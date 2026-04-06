import React, { useState } from "react";
import { parseThread } from "../utils";

export default function PasteModal({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);

  const handleParse = () => {
    if (!text.trim()) { setError("Paste a thread first."); return; }
    const result = parseThread(text);
    if (!result.brand && !result.contactEmail) {
      setError("Couldn't extract details — make sure the text includes a brand name or email address.");
      return;
    }
    setError("");
    setParsed(result);
    setForm({
      brand: result.brand || "",
      contactName: result.contactName || "",
      contactEmail: result.contactEmail || "",
      product: "",
      offer: result.offer || "",
      theirRate: result.theirRate ? String(result.theirRate) : "",
      yourRate: "",
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleAdd = () => {
    if (!form.brand.trim()) { setError("Brand name is required."); return; }
    const initials = form.brand.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["#7C5CFC","#F59E0B","#10B981","#3B82F6","#EF4444","#EC4899","#8B5CF6","#0EA5E9","#F97316","#14B8A6"];
    const colorIdx = form.brand.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length;
    const today = new Date().toISOString().slice(0, 10);

    onAdd({
      id: Date.now(),
      brand: form.brand.trim(),
      logo: initials,
      logoColor: colors[colorIdx],
      domain: form.contactEmail ? form.contactEmail.split("@")[1] : null,
      contact: {
        name: form.contactName.trim(),
        email: form.contactEmail.trim(),
      },
      firstReached: today,
      lastMessage: today,
      offer: form.offer.trim(),
      theirRate: form.theirRate.trim().toLowerCase() === "product" ? "product" : parseFloat(form.theirRate) || null,
      yourRate: parseFloat(form.yourRate) || null,
      product: form.product.trim() || null,
      status: "reply_needed",
      revenue: null,
      category: "",
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Paste Thread</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!parsed ? (
          <>
            <p className="modal-hint">
              Paste a raw email or DM from a brand. Claused will extract the contact, offer, and rate automatically.
            </p>
            <textarea
              className="modal-textarea"
              value={text}
              onChange={(e) => { setText(e.target.value); setError(""); }}
              placeholder={"Hi! I'm Sarah from Fresh Step — we'd love to collaborate on a sponsored Instagram Reel. Our budget is $1,500. sarah.chen@freshstep.com"}
              rows={8}
              autoFocus
            />
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={handleParse}>Parse thread</button>
              <button className="modal-btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <p className="modal-hint">Review and adjust what was extracted, then add.</p>
            <div className="modal-form">
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Brand *</label>
                  <input value={form.brand} onChange={set("brand")} placeholder="e.g. Fresh Step" />
                </div>
                <div className="modal-field">
                  <label>Contact name</label>
                  <input value={form.contactName} onChange={set("contactName")} placeholder="e.g. Sarah Chen" />
                </div>
              </div>
              <div className="modal-field">
                <label>Contact email</label>
                <input value={form.contactEmail} onChange={set("contactEmail")} placeholder="e.g. sarah@brand.com" />
              </div>
              <div className="modal-field">
                <label>Product they're pitching</label>
                <input value={form.product} onChange={set("product")} placeholder="e.g. Litter Genie Plus Disposal System" />
              </div>
              <div className="modal-field">
                <label>What they offered</label>
                <input value={form.offer} onChange={set("offer")} placeholder="e.g. Sponsored Reel + Story Set" />
              </div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Their rate ($) — or type "product"</label>
                  <input value={form.theirRate} onChange={set("theirRate")} placeholder="e.g. 1500 or product" />
                </div>
                <div className="modal-field">
                  <label>Your rate ($)</label>
                  <input value={form.yourRate} onChange={set("yourRate")} type="number" min="0" placeholder="e.g. 2500" />
                </div>
              </div>
            </div>
            {error && <div className="modal-error">{error}</div>}
            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={handleAdd}>Add brand</button>
              <button className="modal-btn-ghost" onClick={() => { setParsed(null); setForm(null); }}>← Re-paste</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
