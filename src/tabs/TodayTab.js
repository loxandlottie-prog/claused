import React from "react";
import { daysUntil, detectConflicts, formatCurrency } from "../utils";
import ConflictAlert from "../components/ConflictAlert";

function todayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function urgencyLabel(days) {
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: "chip-overdue" };
  if (days === 0) return { label: "Due today", cls: "chip-today" };
  if (days <= 3) return { label: `Due in ${days}d`, cls: "chip-soon" };
  return { label: `Due ${days}d`, cls: "chip-week" };
}

export default function TodayTab({ deals, opportunities, financials }) {
  const conflicts = detectConflicts(deals);

  // Deliverables due within 7 days (not done)
  const urgentDeliverables = [];
  deals
    .filter((d) => d.stage !== "paid")
    .forEach((deal) => {
      deal.deliverables.forEach((del) => {
        const days = daysUntil(del.dueDate);
        if (!del.done && days <= 7) {
          urgentDeliverables.push({ ...del, dealBrand: deal.brand, dealLogoColor: deal.logoColor, dealLogo: deal.logo, days });
        }
      });
    });
  urgentDeliverables.sort((a, b) => a.days - b.days);

  // Top inbound needing response
  const needsReply = opportunities.filter((o) => !o.snoozed && o.status === "new").slice(0, 3);

  const netProfit = financials.totalEarned - financials.totalExpenses;
  const goalPct = Math.min(Math.round((financials.totalEarned / financials.annualGoal) * 100), 100);

  return (
    <div className="tab-page today-page">
      <div className="today-greeting">
        <h1 className="today-greeting-text">{todayGreeting()}, Derek.</h1>
        <span className="today-date">{formatDate(new Date())}</span>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="today-section-block">
          {conflicts.map((c) => (
            <ConflictAlert key={c.category} conflict={c} />
          ))}
        </div>
      )}

      {/* Financial snapshot */}
      <div className="today-stat-row">
        <div className="today-stat-chip">
          <span className="today-stat-label">Earned this year</span>
          <span className="today-stat-value earned">{formatCurrency(financials.totalEarned)}</span>
        </div>
        <div className="today-stat-chip">
          <span className="today-stat-label">Pending payment</span>
          <span className="today-stat-value pending">{formatCurrency(financials.pendingInvoices)}</span>
        </div>
        <div className="today-stat-chip">
          <span className="today-stat-label">Net profit</span>
          <span className={`today-stat-value ${netProfit >= 0 ? "profit" : "loss"}`}>
            {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
          </span>
        </div>
        <div className="today-stat-chip goal-chip">
          <span className="today-stat-label">Annual goal</span>
          <div className="today-goal-row">
            <span className="today-stat-value">{goalPct}%</span>
            <div className="today-goal-bar">
              <div className="today-goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Urgent deliverables */}
      <div className="today-section">
        <div className="today-section-header">
          <span className="today-section-title">Due This Week</span>
          {urgentDeliverables.length === 0 && (
            <span className="today-section-empty">Nothing due — you're clear ✓</span>
          )}
        </div>
        {urgentDeliverables.length > 0 && (
          <div className="today-deliverables">
            {urgentDeliverables.map((item, i) => {
              const u = urgencyLabel(item.days);
              return (
                <div key={i} className="today-del-row">
                  <div className="today-del-logo" style={{ background: item.dealLogoColor }}>
                    {item.dealLogo}
                  </div>
                  <div className="today-del-info">
                    <span className="today-del-type">{item.type}</span>
                    <span className="today-del-brand">{item.dealBrand}</span>
                  </div>
                  <span className={`today-chip ${u.cls}`}>{u.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inbound needing reply */}
      <div className="today-section">
        <div className="today-section-header">
          <span className="today-section-title">Needs Your Reply</span>
          {needsReply.length === 0 && (
            <span className="today-section-empty">Inbox clear</span>
          )}
        </div>
        {needsReply.length > 0 && (
          <div className="today-inbound">
            {needsReply.map((item) => (
              <div key={item.id} className="today-inbound-row">
                <div className="today-del-logo" style={{ background: item.logoColor }}>
                  {item.logo}
                </div>
                <div className="today-del-info">
                  <span className="today-del-type">{item.brand}</span>
                  <span className="today-del-brand">{item.actionNeeded || item.subject}</span>
                </div>
                <span className="today-source-badge">{item.source}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
