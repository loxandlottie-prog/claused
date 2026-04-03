import React, { useState } from "react";
import "./App.css";
import {
  financials as initialFinancials,
  deals as initialDeals,
  opportunities as initialOpportunities,
  pastDeals as initialPastDeals,
  targets as initialTargets,
} from "./data";
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
        {tabContent[activeTab]}
      </main>
    </div>
  );
}
