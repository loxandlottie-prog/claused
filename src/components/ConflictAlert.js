import React, { useState } from "react";

function fmtDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function ConflictAlert({ conflict }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const [a, b] = conflict.deals;
  const hasTerms = a.exclusivityTerms || b.exclusivityTerms;

  return (
    <div className="conflict-alert">
      <div className="conflict-icon">⚠</div>
      <div className="conflict-body">
        <div className="conflict-headline">
          <strong>{a.brand}</strong> + <strong>{b.brand}</strong>{" "}
          both active in <span className="conflict-category">{conflict.category}</span>
          {conflict.overlapStart && (
            <span className="conflict-overlap-range">
              {" "}· overlap {fmtDate(conflict.overlapStart)} – {fmtDate(conflict.overlapEnd)}
            </span>
          )}
        </div>
        {hasTerms ? (
          <div className="conflict-terms">
            {a.exclusivityTerms && (
              <div className="conflict-term-row">
                <span className="conflict-term-brand">{a.brand}:</span>
                <span className="conflict-term-text">"{a.exclusivityTerms}"</span>
              </div>
            )}
            {b.exclusivityTerms && (
              <div className="conflict-term-row">
                <span className="conflict-term-brand">{b.brand}:</span>
                <span className="conflict-term-text">"{b.exclusivityTerms}"</span>
              </div>
            )}
          </div>
        ) : (
          <div className="conflict-detail">
            Check for category exclusivity clauses before signing or posting.
          </div>
        )}
      </div>
      <button className="conflict-dismiss" onClick={() => setDismissed(true)}>Dismiss</button>
    </div>
  );
}
