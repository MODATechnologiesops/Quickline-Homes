"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

export default function MarketerApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");

  const loadApplications = useCallback(async () => {
    const response = await api("/marketer/applications");
    setApplications(response.applications || []);
  }, []);

  useEffect(() => {
    let user;
    try {
      user = JSON.parse(localStorage.getItem("quickline_user") || "{}");
    } catch {
      router.replace("/login");
      return;
    }
    if (!localStorage.getItem("quickline_token") || user.role !== "admin") {
      router.replace("/login");
      return;
    }
    loadApplications().catch((requestError) => setError(requestError.message));
  }, [loadApplications, router]);

  async function review(id, decision) {
    setError("");
    setInvite("");
    try {
      const response = await api(`/marketer/applications/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      if (response.invitationCode) setInvite(response.invitationCode);
      await loadApplications();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="marketer-dashboard">
      <header className="marketplace-nav">
        <Link href="/dashboard" className="marketplace-brand"><span className="marketplace-logo">QH</span><span><strong>Quickline Homes</strong><small>ADMIN REVIEW</small></span></Link>
        <Link href="/dashboard">← Dashboard</Link>
        <Link href="/admin/integrations">Listing sources</Link>
      </header>
      <section className="marketer-dashboard-content">
        <p className="marketplace-kicker">ADMIN WORKSPACE</p>
        <h1>Marketer access requests</h1>
        <p>Approve trusted property marketers before they can create a Quickline Homes account.</p>
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        {invite && (
          <div className="marketplace-success" role="status">
            <strong>One-time invite code (expires in 7 days):</strong>
            <code className="marketer-invite-code">{invite}</code>
            <p>Copy it now and send it securely to the approved applicant. It will not be shown again.</p>
          </div>
        )}
        {!applications.length && <p>No marketer requests found.</p>}
        <div className="admin-applications">
          {applications.map((application) => (
            <article className="admin-application" key={application.id}>
              <div>
                <span className={`application-status status-${application.status}`}>{application.status}</span>
                <h2>{application.first_name} {application.last_name}</h2>
                <p>{application.company_name || "Independent marketer"}</p>
                <a href={`mailto:${application.email}`}>{application.email}</a>
                <a href={`tel:${application.phone}`}>{application.phone}</a>
                {application.portfolio_url && <a href={application.portfolio_url} target="_blank" rel="noreferrer">Portfolio ↗</a>}
                {application.message && <p>{application.message}</p>}
              </div>
              {application.status === "pending" && (
                <div className="admin-application-actions">
                  <button className="btn" type="button" onClick={() => review(application.id, "approve")}>Approve</button>
                  <button className="btn secondary" type="button" onClick={() => review(application.id, "reject")}>Reject</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
