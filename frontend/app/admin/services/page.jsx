"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatAmount(value) {
  if (value == null) return "Not set";
  return `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    const response = await api("/services/requests");
    setRequests(response.requests || []);
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
    loadRequests()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [loadRequests, router]);

  async function updateRequest(request, status) {
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      const body = { status };
      if (status === "booked") body.admin_price = prices[request.id] ?? "";
      const response = await api(`/services/requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNotice(response.message || "Service request updated.");
      await loadRequests();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-services-page">
      <header className="marketplace-nav">
        <Link href="/dashboard" className="marketplace-brand">
          <span className="marketplace-logo">QH</span>
          <span><strong>Quickline Homes</strong><small>SERVICE MANAGEMENT</small></span>
        </Link>
        <Link href="/dashboard">← Dashboard</Link>
      </header>
      <section className="admin-services-content">
        <p className="marketplace-kicker">ADMIN / SERVICE PROVIDER</p>
        <h1>Service request board</h1>
        <p>Review requested properties, locations, and service dates. Set the price before confirming a booking.</p>
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        {notice && <div className="marketplace-success" role="status">{notice}</div>}
        {loading && <p role="status">Loading service requests...</p>}
        {!loading && !error && requests.length === 0 && (
          <div className="marketplace-empty"><h2>No service requests yet</h2><p>New customer requests will appear here.</p></div>
        )}
        <div className="service-request-board">
          {requests.map((request) => (
            <article className="service-request-card" key={request.id}>
              <div className="service-request-card-heading">
                <div>
                  <span className={`application-status status-${request.status}`}>{request.status}</span>
                  <h2>{request.service_name}</h2>
                </div>
                <span className="service-request-price">{formatAmount(request.admin_price)}</span>
              </div>
              <dl className="service-request-details">
                <div><dt>Property</dt><dd>{request.property_name}</dd></div>
                <div><dt>Location</dt><dd>{request.location}</dd></div>
                <div><dt>Service date</dt><dd>{formatDate(request.service_date)}</dd></div>
                <div><dt>Customer</dt><dd>{request.customer_name}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${request.customer_email}`}>{request.customer_email}</a></dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${request.customer_phone}`}>{request.customer_phone}</a></dd></div>
                {request.details && <div className="service-request-notes"><dt>Request details</dt><dd>{request.details}</dd></div>}
              </dl>
              {request.status === "requested" && (
                <div className="service-request-admin-actions">
                  <label>
                    Set service price (KES)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={prices[request.id] ?? ""}
                      onChange={(event) => setPrices((current) => ({ ...current, [request.id]: event.target.value }))}
                    />
                  </label>
                  <button className="btn" type="button" disabled={busyId === request.id} onClick={() => updateRequest(request, "booked")}>
                    {busyId === request.id ? "Saving..." : "Set price & confirm booking"}
                  </button>
                  <button className="btn secondary" type="button" disabled={busyId === request.id} onClick={() => updateRequest(request, "cancelled")}>
                    Decline request
                  </button>
                </div>
              )}
              {request.status === "booked" && (
                <button className="btn" type="button" disabled={busyId === request.id} onClick={() => updateRequest(request, "completed")}>
                  {busyId === request.id ? "Saving..." : "Mark service completed"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
