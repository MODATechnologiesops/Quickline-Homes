"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

export default function MarketerOnboard({ invitationCode }) {
  const router = useRouter();
  const [form, setForm] = useState({ invitationCode, firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api("/auth/marketer/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("quickline_token", response.token);
      localStorage.setItem("quickline_user", JSON.stringify(response.user));
      router.replace("/marketer/dashboard");
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
          <span><strong>Quickline Homes</strong><small>MARKETER ACCOUNT</small></span>
        </Link>
        <Link href="/login">Log in</Link>
      </header>
      <section className="marketer-request">
        <p className="marketplace-kicker">APPROVED MARKETER</p>
        <h1>Create your marketer account</h1>
        <p>Use the approved email address and one-time invitation code sent by the Quickline Homes administrator.</p>
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        <form className="marketer-form" onSubmit={submit}>
          <label>Invitation code<input required name="invitationCode" value={form.invitationCode} onChange={update} /></label>
          <div className="marketplace-form-row">
            <label>First name<input required name="firstName" value={form.firstName} onChange={update} /></label>
            <label>Last name<input required name="lastName" value={form.lastName} onChange={update} /></label>
          </div>
          <label>Approved email<input required type="email" name="email" value={form.email} onChange={update} /></label>
          <label>Phone<input required name="phone" type="tel" value={form.phone} onChange={update} /></label>
          <label>Password<input required name="password" type="password" minLength={8} value={form.password} onChange={update} /></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}
