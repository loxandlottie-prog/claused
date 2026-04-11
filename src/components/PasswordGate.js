import React, { useState } from "react";

// Change this to whatever you want your password to be
const PASSWORD = "inbora2026";

export default function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem("inbora_unlocked", "1");
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setInput("");
      setTimeout(() => setShaking(false), 400);
    }
  };

  return (
    <div className="gate-overlay">
      <form className={`gate-card ${shaking ? "gate-shake" : ""}`} onSubmit={handleSubmit}>
        <span className="gate-wordmark">Inbora</span>
        <p className="gate-hint">Enter your password to continue.</p>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="Password"
          autoFocus
          className={error ? "gate-input-error" : ""}
        />
        {error && <p className="gate-error">Incorrect password. Try again.</p>}
        <button type="submit" className="gate-submit">Unlock →</button>
      </form>
    </div>
  );
}
