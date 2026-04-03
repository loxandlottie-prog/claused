import React, { useState } from "react";
import BrandLogo from "../components/BrandLogo";

const SOURCE_CONFIG = {
  Gmail:          { icon: "✉", cls: "source-gmail", label: "Gmail" },
  "Instagram DM": { icon: "◈", cls: "source-ig",   label: "Instagram" },
  "TikTok DM":    { icon: "♪", cls: "source-tt",   label: "TikTok" },
};

const TYPE_LABELS = {
  proposal:     { label: "Proposal",     cls: "type-proposal" },
  product_offer:{ label: "Wants to send product", cls: "type-product" },
  product_sent: { label: "Product en route",       cls: "type-product-sent" },
};

function GmailBanner({ connected }) {
  if (connected) return null;
  return (
    <div className="gmail-banner">
      <div className="gmail-banner-left">
        <span className="gmail-icon">✉</span>
        <div>
          <p className="gmail-banner-title">Connect Gmail to auto-scan your inbox</p>
          <p className="gmail-banner-desc">
            Claused will surface unanswered brand emails, product shipment confirmations, and proposal threads — so nothing slips through.
          </p>
        </div>
      </div>
      <button className="gmail-connect-btn">Connect Gmail</button>
    </div>
  );
}

function OpportunityCard({ item, onAction }) {
  const source = SOURCE_CONFIG[item.source] || { icon: "?", cls: "", label: item.source };
  const typeInfo = TYPE_LABELS[item.type] || null;

  return (
    <div className={`opp-card ${item.snoozed ? "snoozed" : ""} ${item.gmailSimulated ? "gmail-sourced" : ""}`}>
      {item.gmailSimulated && (
        <div className="gmail-sim-tag">✉ Gmail</div>
      )}
      <div className="opp-card-top">
        <div className="opp-brand-row">
          <BrandLogo logo={item.logo} logoColor={item.logoColor} domain={item.domain} size={36} />
          <div>
            <span className="opp-brand">{item.brand}</span>
            <div className="opp-badges">
              <span className={`source-badge ${source.cls}`}>{source.icon} {source.label}</span>
              {typeInfo && <span className={`type-badge ${typeInfo.cls}`}>{typeInfo.label}</span>}
            </div>
          </div>
        </div>
        <div className="opp-meta">
          <span className="inbound-date">{item.date}</span>
          {item.estimatedValue && (
            <span className="inbound-est-value">${item.estimatedValue}</span>
          )}
        </div>
      </div>

      <p className="opp-action-needed">{item.actionNeeded}</p>
      <p className="inbound-preview">{item.preview}</p>

      {item.lastContacted && (
        <div className="last-contacted">
          <span className="last-contacted-icon">💬</span>
          <span>Last from <strong>{item.lastContacted.name}</strong> · {item.lastContacted.date}</span>
        </div>
      )}

      {item.snoozed ? (
        <div className="inbound-snoozed-label">⏰ Followed up later</div>
      ) : item.status === "interested" ? (
        <div className="opp-interested-state">
          <span className="opp-interested-badge">★ Interested</span>
          <span className="opp-interested-hint">Move to Deals when you're ready to negotiate</span>
        </div>
      ) : (
        <div className="inbound-actions">
          <button className="inbound-btn btn-interested" onClick={() => onAction(item.id, "interested")}>
            Interested
          </button>
          <button className="inbound-btn btn-followup" onClick={() => onAction(item.id, "followup")}>
            Follow Up Later
          </button>
          <button className="inbound-btn btn-pass" onClick={() => onAction(item.id, "pass")}>
            Pass
          </button>
        </div>
      )}
    </div>
  );
}

const FILTER_SOURCES = ["All", "Gmail", "Instagram DM", "TikTok DM"];
const FILTER_TYPES = ["All", "Proposal", "Product"];

export default function OpportunitiesTab({ opportunities, onAction }) {
  const [sourceFilter, setSourceFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = opportunities.filter((o) => {
    if (sourceFilter !== "All" && o.source !== sourceFilter) return false;
    if (typeFilter === "Proposal" && o.type !== "proposal") return false;
    if (typeFilter === "Product" && !o.type.startsWith("product")) return false;
    return true;
  });

  const active = filtered.filter((o) => !o.snoozed && o.status !== "passed");
  const snoozed = filtered.filter((o) => o.snoozed);
  const needsReply = active.filter((o) => o.status === "new").length;

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Opportunities</h1>
        {needsReply > 0 && (
          <span className="section-count needs-action">{needsReply} need a reply</span>
        )}
      </div>

      <GmailBanner connected={false} />

      <div className="opp-filters">
        <div className="filter-group">
          <span className="filter-group-label">Source</span>
          {FILTER_SOURCES.map((f) => (
            <button
              key={f}
              className={`filter-pill ${sourceFilter === f ? "active" : ""}`}
              onClick={() => setSourceFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-group-label">Type</span>
          {FILTER_TYPES.map((f) => (
            <button
              key={f}
              className={`filter-pill ${typeFilter === f ? "active" : ""}`}
              onClick={() => setTypeFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="opp-list">
        {active.length === 0 ? (
          <div className="empty-state">No opportunities match these filters.</div>
        ) : (
          active.map((item) => (
            <OpportunityCard key={item.id} item={item} onAction={onAction} />
          ))
        )}
        {snoozed.length > 0 && (
          <>
            <div className="section-divider"><span>Snoozed</span></div>
            {snoozed.map((item) => (
              <OpportunityCard key={item.id} item={item} onAction={onAction} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
