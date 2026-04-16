import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup, getSession } from "../auth";
import "./AuthPages.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Already logged in — go straight to app
  if (getSession()) {
    navigate("/app", { replace: true });
    return null;
  }

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 6) e.password = "Password must be at least 6 characters.";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setLoading(true);
    signup(email.trim().toLowerCase(), password);
    navigate("/app", { replace: true });
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
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start managing your brand deals for free.</p>
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`auth-input${errors.email ? " error" : ""}`}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: null })); }}
                placeholder="you@example.com"
                autoFocus
                autoComplete="email"
              />
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>
            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`auth-input${errors.password ? " error" : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: null })); }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
