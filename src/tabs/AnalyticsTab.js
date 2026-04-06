import React from "react";
import { analyticsData } from "../data";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function StatCompare({ label, thisYear, lastYear, format }) {
  const fmt = format || ((n) => n);
  const up = thisYear >= lastYear;
  const diff = thisYear - lastYear;
  const pctChange = lastYear > 0 ? Math.round((diff / lastYear) * 100) : 100;

  return (
    <div className="compare-card">
      <span className="compare-label">{label}</span>
      <span className="compare-this">{fmt(thisYear)}</span>
      <div className="compare-meta">
        <span className="compare-last">vs {fmt(lastYear)} last year</span>
        <span className={`compare-delta ${up ? "delta-up" : "delta-down"}`}>
          {up ? "↑" : "↓"} {Math.abs(pctChange)}%
        </span>
      </div>
    </div>
  );
}

function BarChart({ data, lastYearData }) {
  const max = Math.max(...data.map((v) => v), ...lastYearData.map((v) => v), 1);
  const currentMonth = new Date().getMonth();

  return (
    <div className="bar-chart">
      {data.map((val, i) => {
        const lyVal = lastYearData[i];
        const isPast = i < currentMonth;
        const isCurrent = i === currentMonth;
        return (
          <div key={i} className="bar-col">
            <div className="bar-pair">
              {/* Last year bar (ghost) */}
              <div
                className="bar-fill bar-last-year"
                style={{ height: `${(lyVal / max) * 100}%` }}
                title={`${MONTHS[i]} 2025: ${lyVal}`}
              />
              {/* This year bar */}
              <div
                className={`bar-fill bar-this-year ${isCurrent ? "bar-current" : ""} ${!isPast && !isCurrent ? "bar-future" : ""}`}
                style={{ height: `${(val / max) * 100}%` }}
                title={`${MONTHS[i]} 2026: ${val}`}
              />
            </div>
            <span className="bar-month">{MONTHS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ stages }) {
  const max = stages[0].count;
  return (
    <div className="funnel">
      {stages.map((stage, i) => {
        const pct = Math.round((stage.count / max) * 100);
        const dropOff = i > 0
          ? Math.round((1 - stage.count / stages[i - 1].count) * 100)
          : null;
        return (
          <div key={i} className="funnel-row">
            {dropOff !== null && (
              <div className="funnel-dropoff">▼ {dropOff}% drop-off</div>
            )}
            <div className="funnel-bar-wrap" style={{ width: `${Math.max(pct, 12)}%` }}>
              <div className="funnel-bar">
                <span className="funnel-stage-label">{stage.label}</span>
                <span className="funnel-count">{stage.count}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryBar({ label, count, max }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="cat-row">
      <span className="cat-label">{label}</span>
      <div className="cat-bar-track">
        <div className="cat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="cat-count">{count}</span>
    </div>
  );
}

export default function AnalyticsTab() {
  const { thisYear, lastYear, funnel, categories } = analyticsData;
  const catMax = Math.max(...categories.map((c) => c.count));

  return (
    <div className="analytics-page">
      {/* Section 1 — Year over year */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h2 className="analytics-section-title">Overview</h2>
          <span className="analytics-section-sub">2026 YTD vs 2025 full year</span>
        </div>
        <div className="compare-grid">
          <StatCompare
            label="Brands reached out"
            thisYear={thisYear.totalBrands}
            lastYear={lastYear.totalBrands}
          />
          <StatCompare
            label="Deals closed"
            thisYear={thisYear.dealsClosedCount}
            lastYear={lastYear.dealsClosedCount}
          />
          <StatCompare
            label="Close rate"
            thisYear={thisYear.closeRate}
            lastYear={lastYear.closeRate}
            format={(n) => `${n}%`}
          />
          <StatCompare
            label="Revenue"
            thisYear={thisYear.revenue}
            lastYear={lastYear.revenue}
            format={(n) => "$" + n.toLocaleString()}
          />
        </div>
      </div>

      {/* Section 2 — Monthly outreach */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h2 className="analytics-section-title">Outreach by month</h2>
          <div className="chart-legend">
            <span className="legend-dot legend-this" />
            <span>2026</span>
            <span className="legend-dot legend-last" style={{ marginLeft: 12 }} />
            <span>2025</span>
          </div>
        </div>
        <BarChart data={thisYear.monthly} lastYearData={lastYear.monthly} />
      </div>

      {/* Section 3 — Funnel */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h2 className="analytics-section-title">Deal funnel</h2>
        </div>
        <Funnel stages={funnel} />
      </div>

      {/* Section 4 — Categories */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h2 className="analytics-section-title">Top categories</h2>
        </div>
        <div className="cat-list">
          {categories.map((c) => (
            <CategoryBar key={c.label} label={c.label} count={c.count} max={catMax} />
          ))}
        </div>
      </div>
    </div>
  );
}
