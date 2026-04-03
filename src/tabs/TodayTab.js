import React, { useState } from "react";
import { daysUntil, detectConflicts } from "../utils";
import ConflictAlert from "../components/ConflictAlert";
import BrandLogo from "../components/BrandLogo";

function todayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatFullDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

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
  const a = new Date(dateStr + "T00:00:00");
  return (
    a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
  );
}

function dayShortLabel(d, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tmrw";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function daySubLabel(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeliverableRow({ item }) {
  const isOverdue = item.days < 0;
  const isToday = item.days === 0;
  const chipCls = isOverdue ? "chip-overdue" : isToday ? "chip-today" : item.days <= 2 ? "chip-soon" : "chip-week";
  const chipLabel = isOverdue
    ? `${Math.abs(item.days)}d overdue`
    : isToday ? "Due today"
    : item.days === 1 ? "Tomorrow"
    : `${item.days}d`;

  return (
    <div className={`cal-del-row ${isOverdue ? "cal-overdue" : ""}`}>
      <BrandLogo logo={item.dealLogo} logoColor={item.dealLogoColor} domain={item.dealLogoDomain} size={30} />
      <div className="cal-del-info">
        <span className="cal-del-type">{item.type}</span>
        <span className="cal-del-brand">{item.dealBrand}</span>
      </div>
      <span className={`cal-chip ${chipCls}`}>{chipLabel}</span>
    </div>
  );
}

export default function TodayTab({ deals, opportunities }) {
  const [selectedDay, setSelectedDay] = useState(0);

  const conflicts = detectConflicts(deals);
  const weekDays = getWeekDays();

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
            dealLogoDomain: deal.domain,
            days: daysUntil(del.dueDate),
          });
        }
      });
    });

  // Overdue items (shown under "Today" slot)
  const overdue = allDeliverables.filter((d) => d.days < 0);

  // Items per day slot
  const itemsPerDay = weekDays.map((day) =>
    allDeliverables.filter((d) => d.days >= 0 && isSameDay(d.dueDate, day))
  );

  // What to show in the expanded panel
  const selectedItems = itemsPerDay[selectedDay];
  const selectedOverdue = selectedDay === 0 ? overdue : [];
  const panelItems = [...selectedOverdue, ...selectedItems];

  const totalThisWeek = allDeliverables.filter((d) => d.days >= 0 && d.days <= 6).length;
  const overdueCount = overdue.length;

  const needsReply = opportunities.filter((o) => !o.snoozed && o.status === "new").slice(0, 3);

  return (
    <div className="tab-page today-page">

      <div className="today-greeting">
        <h1 className="today-greeting-text">{todayGreeting()}, Derek.</h1>
        <span className="today-date">{formatFullDate(new Date())}</span>
      </div>

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conflicts.map((c) => <ConflictAlert key={c.category} conflict={c} />)}
        </div>
      )}

      {/* Interactive week calendar */}
      <div className="week-block">
        <div className="week-block-title-row">
          <span className="today-section-title">This Week</span>
          {overdueCount > 0 && (
            <span className="week-count-badge has-overdue">{overdueCount} overdue</span>
          )}
          {totalThisWeek > 0 && (
            <span className="week-count-badge">{totalThisWeek} due this week</span>
          )}
          {overdueCount === 0 && totalThisWeek === 0 && (
            <span className="today-section-empty">You're clear ✓</span>
          )}
        </div>

        <div className="week-strip">
          {weekDays.map((day, i) => {
            const items = itemsPerDay[i];
            const hasOverdueHere = i === 0 && overdueCount > 0;
            const count = items.length + (hasOverdueHere ? overdueCount : 0);
            const isSelected = selectedDay === i;

            return (
              <button
                key={i}
                className={`week-day ${i === 0 ? "is-today" : ""} ${count > 0 ? "has-items" : ""} ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedDay(i)}
              >
                <span className="week-day-name">{dayShortLabel(day, i)}</span>
                <span className="week-day-date">{daySubLabel(day)}</span>
                <div className="week-day-dots">
                  {count > 0
                    ? items.slice(0, 3).map((item, j) => (
                        <span key={j} className="week-dot" style={{ background: item.dealLogoColor }} />
                      ))
                    : <span className="week-dot-empty" />
                  }
                  {hasOverdueHere && items.length === 0 && (
                    <span className="week-dot" style={{ background: "var(--red)" }} />
                  )}
                </div>
                {count > 0 && (
                  <span className="week-day-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Expanded panel for selected day */}
        <div className="week-panel">
          {panelItems.length === 0 ? (
            <div className="week-empty">
              <span>✓</span>
              <span>Nothing due {selectedDay === 0 ? "today" : selectedDay === 1 ? "tomorrow" : `on ${daySubLabel(weekDays[selectedDay])}`}.</span>
            </div>
          ) : (
            panelItems.map((item, i) => <DeliverableRow key={i} item={item} />)
          )}
        </div>
      </div>

      {needsReply.length > 0 && (
        <div className="today-section">
          <div className="today-section-header">
            <span className="today-section-title">Needs Your Reply</span>
            <span className="section-count needs-action">{needsReply.length}</span>
          </div>
          <div className="today-inbound">
            {needsReply.map((item) => (
              <div key={item.id} className="today-inbound-row">
                <BrandLogo logo={item.logo} logoColor={item.logoColor} domain={item.domain} size={30} />
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
