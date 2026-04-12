import React, { useState } from "react";
import BrandCard from "../components/BrandCard";

const FILTERS = [
  { key: "all",             label: "All" },
  { key: "reply_needed",    label: "Action required" },
  { key: "waiting_on_them", label: "Waiting on them" },
  { key: "deal_closed",     label: "Closed" },
];

export default function HomeTab({ threads, onStatusChange, onDeliverableToggle, onDeliverableAdd, gmailEmail }) {
  const [filter, setFilter] = useState("all");
  const [year, setYear] = useState("all");

  // Derive sorted unique years from thread dates
  const years = [...new Set(threads.map((t) => t.firstReached.slice(0, 4)))]
    .sort((a, b) => b - a);

  const yearFiltered = year === "all"
    ? threads
    : threads.filter((t) => t.firstReached.startsWith(year));

  const replyCount   = yearFiltered.filter((t) => t.status === "reply_needed").length;
  const waitingCount = yearFiltered.filter((t) => t.status === "waiting_on_them" || t.status === "you_replied").length;
  const closedCount  = yearFiltered.filter((t) => t.status === "deal_closed").length;

  const filtered = yearFiltered.filter((t) => {
    if (filter === "all") return true;
    if (filter === "waiting_on_them") return t.status === "waiting_on_them" || t.status === "you_replied";
    return t.status === filter;
  });

  // Open deals first, then closed, then passed at the very bottom
  const openDeals   = filtered.filter((t) => t.status !== "deal_closed" && t.status !== "deal_passed");
  const closedDeals = filtered.filter((t) => t.status === "deal_closed");
  const passedDeals = filtered.filter((t) => t.status === "deal_passed");

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
        ) : (
          <>
            {openDeals.map((t) => (
              <BrandCard key={t.id} thread={t} onStatusChange={onStatusChange}
                onDeliverableToggle={onDeliverableToggle} onDeliverableAdd={onDeliverableAdd} gmailEmail={gmailEmail} />
            ))}
            {closedDeals.length > 0 && (
              <>
                <div className="closed-divider"><span>Closed deals ({closedDeals.length})</span></div>
                {closedDeals.map((t) => (
                  <BrandCard key={t.id} thread={t} onStatusChange={onStatusChange}
                    onDeliverableToggle={onDeliverableToggle} onDeliverableAdd={onDeliverableAdd} gmailEmail={gmailEmail} />
                ))}
              </>
            )}
            {passedDeals.length > 0 && (
              <>
                <div className="closed-divider closed-divider-passed"><span>Passed ({passedDeals.length})</span></div>
                {passedDeals.map((t) => (
                  <BrandCard key={t.id} thread={t} onStatusChange={onStatusChange}
                    onDeliverableToggle={onDeliverableToggle} onDeliverableAdd={onDeliverableAdd} gmailEmail={gmailEmail} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
