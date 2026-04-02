import React from "react";

const SOURCE_CONFIG = {
  Gmail: { icon: "✉", cls: "source-gmail", label: "Gmail" },
  "Instagram DM": { icon: "◈", cls: "source-ig", label: "Instagram DM" },
  "TikTok DM": { icon: "♪", cls: "source-tt", label: "TikTok DM" },
};

function InboundCard({ item, onAction }) {
  const source = SOURCE_CONFIG[item.source] || { icon: "?", cls: "", label: item.source };

  return (
    <div className={`inbound-card ${item.snoozed ? "snoozed" : ""}`}>
      <div className="inbound-top">
        <div className="inbound-brand-row">
          <span className="inbound-brand">{item.brand}</span>
          <span className={`source-badge ${source.cls}`}>
            {source.icon} {source.label}
          </span>
        </div>
        <div className="inbound-meta">
          <span className="inbound-date">{item.date}</span>
          {item.estimatedValue && (
            <span className="inbound-est-value">${item.estimatedValue} est.</span>
          )}
        </div>
      </div>

      <p className="inbound-subject">{item.subject}</p>
      <p className="inbound-preview">{item.preview}</p>

      {item.lastContacted && (
        <div className="last-contacted">
          <span className="last-contacted-icon">💬</span>
          <span>Last message from <strong>{item.lastContacted.name}</strong> on {item.lastContacted.date}</span>
        </div>
      )}

      {item.snoozed ? (
        <div className="inbound-snoozed-label">⏰ Followed up later</div>
      ) : (
        <div className="inbound-actions">
          <button
            className="inbound-btn btn-interested"
            onClick={() => onAction(item.id, "interested")}
          >
            Interested
          </button>
          <button
            className="inbound-btn btn-followup"
            onClick={() => onAction(item.id, "followup")}
          >
            Follow Up Later
          </button>
          <button
            className="inbound-btn btn-pass"
            onClick={() => onAction(item.id, "pass")}
          >
            Pass
          </button>
        </div>
      )}
    </div>
  );
}

export default function InboundSection({ inbound, onAction }) {
  const active = inbound.filter((i) => !i.snoozed);
  const snoozed = inbound.filter((i) => i.snoozed);

  return (
    <div className="section">
      <div className="section-header">
        <h2 className="section-title">Inbound Outreach</h2>
        {active.length > 0 && (
          <span className="section-count needs-action">{active.length} needs response</span>
        )}
      </div>

      {inbound.length === 0 ? (
        <div className="empty-state">No inbound messages right now.</div>
      ) : (
        <div className="inbound-list">
          {active.map((item) => (
            <InboundCard key={item.id} item={item} onAction={onAction} />
          ))}
          {snoozed.map((item) => (
            <InboundCard key={item.id} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </div>
  );
}
