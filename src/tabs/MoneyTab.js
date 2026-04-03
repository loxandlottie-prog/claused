import React, { useState } from "react";
import { formatCurrency } from "../utils";

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
      onClick={() => { setDraft(value.toString()); setEditing(true); }}
      title="Click to edit"
    >
      {prefix}{value.toLocaleString()}
    </span>
  );
}

const PAYMENT_BADGE = {
  unpaid: { label: "Unpaid", cls: "badge-unpaid" },
  invoiced: { label: "Invoiced", cls: "badge-invoiced" },
  paid: { label: "Paid", cls: "badge-paid" },
};

const QUARTERS = [
  { label: "Q1", months: "Jan – Mar", due: true },
  { label: "Q2", months: "Apr – Jun", due: false },
  { label: "Q3", months: "Jul – Sep", due: false },
  { label: "Q4", months: "Oct – Dec", due: false },
];

export default function MoneyTab({ financials, setFinancials, deals }) {
  const { totalEarned, pendingInvoices, totalExpenses, annualGoal } = financials;
  const netProfit = totalEarned - totalExpenses;
  const taxEst = Math.round(netProfit * 0.3);
  const goalPct = Math.min(Math.round((totalEarned / annualGoal) * 100), 100);
  const monthsElapsed = new Date().getMonth() + 1;
  const monthlyPace = Math.round(totalEarned / monthsElapsed);
  const projectedAnnual = monthlyPace * 12;

  const update = (key) => (val) => setFinancials((f) => ({ ...f, [key]: val }));

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Money</h1>
      </div>

      {/* Top stat cards */}
      <div className="money-stats">
        <div className="money-stat-card">
          <span className="money-stat-label">Earned This Year</span>
          <EditableValue value={totalEarned} onSave={update("totalEarned")} className="money-stat-value earned" />
          <span className="money-stat-hint">Click to edit</span>
        </div>
        <div className="money-stat-card">
          <span className="money-stat-label">Pending Invoices</span>
          <EditableValue value={pendingInvoices} onSave={update("pendingInvoices")} className="money-stat-value pending" />
          <span className="money-stat-hint">Awaiting payment</span>
        </div>
        <div className="money-stat-card">
          <span className="money-stat-label">Total Expenses</span>
          <EditableValue value={totalExpenses} onSave={update("totalExpenses")} className="money-stat-value expenses" />
          <span className="money-stat-hint">Click to edit</span>
        </div>
        <div className="money-stat-card">
          <span className="money-stat-label">Net Profit / Loss</span>
          <span className={`money-stat-value ${netProfit >= 0 ? "profit" : "loss"}`}>
            {netProfit >= 0 ? "+" : ""}{formatCurrency(netProfit)}
          </span>
          <span className="money-stat-hint">After expenses</span>
        </div>
      </div>

      <div className="money-grid">
        {/* Annual goal */}
        <div className="money-card">
          <div className="money-card-header">
            <span className="money-card-title">Annual Goal</span>
            <div className="money-goal-target">
              <span>{formatCurrency(totalEarned)}</span>
              <span className="money-goal-sep"> / </span>
              <EditableValue value={annualGoal} onSave={update("annualGoal")} className="money-goal-edit" />
            </div>
          </div>
          <div className="goal-bar-track" style={{ marginTop: 12 }}>
            <div className="goal-bar-fill" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="money-goal-stats">
            <span>{goalPct}% to goal</span>
            <span>Pace: {formatCurrency(monthlyPace)}/mo → {formatCurrency(projectedAnnual)} projected</span>
          </div>
        </div>

        {/* Tax estimate */}
        <div className="money-card">
          <div className="money-card-header">
            <span className="money-card-title">Tax Estimate (30%)</span>
            <span className="money-tax-total">{formatCurrency(taxEst)} owed</span>
          </div>
          <div className="quarterly-grid">
            {QUARTERS.map((q) => (
              <div key={q.label} className={`quarter-row ${q.due ? "quarter-due" : ""}`}>
                <div className="quarter-left">
                  <span className="quarter-label">{q.label}</span>
                  <span className="quarter-months">{q.months}</span>
                </div>
                <div className="quarter-right">
                  <span className="quarter-amount">{formatCurrency(Math.round(taxEst / 4))}</span>
                  {q.due && <span className="quarter-due-badge">Due</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="money-tax-note">Estimate only. Consult a tax professional for accurate figures.</p>
        </div>
      </div>

      {/* Deal breakdown table */}
      <div className="money-card">
        <div className="money-card-header">
          <span className="money-card-title">Deal Breakdown</span>
          <span className="money-card-subtitle">{deals.length} deals total</span>
        </div>
        <table className="money-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Category</th>
              <th>Value</th>
              <th>Invoice</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => {
              const p = PAYMENT_BADGE[deal.paymentStatus];
              return (
                <tr key={deal.id}>
                  <td>
                    <div className="money-table-brand">
                      <div className="deal-logo" style={{ background: deal.logoColor, width: 28, height: 28, fontSize: 10 }}>
                        {deal.logo}
                      </div>
                      {deal.brand}
                    </div>
                  </td>
                  <td className="money-table-muted">{deal.category}</td>
                  <td className="money-table-value">{formatCurrency(deal.value)}</td>
                  <td className="money-table-muted">{deal.invoiceNumber || "—"}</td>
                  <td><span className={`payment-badge ${p.cls}`}>{p.label}</span></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="money-table-total-label">Total</td>
              <td className="money-table-total">{formatCurrency(deals.reduce((s, d) => s + d.value, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
