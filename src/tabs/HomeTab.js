import React, { useState } from "react";
import BrandCard from "../components/BrandCard";
import { daysSince } from "../utils";

// Lower score = shown first. Active top, then closed/rejected.
function priorityScore(t) {
  const days = daysSince(t.lastMessage);
  const value =
    (typeof t.revenue === "number" && t.revenue > 0 ? t.revenue : 0) ||
    (typeof t.yourRate === "number" && t.yourRate > 0 ? t.yourRate : 0) ||
    (typeof t.theirRate === "number" && t.theirRate > 0 ? t.theirRate : 0);
  const valueBoost = Math.min(500, value / 10);
  const stalePenalty = days > 21 ? Math.min(300, (days - 21) * 4) : 0;

  switch (t.status) {
    case "active":   return 1000 - valueBoost + stalePenalty;
    case "closed":   return 9000;
    case "rejected": return 9500;
    default:         return 5000 + stalePenalty;
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

  const activeCount   = yearFiltered.filter((t) => t.status === "active").length;
  const closedCount   = yearFiltered.filter((t) => t.status === "closed").length;
  const rejectedCount = yearFiltered.filter((t) => t.status === "rejected").length;

  const filtered = yearFiltered.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const sorted = [...filtered].sort((a, b) => priorityScore(a) - priorityScore(b));

  // Section groups for "all" view
  const activeDeals   = sorted.filter((t) => t.status === "active");
  const closedDeals   = sorted.filter((t) => t.status === "closed");
  const rejectedDeals = sorted.filter((t) => t.status === "rejected");

  const cardProps = { onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, gmailEmail };

  const STAT_FILTERS = [
    { key: "all",      label: "Total brands", count: yearFiltered.length, highlight: false },
    { key: "active",   label: "Active",        count: activeCount,         highlight: false },
    { key: "closed",   label: "Closed",        count: closedCount,         highlight: true  },
    { key: "rejected", label: "Rejected",      count: rejectedCount,       highlight: false },
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
      <div className="stat-grid">
        {STAT_FILTERS.map((s) => (
          <button
            key={s.key}
            className={`stat-card stat-card-btn ${filter === s.key ? "stat-card-active" : ""}`}
            onClick={() => setFilter(s.key)}
          >
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.highlight && s.count > 0 ? "stat-value-green" : ""}`}>
              {s.count}
            </span>
          </button>
        ))}
      </div>

      {years.length > 1 && (
        <div className="filter-bar filter-bar-years">
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
      )}

      <div className="thread-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No brands match this filter.</div>
        ) : filter !== "all" ? (
          sorted.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)
        ) : (
          <>
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
