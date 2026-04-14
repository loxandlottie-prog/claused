import React, { useState, useEffect, useRef } from "react";
import { formatCurrency } from "../utils";

const GOAL_KEY = (year) => `inbora_goal_${year}`;

export default function GoalBar({ threads }) {
  const year = new Date().getFullYear();
  const [goal, setGoal]     = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]   = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(GOAL_KEY(year));
    if (saved) setGoal(parseFloat(saved));
  }, [year]);

  // Closed deals this calendar year (by lastMessage year)
  const closedThisYear = threads.filter(
    (t) => t.status === "closed" && (t.lastMessage || "").startsWith(String(year))
  );
  const earned      = closedThisYear.reduce((sum, t) => sum + (t.yourRate || 0), 0);
  const closedCount = closedThisYear.length;
  const pct         = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
  const achieved    = goal > 0 && earned >= goal;

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(goal != null ? String(goal) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const save = () => {
    const n = parseFloat(String(draft).replace(/[$,\s]/g, ""));
    if (!isNaN(n) && n > 0) {
      setGoal(n);
      localStorage.setItem(GOAL_KEY(year), String(n));
    }
    setEditing(false);
  };

  const clear = () => {
    setGoal(null);
    localStorage.removeItem(GOAL_KEY(year));
    setEditing(false);
  };

  const barColor = achieved
    ? "var(--green)"
    : pct >= 75
    ? "#F59E0B"
    : "var(--primary)";

  if (!goal && !editing) {
    return (
      <button className="goal-bar goal-bar-unset" onClick={() => { setDraft(""); setEditing(true); }}>
        <span className="goal-year-chip">{year}</span>
        Set a revenue goal
        <span className="goal-set-arrow">→</span>
      </button>
    );
  }

  return (
    <div className="goal-bar">
      <div className="goal-bar-header">
        <div className="goal-bar-left">
          <span className="goal-year-chip">{year}</span>
          <span className="goal-title">Revenue Goal</span>
        </div>
        <div className="goal-bar-right">
          <span className="goal-earned">{formatCurrency(earned)}</span>
          <span className="goal-of">of</span>
          {editing ? (
            <span className="goal-edit-inline">
              <span className="goal-edit-prefix">$</span>
              <input
                ref={inputRef}
                className="goal-edit-input"
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="50000"
              />
            </span>
          ) : (
            <button className="goal-target" onClick={startEdit} title="Click to edit goal">
              {formatCurrency(goal)}
            </button>
          )}
        </div>
      </div>

      <div className="goal-track">
        <div
          className="goal-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
        {pct > 0 && pct < 100 && (
          <div className="goal-fill-glow" style={{ left: `${pct}%`, background: barColor }} />
        )}
      </div>

      <div className="goal-bar-footer">
        <span className="goal-count">
          {closedCount === 0
            ? "No deals closed yet"
            : `${closedCount} deal${closedCount !== 1 ? "s" : ""} closed`}
        </span>
        <span className="goal-pct" style={{ color: barColor }}>
          {achieved ? "Goal reached ✓" : `${Math.round(pct)}%`}
        </span>
      </div>

      {!editing && (
        <button className="goal-clear" onClick={clear} title="Remove goal">×</button>
      )}
    </div>
  );
}
