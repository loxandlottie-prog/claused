import React from "react";
import { daysUntil } from "../utils";

export default function UsageRightsCountdown({ expiry, flagged, onFlagViolation }) {
  if (!expiry) return null;
  const days = daysUntil(expiry);
  const expired = days <= 0;
  const urgent = !expired && days <= 14;
  const warning = !expired && !urgent && days <= 60;

  return (
    <div className={`usage-rights ${expired ? "expired" : urgent ? "urgent" : warning ? "warning" : ""}`}>
      <span className="usage-icon">🔒</span>
      <div className="usage-info">
        <span className="usage-label">Usage rights</span>
        <span className="usage-expiry">
          {expired ? "Expired" : `${days}d left`} · expires {expiry}
        </span>
      </div>
      {flagged && <span className="usage-violation-badge">⚠ Violation flagged</span>}
      {!flagged && (expired || urgent) && onFlagViolation && (
        <button className="usage-flag-btn" onClick={onFlagViolation}>Flag violation</button>
      )}
    </div>
  );
}
