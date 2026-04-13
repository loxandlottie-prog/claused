import React, { useState } from "react";
import BrandCard from "../components/BrandCard";
import { daysSince } from "../utils";

const FILTERS = [
  { key: "all",      label: "All"      },
  { key: "active",   label: "Active"   },
  { key: "accepted", label: "Accepted" },
  { key: "closed",   label: "Closed"   },
  { key: "rejected", label: "Rejected" },
];

// Lower score = shown first. Accepted deals top, then active, then closed/rejected.
function priorityScore(t) {
  const days = daysSince(t.lastMessage);
  const value =
    (typeof t.revenue === "number" && t.revenue > 0 ? t.revenue : 0) ||
    (typeof t.yourRate === "number" && t.yourRate > 0 ? t.yourRate : 0) ||
    (typeof t.theirRate === "number" && t.theirRate > 0 ? t.theirRate : 0);
  const valueBoost = Math.min(500, value / 10);
  const stalePenalty = days > 21 ? Math.min(300, (days - 21) * 4) : 0;

  switch (t.status) {
    case "accepted": return -1000 - valueBoost;
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
  const acceptedCount = yearFiltered.filter((t) => t.status === "accepted").length;
  const closedCount   = yearFiltered.filter((t) => t.status === "closed").length;

  const filtered = yearFiltered.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const sorted = [...filtered].sort((a, b) => priorityScore(a) - priorityScore(b));

  // Section groups for "all" view
  const acceptedDeals = sorted.filter((t) => t.status === "accepted");
  const activeDeals   = sorted.filter((t) => t.status === "active");
  const closedDeals   = sorted.filter((t) => t.status === "closed");
  const rejectedDeals = sorted.filter((t) => t.status === "rejected");

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
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <span className="stat-value">{activeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Accepted</span>
          <span className={`stat-value ${acceptedCount > 0 ? "stat-value-green" : ""}`}>{acceptedCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Closed</span>
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
            {f.key === "accepted" && acceptedCount > 0 && (
              <span className="filter-count-badge filter-count-green">{acceptedCount}</span>
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
            {acceptedDeals.length > 0 && (
              <>
                <div className="section-header section-header-active">
                  Accepted <span className="section-count section-count-active">{acceptedDeals.length}</span>
                </div>
                {acceptedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
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
