import React, { useState, useEffect, useRef } from "react";
import { formatCurrency } from "../utils";

const GOAL_KEY = (year) => `inbora_goal_${year}`;

const MODES = [
  { key: "revenue", label: "$" },
  { key: "count",   label: "#" },
  { key: "both",    label: "Both" },
];

function loadGoal(year) {
  try {
    const raw = localStorage.getItem(GOAL_KEY(year));
    if (!raw) return { mode: "revenue", revenue: null, count: null };
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return { mode: "revenue", revenue: parsed, count: null };
    return parsed;
  } catch {
    return { mode: "revenue", revenue: null, count: null };
  }
}

function saveGoal(year, data) {
  localStorage.setItem(GOAL_KEY(year), JSON.stringify(data));
}

export default function GoalBar({ threads }) {
  const year = new Date().getFullYear();
  const [goalData, setGoalData] = useState(() => loadGoal(year));
  const [editingField, setEditingField] = useState(null);
  const revInputRef = useRef(null);
  const cntInputRef = useRef(null);

  useEffect(() => { setGoalData(loadGoal(year)); }, [year]);

  const paidDeals   = threads.filter((t) => t.status === "paid");
  const earned      = paidDeals.reduce((sum, t) => sum + (t.yourRate || 0), 0);
  const closedCount = paidDeals.length;

  const update = (changes) => {
    const next = { ...goalData, ...changes };
    setGoalData(next);
    saveGoal(year, next);
  };

  const startEdit = (field) => {
    setEditingField(field);
    setTimeout(() => {
      const ref = field === "revenue" ? revInputRef : cntInputRef;
      if (ref.current) {
        ref.current.value = goalData[field] != null ? String(goalData[field]) : "";
        ref.current.focus();
      }
    }, 0);
  };

  const saveEdit = (field) => {
    const ref = (field === "revenue" ? revInputRef : cntInputRef).current;
    const n   = parseFloat((ref?.value || "").replace(/[$,\s]/g, ""));
    update({ [field]: !isNaN(n) && n > 0 ? n : goalData[field] });
    setEditingField(null);
  };

  const hasAnyGoal = goalData.revenue != null || goalData.count != null;
  const mode = goalData.mode;

  const revPct      = goalData.revenue > 0 ? Math.min(100, (earned / goalData.revenue) * 100) : 0;
  const cntPct      = goalData.count   > 0 ? Math.min(100, (closedCount / goalData.count) * 100) : 0;
  const revAchieved = goalData.revenue > 0 && earned      >= goalData.revenue;
  const cntAchieved = goalData.count   > 0 && closedCount >= goalData.count;

  // Unset state — a slim inline prompt
  if (!hasAnyGoal && editingField === null) {
    return (
      <button className="goal-bar goal-bar-unset" onClick={() => startEdit("revenue")}>
        <span className="goal-year-chip">{year}</span>
        <span className="goal-unset-text">Set a {year} goal</span>
        <span className="goal-set-arrow">→</span>
      </button>
    );
  }

  const showRevenue = mode === "revenue" || mode === "both";
  const showCount   = mode === "count"   || mode === "both";

  return (
    <div className="goal-bar goal-bar-active">
      <span className="goal-year-chip">{year}</span>

      <div className="goal-tracks">
        {showRevenue && (
          <div className="goal-track-row">
            {showCount && <span className="goal-track-label">Revenue</span>}
            <div className="goal-track">
              <div className="goal-fill" style={{
                width: `${revPct}%`,
                background: revAchieved ? "#0F766E" : "var(--primary)"
              }} />
            </div>
            <span className="goal-track-stat">
              <span className="goal-earned-sm">{formatCurrency(earned)}</span>
              <span className="goal-of-sm">of</span>
              {editingField === "revenue" ? (
                <span className="goal-edit-inline">
                  <span className="goal-edit-prefix">$</span>
                  <input ref={revInputRef} className="goal-edit-input" type="number"
                    onBlur={() => saveEdit("revenue")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") saveEdit("revenue"); }}
                    placeholder="50000"
                  />
                </span>
              ) : (
                <button className="goal-target-inline" onClick={() => startEdit("revenue")}>
                  {goalData.revenue != null
                    ? (revAchieved ? <span className="goal-achieved-txt">✓</span> : formatCurrency(goalData.revenue))
                    : <em className="goal-unset-inline">set</em>}
                </button>
              )}
              {!revAchieved && goalData.revenue != null && (
                <span className="goal-pct-sm">{Math.round(revPct)}%</span>
              )}
            </span>
          </div>
        )}
        {showCount && (
          <div className="goal-track-row">
            {showRevenue && <span className="goal-track-label">Deals</span>}
            <div className="goal-track">
              <div className="goal-fill" style={{
                width: `${cntPct}%`,
                background: cntAchieved ? "#0F766E" : "var(--primary)"
              }} />
            </div>
            <span className="goal-track-stat">
              <span className="goal-earned-sm">{closedCount}</span>
              <span className="goal-of-sm">of</span>
              {editingField === "count" ? (
                <span className="goal-edit-inline">
                  <input ref={cntInputRef} className="goal-edit-input" type="number"
                    onBlur={() => saveEdit("count")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") saveEdit("count"); }}
                    placeholder="10"
                  />
                </span>
              ) : (
                <button className="goal-target-inline" onClick={() => startEdit("count")}>
                  {goalData.count != null
                    ? (cntAchieved ? <span className="goal-achieved-txt">✓</span> : `${goalData.count} deals`)
                    : <em className="goal-unset-inline">set</em>}
                </button>
              )}
              {!cntAchieved && goalData.count != null && (
                <span className="goal-pct-sm">{Math.round(cntPct)}%</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="goal-controls">
        <div className="goal-mode-toggle">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`goal-mode-btn ${mode === m.key ? "goal-mode-active" : ""}`}
              onClick={() => update({ mode: m.key })}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          className="goal-clear"
          onClick={() => { update({ revenue: null, count: null }); setEditingField(null); }}
          title="Remove goal"
        >
          ×
        </button>
      </div>
    </div>
  );
}
