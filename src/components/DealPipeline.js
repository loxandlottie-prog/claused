import React, { useState } from "react";
import { daysUntil } from "../utils";
import UsageRightsCountdown from "./UsageRightsCountdown";
import BrandLogo from "./BrandLogo";

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
  outreach:      "#94A3B8",
  negotiating:   "#F59E0B",
  signed:        "#3B82F6",
  "in production": "#8B5CF6",
  delivered:     "#06B6D4",
  invoiced:      "#F97316",
  paid:          "#10B981",
};

const PAYMENT_BADGE = {
  unpaid:   { label: "Unpaid",   cls: "badge-unpaid" },
  invoiced: { label: "Invoiced", cls: "badge-invoiced" },
  paid:     { label: "Paid",     cls: "badge-paid" },
};

const PHASE_COLORS = {
  done:     "#10B981",
  active:   "#8B5CF6",
  upcoming: "#CBD5E1",
};

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

function PhaseTimeline({ phases }) {
  return (
    <div className="phase-timeline-section">
      <span className="section-label">Phases</span>
      <div className="phase-steps">
        {phases.map((phase, i) => {
          const color = PHASE_COLORS[phase.status] || PHASE_COLORS.upcoming;
          const isLast = i === phases.length - 1;
          return (
            <div key={i} className={`phase-step phase-${phase.status}`}>
              <div className="phase-track">
                <div className="phase-dot" style={{ background: color, borderColor: color }} />
                {!isLast && (
                  <div
                    className="phase-connector"
                    style={{ background: phase.status === "done" ? color : "#E2E8F0" }}
                  />
                )}
              </div>
              <div className="phase-info">
                <span className="phase-name">{phase.name}</span>
                {phase.dueDate && (
                  <span className="phase-date">{phase.dueDate}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ deal, onStageChange }) {
  const [expanded, setExpanded] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [violationFlagged, setViolationFlagged] = useState(deal.usageViolationFlagged || false);
  const stageColor = STAGE_COLORS[deal.stage];
  const payment = PAYMENT_BADGE[deal.paymentStatus];

  return (
    <div className="deal-card" style={{ borderLeft: `3px solid ${stageColor}` }}>
      <div className="deal-card-header" onClick={() => setExpanded((e) => !e)}>
        <div className="deal-brand-row">
          <BrandLogo logo={deal.logo} logoColor={deal.logoColor} domain={deal.domain} size={36} />
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
            onClick={(e) => { e.stopPropagation(); setShowStageMenu((s) => !s); }}
          >
            <span className="stage-dot" style={{ background: stageColor }} />
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
                  onClick={() => { onStageChange(deal.id, s); setShowStageMenu(false); }}
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
          {deal.phases && deal.phases.length > 0 ? (
            <PhaseTimeline phases={deal.phases} />
          ) : (
            <div className="deliverables-section">
              <span className="section-label">Deliverables</span>
              {deal.deliverables.map((d, i) => (
                <DeliverableRow key={i} item={d} />
              ))}
            </div>
          )}

          {deal.usageRightsExpiry && (
            <UsageRightsCountdown
              expiry={deal.usageRightsExpiry}
              flagged={violationFlagged}
              onFlagViolation={() => setViolationFlagged(true)}
            />
          )}

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
          <div className="section-divider"><span>Paid & Closed</span></div>
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
