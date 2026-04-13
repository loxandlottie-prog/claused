import React, { useState, useEffect, useRef } from "react";
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

function EditableText({ value, onSave, className, placeholder = "Add...", multiline = false, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = (e) => { e.stopPropagation(); setDraft(value || ""); setEditing(true); };
  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value || "").trim()) onSave(trimmed || null);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    const sharedProps = {
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: save,
      autoFocus: true,
      onClick: (e) => e.stopPropagation(),
      className: `edit-field ${multiline ? "edit-field-multi" : ""}`,
    };
    return multiline
      ? <textarea {...sharedProps} rows={3} onKeyDown={(e) => e.key === "Escape" && cancel()} />
      : <input {...sharedProps} type={type} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }} />;
  }

  return (
    <span className={`editable-hover ${className || ""}`} onClick={start} title="Click to edit">
      {value != null && value !== "" ? value : <em className="field-empty">{placeholder}</em>}
    </span>
  );
}

function EditableRate({ value, onSave, label, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = (e) => { e.stopPropagation(); setDraft(value != null ? String(value) : ""); setEditing(true); };
  const save = () => {
    setEditing(false);
    const n = parseFloat(String(draft).replace(/[$,]/g, ""));
    onSave(isNaN(n) ? null : n);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <span className={`${className} rate-chip-editing`} onClick={(e) => e.stopPropagation()}>
        <span className="rate-chip-label">{label}:</span>
        <input
          className="edit-field edit-field-rate"
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          autoFocus
          placeholder="0"
        />
      </span>
    );
  }

  if (value == null) {
    return (
      <span className={`${className} rate-chip-add editable-hover`} onClick={start} title="Click to set">
        + {label}
      </span>
    );
  }

  return (
    <span className={`${className} editable-hover`} onClick={start} title="Click to edit">
      {label}: {formatCurrency(value)}
    </span>
  );
}

function getGmailUrl(threadId, gmailEmail) {
  const authuser = gmailEmail ? `?authuser=${encodeURIComponent(gmailEmail)}` : "";
  return `https://mail.google.com/mail/${authuser}#all/${threadId}`;
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
      <div className="deliverables-title">Tasks</div>
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
          placeholder="Add a task..."
          className="deliverable-add-input"
        />
        <button type="submit" className="deliverable-add-btn">Add</button>
      </form>
    </div>
  );
}

export default function BrandCard({ thread, onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, gmailEmail }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!showStatusMenu && !showActionsMenu) return;
    const handler = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setShowStatusMenu(false);
        setShowActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showStatusMenu, showActionsMenu]);

  const since = daysSince(thread.lastMessage);
  const s = STATUS[thread.status];
  const deliverables = thread.deliverables || [];
  const subThreads = thread.subThreads || [];
  const doneCount = deliverables.filter((d) => d.done).length;
  const nextStep = deliverables.find((d) => !d.done);
  const hasDeliverables = deliverables.length > 0;

  const websiteUrl = thread.domain ? `https://www.${thread.domain}` : null;
  const gmailUrl = getGmailUrl(thread.id, gmailEmail);

  const save = (field, value) => onFieldChange(thread.id, { [field]: value });
  const saveContact = (field, value) => onFieldChange(thread.id, { contact: { ...thread.contact, [field]: value } });

  return (
    <div className="brand-card" ref={cardRef}>
      <div className="brand-card-main">
        <BrandLogo domain={thread.domain} logo={thread.logo} logoColor={thread.logoColor} />

        <div className="brand-info">
          <div className="brand-top-row">
            <div className="brand-name-group">
              <EditableText
                value={thread.brand}
                onSave={(v) => save("brand", v)}
                className="brand-name"
                placeholder="Brand name"
              />
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
            <EditableText
              value={thread.contact?.name}
              onSave={(v) => saveContact("name", v)}
              placeholder="Contact name"
            />
            {thread.contact?.name && <span className="contact-sep">·</span>}
            <EditableText
              value={thread.contact?.email}
              onSave={(v) => saveContact("email", v)}
              className="contact-email"
              placeholder="email@example.com"
              type="email"
            />
          </div>

          <div className="brand-offer">
            <EditableText
              value={thread.offer}
              onSave={(v) => save("offer", v)}
              placeholder="Describe the deal..."
            />
          </div>

          <div className="brand-notes-row">
            <EditableText
              value={thread.notes}
              onSave={(v) => save("notes", v)}
              className="brand-notes-text"
              placeholder="Add notes..."
              multiline
            />
          </div>

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
              <span className="next-step-label">Tasks</span>
              <span className="next-step-text">All done ✓</span>
              <span className="deliverable-progress">{doneCount}/{deliverables.length}</span>
            </div>
          )}

          <div className="brand-meta-row">
            <div className="brand-rates">
              {thread.theirRate === "product" ? (
                <span className="rate-chip rate-product editable-hover" onClick={(e) => { e.stopPropagation(); save("theirRate", null); }} title="Click to clear">Product only</span>
              ) : (
                <EditableRate
                  value={thread.theirRate}
                  onSave={(v) => save("theirRate", v)}
                  label="Their rate"
                  className="rate-chip rate-their"
                />
              )}
              <EditableRate
                value={thread.yourRate}
                onSave={(v) => save("yourRate", v)}
                label="Your rate"
                className="rate-chip rate-yours"
              />
              {thread.status === "deal_closed" && (
                <EditableRate
                  value={thread.revenue}
                  onSave={(v) => save("revenue", v)}
                  label="Closed"
                  className="rate-chip rate-closed"
                />
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
                  {expanded ? "▲ Hide" : `▾ ${hasDeliverables ? `Tasks (${deliverables.length})` : subThreads.length > 0 ? `${subThreads.length + 1} threads` : "Tasks"}`}
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
          {subThreads.length > 0 && (
            <div className="sub-threads-section">
              <div className="deliverables-title">Other threads</div>
              {[{ id: thread.id, offer: thread.offer, lastMessage: thread.lastMessage, contact: thread.contact }, ...subThreads].map((st) => (
                <div key={st.id} className="sub-thread-row">
                  <span className="sub-thread-subject">{st.offer || "(no subject)"}</span>
                  <span className="sub-thread-date">{fmtDate(st.lastMessage)}</span>
                  <a
                    href={getGmailUrl(st.id, gmailEmail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sub-thread-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
