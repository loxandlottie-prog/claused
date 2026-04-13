import React, { useState } from "react";
import { parseThread } from "../utils";

const STATUS_OPTIONS = [
  { value: "active",   label: "Active"   },
  { value: "closed",   label: "Closed"   },
  { value: "rejected", label: "Rejected" },
];

const COLORS = [
  "#0D9488","#F59E0B","#10B981","#3B82F6","#EF4444",
  "#EC4899","#8B5CF6","#0EA5E9","#F97316","#14B8A6",
];

function extractDomain(website, email) {
  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return website.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;
    }
  }
  if (email && email.includes("@")) return email.split("@")[1];
  return null;
}

const today = new Date().toISOString().slice(0, 10);

function emptyForm() {
  return {
    brand: "",
    contactName: "",
    contactEmail: "",
    website: "",
    firstReached: today,
    lastMessage: today,
    offer: "",
    product: "",
    theirRate: "",
    yourRate: "",
    revenue: "",
    notes: "",
    status: "active",
  };
}

export default function PasteModal({ onAdd, onClose }) {
  const [step, setStep] = useState("paste"); // "paste" | "form"
  const [text, setText] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleParse = () => {
    if (!text.trim()) { setError("Paste a thread first."); return; }
    const result = parseThread(text);
    if (!result.brand && !result.contactEmail) {
      setError("Couldn't extract details — make sure the text includes a brand name or email address.");
      return;
    }
    setForm((f) => ({
      ...f,
      brand: result.brand || "",
      contactName: result.contactName || "",
      contactEmail: result.contactEmail || "",
      offer: result.offer || "",
      theirRate: result.theirRate ? String(result.theirRate) : "",
    }));
    setError("");
    setStep("form");
  };

  const handleAdd = () => {
    if (!form.brand.trim()) { setError("Brand name is required."); return; }
    const brand = form.brand.trim();
    const colorIdx = brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length;
    const initials = brand.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
    const domain = extractDomain(form.website, form.contactEmail);

    const theirRateRaw = form.theirRate.trim().toLowerCase();
    const theirRate = theirRateRaw === "product" ? "product" : parseFloat(theirRateRaw) || null;

    onAdd({
      id: Date.now(),
      brand,
      logo: initials,
      logoColor: COLORS[colorIdx],
      domain,
      contact: {
        name: form.contactName.trim(),
        email: form.contactEmail.trim(),
      },
      firstReached: form.firstReached || today,
      lastMessage: form.lastMessage || today,
      offer: form.offer.trim() || null,
      product: form.product.trim() || null,
      theirRate,
      yourRate: parseFloat(form.yourRate) || null,
      revenue: parseFloat(form.revenue) || null,
      notes: form.notes.trim() || null,
      status: form.status,
      category: "",
      deliverables: [],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <span className="modal-title">{step === "paste" ? "Paste Thread" : "Add Brand"}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === "paste" ? (
          <>
            <p className="modal-hint">
              Paste a raw email or DM and Inbora will pre-fill what it can. Or{" "}
              <button className="modal-link" onClick={() => setStep("form")}>enter details manually →</button>
            </p>
            <textarea
              className="modal-textarea"
              value={text}
              onChange={(e) => { setText(e.target.value); setError(""); }}
              placeholder={"Hi! I'm Sarah from Fresh Step — we'd love to collaborate on a sponsored Instagram Reel. Our budget is $1,500.\n\nsarah.chen@freshstep.com"}
              rows={8}
              autoFocus
            />
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={handleParse}>Parse thread</button>
              <button className="modal-btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-hint">Fill in what you know — everything except Brand name is optional.</p>

            <div className="modal-form">
              <div className="modal-section-label">Brand</div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Brand name *</label>
                  <input value={form.brand} onChange={set("brand")} placeholder="e.g. Fresh Step" autoFocus />
                </div>
                <div className="modal-field">
                  <label>Website</label>
                  <input value={form.website} onChange={set("website")} placeholder="e.g. freshstep.com" />
                </div>
              </div>

              <div className="modal-section-label">Contact</div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Contact name</label>
                  <input value={form.contactName} onChange={set("contactName")} placeholder="e.g. Sarah Chen" />
                </div>
                <div className="modal-field">
                  <label>Contact email</label>
                  <input value={form.contactEmail} onChange={set("contactEmail")} placeholder="e.g. sarah@freshstep.com" />
                </div>
              </div>

              <div className="modal-section-label">Dates</div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Date reached out</label>
                  <input type="date" value={form.firstReached} onChange={set("firstReached")} />
                </div>
                <div className="modal-field">
                  <label>Last message date</label>
                  <input type="date" value={form.lastMessage} onChange={set("lastMessage")} />
                </div>
              </div>

              <div className="modal-section-label">Deal</div>
              <div className="modal-field">
                <label>What they're offering</label>
                <input value={form.offer} onChange={set("offer")} placeholder="e.g. Sponsored Reel + Story set" />
              </div>
              <div className="modal-field">
                <label>Product (optional)</label>
                <input value={form.product} onChange={set("product")} placeholder="e.g. Fresh Step Clean Paws Litter" />
              </div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Their rate — or type "product"</label>
                  <input value={form.theirRate} onChange={set("theirRate")} placeholder="e.g. 1500 or product" />
                </div>
                <div className="modal-field">
                  <label>Your rate ($)</label>
                  <input type="number" min="0" value={form.yourRate} onChange={set("yourRate")} placeholder="e.g. 2500" />
                </div>
              </div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Deal value / revenue ($)</label>
                  <input type="number" min="0" value={form.revenue} onChange={set("revenue")} placeholder="e.g. 2500" />
                </div>
                <div className="modal-field">
                  <label>Status</label>
                  <select value={form.status} onChange={set("status")}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-field">
                <label>Phase / progress note (optional)</label>
                <input value={form.notes} onChange={set("notes")} placeholder="e.g. Negotiating on rate, they came back at $1,800" />
              </div>
            </div>

            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={handleAdd}>Add brand</button>
              {step === "form" && text && (
                <button className="modal-btn-ghost" onClick={() => { setStep("paste"); setError(""); }}>← Back to paste</button>
              )}
              <button className="modal-btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
