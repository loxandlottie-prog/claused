import React from "react";

const TABS = [
  { id: "today",         label: "Today",        icon: "○" },
  { id: "deals",         label: "Deals",        icon: "◈" },
  { id: "money",         label: "Money",        icon: "$" },
  { id: "opportunities", label: "Opportunities", icon: "✉" },
  { id: "past-deals",    label: "Past Deals",   icon: "✓" },
  { id: "targets",       label: "Targets",      icon: "◎" },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-mark">C</span>
        <span className="logo-text">laused</span>
      </div>

      <nav className="sidebar-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-nav-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar-nav-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">DW</div>
        <span className="sidebar-username">Derek W.</span>
      </div>
    </aside>
  );
}
