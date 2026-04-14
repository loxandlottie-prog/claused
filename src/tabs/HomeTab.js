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

const STATUS_TIPS = [
  { label: "New",         tip: "Inbound opportunity — you haven't meaningfully engaged yet."          },
  { label: "Negotiating", tip: "Active back-and-forth on rates, deliverables, or terms."              },
  { label: "Confirmed",   tip: "Deal agreed. Scope, rate, and terms are locked in."                   },
  { label: "Completed",   tip: "Deliverables done, but payment may still be outstanding."             },
  { label: "Paid",        tip: "Payment received. The deal is fully finished."                        },
  { label: "Declined",    tip: "Deal is dead — you passed, they passed, or it fell through."          },
];

// Lower score = shown first.
function priorityScore(t) {
  const days  = daysSince(t.lastMessage);
  const value = typeof t.yourRate === "number" && t.yourRate > 0 ? t.yourRate : 0;
  const valueBoost   = Math.min(500, value / 10);
  const stalePenalty = days > 21 ? Math.min(300, (days - 21) * 4) : 0;

  switch (t.status) {
    case "new":         return 500  + stalePenalty;
    case "negotiating": return 1000 - valueBoost + stalePenalty;
    case "confirmed":   return 2000 - valueBoost;
    case "completed":   return 9000;
    case "paid":        return 9500;
    case "declined":    return 9800;
    default:            return 5000 + stalePenalty;
  }
}

function StatusLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="status-legend-wrap">
      <button
        className="status-legend-btn"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="Status definitions"
      >
        ⓘ
      </button>
      {open && (
        <div className="status-legend-tooltip">
          {STATUS_TIPS.map((s) => (
            <div key={s.label} className="status-tip-row">
              <span className="status-tip-label">{s.label}</span>
              <span className="status-tip-text">{s.tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

  const newCount         = dateFiltered.filter((t) => t.status === "new").length;
  const negotiatingCount = dateFiltered.filter((t) => t.status === "negotiating").length;
  const confirmedCount   = dateFiltered.filter((t) => t.status === "confirmed").length;
  const completedCount   = dateFiltered.filter((t) => t.status === "completed").length;
  const paidCount        = dateFiltered.filter((t) => t.status === "paid").length;
  const declinedCount    = dateFiltered.filter((t) => t.status === "declined").length;

  const filtered = dateFiltered.filter((t) =>
    filter === "all" ? true : t.status === filter
  );
  const sorted = [...filtered].sort((a, b) => priorityScore(a) - priorityScore(b));

  const newDeals         = sorted.filter((t) => t.status === "new");
  const negotiatingDeals = sorted.filter((t) => t.status === "negotiating");
  const confirmedDeals   = sorted.filter((t) => t.status === "confirmed");
  const completedDeals   = sorted.filter((t) => t.status === "completed");
  const paidDeals        = sorted.filter((t) => t.status === "paid");
  const declinedDeals    = sorted.filter((t) => t.status === "declined");

  const cardProps = { onStatusChange, onFieldChange, onDeliverableToggle, onDeliverableAdd, onNotADeal, gmailEmail };

  // Confirmed and Declined are not primary filter cards per spec
  const STAT_FILTERS = [
    { key: "new",         label: "New",         count: newCount,            highlight: newCount > 0        },
    { key: "negotiating", label: "Negotiating",  count: negotiatingCount,   highlight: false               },
    { key: "confirmed",   label: "Confirmed",    count: confirmedCount,     highlight: confirmedCount > 0  },
    { key: "completed",   label: "Completed",    count: completedCount,     highlight: false               },
    { key: "paid",        label: "Paid",         count: paidCount,          highlight: true                },
    { key: "declined",    label: "Declined",     count: declinedCount,      highlight: false               },
    { key: "all",         label: "Total",        count: dateFiltered.length, highlight: false              },
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

      <div className="stat-grid-row">
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
        <StatusLegend />
      </div>

      <div className="thread-list-bar">
        <select
          className="date-select-inline"
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
            {newDeals.length > 0 && (
              <>
                <div className="section-header section-header-new">
                  New <span className="section-count">{newDeals.length}</span>
                </div>
                {newDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
            {negotiatingDeals.length > 0 && (
              <>
                <div className="section-header section-header-negotiating">
                  Negotiating <span className="section-count">{negotiatingDeals.length}</span>
                </div>
                {negotiatingDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
            {confirmedDeals.length > 0 && (
              <>
                <div className="section-header section-header-confirmed">
                  Confirmed <span className="section-count">{confirmedDeals.length}</span>
                </div>
                {confirmedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
            {completedDeals.length > 0 && (
              <>
                <div className="section-header section-header-muted">
                  Completed <span className="section-count">{completedDeals.length}</span>
                </div>
                {completedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
            {paidDeals.length > 0 && (
              <>
                <div className="section-header section-header-paid">
                  Paid <span className="section-count">{paidDeals.length}</span>
                </div>
                {paidDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
            {declinedDeals.length > 0 && (
              <>
                <div className="section-header section-header-muted">
                  Declined <span className="section-count">{declinedDeals.length}</span>
                </div>
                {declinedDeals.map((t) => <BrandCard key={t.id} thread={t} {...cardProps} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
