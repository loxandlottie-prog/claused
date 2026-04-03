import React, { useState } from "react";
import UsageRightsCountdown from "../components/UsageRightsCountdown";
import BrandLogo from "../components/BrandLogo";
import { formatCurrency } from "../utils";

const PAYMENT_METHOD_LABELS = {
  wire: "Wire transfer",
  paypal: "PayPal",
  stripe: "Stripe",
  check: "Check",
};

function PastDealCard({ deal }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="deal-card" onClick={() => setExpanded((e) => !e)}>
      <div className="deal-card-header" style={{ cursor: "pointer" }}>
        <div className="deal-brand-row">
          <BrandLogo logo={deal.logo} logoColor={deal.logoColor} domain={deal.domain} size={36} />
          <div className="deal-brand-info">
            <span className="deal-brand-name">{deal.brand}</span>
            <span className="deal-category">{deal.category}</span>
          </div>
          <div className="deal-header-right">
            <span className="deal-value">{formatCurrency(deal.value)}</span>
            <span className="payment-badge badge-paid">Paid {deal.paidDate}</span>
          </div>
          <span className="deal-chevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="deal-card-body">
          <div className="deliverables-section">
            <span className="section-label">Deliverables</span>
            {deal.deliverables.map((d, i) => (
              <div key={i} className="deliverable-row done">
                <span className="deliverable-check">✓</span>
                <span className="deliverable-type">{d.type}</span>
                <span className="deliverable-due">Done</span>
              </div>
            ))}
          </div>

          <UsageRightsCountdown expiry={deal.usageRightsExpiry} />

          <div className="past-deal-meta">
            <div className="past-meta-row">
              <span className="past-meta-label">Invoice</span>
              <span className="past-meta-value">{deal.invoiceNumber}</span>
            </div>
            <div className="past-meta-row">
              <span className="past-meta-label">Payment method</span>
              <span className="past-meta-value">{PAYMENT_METHOD_LABELS[deal.paymentMethod] || deal.paymentMethod}</span>
            </div>
          </div>

          {deal.notes && (
            <div className="deal-notes">
              <span className="notes-icon">📝</span>
              {deal.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { id: "newest", label: "Newest first" },
  { id: "value", label: "Highest value" },
];

export default function PastDealsTab({ pastDeals }) {
  const [sort, setSort] = useState("newest");

  const totalEarned = pastDeals.reduce((s, d) => s + d.value, 0);
  const avgDeal = Math.round(totalEarned / (pastDeals.length || 1));

  const sorted = [...pastDeals].sort((a, b) => {
    if (sort === "value") return b.value - a.value;
    return new Date(b.paidDate) - new Date(a.paidDate);
  });

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Past Deals</h1>
      </div>

      <div className="past-stats">
        <div className="past-stat-chip">
          <span className="past-stat-label">Total earned</span>
          <span className="past-stat-value">{formatCurrency(totalEarned)}</span>
        </div>
        <div className="past-stat-chip">
          <span className="past-stat-label">Deals completed</span>
          <span className="past-stat-value">{pastDeals.length}</span>
        </div>
        <div className="past-stat-chip">
          <span className="past-stat-label">Avg deal size</span>
          <span className="past-stat-value">{formatCurrency(avgDeal)}</span>
        </div>
      </div>

      <div className="past-filters">
        <span className="filter-group-label">Sort by</span>
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.id}
            className={`filter-pill ${sort === s.id ? "active" : ""}`}
            onClick={() => setSort(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="deals-list">
        {sorted.map((deal) => (
          <PastDealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}
