import React, { useState, useEffect, useRef } from "react";
import { formatCurrency } from "../utils";

const GOAL_KEY = (year) => `inbora_goal_${year}`;

const MODES = [
  { key: "revenue", label: "$" },
  { key: "count",   label: "#" },
  { key: "both",    label: "$+#" },
];

function loadGoal(year) {
  try {
    const raw = localStorage.getItem(GOAL_KEY(year));
    if (!raw) return { mode: "revenue", revenue: null, count: null };
    const parsed = JSON.parse(raw);
    // backwards compat: old format was just a number
    if (typeof parsed === "number") return { mode: "revenue", revenue: parsed, count: null };
    return parsed;
  } catch {
    return { mode: "revenue", revenue: null, count: null };
  }
}

function saveGoal(year, data) {
  localStorage.setItem(GOAL_KEY(year), JSON.stringify(data));
}

function ProgressBar({ pct, achieved }) {
  const width = Math.min(100, Math.max(0, pct));
  // All states use teal — deeper shade on achievement
  const color = achieved ? "#0F766E" : "#0D9488";
  return (
    <div className="goal-track">
      <div className="goal-fill" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

function GoalRow({ label, current, goal, unit, onEditGoal, editingThis, draftRef, onSave, onStartEdit }) {
  const pct      = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const achieved = goal > 0 && current >= goal;
  const color    = achieved ? "#0F766E" : "var(--primary)";

  return (
    <div className="goal-row">
      <div className="goal-row-header">
        <span className="goal-row-label">{label}</span>
        <div className="goal-bar-right">
          <span className="goal-earned">{unit === "$" ? formatCurrency(current) : current}</span>
          <span className="goal-of">of</span>
          {editingThis ? (
            <span className="goal-edit-inline">
              {unit === "$" && <span className="goal-edit-prefix">$</span>}
              <input
                ref={draftRef}
                className="goal-edit-input"
                type="number"
                onBlur={onSave}
                onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onSave(); }}
                placeholder={unit === "$" ? "50000" : "10"}
              />
            </span>
          ) : (
            <button className="goal-target" onClick={onStartEdit} title="Click to edit goal">
              {goal != null ? (unit === "$" ? formatCurrency(goal) : `${goal} deals`) : <em className="goal-unset-inline">set goal</em>}
            </button>
          )}
        </div>
      </div>
      <ProgressBar pct={pct} achieved={achieved} />
      <div className="goal-bar-footer">
        <span className="goal-count">
          {unit === "$"
            ? (current === 0 ? "No revenue yet" : `${Math.round(pct)}% to goal`)
            : (current === 0 ? "No deals paid yet" : `${current} deal${current !== 1 ? "s" : ""} paid`)}
        </span>
        <span className="goal-pct" style={{ color }}>
          {achieved ? "Goal reached ✓" : goal != null ? `${Math.round(pct)}%` : ""}
        </span>
      </div>
    </div>
  );
}

export default function GoalBar({ threads }) {
  const year = new Date().getFullYear();
  const [goalData, setGoalData] = useState(() => loadGoal(year));
  const [editingField, setEditingField] = useState(null); // 'revenue' | 'count' | null
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
      (field === "revenue" ? revInputRef : cntInputRef).current?.focus();
      const ref = (field === "revenue" ? revInputRef : cntInputRef).current;
      if (ref) ref.value = goalData[field] != null ? String(goalData[field]) : "";
    }, 0);
  };

  const saveEdit = (field) => {
    const ref = (field === "revenue" ? revInputRef : cntInputRef).current;
    const raw = ref?.value || "";
    const n   = parseFloat(raw.replace(/[$,\s]/g, ""));
    update({ [field]: !isNaN(n) && n > 0 ? n : goalData[field] });
    setEditingField(null);
  };

  const hasAnyGoal = goalData.revenue != null || goalData.count != null;

  if (!hasAnyGoal && editingField === null) {
    return (
      <button
        className="goal-bar goal-bar-unset"
        onClick={() => { startEdit("revenue"); }}
      >
        <span className="goal-year-chip">{year}</span>
        <span>Set a goal for {year}</span>
        <span className="goal-set-arrow">→</span>
      </button>
    );
  }

  const mode = goalData.mode;

  return (
    <div className="goal-bar">
      <div className="goal-bar-top-row">
        <div className="goal-bar-left">
          <span className="goal-year-chip">{year}</span>
          <span className="goal-title">Goal</span>
        </div>
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
        <button className="goal-clear" onClick={() => { update({ revenue: null, count: null }); setEditingField(null); }} title="Remove goal">×</button>
      </div>

      {(mode === "revenue" || mode === "both") && (
        <GoalRow
          label="Revenue"
          current={earned}
          goal={goalData.revenue}
          unit="$"
          editingThis={editingField === "revenue"}
          draftRef={revInputRef}
          onStartEdit={() => startEdit("revenue")}
          onSave={() => saveEdit("revenue")}
        />
      )}

      {(mode === "count" || mode === "both") && (
        <GoalRow
          label="Deals paid"
          current={closedCount}
          goal={goalData.count}
          unit="#"
          editingThis={editingField === "count"}
          draftRef={cntInputRef}
          onStartEdit={() => startEdit("count")}
          onSave={() => saveEdit("count")}
        />
      )}
    </div>
  );
}
