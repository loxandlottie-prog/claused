import React, { useState } from "react";
import "./App.css";
import { financials as initialFinancials, deals as initialDeals, inbound as initialInbound } from "./data";
import FinancialBar from "./components/FinancialBar";
import DealPipeline from "./components/DealPipeline";
import InboundSection from "./components/InboundSection";
import ConflictAlert from "./components/ConflictAlert";

function App() {
  const [financials, setFinancials] = useState(initialFinancials);
  const [deals, setDeals] = useState(initialDeals);
  const [inbound, setInbound] = useState(initialInbound);

  const activeDeals = deals.filter((d) => d.stage !== "paid");

  const conflicts = [];
  const categoryMap = {};
  activeDeals.forEach((deal) => {
    if (!categoryMap[deal.category]) categoryMap[deal.category] = [];
    categoryMap[deal.category].push(deal);
  });
  Object.entries(categoryMap).forEach(([category, group]) => {
    if (group.length > 1) conflicts.push({ category, deals: group });
  });

  const handleInboundAction = (id, action) => {
    if (action === "pass") {
      setInbound((prev) => prev.filter((i) => i.id !== id));
    } else if (action === "interested") {
      setInbound((prev) => prev.filter((i) => i.id !== id));
    } else if (action === "followup") {
      setInbound((prev) =>
        prev.map((i) => (i.id === id ? { ...i, snoozed: true } : i))
      );
    }
  };

  const handleStageChange = (id, newStage) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === id ? { ...d, stage: newStage } : d))
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">C</span>
            <span className="logo-text">laused</span>
          </div>
          <nav className="nav">
            <button className="nav-item active">Dashboard</button>
            <button className="nav-item">Deals</button>
            <button className="nav-item">Invoices</button>
            <button className="nav-item">Reports</button>
          </nav>
          <div className="header-right">
            <div className="avatar">DW</div>
          </div>
        </div>
      </header>

      <main className="main">
        <FinancialBar financials={financials} setFinancials={setFinancials} />

        {conflicts.length > 0 && (
          <div className="conflict-section">
            {conflicts.map((c) => (
              <ConflictAlert key={c.category} conflict={c} />
            ))}
          </div>
        )}

        <div className="content-grid">
          <DealPipeline deals={deals} onStageChange={handleStageChange} />
          <InboundSection inbound={inbound} onAction={handleInboundAction} />
        </div>
      </main>
    </div>
  );
}

export default App;
