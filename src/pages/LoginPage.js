import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, getSession } from "../auth";
import "./AuthPages.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Already logged in — go straight to app
  if (getSession()) {
    navigate("/app", { replace: true });
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = login(email.trim().toLowerCase(), password);
    if (ok) {
      navigate("/app", { replace: true });
    } else {
      setError("Incorrect email or password.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/" className="auth-wordmark">
          <span className="auth-bracket">[</span>in<span className="auth-bracket">]</span>bora
        </Link>
      </nav>
      <div className="auth-body">
        <div className="auth-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your Inbora account.</p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`auth-input${error ? " error" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`auth-input${error ? " error" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
            {error && <span className="auth-error">{error}</span>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="auth-footer-text">
            Don't have an account? <Link to="/signup">Get started free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
