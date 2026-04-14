import React, { useState } from "react";
import BrandCard from "../components/BrandCard";
import GoalBar from "../components/GoalBar";
import { daysSince } from "../utils";

const DATE_OPTIONS = [
  { key: "all", label: "All time", days: null },
  { key: "30d", label: "30 days",  days: 30   },
  { key: "90d", label: "90 days",  days: 90   },
  { key: "6mo", label: "6 months", days: 180  },
  { key: "1y",  label: "1 year",   days: 365  },
];

// Lower score = shown first.
function priorityScore(t) {
  const days = daysSince(t.lastMessage);
  const value =
    (typeof t.yourRate === "number" && t.yourRate > 0 ? t.yourRate : 0);
  const valueBoost = Math.min(500, value / 10);
  const stalePenalty = days > 21 ? Math.min(300, (days - 21) * 4) : 0;

  switch (t.status) {
    case "pending":  return 500  + stalePenalty;
    case "active":   return 1000 - valueBoost + stalePenalty;
    case "closed":   return 9000;
    case "rejected": return 9500;
    default:         return 5000 + stalePenalty;
  }
}

export default function HomeTab({ threads, onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, onNotADeal, gmailEmail }) {
  const [filter, setFilter]       = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const dateOption = DATE_OPTIONS.find((o) => o.key === dateRange);
  const cutoff = dateOption?.days
    ? new Date(Date.now() - dateOption.days * 86400 * 1000).toISOString().slice(0, 10)
    : null;

  const dateFiltered = cutoff
    ? threads.filter((t) => (t.firstReached || "") >= cutoff)
    : threads;

  const pendingCount  = dateFiltered.filter((t) => t.status === "pending").length;
  const activeCount   = dateFiltered.filter((t) => t.status === "active").length;
  const closedCount   = dateFiltered.filter((t) => t.status === "closed").length;
  const rejectedCount = dateFiltered.filter((t) => t.status === "rejected").length;

  const filtered = dateFiltered.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const sorted = [...filtered].sort((a, b) => priorityScore(a) - priorityScore(b));

  const pendingDeals  = sorted.filter((t) => t.status === "pending");
  const activeDeals   = sorted.filter((t) => t.status === "active");
  const closedDeals   = sorted.filter((t) => t.status === "closed");
  const rejectedDeals = sorted.filter((t) => t.status === "rejected");

  const cardProps = { onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, onNotADeal, gmailEmail };

  const STAT_FILTERS = [
    { key: "all",      label: "Total",    count: dateFiltered.length, highlight: false },
    { key: "pending",  label: "Pending",  count: pendingCount,        highlight: pendingCount > 0 },
    { key: "active",   label: "Active",   count: activeCount,         highlight: false },
    { key: "closed",   label: "Closed",   count: closedCount,         highlight: true  },
    { key: "rejected", label: "Rejected", count: rejectedCount,       highlight: false },
  ];

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
      <GoalBar threads={threads} />

      <div className="stats-row">
        <div className="stat-grid">
          {STAT_FILTERS.map((s) => (
            <button
              key={s.key}
              className={`stat-card stat-card-btn ${filter === s.key ? "stat-card-active" : ""}`}
              onClick={() => setFilter(s.key)}
            >
              <span className="stat-label">{s.label}</span>
              <span className={`stat-value ${s.highlight && s.count > 0 ? "stat-value-highlight" : ""}`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>

        <select
          className="date-select"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="thread-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No brands match this filter.</div>
        ) : filter !== "all" ? (
          sorted.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)
        ) : (
          <>
            {pendingDeals.length > 0 && (
              <>
                <div className="section-header section-header-pending">
                  Pending <span className="section-count">{pendingDeals.length}</span>
                </div>
                {pendingDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}

            {activeDeals.length > 0 && (
              <>
                <div className="section-header">
                  Active <span className="section-count">{activeDeals.length}</span>
                </div>
                {activeDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
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
