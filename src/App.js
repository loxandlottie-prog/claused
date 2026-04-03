import React, { useState, useRef } from "react";
import "./App.css";
import {
  financials as initialFinancials,
  deals as initialDeals,
  opportunities as initialOpportunities,
  pastDeals as initialPastDeals,
  targets as initialTargets,
} from "./data";
import { formatCurrency } from "./utils";
import Sidebar from "./components/Sidebar";
import TodayTab from "./tabs/TodayTab";
import DealsTab from "./tabs/DealsTab";
import MoneyTab from "./tabs/MoneyTab";
import OpportunitiesTab from "./tabs/OpportunitiesTab";
import PastDealsTab from "./tabs/PastDealsTab";
import TargetsTab from "./tabs/TargetsTab";

export default function App() {
  const [activeTab, setActiveTab] = useState("today");
  const [financials, setFinancials] = useState(initialFinancials);
  const [deals, setDeals] = useState(initialDeals);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [pastDeals] = useState(initialPastDeals);
  const [targets, setTargets] = useState(initialTargets);

  const handleStageChange = (id, newStage) => {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage: newStage } : d)));
  };

  const handleDealAdd = (newDeal) => {
    setDeals((prev) => [newDeal, ...prev]);
  };

  const handleOpportunityAction = (id, action) => {
    if (action === "pass") {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, status: "passed" } : o)));
    } else if (action === "interested") {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, status: "interested" } : o)));
    } else if (action === "followup") {
      setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, snoozed: true } : o)));
    }
  };

  const handleTargetUpdate = (id, changes) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  };

  const handleTargetAdd = (newTarget) => {
    setTargets((prev) => [...prev, newTarget]);
  };

  const goalPct = Math.min(Math.round((financials.totalEarned / financials.annualGoal) * 100), 100);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const goalInputRef = useRef(null);

  const startEditGoal = () => {
    setGoalDraft(financials.annualGoal.toString());
    setEditingGoal(true);
    setTimeout(() => goalInputRef.current && goalInputRef.current.select(), 0);
  };
  const saveGoal = () => {
    const val = parseFloat(goalDraft.replace(/,/g, ""));
    if (!isNaN(val) && val > 0) setFinancials((f) => ({ ...f, annualGoal: val }));
    setEditingGoal(false);
  };

  const tabContent = {
    today: (
      <TodayTab deals={deals} opportunities={opportunities} financials={financials} />
    ),
    deals: (
      <DealsTab deals={deals} onStageChange={handleStageChange} onDealAdd={handleDealAdd} />
    ),
    money: (
      <MoneyTab financials={financials} setFinancials={setFinancials} deals={deals} />
    ),
    opportunities: (
      <OpportunitiesTab opportunities={opportunities} onAction={handleOpportunityAction} />
    ),
    "past-deals": (
      <PastDealsTab pastDeals={pastDeals} />
    ),
    targets: (
      <TargetsTab
        targets={targets}
        onTargetUpdate={handleTargetUpdate}
        onTargetAdd={handleTargetAdd}
      />
    ),
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="tab-content">
        <div className="sticky-fin-bar">
          <div className="sfb-item">
            <span className="sfb-label">Earned this year</span>
            <span className="sfb-value sfb-earned">{formatCurrency(financials.totalEarned)}</span>
          </div>
          <div className="sfb-sep" />
          <div className="sfb-item sfb-goal-item">
            <div className="sfb-goal-label-row">
              <span className="sfb-label">Annual goal</span>
              <button className="sfb-edit-btn" onClick={startEditGoal} title="Edit goal">✎</button>
            </div>
            {editingGoal ? (
              <input
                ref={goalInputRef}
                className="sfb-goal-input"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={saveGoal}
                onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); if (e.key === "Escape") setEditingGoal(false); }}
              />
            ) : (
              <div className="sfb-goal-row">
                <div className="sfb-goal-track">
                  <div className="sfb-goal-fill" style={{ width: `${goalPct}%` }} />
                </div>
                <span className="sfb-value">{goalPct}% · {formatCurrency(financials.annualGoal)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="tab-content-inner">
          {tabContent[activeTab]}
        </div>
      </main>
    </div>
  );
}
