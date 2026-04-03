import React from "react";
import { daysUntil } from "../utils";

export default function UsageRightsCountdown({ expiry }) {
  const days = daysUntil(expiry);
  const urgent = days <= 30;
  const warning = days <= 90;
  return (
    <div className={`usage-rights ${urgent ? "urgent" : warning ? "warning" : ""}`}>
      <span className="usage-icon">🔒</span>
      <span className="usage-label">Usage rights</span>
      <span className="usage-expiry">
        {days <= 0 ? "Expired" : `${days}d left`} · {expiry}
      </span>
    </div>
  );
}
