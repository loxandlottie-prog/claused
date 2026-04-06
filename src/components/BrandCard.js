import React from "react";
import { daysSince, formatCurrency, fmtDate } from "../utils";

const STATUS = {
  reply_needed:   { label: "Reply needed",    cls: "status-red"    },
  waiting_on_them:{ label: "Waiting on them", cls: "status-yellow" },
  you_replied:    { label: "You replied",      cls: "status-blue"   },
  deal_closed:    { label: "Deal closed",      cls: "status-green"  },
};

const NEXT_STATUS = {
  reply_needed:    "you_replied",
  you_replied:     "waiting_on_them",
  waiting_on_them: "deal_closed",
  deal_closed:     null,
};

export default function BrandCard({ thread, onStatusChange }) {
  const since = daysSince(thread.lastMessage);
  const followUp = since >= 14 && thread.status !== "deal_closed";
  const s = STATUS[thread.status];
  const next = NEXT_STATUS[thread.status];

  return (
    <div className={`brand-card ${followUp ? "brand-card-followup" : ""}`}>
      {followUp && (
        <div className="followup-flag">
          ⏰ Follow up — silent for {since}d
        </div>
      )}

      <div className="brand-card-main">
        {/* Logo */}
        <div className="brand-logo" style={{ background: thread.logoColor + "18", color: thread.logoColor }}>
          {thread.logo}
        </div>

        {/* Info block */}
        <div className="brand-info">
          <div className="brand-top-row">
            <span className="brand-name">{thread.brand}</span>
            <span className={`status-badge ${s.cls}`}>{s.label}</span>
          </div>
          <div className="brand-contact">
            {thread.contact.name && <span>{thread.contact.name}</span>}
            {thread.contact.name && thread.contact.email && <span className="contact-sep">·</span>}
            {thread.contact.email && <span className="contact-email">{thread.contact.email}</span>}
          </div>
          <div className="brand-offer">{thread.offer || <span className="muted">No offer details</span>}</div>

          <div className="brand-meta-row">
            <div className="brand-rates">
              {thread.theirRate && (
                <span className="rate-chip rate-their">
                  Their rate: {formatCurrency(thread.theirRate)}
                </span>
              )}
              {thread.yourRate && (
                <span className="rate-chip rate-yours">
                  Your rate: {formatCurrency(thread.yourRate)}
                </span>
              )}
              {thread.status === "deal_closed" && thread.revenue && (
                <span className="rate-chip rate-closed">
                  Closed: {formatCurrency(thread.revenue)}
                </span>
              )}
            </div>
            <div className="brand-dates">
              <span className="date-chip">Reached out {fmtDate(thread.firstReached)}</span>
              <span className="date-sep">·</span>
              <span className={`date-chip ${since >= 14 && thread.status !== "deal_closed" ? "date-stale" : ""}`}>
                Last message {since === 0 ? "today" : since === 1 ? "yesterday" : `${since}d ago`}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {next && (
          <button
            className="brand-advance-btn"
            onClick={() => onStatusChange(thread.id, next)}
            title={`Mark as: ${STATUS[next].label}`}
          >
            {next === "you_replied" && "Replied ✓"}
            {next === "waiting_on_them" && "Sent ✓"}
            {next === "deal_closed" && "Close deal"}
          </button>
        )}
      </div>
    </div>
  );
}
