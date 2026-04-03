import React from "react";
import { daysUntil, detectConflicts, formatCurrency } from "../utils";
import ConflictAlert from "../components/ConflictAlert";

function todayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatFullDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Returns an array of 7 Date objects starting from today
function getWeekDays() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(dateStr, d) {
  const a = new Date(dateStr);
  return (
    a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
  );
}

function dayLabel(d, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function daySubLabel(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayGroupLabel(d, index) {
  if (index === 0) return `Today · ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
  if (index === 1) return `Tomorrow · ${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function TodayTab({ deals, opportunities, financials }) {
  const conflicts = detectConflicts(deals);
  const weekDays = getWeekDays();

  // Collect all undone deliverables from active deals
  const allDeliverables = [];
  deals
    .filter((d) => d.stage !== "paid")
    .forEach((deal) => {
      deal.deliverables.forEach((del) => {
        if (!del.done) {
          allDeliverables.push({
            ...del,
            dealBrand: deal.brand,
            dealLogoColor: deal.logoColor,
            dealLogo: deal.logo,
            days: daysUntil(del.dueDate),
          });
        }
      });
    });

  // Overdue = due before today
  const overdue = allDeliverables.filter((d) => d.days < 0).sort((a, b) => a.days - b.days);

  // This week = due within the 7-day window
  const thisWeek = allDeliverables.filter((d) => d.days >= 0 && d.days <= 6);

  // Items per day slot for the week strip dots
  const itemsPerDay = weekDays.map((day) =>
    thisWeek.filter((d) => isSameDay(d.dueDate, day))
  );

  // Inbound needing reply
  const needsReply = opportunities.filter((o) => !o.snoozed && o.status === "new").slice(0, 3);

  const netProfit = financials.totalEarned - financials.totalExpenses;
  const goalPct = Math.min(Math.round((financials.totalEarned / financials.annualGoal) * 100), 100);

  const totalDue = overdue.length + thisWeek.length;

  return (
    <div className="tab-page today-page">

      {/* Greeting */}
      <div className="today-greeting">
        <h1 className="today-greeting-text">{todayGreeting()}, Derek.</h1>
        <span className="today-date">{formatFullDate(new Date())}</span>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

      {/* Week calendar block */}
      <div className="week-block">
        <div className="week-block-header">
          <div className="week-block-title-row">
            <span className="today-section-title">This Week</span>
            {totalDue > 0 ? (
              <span className={`week-count-badge ${overdue.length > 0 ? "has-overdue" : ""}`}>
                {totalDue} item{totalDue !== 1 ? "s" : ""}{overdue.length > 0 ? ` · ${overdue.length} overdue` : ""}
              </span>
            ) : (
              <span className="today-section-empty">You're clear ✓</span>
            )}
          </div>

          {/* 7-day strip */}
          <div className="week-strip">
            {weekDays.map((day, i) => {
              const items = itemsPerDay[i];
              return (
                <div key={i} className={`week-day ${i === 0 ? "is-today" : ""} ${items.length > 0 ? "has-items" : ""}`}>
                  <span className="week-day-name">{dayLabel(day, i)}</span>
                  <span className="week-day-date">{daySubLabel(day)}</span>
                  <div className="week-day-dots">
                    {items.slice(0, 3).map((item, j) => (
                      <span
                        key={j}
                        className="week-dot"
                        style={{ background: item.dealLogoColor }}
                        title={`${item.type} — ${item.dealBrand}`}
                      />
                    ))}
                    {items.length === 0 && <span className="week-dot-empty" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue section */}
        {overdue.length > 0 && (
          <div className="day-group">
            <div className="day-group-header overdue-header">
              <span className="day-group-label">⚠ Overdue</span>
            </div>
            {overdue.map((item, i) => (
              <DeliverableRow key={i} item={item} />
            ))}
          </div>
        )}

        {/* Per-day groups */}
        {weekDays.map((day, i) => {
          const items = itemsPerDay[i];
          if (items.length === 0) return null;
          return (
            <div key={i} className="day-group">
              <div className={`day-group-header ${i === 0 ? "today-header" : ""}`}>
                <span className="day-group-label">{dayGroupLabel(day, i)}</span>
                <span className="day-group-count">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              {items.map((item, j) => (
                <DeliverableRow key={j} item={item} />
              ))}
            </div>
          );
        })}

        {totalDue === 0 && (
          <div className="week-empty">
            <span>🎉</span>
            <span>No deliverables due this week. Enjoy the breathing room.</span>
          </div>
        )}
      </div>

      {/* Inbound needing reply */}
      {needsReply.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <span className="today-section-title">Needs Your Reply</span>
            <span className="section-count needs-action">{needsReply.length}</span>
          </div>
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
        </div>
      )}
    </div>
  );
}

function DeliverableRow({ item }) {
  const isOverdue = item.days < 0;
  const isToday = item.days === 0;

  return (
    <div className={`cal-del-row ${isOverdue ? "cal-overdue" : ""} ${isToday ? "cal-today" : ""}`}>
      <div className="cal-del-logo" style={{ background: item.dealLogoColor }}>
        {item.dealLogo}
      </div>
      <div className="cal-del-info">
        <span className="cal-del-type">{item.type}</span>
        <span className="cal-del-brand">{item.dealBrand}</span>
      </div>
      <span className={`cal-chip ${isOverdue ? "chip-overdue" : isToday ? "chip-today" : item.days <= 2 ? "chip-soon" : "chip-week"}`}>
        {isOverdue
          ? `${Math.abs(item.days)}d overdue`
          : isToday
          ? "Due today"
          : item.days === 1
          ? "Tomorrow"
          : `${item.days}d`}
      </span>
    </div>
  );
}
