import React, { useState } from "react";

export default function ConflictAlert({ conflict }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="conflict-alert">
      <div className="conflict-icon">⚠</div>
      <div className="conflict-body">
        <strong>Category conflict detected:</strong>{" "}
        <span className="conflict-category">{conflict.category}</span> —{" "}
        {conflict.deals.map((d, i) => (
          <span key={d.id}>
            {i > 0 && " and "}
            <strong>{d.brand}</strong>
          </span>
        ))}{" "}
        are both active in this category. Check exclusivity clauses before proceeding.
      </div>
      <button className="conflict-dismiss" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  );
}
