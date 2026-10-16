"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyName: "",
  portfolioUrl: "",
  message: "",
};

export default function MarketerRequestPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api("/marketer/applications", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNotice(response.message);
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="marketer-page">
      <header className="marketplace-nav">
        <Link href="/marketplace" className="marketplace-brand">
          <span className="marketplace-logo">QH</span>
          <span><strong>Quickline Homes</strong><small>MARKETER ACCESS</small></span>
        </Link>
        <Link href="/marketplace">← Back to marketplace</Link>
      </header>
      <section className="marketer-request">
        <p className="marketplace-kicker">PROPERTY PROFESSIONALS</p>
        <h1>Request marketer access</h1>
        <p>Send your marketing details to the Quickline Homes team. Approved marketers receive a one-time invitation to create an account.</p>
        {notice && <div className="marketplace-success" role="status">{notice}</div>}
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        <form onSubmit={submit} className="marketer-form">
          <div className="marketplace-form-row">
            <label>First name<input required name="firstName" value={form.firstName} onChange={update} /></label>
            <label>Last name<input required name="lastName" value={form.lastName} onChange={update} /></label>
          </div>
          <div className="marketplace-form-row">
            <label>Email<input required name="email" type="email" value={form.email} onChange={update} /></label>
            <label>Phone<input required name="phone" type="tel" value={form.phone} onChange={update} /></label>
          </div>
          <label>Agency or company (optional)<input name="companyName" value={form.companyName} onChange={update} /></label>
          <label>Portfolio or business website (optional)<input name="portfolioUrl" type="url" value={form.portfolioUrl} onChange={update} placeholder="https://" /></label>
          <label>Tell us about your marketing work<textarea name="message" rows="4" value={form.message} onChange={update} /></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Sending request..." : "Send access request"}</button>
        </form>
      </section>
    </main>
  );
}
