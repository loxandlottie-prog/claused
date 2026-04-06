import React, { useState } from "react";
import BrandCard from "../components/BrandCard";

const FILTERS = [
  { key: "all",             label: "All" },
  { key: "reply_needed",    label: "Action required" },
  { key: "waiting_on_them", label: "Waiting on them" },
  { key: "deal_closed",     label: "Closed" },
];

export default function HomeTab({ threads, onStatusChange }) {
  const [filter, setFilter] = useState("all");

  const replyCount   = threads.filter((t) => t.status === "reply_needed").length;
  const waitingCount = threads.filter((t) => t.status === "waiting_on_them" || t.status === "you_replied").length;
  const closedCount  = threads.filter((t) => t.status === "deal_closed").length;

  const visible = threads.filter((t) => {
    if (filter === "all") return true;
    if (filter === "waiting_on_them") return t.status === "waiting_on_them" || t.status === "you_replied";
    return t.status === filter;
  });

  return (
    <div className="home-page">
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total brands</span>
          <span className="stat-value">{threads.length}</span>
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
      </div>

      <div className="thread-list">
        {visible.length === 0 ? (
          <div className="empty-state">No brands in this category yet.</div>
        ) : (
          visible.map((t) => (
            <BrandCard key={t.id} thread={t} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}
