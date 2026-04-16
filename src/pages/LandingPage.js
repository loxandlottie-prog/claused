import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSession, logout } from "../auth";
import "./LandingPage.css";

export default function LandingPage() {
  const session = getSession();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <Link to="/" className="lp-wordmark">
          <span className="lp-bracket">[</span>in<span className="lp-bracket">]</span>bora
        </Link>
        <div className="lp-nav-right">
          {session ? (
            <>
              <Link to="/app" className="lp-nav-link">Dashboard</Link>
              <button className="lp-nav-link lp-nav-btn" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <Link to="/login" className="lp-btn-ghost">Sign in</Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <h1 className="lp-headline">
          Your brand inbox,<br />finally organized.
        </h1>
        <p className="lp-subheadline">
          Creators waste hours hunting through emails for brand deals.<br className="lp-br" />
          Inbora brings them all to one place.
        </p>
        <div className="lp-hero-ctas">
          <Link to="/signup" className="lp-btn-primary">Get started free</Link>
          <button className="lp-demo-link">Watch demo ↗</button>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="lp-features-grid">
          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="#7C5CFC" strokeWidth="1.75"/>
                <path d="M2 8l10 6 10-6" stroke="#7C5CFC" strokeWidth="1.75" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="lp-feature-title">Inbox meets CRM</h3>
            <p className="lp-feature-body">
              Every brand that reaches out, in one feed. No more searching Gmail for that deal from three weeks ago.
            </p>
          </div>

          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#7C5CFC" strokeWidth="1.75"/>
                <path d="M12 7v5l3 3" stroke="#7C5CFC" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="lp-feature-title">Know what to do next</h3>
            <p className="lp-feature-body">
              Status badges show if you need to reply, they're waiting, or the deal is live. Nothing falls through the cracks.
            </p>
          </div>

          <div className="lp-feature">
            <div className="lp-feature-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l5-5 4 4 5-6 4 4" stroke="#7C5CFC" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 21h18" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="lp-feature-title">Watch your deals grow</h3>
            <p className="lp-feature-body">
              Analytics dashboard shows brands reached out, closed, and year-over-year growth at a glance.
            </p>
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="lp-proof">
        <p className="lp-proof-line">Built for creators who manage brand partnerships</p>
        <blockquote className="lp-quote">
          "I used to lose track of deals in Gmail all the time. Inbora fixed that in a day."
          <cite>— Creator, 200K followers</cite>
        </blockquote>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="lp-cta-section">
        <h2 className="lp-cta-headline">Start managing your brand deals today</h2>
        <Link to="/signup" className="lp-btn-primary">Get started free</Link>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <span className="lp-footer-wordmark">
          <span className="lp-bracket">[</span>in<span className="lp-bracket">]</span>bora
        </span>
        <span className="lp-footer-copy">© 2026 Inbora</span>
      </footer>
    </div>
  );
}
