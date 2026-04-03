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

function AddDealForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);

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

    // Auto-generate logo initials and a color from brand name
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
  const conflicts = detectConflicts(deals);

  const handleAdd = (newDeal) => {
    onDealAdd(newDeal);
    setShowForm(false);
  };

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Deals</h1>
        <button className="tab-action-btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New deal"}
        </button>
      </div>

      {showForm && (
        <AddDealForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {conflicts.map((c) => <ConflictAlert key={c.category} conflict={c} />)}
        </div>
      )}

      <DealPipeline deals={deals} onStageChange={onStageChange} />
    </div>
  );
}
