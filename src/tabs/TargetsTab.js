import React, { useState } from "react";

const PRIORITY_CONFIG = {
  high:   { label: "High",   cls: "priority-high" },
  medium: { label: "Medium", cls: "priority-medium" },
  low:    { label: "Low",    cls: "priority-low" },
};

const STATUS_CONFIG = {
  "not contacted": { label: "Not contacted", color: "#A09890" },
  "contacted":     { label: "Contacted",     color: "#F59E0B" },
  "in talks":      { label: "In talks",      color: "#4F7FFA" },
  "passed":        { label: "Passed",        color: "#EF4444" },
};

const LOGO_PALETTE = ["#4F7FFA","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#0EA5E9","#F97316","#A855F7","#14B8A6"];

function autoLogo(brand) {
  return brand.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function autoColor(brand, palette) {
  const idx = brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
  return palette[idx];
}

function TargetCard({ target, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[target.priority];
  const status = STATUS_CONFIG[target.status] || { label: target.status, color: "#A09890" };
  const logo = target.logo || autoLogo(target.brand);
  const logoColor = target.logoColor || autoColor(target.brand, LOGO_PALETTE);

  const statusOrder = ["not contacted", "contacted", "in talks", "passed"];
  const nextStatus = statusOrder[statusOrder.indexOf(target.status) + 1];

  return (
    <div className="deal-card target-card">
      <div className="deal-card-header" onClick={() => setExpanded((e) => !e)} style={{ cursor: "pointer" }}>
        <div className="deal-brand-row">
          <div className="deal-logo" style={{ background: logoColor }}>
            {logo}
          </div>
          <div className="deal-brand-info">
            <span className="deal-brand-name">{target.brand}</span>
            <span className="deal-category">{target.category}</span>
          </div>
          <div className="deal-header-right">
            {target.estimatedValue && (
              <span className="target-est-value">${target.estimatedValue}</span>
            )}
            <span className={`priority-badge ${priority.cls}`}>{priority.label}</span>
          </div>
          <span className="deal-chevron">{expanded ? "▲" : "▼"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            className="deal-stage-pill"
            style={{
              background: status.color + "18",
              color: status.color,
              borderColor: status.color + "44",
            }}
          >
            <span className="stage-dot" style={{ background: status.color }} />
            {status.label}
          </div>
          {nextStatus && (
            <button
              className="target-advance-btn"
              onClick={(e) => { e.stopPropagation(); onUpdate(target.id, { status: nextStatus }); }}
            >
              Mark as {STATUS_CONFIG[nextStatus]?.label}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="deal-card-body">
          {target.notes && (
            <div className="deal-notes">
              <span className="notes-icon">📝</span>
              {target.notes}
            </div>
          )}
          <div className="past-deal-meta">
            {target.website && (
              <div className="past-meta-row">
                <span className="past-meta-label">Website</span>
                <span className="past-meta-value">{target.website}</span>
              </div>
            )}
            {target.contactName && (
              <div className="past-meta-row">
                <span className="past-meta-label">Contact</span>
                <span className="past-meta-value">{target.contactName}</span>
              </div>
            )}
            {target.contactEmail && (
              <div className="past-meta-row">
                <span className="past-meta-label">Email</span>
                <span className="past-meta-value">{target.contactEmail}</span>
              </div>
            )}
            <div className="past-meta-row">
              <span className="past-meta-label">Added</span>
              <span className="past-meta-value">{target.addedDate}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  brand: "", category: "", website: "", estimatedValue: "", priority: "medium", notes: "", contactName: "", contactEmail: "",
};

function AddTargetForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.brand.trim()) return;
    onAdd({ ...form, id: Date.now(), status: "not contacted", addedDate: new Date().toISOString().slice(0, 10) });
  };

  return (
    <form className="add-target-form" onSubmit={handleSubmit}>
      <div className="add-form-row">
        <div className="add-form-field">
          <label>Brand name *</label>
          <input value={form.brand} onChange={set("brand")} placeholder="e.g. Chewy" required />
        </div>
        <div className="add-form-field">
          <label>Category</label>
          <input value={form.category} onChange={set("category")} placeholder="e.g. pet food" />
        </div>
      </div>
      <div className="add-form-row">
        <div className="add-form-field">
          <label>Est. deal value</label>
          <input value={form.estimatedValue} onChange={set("estimatedValue")} placeholder="e.g. 3,000–6,000" />
        </div>
        <div className="add-form-field">
          <label>Priority</label>
          <select value={form.priority} onChange={set("priority")}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="add-form-row">
        <div className="add-form-field">
          <label>Contact name</label>
          <input value={form.contactName} onChange={set("contactName")} placeholder="Optional" />
        </div>
        <div className="add-form-field">
          <label>Contact email</label>
          <input value={form.contactEmail} onChange={set("contactEmail")} placeholder="Optional" />
        </div>
      </div>
      <div className="add-form-field" style={{ gridColumn: "1/-1" }}>
        <label>Notes</label>
        <textarea value={form.notes} onChange={set("notes")} placeholder="Why this brand? How to reach them?" rows={2} />
      </div>
      <div className="add-form-actions">
        <button type="submit" className="add-form-submit">Add Target</button>
        <button type="button" className="add-form-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

const PRIORITY_FILTERS = ["All", "High", "Medium", "Low"];
const STATUS_FILTERS = ["All", "Not contacted", "Contacted", "In talks"];

export default function TargetsTab({ targets, onTargetUpdate, onTargetAdd }) {
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const filtered = targets.filter((t) => {
    if (priorityFilter !== "All" && t.priority !== priorityFilter.toLowerCase()) return false;
    if (statusFilter !== "All" && t.status !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const handleAdd = (newTarget) => {
    onTargetAdd(newTarget);
    setShowForm(false);
  };

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Targets</h1>
        <button className="tab-action-btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add brand"}
        </button>
      </div>

      {showForm && (
        <AddTargetForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      <div className="opp-filters">
        <div className="filter-group">
          <span className="filter-group-label">Priority</span>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-pill ${priorityFilter === f ? "active" : ""}`}
              onClick={() => setPriorityFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-group-label">Status</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-pill ${statusFilter === f ? "active" : ""}`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="deals-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No targets match these filters.</div>
        ) : (
          filtered.map((t) => (
            <TargetCard key={t.id} target={t} onUpdate={onTargetUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
