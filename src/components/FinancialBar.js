import React, { useState } from "react";

function EditableValue({ value, onSave, prefix = "$", className = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toString());

  const handleSave = () => {
    const parsed = parseFloat(draft.replace(/,/g, ""));
    if (!isNaN(parsed)) onSave(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className={"editable-input " + className}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        autoFocus
      />
    );
  }

  return (
    <span
      className={"editable-value " + className}
      onClick={() => {
        setDraft(value.toString());
        setEditing(true);
      }}
      title="Click to edit"
    >
      {prefix}{value.toLocaleString()}
    </span>
  );
}

export default function FinancialBar({ financials, setFinancials }) {
  const { totalEarned, pendingInvoices, totalExpenses, annualGoal } = financials;
  const netProfit = totalEarned - totalExpenses;
  const goalProgress = Math.min((totalEarned / annualGoal) * 100, 100);
  const taxEstimate = netProfit * 0.3;

  const update = (key) => (val) => setFinancials((f) => ({ ...f, [key]: val }));

  return (
    <div className="financial-bar">
      <div className="financial-bar-inner">
        <div className="fin-stat">
          <span className="fin-label">Earned This Year</span>
          <EditableValue value={totalEarned} onSave={update("totalEarned")} className="fin-value earned" />
        </div>

        <div className="fin-divider" />

        <div className="fin-stat">
          <span className="fin-label">Pending Invoices</span>
          <EditableValue value={pendingInvoices} onSave={update("pendingInvoices")} className="fin-value pending" />
        </div>

        <div className="fin-divider" />

        <div className="fin-stat">
          <span className="fin-label">Expenses</span>
          <EditableValue value={totalExpenses} onSave={update("totalExpenses")} className="fin-value expenses" />
        </div>

        <div className="fin-divider" />

        <div className="fin-stat">
          <span className="fin-label">Tax Position (est. 30%)</span>
          <span className={`fin-value ${netProfit >= 0 ? "profit" : "loss"}`}>
            {netProfit >= 0 ? "+" : ""}${netProfit.toLocaleString()}
            <span className="fin-tax-hint"> / ~${Math.round(taxEstimate).toLocaleString()} owed</span>
          </span>
        </div>

        <div className="fin-divider" />

        <div className="fin-stat fin-goal">
          <div className="fin-goal-top">
            <span className="fin-label">Annual Goal</span>
            <div className="fin-goal-values">
              <span className="fin-value">${totalEarned.toLocaleString()}</span>
              <span className="fin-goal-sep"> / </span>
              <EditableValue value={annualGoal} onSave={update("annualGoal")} className="fin-goal-target" />
            </div>
          </div>
          <div className="goal-bar-track">
            <div
              className="goal-bar-fill"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          <span className="goal-pct">{Math.round(goalProgress)}% to goal</span>
        </div>
      </div>
    </div>
  );
}
