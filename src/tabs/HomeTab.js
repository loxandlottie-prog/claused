import React, { useState } from "react";
import BrandCard from "../components/BrandCard";
import { daysSince } from "../utils";

const FILTERS = [
  { key: "all",             label: "All" },
  { key: "in_progress",    label: "Active" },
  { key: "reply_needed",   label: "Action required" },
  { key: "waiting_on_them", label: "Waiting on them" },
  { key: "deal_closed",    label: "Closed" },
  { key: "deal_passed",    label: "Rejected" },
];

// Lower score = shown first.
// in_progress always tops, then reply_needed, then active, then stale.
function priorityScore(t) {
  const days = daysSince(t.lastMessage);

  const value =
    (typeof t.revenue === "number" && t.revenue > 0 ? t.revenue : 0) ||
    (typeof t.yourRate === "number" && t.yourRate > 0 ? t.yourRate : 0) ||
    (typeof t.theirRate === "number" && t.theirRate > 0 ? t.theirRate : 0);

  const valueBoost = Math.min(500, value / 10);
  const stalePenalty = days > 21 ? Math.min(300, (days - 21) * 4) : 0;

  switch (t.status) {
    case "in_progress":
      // Accepted deals always first, sorted by value
      return -1000 - valueBoost;

    case "reply_needed":
      return 0 + Math.max(0, days * 2);

    case "you_replied":
    case "waiting_on_them":
      return 1000 - valueBoost + stalePenalty;

    case "deal_closed":
      return 9000;

    case "deal_passed":
      return 9500;

    default:
      return 5000 + stalePenalty;
  }
}

export default function HomeTab({ threads, onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, gmailEmail }) {
  const [filter, setFilter] = useState("all");
  const [year, setYear] = useState("all");

  const years = [...new Set(threads.map((t) => t.firstReached.slice(0, 4)))]
    .sort((a, b) => b - a);

  const yearFiltered = year === "all"
    ? threads
    : threads.filter((t) => t.firstReached.startsWith(year));

  const activeCount  = yearFiltered.filter((t) => t.status === "in_progress").length;
  const replyCount   = yearFiltered.filter((t) => t.status === "reply_needed").length;
  const waitingCount = yearFiltered.filter((t) => t.status === "waiting_on_them" || t.status === "you_replied").length;
  const closedCount  = yearFiltered.filter((t) => t.status === "deal_closed").length;

  const filtered = yearFiltered.filter((t) => {
    if (filter === "all") return true;
    if (filter === "waiting_on_them") return t.status === "waiting_on_them" || t.status === "you_replied";
    return t.status === filter;
  });

  const sorted = [...filtered].sort((a, b) => priorityScore(a) - priorityScore(b));

  // Section groups for "all" view
  const STALE_DAYS = 21;
  const activeDeals    = sorted.filter((t) => t.status === "in_progress");
  const needsAttention = sorted.filter((t) => t.status === "reply_needed");
  const inPlay         = sorted.filter((t) => t.status !== "in_progress" && t.status !== "reply_needed" && t.status !== "deal_closed" && t.status !== "deal_passed" && daysSince(t.lastMessage) <= STALE_DAYS);
  const goneQuiet      = sorted.filter((t) => t.status !== "in_progress" && t.status !== "reply_needed" && t.status !== "deal_closed" && t.status !== "deal_passed" && daysSince(t.lastMessage) > STALE_DAYS);
  const closedDeals    = sorted.filter((t) => t.status === "deal_closed");
  const rejectedDeals  = sorted.filter((t) => t.status === "deal_passed");

  const cardProps = { onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, gmailEmail };

  if (threads.length === 0) {
    return (
      <div className="home-page">
        <div className="empty-hero">
          <div className="empty-hero-icon">📬</div>
          <h2 className="empty-hero-title">No brands yet</h2>
          <p className="empty-hero-desc">Paste a thread or connect Gmail to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total brands</span>
          <span className="stat-value">{yearFiltered.length}</span>
        </div>
        <div className={`stat-card ${replyCount > 0 ? "stat-card-alert" : ""}`}>
          <span className="stat-label">Awaiting your reply</span>
          <span className={`stat-value ${replyCount > 0 ? "stat-value-alert" : ""}`}>{replyCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Waiting on them</span>
          <span className="stat-value">{waitingCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active deals</span>
          <span className={`stat-value ${activeCount > 0 ? "stat-value-green" : ""}`}>{activeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Deals closed</span>
          <span className="stat-value stat-value-green">{closedCount}</span>
        </div>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? "filter-btn-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "reply_needed" && replyCount > 0 && (
              <span className="filter-count-badge">{replyCount}</span>
            )}
            {f.key === "in_progress" && activeCount > 0 && (
              <span className="filter-count-badge filter-count-green">{activeCount}</span>
            )}
          </button>
        ))}

        <div className="filter-bar-sep" />

        <button
          className={`filter-btn ${year === "all" ? "filter-btn-active" : ""}`}
          onClick={() => setYear("all")}
        >
          All years
        </button>
        {years.map((y) => (
          <button
            key={y}
            className={`filter-btn ${year === y ? "filter-btn-active" : ""}`}
            onClick={() => setYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="thread-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No brands match this filter.</div>
        ) : filter !== "all" ? (
          sorted.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)
        ) : (
          <>
            {activeDeals.length > 0 && (
              <>
                <div className="section-header section-header-active">
                  Active <span className="section-count section-count-active">{activeDeals.length}</span>
                </div>
                {activeDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {needsAttention.length > 0 && (
              <>
                <div className="section-header section-header-urgent">
                  Needs your reply <span className="section-count">{needsAttention.length}</span>
                </div>
                {needsAttention.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {inPlay.length > 0 && (
              <>
                <div className="section-header">
                  In play <span className="section-count">{inPlay.length}</span>
                </div>
                {inPlay.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {goneQuiet.length > 0 && (
              <>
                <div className="section-header section-header-muted">
                  Gone quiet <span className="section-count">{goneQuiet.length}</span>
                </div>
                {goneQuiet.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {closedDeals.length > 0 && (
              <>
                <div className="section-header section-header-muted">
                  Closed <span className="section-count">{closedDeals.length}</span>
                </div>
                {closedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {rejectedDeals.length > 0 && (
              <>
                <div className="section-header section-header-muted">
                  Rejected <span className="section-count">{rejectedDeals.length}</span>
                </div>
                {rejectedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
