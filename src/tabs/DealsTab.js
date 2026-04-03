import React from "react";
import DealPipeline from "../components/DealPipeline";
import ConflictAlert from "../components/ConflictAlert";
import { detectConflicts } from "../utils";

export default function DealsTab({ deals, onStageChange }) {
  const conflicts = detectConflicts(deals);

  return (
    <div className="tab-page">
      <div className="tab-page-header">
        <h1 className="tab-title">Deals</h1>
      </div>

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {conflicts.map((c) => (
            <ConflictAlert key={c.category} conflict={c} />
          ))}
        </div>
      )}

      <DealPipeline deals={deals} onStageChange={onStageChange} />
    </div>
  );
}
