import React, { useState } from "react";
import DealPipeline from "../components/DealPipeline";
import ConflictAlert from "../components/ConflictAlert";
import { detectConflicts } from "../utils";

const STAGES = ["outreach", "negotiating", "signed", "in production", "delivered", "invoiced", "paid"];
const PAYMENT_STATUSES = ["unpaid", "invoiced", "paid"];

const EMPTY_FORM = {
  brand: "",
  domain: "",
  value: "",
  category: "",
  stage: "outreach",
  paymentStatus: "unpaid",
  usageRightsExpiry: "",
  notes: "",
  deliverables: [{ type: "", dueDate: "" }],
};

// ── Email Parser ──────────────────────────────────────────────
function parseEmail(text) {
  const result = { brand: "", value: "", deliverables: [], notes: "" };

  // Extract brand from "From: Name @ Brand" or "I'm [name] from [Brand]" or "on behalf of [Brand]"
  const fromMatch = text.match(/from[:\s]+[^<\n]*?(?:at|@)\s*([A-Z][A-Za-z0-9 &.'-]{2,30})/i)
    || text.match(/(?:I'?m|I am|my name is)[^,.\n]*?(?:from|at|with)\s+([A-Z][A-Za-z0-9 &.'-]{2,30})/i)
    || text.match(/on behalf of\s+([A-Z][A-Za-z0-9 &.'-]{2,30})/i)
    || text.match(/(?:team|brand|company)[:\s]+([A-Z][A-Za-z0-9 &.'-]{2,30})/i);
  if (fromMatch) result.brand = fromMatch[1].trim();

  // Extract deal value — largest dollar amount that looks like a fee
  const valueMatches = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)/g)];
  if (valueMatches.length > 0) {
    const nums = valueMatches.map((m) => parseFloat(m[1].replace(/,/g, "")));
    result.value = String(Math.max(...nums));
  }

  // Extract deliverables
  const deliverableKeywords = [
    "instagram reel", "ig reel", "tiktok video", "tiktok", "youtube video", "youtube",
    "instagram story", "ig story", "instagram post", "blog post", "sponsored post",
    "unboxing", "review video", "instagram carousel", "twitter post", "facebook post",
    "newsletter mention", "podcast mention",
  ];
  const found = new Set();
  const lc = text.toLowerCase();
  deliverableKeywords.forEach((kw) => {
    if (lc.includes(kw)) {
      const label = kw.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      found.add(label);
    }
  });

  // Also match "X [platform] videos/posts" pattern
  const countMatch = [...text.matchAll(/(\d+)\s+(instagram reel|tiktok video|youtube video|instagram post)/gi)];
  countMatch.forEach((m) => {
    const label = `${m[1]}x ${m[2].split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
    found.add(label);
  });

  result.deliverables = [...found].map((type) => ({ type, dueDate: "" }));
  if (result.deliverables.length === 0) result.deliverables = [{ type: "", dueDate: "" }];

  // Grab first 200 chars as notes hint
  result.notes = text.trim().slice(0, 200).replace(/\n+/g, " ");

  return result;
}

function EmailParser({ onParsed }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");

  const handleParse = () => {
    if (!text.trim()) { setError("Paste an email first."); return; }
    const result = parseEmail(text);
    if (!result.brand && !result.value) {
      setError("Couldn't extract deal details — try adjusting the email text.");
      return;
    }
    setError("");
    setParsed(result);
  };

  const handleUse = () => {
    onParsed(parsed);
    setText("");
    setParsed(null);
  };

  return (
    <div className="email-parser-card">
      <div className="email-parser-header">
        <span className="email-parser-title">Parse inbound email</span>
        <span className="email-parser-hint">Paste a brand email to auto-fill the deal form</span>
      </div>
      <textarea
        className="email-parser-textarea"
        value={text}
        onChange={(e) => { setText(e.target.value); setParsed(null); setError(""); }}
        placeholder={"Paste the brand's email here...\n\nInbora will extract the brand name, deal value, and deliverables automatically."}
        rows={6}
      />
      {error && <div className="email-parser-error">{error}</div>}
      {parsed && (
        <div className="email-parse-preview">
          <div className="parse-preview-title">Extracted</div>
          <div className="parse-preview-grid">
            {parsed.brand && (
              <div className="parse-preview-row">
                <span className="parse-label">Brand</span>
                <span className="parse-value">{parsed.brand}</span>
              </div>
            )}
            {parsed.value && (
              <div className="parse-preview-row">
                <span className="parse-label">Value</span>
                <span className="parse-value">${Number(parsed.value).toLocaleString()}</span>
              </div>
            )}
            {parsed.deliverables.filter(d => d.type).length > 0 && (
              <div className="parse-preview-row">
                <span className="parse-label">Deliverables</span>
                <span className="parse-value">{parsed.deliverables.filter(d => d.type).map(d => d.type).join(", ")}</span>
              </div>
            )}
          </div>
          <button className="email-parser-use-btn" onClick={handleUse}>Use to fill form</button>
        </div>
      )}
      {!parsed && (
        <button className="email-parser-parse-btn" onClick={handleParse}>Parse</button>
      )}
    </div>
  );
}

function AddDealForm({ onAdd, onCancel, prefill }) {
  const [form, setForm] = useState(prefill ? { ...EMPTY_FORM, ...prefill } : EMPTY_FORM);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setDeliverable = (i, key, value) => {
    setForm((f) => {
      const deliverables = [...f.deliverables];
      deliverables[i] = { ...deliverables[i], [key]: value };
      return { ...f, deliverables };
    });
  };

  const addDeliverable = () =>
    setForm((f) => ({ ...f, deliverables: [...f.deliverables, { type: "", dueDate: "" }] }));

  const removeDeliverable = (i) =>
    setForm((f) => ({ ...f, deliverables: f.deliverables.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.brand.trim() || !form.value) return;

    const initials = form.brand.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["#4F7FFA","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#F97316","#0EA5E9","#14B8A6","#A855F7"];
    const colorIdx = form.brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;

    onAdd({
      id: Date.now(),
      brand: form.brand.trim(),
      logo: initials,
      logoColor: colors[colorIdx],
      domain: form.domain.trim() || null,
      value: parseFloat(form.value) || 0,
      category: form.category.trim(),
      stage: form.stage,
      paymentStatus: form.paymentStatus,
      invoiceNumber: null,
      deliverables: form.deliverables
        .filter((d) => d.type.trim())
        .map((d) => ({ type: d.type.trim(), dueDate: d.dueDate || "", done: false })),
      usageRightsExpiry: form.usageRightsExpiry || "",
      notes: form.notes.trim(),
      usageViolationFlagged: false,
    });
  };

  return (
    <form className="add-deal-form" onSubmit={handleSubmit}>
      <div className="add-deal-form-title">New Deal</div>

      <div className="add-form-grid">
        <div className="add-form-field">
          <label>Brand name *</label>
          <input value={form.brand} onChange={set("brand")} placeholder="e.g. Petlibro" required />
        </div>
        <div className="add-form-field">
          <label>Deal value *</label>
          <input value={form.value} onChange={set("value")} placeholder="e.g. 3500" type="number" min="0" required />
        </div>
        <div className="add-form-field">
          <label>Category</label>
          <input value={form.category} onChange={set("category")} placeholder="e.g. automatic feeders" />
        </div>
        <div className="add-form-field">
          <label>Website / domain</label>
          <input value={form.domain} onChange={set("domain")} placeholder="e.g. petlibro.com" />
        </div>
        <div className="add-form-field">
          <label>Stage</label>
          <select value={form.stage} onChange={set("stage")}>
            {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="add-form-field">
          <label>Payment status</label>
          <select value={form.paymentStatus} onChange={set("paymentStatus")}>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="add-form-field">
          <label>Usage rights expiry</label>
          <input value={form.usageRightsExpiry} onChange={set("usageRightsExpiry")} type="date" />
        </div>
        <div className="add-form-field" style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <textarea value={form.notes} onChange={set("notes")} placeholder="Exclusivity terms, approval process, contacts..." rows={2} />
        </div>
      </div>

      <div className="add-deliverables-section">
        <div className="add-deliverables-header">
          <label>Deliverables</label>
          <button type="button" className="add-deliverable-btn" onClick={addDeliverable}>+ Add</button>
        </div>
        {form.deliverables.map((del, i) => (
          <div key={i} className="deliverable-input-row">
            <input
              value={del.type}
              onChange={(e) => setDeliverable(i, "type", e.target.value)}
              placeholder="e.g. Instagram Reel"
              style={{ flex: 1 }}
            />
            <input
              value={del.dueDate}
              onChange={(e) => setDeliverable(i, "dueDate", e.target.value)}
              type="date"
              style={{ width: 150 }}
            />
            {form.deliverables.length > 1 && (
              <button type="button" className="remove-deliverable-btn" onClick={() => removeDeliverable(i)}>✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="add-form-actions">
        <button type="submit" className="add-form-submit">Add Deal</button>
        <button type="button" className="add-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function DealsTab({ deals, onStageChange, onDealAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const conflicts = detectConflicts(deals);

  const handleAdd = (newDeal) => {
    onDealAdd(newDeal);
    setShowForm(false);
    setPrefill(null);
  };

  const handleParsed = (parsed) => {
    setPrefill({
      brand: parsed.brand,
      value: parsed.value,
      notes: parsed.notes,
      deliverables: parsed.deliverables,
    });
    setShowParser(false);
    setShowForm(true);
  };

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Deals</h1>
        <div className="tab-header-actions">
          <button
            className="tab-action-btn-ghost"
            onClick={() => { setShowParser((s) => !s); setShowForm(false); }}
          >
            {showParser ? "Cancel" : "✉ Parse email"}
          </button>
          <button
            className="tab-action-btn"
            onClick={() => { setShowForm((s) => !s); setShowParser(false); setPrefill(null); }}
          >
            {showForm ? "Cancel" : "+ New deal"}
          </button>
        </div>
      </div>

      {showParser && <EmailParser onParsed={handleParsed} />}

      {showForm && (
        <AddDealForm
          onAdd={handleAdd}
          onCancel={() => { setShowForm(false); setPrefill(null); }}
          prefill={prefill}
        />
      )}

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {conflicts.map((c, i) => <ConflictAlert key={i} conflict={c} />)}
        </div>
      )}

      <DealPipeline deals={deals} onStageChange={onStageChange} />
    </div>
  );
}
