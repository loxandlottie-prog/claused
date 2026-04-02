import React, { useState } from "react";

const STAGES = [
  "outreach",
  "negotiating",
  "signed",
  "in production",
  "delivered",
  "invoiced",
  "paid",
];

const STAGE_COLORS = {
  outreach: "#94A3B8",
  negotiating: "#F59E0B",
  signed: "#3B82F6",
  "in production": "#8B5CF6",
  delivered: "#06B6D4",
  invoiced: "#F97316",
  paid: "#10B981",
};

const PAYMENT_BADGE = {
  unpaid: { label: "Unpaid", cls: "badge-unpaid" },
  invoiced: { label: "Invoiced", cls: "badge-invoiced" },
  paid: { label: "Paid", cls: "badge-paid" },
};

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function UsageRightsCountdown({ expiry }) {
  const days = daysUntil(expiry);
  const urgent = days <= 30;
  const warning = days <= 90;
  return (
    <div className={`usage-rights ${urgent ? "urgent" : warning ? "warning" : ""}`}>
      <span className="usage-icon">🔒</span>
      <span className="usage-label">Usage rights</span>
      <span className="usage-expiry">
        {days <= 0 ? "Expired" : `${days}d left`} · {expiry}
      </span>
    </div>
  );
}

function DeliverableRow({ item }) {
  const days = daysUntil(item.dueDate);
  const overdue = days < 0 && !item.done;
  return (
    <div className={`deliverable-row ${item.done ? "done" : ""} ${overdue ? "overdue" : ""}`}>
      <span className="deliverable-check">{item.done ? "✓" : "○"}</span>
      <span className="deliverable-type">{item.type}</span>
      <span className="deliverable-due">
        {item.done ? "Done" : overdue ? `${Math.abs(days)}d overdue` : `Due ${item.dueDate}`}
      </span>
    </div>
  );
}

function DealCard({ deal, onStageChange }) {
  const [expanded, setExpanded] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const stageColor = STAGE_COLORS[deal.stage];
  const payment = PAYMENT_BADGE[deal.paymentStatus];

  return (
    <div className="deal-card">
      <div className="deal-card-header" onClick={() => setExpanded((e) => !e)}>
        <div className="deal-brand-row">
          <div className="deal-logo" style={{ background: deal.logoColor }}>
            {deal.logo}
          </div>
          <div className="deal-brand-info">
            <span className="deal-brand-name">{deal.brand}</span>
            <span className="deal-category">{deal.category}</span>
          </div>
          <div className="deal-header-right">
            <span className="deal-value">${deal.value.toLocaleString()}</span>
            <span className={`payment-badge ${payment.cls}`}>{payment.label}</span>
          </div>
          <span className="deal-chevron">{expanded ? "▲" : "▼"}</span>
        </div>

        <div className="deal-stage-row">
          <div
            className="deal-stage-pill"
            style={{ background: stageColor + "22", color: stageColor, borderColor: stageColor + "44" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowStageMenu((s) => !s);
            }}
          >
            <span
              className="stage-dot"
              style={{ background: stageColor }}
            />
            {deal.stage}
            <span className="stage-edit-hint">▾</span>
          </div>

          {showStageMenu && (
            <div className="stage-menu" onClick={(e) => e.stopPropagation()}>
              {STAGES.map((s) => (
                <button
                  key={s}
                  className={`stage-menu-item ${s === deal.stage ? "active" : ""}`}
                  style={{ color: STAGE_COLORS[s] }}
                  onClick={() => {
                    onStageChange(deal.id, s);
                    setShowStageMenu(false);
                  }}
                >
                  <span className="stage-dot" style={{ background: STAGE_COLORS[s] }} />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="deal-card-body">
          <div className="deliverables-section">
            <span className="section-label">Deliverables</span>
            {deal.deliverables.map((d, i) => (
              <DeliverableRow key={i} item={d} />
            ))}
          </div>

          <UsageRightsCountdown expiry={deal.usageRightsExpiry} />

          {deal.notes && (
            <div className="deal-notes">
              <span className="notes-icon">📝</span>
              {deal.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DealPipeline({ deals, onStageChange }) {
  const active = deals.filter((d) => d.stage !== "paid");
  const paid = deals.filter((d) => d.stage === "paid");

  return (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">Active Deals</h2>
        <span className="section-count">{active.length}</span>
      </div>

      <div className="deals-list">
        {active.map((deal) => (
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} />
        ))}
      </div>

      {paid.length > 0 && (
        <>
          <div className="section-divider">
            <span>Paid & Closed</span>
          </div>
          <div className="deals-list faded">
            {paid.map((deal) => (
              <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
