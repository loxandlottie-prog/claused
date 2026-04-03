import React, { useState } from "react";
import { formatCurrency } from "../utils";
import BrandLogo from "../components/BrandLogo";

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

// Tags that indicate content-creator business deductibility
const DEDUCTIBLE_KEYWORDS = [
  "ring light", "camera", "tripod", "microphone", "mic", "lens", "lighting",
  "sd card", "memory card", "hard drive", "laptop", "monitor", "keyboard",
  "backdrop", "prop", "studio", "storage", "battery", "charger", "cable",
  "pet food", "pet treat", "pet toy", "cat litter", "dog", "cat", "bird",
  "aquarium", "fish", "hamster", "rabbit", "guinea pig",
  "subscription", "software", "editing", "adobe", "canva",
  "shipping", "packaging", "label",
];

function tagDeductibility(description) {
  const lc = description.toLowerCase();
  for (const kw of DEDUCTIBLE_KEYWORDS) {
    if (lc.includes(kw)) return "deductible";
  }
  return "review";
}

// Attempt to parse Amazon order CSV or a simpler date,description,amount CSV
function parseExpenseCSV(raw) {
  const lines = raw.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;

  // Detect header row
  const header = lines[0].toLowerCase();
  const isAmazon = header.includes("order date") || header.includes("title");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    if (isAmazon) {
      // Amazon CSV: order date, order id, title, ..., purchase price per unit, quantity, ..., total charged
      const date = cols[0] || "";
      const title = cols[2] || cols[1] || "";
      // Find first dollar-like value
      const amountCol = cols.slice(10).find((c) => /[\d.]+/.test(c) && parseFloat(c) > 0);
      const amount = amountCol ? parseFloat(amountCol) : 0;
      if (title && amount > 0) {
        rows.push({ date, description: title, amount, deductibility: tagDeductibility(title) });
      }
    } else {
      // Generic: date, description, amount
      if (cols.length >= 3) {
        const amount = parseFloat(cols[2].replace(/[$,]/g, "")) || 0;
        if (amount > 0) {
          rows.push({ date: cols[0], description: cols[1], amount, deductibility: tagDeductibility(cols[1]) });
        }
      }
    }
  }
  return rows.length > 0 ? rows : null;
}

function AmazonImport({ onImport }) {
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [deductibility, setDeductibility] = useState({});

  const handleParse = () => {
    const parsed = parseExpenseCSV(csv);
    if (!parsed) {
      setError("Couldn't parse — expected columns: Date, Description, Amount (or paste Amazon order CSV).");
      return;
    }
    setError("");
    const initialTags = {};
    parsed.forEach((r, i) => { initialTags[i] = r.deductibility; });
    setDeductibility(initialTags);
    setRows(parsed);
  };

  const total = rows ? rows.reduce((s, r) => s + r.amount, 0) : 0;
  const deductibleTotal = rows
    ? rows.filter((_, i) => deductibility[i] === "deductible").reduce((s, r) => s + r.amount, 0)
    : 0;

  const handleImport = () => {
    onImport(total);
    setCsv("");
    setRows(null);
    setDeductibility({});
  };

  return (
    <div className="money-card">
      <div className="money-card-header">
        <span className="money-card-title">Import Amazon Expenses</span>
        <span className="money-card-subtitle">Paste order CSV or Date, Description, Amount</span>
      </div>

      {!rows ? (
        <>
          <textarea
            className="csv-import-textarea"
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setError(""); }}
            placeholder={"Paste CSV here — Amazon order export or:\nDate,Description,Amount\n2026-03-15,Ring light,89.99\n2026-03-18,Pet food for reviews,42.50"}
            rows={6}
          />
          {error && <div className="csv-import-error">{error}</div>}
          <button className="csv-import-parse-btn" onClick={handleParse} disabled={!csv.trim()}>
            Parse CSV
          </button>
        </>
      ) : (
        <>
          <table className="csv-import-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td className="money-table-muted">{row.date}</td>
                  <td>{row.description}</td>
                  <td className="money-table-value">{formatCurrency(row.amount)}</td>
                  <td>
                    <select
                      className="deductibility-select"
                      value={deductibility[i] || "review"}
                      onChange={(e) => setDeductibility((d) => ({ ...d, [i]: e.target.value }))}
                    >
                      <option value="deductible">Deductible</option>
                      <option value="review">Needs review</option>
                      <option value="personal">Personal</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="money-table-total-label">Total imported</td>
                <td className="money-table-total">{formatCurrency(total)}</td>
                <td className="money-table-muted" style={{ fontSize: 12 }}>
                  {formatCurrency(deductibleTotal)} deductible
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="csv-import-actions">
            <button className="csv-import-confirm-btn" onClick={handleImport}>
              Add {formatCurrency(total)} to expenses
            </button>
            <button className="csv-import-cancel-btn" onClick={() => { setRows(null); setCsv(""); }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MoneyTab({ financials, setFinancials, deals }) {
  const { totalEarned, pendingInvoices, totalExpenses, annualGoal } = financials;
  const netProfit = totalEarned - totalExpenses;
  const taxEst = Math.round(netProfit * 0.3);
  const goalPct = Math.min(Math.round((totalEarned / annualGoal) * 100), 100);
  const monthsElapsed = new Date().getMonth() + 1;
  const monthlyPace = Math.round(totalEarned / monthsElapsed);
  const projectedAnnual = monthlyPace * 12;

  const update = (key) => (val) => setFinancials((f) => ({ ...f, [key]: val }));

  const handleExpenseImport = (amount) => {
    setFinancials((f) => ({ ...f, totalExpenses: f.totalExpenses + amount }));
  };

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
                      <BrandLogo logo={deal.logo} logoColor={deal.logoColor} domain={deal.domain} size={28} />
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

      {/* Amazon expense import */}
      <AmazonImport onImport={handleExpenseImport} />
    </div>
  );
}
