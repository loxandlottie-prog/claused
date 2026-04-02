import React, { useState } from "react";

export default function ConflictAlert({ conflict }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const [a, b] = conflict.deals;

  // Pull any exclusivity language out of deal notes
  const exclusivityHints = conflict.deals
    .filter((d) => d.notes && /exclusiv/i.test(d.notes))
    .map((d) => `${d.brand}: "${d.notes}"`);

  return (
    <div className="conflict-alert">
      <div className="conflict-icon">⚠</div>
      <div className="conflict-body">
        <div className="conflict-headline">
          <strong>{a.brand}</strong> and <strong>{b.brand}</strong> are both active in{" "}
          <span className="conflict-category">{conflict.category}</span>
        </div>
        <div className="conflict-detail">
          Both deals are in-flight simultaneously — check for category exclusivity clauses before
          signing or posting.
          {exclusivityHints.length > 0 && (
            <ul className="conflict-notes">
              {exclusivityHints.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button className="conflict-dismiss" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  );
}
