import React, { useState } from "react";
import { daysSince, formatCurrency, fmtDate } from "../utils";

const STATUS = {
  reply_needed:    { label: "Reply needed",    cls: "status-red"    },
  waiting_on_them: { label: "Waiting on them", cls: "status-yellow" },
  you_replied:     { label: "You replied",     cls: "status-blue"   },
  deal_closed:     { label: "Deal closed",     cls: "status-green"  },
};

const NEXT_STATUS = {
  reply_needed:    "you_replied",
  you_replied:     "waiting_on_them",
  waiting_on_them: "deal_closed",
  deal_closed:     null,
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
        <img
          src={sources[srcIdx]}
          alt=""
          onError={() => setSrcIdx((i) => i + 1)}
        />
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
  const account = gmailEmail || "0";
  if (thread.source === "gmail" && thread.id) {
    return `https://mail.google.com/mail/u/${account}/#all/${thread.id}`;
  }
  if (thread.contact?.email) {
    return `https://mail.google.com/mail/u/${account}/#search/from%3A${encodeURIComponent(thread.contact.email)}`;
  }
  return `https://mail.google.com/mail/u/${account}/#search/${encodeURIComponent(thread.brand)}`;
}

export default function BrandCard({ thread, onStatusChange, gmailEmail }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const since = daysSince(thread.lastMessage);
  const followUp = since >= 14 && thread.status !== "deal_closed";
  const s = STATUS[thread.status];

  const websiteUrl = thread.domain ? `https://www.${thread.domain}` : null;
  const gmailUrl = getGmailUrl(thread, gmailEmail);

  return (
    <div className={`brand-card ${followUp ? "brand-card-followup" : ""}`}>
      {followUp && (
        <div className="followup-flag">⏰ Follow up — silent for {since}d</div>
      )}

      <div className="brand-card-main">
        <BrandLogo domain={thread.domain} logo={thread.logo} logoColor={thread.logoColor} />

        <div className="brand-info">
          <div className="brand-top-row">
            <div className="brand-name-group">
              <span className="brand-name">{thread.brand}</span>
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brand-website-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {thread.domain} ↗
                </a>
              )}
            </div>
            <div className="brand-top-right">
              <div className="status-picker" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`status-badge ${s.cls} status-badge-btn`}
                  onClick={() => setShowStatusMenu((v) => !v)}
                  title="Change status"
                >
                  {s.label} ▾
                </button>
                {showStatusMenu && (
                  <div className="status-menu">
                    {Object.entries(STATUS).map(([key, val]) => (
                      <button
                        key={key}
                        className={`status-menu-item ${key === thread.status ? "status-menu-active" : ""}`}
                        onClick={() => {
                          onStatusChange(thread.id, key);
                          setShowStatusMenu(false);
                        }}
                      >
                        <span className={`status-menu-dot ${val.cls}`} />
                        {val.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gmail-open-btn"
                title="Open in Gmail"
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="currentColor"/>
                </svg>
                Open in Gmail
              </a>
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
            <div className="brand-dates">
              <span className="date-chip">Reached out {fmtDate(thread.firstReached)}</span>
              <span className="date-sep">·</span>
              <span className={`date-chip ${since >= 14 && thread.status !== "deal_closed" ? "date-stale" : ""}`}>
                Last message {since === 0 ? "today" : since === 1 ? "yesterday" : `${since}d ago`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
