import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import { threads as demoThreads } from "./data";
import HomeTab from "./tabs/HomeTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import PasteModal from "./components/PasteModal";
import PasswordGate from "./components/PasswordGate";

// ─── localStorage keys ────────────────────────────────────────────────────────
const LS_OVERRIDES = "inbora_overrides";
const LS_BLOCKED   = "inbora_blocked";

// ─── Dedup key — mirrors api/gmail/threads.js logic ──────────────────────────
const threadDedupKey = (t) =>
  t.senderIsAgency
    ? (t.brand || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim()
    : (t.senderDomain || "").toLowerCase();

// ─── Status migration — maps legacy values to current schema ─────────────────
const STATUS_MIGRATION = {
  reply_needed: "new", you_replied: "negotiating", waiting_on_them: "negotiating",
  in_progress: "negotiating", accepted: "negotiating",
  deal_closed: "completed", deal_passed: "declined",
  pending: "new", active: "negotiating", closed: "completed", rejected: "declined",
  confirmed: "in-progress",
};

function migrateStatuses(overridesMap) {
  Object.values(overridesMap).forEach((ov) => {
    if (ov.status && STATUS_MIGRATION[ov.status]) ov.status = STATUS_MIGRATION[ov.status];
  });
  return overridesMap;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
// Thread IDs are 10+ hex chars. Anything else is a legacy brand-name key — drop it.
const isThreadId = (k) => /^[0-9a-f]{10,}$/i.test(k);

function lsGetOverrides() {
  try {
    // Primary store (current key)
    const primary = JSON.parse(localStorage.getItem(LS_OVERRIDES) || "{}");
    // Temporary migration: pick up anything saved under the short-lived v2 key
    const v2 = JSON.parse(localStorage.getItem("inbora_overrides_v2") || "{}");
    // Merge: v2 is more recent so it wins on conflict
    const merged = { ...primary, ...v2 };
    // Keep only thread-ID keyed entries (drop legacy brand-name keys)
    const clean = {};
    Object.entries(merged).forEach(([k, v]) => { if (isThreadId(k)) clean[k] = v; });
    migrateStatuses(clean);
    // Persist the cleaned merged result and remove the stale v2 key
    localStorage.setItem(LS_OVERRIDES, JSON.stringify(clean));
    localStorage.removeItem("inbora_overrides_v2");
    return clean;
  } catch { return {}; }
}
function lsSetOverrides(map) {
  localStorage.setItem(LS_OVERRIDES, JSON.stringify(map));
}
function lsGetBlocked() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_BLOCKED) || "[]")); }
  catch { return new Set(); }
}
function lsSetBlocked(set) {
  localStorage.setItem(LS_BLOCKED, JSON.stringify([...set]));
}

// ─── Server helpers (fire-and-forget — localStorage is the source of truth for
//     instant UI updates; server is the durable, cross-device store) ───────────
function serverSaveOverride(threadId, fullData) {
  fetch("/api/overrides", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, data: fullData }),
  }).catch(console.error);
}

function serverAddBlocked(dedupKey) {
  fetch("/api/blocked", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dedup_key: dedupKey }),
  }).catch(console.error);
}

// ─── Apply overrides from a map to a list of threads ─────────────────────────
function applyOverrides(threads, overridesMap) {
  return threads.map((t) => {
    const ov = overridesMap[t.id];
    if (!ov) return t;
    // Deep merge contact so partial contact updates don't wipe other contact fields
    if (ov.contact) return { ...t, ...ov, contact: { ...t.contact, ...ov.contact } };
    return { ...t, ...ov };
  });
}

export default function App() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem("inbora_unlocked") === "1"
  );
  const [activeTab, setActiveTab] = useState("home");
  const [threads, setThreads] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Gmail connection state
  const [gmail, setGmail] = useState({ connected: false, email: null, loading: true });
  const [gmailError, setGmailError] = useState(false);

  // In-memory overrides map: { thread_id: { status, yourRate, ... } }
  // This is the single source of truth for unsaved state; kept in sync with
  // localStorage (instant) and the server (durable).
  const overridesRef = useRef(lsGetOverrides());
  const blockedRef   = useRef(lsGetBlocked());

  // ─── Persist an override for one thread ────────────────────────────────────
  const persistOverride = (threadId, updates) => {
    const current = overridesRef.current[threadId] || {};
    // Deep merge contact
    const merged = updates.contact
      ? { ...current, ...updates, contact: { ...(current.contact || {}), ...updates.contact } }
      : { ...current, ...updates };
    overridesRef.current[threadId] = merged;
    lsSetOverrides(overridesRef.current);    // instant cache
    serverSaveOverride(threadId, merged);    // durable store
  };

  // ─── Persist a blocked thread ───────────────────────────────────────────────
  const persistBlocked = (dedupKey) => {
    blockedRef.current.add(dedupKey);
    lsSetBlocked(blockedRef.current);
    serverAddBlocked(dedupKey);
  };

  // ─── Load Gmail threads + server overrides/blocked ─────────────────────────
  const loadGmailThreads = async () => {
    try {
      // Load server overrides and blocked in parallel with Gmail threads
      const [gmailData, serverOverrides, serverBlocked] = await Promise.all([
        fetch("/api/gmail/threads").then((r) => {
          if (r.status === 401) throw new Error("not_connected");
          return r.json();
        }),
        fetch("/api/overrides").then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/blocked").then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      // Server data wins over localStorage — but only when the server actually returned
      // something. null means the request failed (Supabase not set up, auth error, etc.)
      // and we fall back to whatever is in localStorage.
      // Note: we also trust an empty {} from the server once Supabase is wired up,
      // because that means the user genuinely has no server-side overrides yet.
      // The first save from any device will populate it.
      if (serverOverrides !== null) {
        // Merge: keep any local-only overrides that aren't on the server yet
        // (handles the case where the user saved locally before Supabase was set up)
        const merged = { ...overridesRef.current, ...serverOverrides };
        overridesRef.current = migrateStatuses(merged);
        lsSetOverrides(overridesRef.current);
      }
      if (serverBlocked !== null) {
        blockedRef.current = new Set(serverBlocked);
        lsSetBlocked(blockedRef.current);
      }

      const filtered = gmailData.filter((t) => !blockedRef.current.has(threadDedupKey(t)));
      const withOverrides = applyOverrides(filtered, overridesRef.current);

      setThreads((prev) => {
        const manualThreads = prev.filter((t) => t.source !== "gmail" && !demoThreads.find((d) => d.id === t.id));
        return [...withOverrides, ...manualThreads];
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Check connection status + handle OAuth return
  useEffect(() => {
    if (!unlocked) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "error") setGmailError(true);
    if (params.has("gmail")) window.history.replaceState({}, "", window.location.pathname);

    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setGmail({ connected: data.connected, email: data.email, loading: false });
        if (data.connected) loadGmailThreads();
      })
      .catch(() => setGmail({ connected: false, email: null, loading: false }));
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => { window.location.href = "/api/auth/google"; };
  const handleDisconnect = () => { window.location.href = "/api/auth/disconnect"; };

  const handleStatusChange = (id, newStatus) => {
    setThreads((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    persistOverride(id, { status: newStatus });
  };

  const handleThreadAdd = (thread) => {
    setThreads((prev) => [thread, ...prev]);
  };

  const handleNotADeal = (id) => {
    setThreads((prev) => {
      const thread = prev.find((t) => t.id === id);
      if (thread) persistBlocked(threadDedupKey(thread));
      return prev.filter((t) => t.id !== id);
    });
  };

  const handleFieldChange = (id, updates) => {
    setThreads((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      if (updates.contact) return { ...t, contact: { ...t.contact, ...updates.contact } };
      return { ...t, ...updates };
    }));
    persistOverride(id, updates);
  };

  const handleDeliverableToggle = (threadId, deliverableId) => {
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== threadId) return t;
        const deliverables = (t.deliverables || []).map((d) =>
          d.id === deliverableId ? { ...d, done: !d.done } : d
        );
        return { ...t, deliverables };
      });
      const changed = next.find((t) => t.id === threadId);
      if (changed) persistOverride(threadId, { deliverables: changed.deliverables });
      return next;
    });
  };

  const handleDeliverableAdd = (threadId, text) => {
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== threadId) return t;
        const deliverables = [...(t.deliverables || []), { id: Date.now(), text, done: false }];
        return { ...t, deliverables };
      });
      const changed = next.find((t) => t.id === threadId);
      if (changed) persistOverride(threadId, { deliverables: changed.deliverables });
      return next;
    });
  };

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <span className="wordmark">Inbora</span>
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
            onFieldChange={handleFieldChange}
            onThreadAdd={handleThreadAdd}
            onDeliverableToggle={handleDeliverableToggle}
            onDeliverableAdd={handleDeliverableAdd}
            onNotADeal={handleNotADeal}
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
