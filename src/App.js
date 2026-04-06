import React, { useState } from "react";
import "./App.css";
import { threads as initialThreads } from "./data";
import HomeTab from "./tabs/HomeTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import PasteModal from "./components/PasteModal";
import PasswordGate from "./components/PasswordGate";

export default function App() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem("claused_unlocked") === "1"
  );
  const [activeTab, setActiveTab] = useState("home");
  const [threads, setThreads] = useState(initialThreads);
  const [showModal, setShowModal] = useState(false);

  const handleStatusChange = (id, newStatus) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, lastMessage: new Date().toISOString().slice(0, 10) }
          : t
      )
    );
  };

  const handleThreadAdd = (thread) => {
    setThreads((prev) => [thread, ...prev]);
  };

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <span className="wordmark">Claused</span>
          <nav className="header-nav">
            <button
              className={`header-tab ${activeTab === "home" ? "header-tab-active" : ""}`}
              onClick={() => setActiveTab("home")}
            >
              Home
            </button>
            <button
              className={`header-tab ${activeTab === "analytics" ? "header-tab-active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
          </nav>
          <div className="header-actions">
            <button className="btn-ghost">Connect Gmail</button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Paste Thread</button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "home" ? (
          <HomeTab
            threads={threads}
            onStatusChange={handleStatusChange}
            onThreadAdd={handleThreadAdd}
          />
        ) : (
          <AnalyticsTab />
        )}
      </main>

      {showModal && (
        <PasteModal
          onAdd={handleThreadAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
