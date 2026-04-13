import React, { useState } from "react";
import { daysSince, formatCurrency, fmtDate } from "../utils";

const STATUS = {
  reply_needed:    { label: "Reply needed",      cls: "status-red"    },
  you_replied:     { label: "Replied",           cls: "status-blue"   },
  waiting_on_them: { label: "Waiting on them",   cls: "status-yellow" },
  in_progress:     { label: "In progress",       cls: "status-teal"   },
  deal_closed:     { label: "Closed",            cls: "status-green"  },
  deal_passed:     { label: "Passed",            cls: "status-gray"   },
};

const LOGO_SOURCES = (domain) => [
  `https://logo.clearbit.com/${domain}`,
  `https://icon.horse/icon/${domain}`,
];

function BrandLogo({ domain, logo, logoColor }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = domain ? LOGO_SOURCES(domain) : [];
  const allFailed = srcIdx >= sources.length;

  if (sources.length > 0 && !allFailed) {
    return (
      <div className="brand-logo brand-logo-img">
        <img src={sources[srcIdx]} alt="" onError={() => setSrcIdx((i) => i + 1)} />
      </div>
    );
  }
  return (
    <div className="brand-logo" style={{ background: logoColor + "18", color: logoColor }}>
      {logo}
    </div>
  );
}

function getGmailUrl(thread, gmailEmail) {
  const authuser = gmailEmail ? `?authuser=${encodeURIComponent(gmailEmail)}` : "";
  if (thread.source === "gmail" && thread.id) {
    return `https://mail.google.com/mail/${authuser}#all/${thread.id}`;
  }
  if (thread.contact?.email) {
    return `https://mail.google.com/mail/${authuser}#search/from%3A${encodeURIComponent(thread.contact.email)}`;
  }
  return `https://mail.google.com/mail/${authuser}#search/${encodeURIComponent(thread.brand)}`;
}

function Deliverables({ deliverables, threadId, onToggle, onAdd }) {
  const [newText, setNewText] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAdd(threadId, newText.trim());
    setNewText("");
  };

  return (
    <div className="deliverables-section">
      <div className="deliverables-title">Deliverables</div>
      <div className="deliverables-list">
        {deliverables.map((d) => (
          <label key={d.id} className={`deliverable-item ${d.done ? "deliverable-done" : ""}`}>
            <input
              type="checkbox"
              checked={d.done}
              onChange={() => onToggle(threadId, d.id)}
              className="deliverable-checkbox"
            />
            <span className="deliverable-text">{d.text}</span>
          </label>
        ))}
      </div>
      <form className="deliverable-add-row" onSubmit={handleAdd}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a deliverable..."
          className="deliverable-add-input"
        />
        <button type="submit" className="deliverable-add-btn">Add</button>
      </form>
    </div>
  );
}

export default function BrandCard({ thread, onStatusChange, onDeliverableToggle, onDeliverableAdd, gmailEmail }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const since = daysSince(thread.lastMessage);
  const s = STATUS[thread.status];
  const deliverables = thread.deliverables || [];
  const doneCount = deliverables.filter((d) => d.done).length;
  const nextStep = deliverables.find((d) => !d.done);
  const hasDeliverables = deliverables.length > 0;

  const websiteUrl = thread.domain ? `https://www.${thread.domain}` : null;
  const gmailUrl = getGmailUrl(thread, gmailEmail);

  return (
    <div className="brand-card">
      <div className="brand-card-main">
        <BrandLogo domain={thread.domain} logo={thread.logo} logoColor={thread.logoColor} />

        <div className="brand-info">
          <div className="brand-top-row">
            <div className="brand-name-group">
              <span className="brand-name">{thread.brand}</span>
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="brand-website-link" onClick={(e) => e.stopPropagation()}>
                  {thread.domain} ↗
                </a>
              )}
            </div>
            <div className="brand-top-right">
              <div className="status-picker" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`status-badge ${s.cls} status-badge-btn`}
                  onClick={() => setShowStatusMenu((v) => !v)}
                >
                  {s.label} ▾
                </button>
                {showStatusMenu && (
                  <div className="status-menu">
                    {Object.entries(STATUS).map(([key, val]) => (
                      <button key={key}
                        className={`status-menu-item ${key === thread.status ? "status-menu-active" : ""}`}
                        onClick={() => { onStatusChange(thread.id, key); setShowStatusMenu(false); }}
                      >
                        <span className={`status-menu-dot ${val.cls}`} />
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <a href={gmailUrl} target="_blank" rel="noopener noreferrer"
                className="gmail-icon-btn" title="Open in Gmail" onClick={(e) => e.stopPropagation()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="currentColor"/>
                </svg>
              </a>
              <div className="actions-picker" onClick={(e) => e.stopPropagation()}>
                <button className="actions-menu-btn" onClick={() => setShowActionsMenu((v) => !v)}>⋯</button>
                {showActionsMenu && (
                  <div className="actions-menu">
                    <button className="actions-menu-item actions-item-close"
                      onClick={() => { onStatusChange(thread.id, "deal_closed"); setShowActionsMenu(false); }}>
                      ✓ Close deal
                    </button>
                    <button className="actions-menu-item actions-item-pass"
                      onClick={() => { onStatusChange(thread.id, "deal_passed"); setShowActionsMenu(false); }}>
                      ✕ Pass
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="brand-contact">
            {thread.contact.name && <span>{thread.contact.name}</span>}
            {thread.contact.name && thread.contact.email && <span className="contact-sep">·</span>}
            {thread.contact.email && <span className="contact-email">{thread.contact.email}</span>}
          </div>

          {thread.product && (
            <div className="brand-product">
              <span className="brand-product-label">Product</span>
              <span className="brand-product-name">{thread.product}</span>
            </div>
          )}

          <div className="brand-offer">{thread.offer || <span className="muted">No offer details</span>}</div>

          {thread.notes && (
            <div className="brand-notes">{thread.notes}</div>
          )}

          {/* Next step chip — shown on card face */}
          {nextStep && (
            <div className="next-step-row">
              <span className="next-step-label">Next</span>
              <span className="next-step-text">{nextStep.text}</span>
              {hasDeliverables && (
                <span className="deliverable-progress">{doneCount}/{deliverables.length}</span>
              )}
            </div>
          )}
          {hasDeliverables && !nextStep && (
            <div className="next-step-row next-step-done">
              <span className="next-step-label">Deliverables</span>
              <span className="next-step-text">All done ✓</span>
              <span className="deliverable-progress">{doneCount}/{deliverables.length}</span>
            </div>
          )}

          <div className="brand-meta-row">
            <div className="brand-rates">
              {thread.theirRate === "product" ? (
                <span className="rate-chip rate-product">Product only</span>
              ) : thread.theirRate ? (
                <span className="rate-chip rate-their">Their rate: {formatCurrency(thread.theirRate)}</span>
              ) : null}
              {thread.yourRate && (
                <span className="rate-chip rate-yours">Your rate: {formatCurrency(thread.yourRate)}</span>
              )}
              {thread.status === "deal_closed" && thread.revenue && (
                <span className="rate-chip rate-closed">Closed: {formatCurrency(thread.revenue)}</span>
              )}
            </div>
            <div className="brand-dates-row">
              <div className="brand-dates">
                <span className="date-chip">Reached out {fmtDate(thread.firstReached)}</span>
                <span className="date-sep">·</span>
                <span className={`date-chip ${since >= 14 && thread.status !== "deal_closed" ? "date-stale" : ""}`}>
                  Last message {since === 0 ? "today" : since === 1 ? "yesterday" : `${since}d ago`}
                </span>
              </div>
              <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                {!["in_progress", "deal_closed", "deal_passed"].includes(thread.status) && (
                  <>
                    <button
                      className="card-action-btn card-action-accept"
                      onClick={() => onStatusChange(thread.id, "in_progress")}
                      title="Accept deal"
                    >
                      ✓ Accept
                    </button>
                    <button
                      className="card-action-btn card-action-reject"
                      onClick={() => onStatusChange(thread.id, "deal_passed")}
                      title="Reject deal"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}
                <button
                  className="expand-btn"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "▲ Hide tasks" : `▾ Tasks${hasDeliverables ? ` (${deliverables.length})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="brand-card-expanded">
          <Deliverables
            deliverables={deliverables}
            threadId={thread.id}
            onToggle={onDeliverableToggle}
            onAdd={onDeliverableAdd}
          />
        </div>
      )}
    </div>
  );
}
