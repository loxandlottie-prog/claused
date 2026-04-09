import React, { useState, useEffect } from "react";
import "./App.css";
import { threads as demoThreads } from "./data";
import HomeTab from "./tabs/HomeTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import PasteModal from "./components/PasteModal";
import PasswordGate from "./components/PasswordGate";

export default function App() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem("claused_unlocked") === "1"
  );
  const [activeTab, setActiveTab] = useState("home");
  const [threads, setThreads] = useState(demoThreads);
  const [showModal, setShowModal] = useState(false);

  // Gmail connection state
  const [gmail, setGmail] = useState({ connected: false, email: null, loading: true });
  const [gmailError, setGmailError] = useState(false);

  // Check connection status + handle OAuth return
  useEffect(() => {
    if (!unlocked) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "error") setGmailError(true);

    // Clean up URL
    if (params.has("gmail")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setGmail({ connected: data.connected, email: data.email, loading: false });
        if (data.connected) loadGmailThreads();
      })
      .catch(() => setGmail({ connected: false, email: null, loading: false }));
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGmailThreads = () => {
    fetch("/api/gmail/threads")
      .then((r) => {
        if (r.status === 401) throw new Error("not_connected");
        return r.json();
      })
      .then((gmailData) => {
        if (gmailData.length > 0) {
          // Merge: Gmail threads first, then any manually-added threads
          setThreads((prev) => {
            const manualThreads = prev.filter((t) => t.source !== "gmail" && !demoThreads.find((d) => d.id === t.id));
            return [...gmailData, ...manualThreads];
          });
        }
      })
      .catch(console.error);
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = () => {
    window.location.href = "/api/auth/disconnect";
  };

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

  const handleDeliverableToggle = (threadId, deliverableId) => {
    setThreads((prev) => prev.map((t) =>
      t.id !== threadId ? t : {
        ...t,
        deliverables: (t.deliverables || []).map((d) =>
          d.id === deliverableId ? { ...d, done: !d.done } : d
        ),
      }
    ));
  };

  const handleDeliverableAdd = (threadId, text) => {
    setThreads((prev) => prev.map((t) =>
      t.id !== threadId ? t : {
        ...t,
        deliverables: [...(t.deliverables || []), { id: Date.now(), text, done: false }],
      }
    ));
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
            {gmailError && (
              <span className="gmail-error-badge">Gmail auth failed — try again</span>
            )}
            {gmail.loading ? (
              <span className="gmail-status-loading">•••</span>
            ) : gmail.connected ? (
              <div className="gmail-connected-row">
                <span className="gmail-connected-badge">
                  <span className="gmail-dot" />
                  {gmail.email || "Gmail connected"}
                </span>
                <button className="btn-ghost gmail-disconnect" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="btn-ghost gmail-connect-btn" onClick={handleConnect}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6ZM20 6L12 11L4 6H20ZM20 18H4V8L12 13L20 8V18Z" fill="currentColor"/>
                </svg>
                Connect Gmail
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              Paste Thread
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeTab === "home" ? (
          <HomeTab
            threads={threads}
            onStatusChange={handleStatusChange}
            onThreadAdd={handleThreadAdd}
            onDeliverableToggle={handleDeliverableToggle}
            onDeliverableAdd={handleDeliverableAdd}
            gmailConnected={gmail.connected}
            gmailEmail={gmail.email}
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
