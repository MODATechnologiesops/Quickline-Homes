"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

function formatMoney(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/payments/history")
      .then((response) => setPayments(response.payments || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="payment-card payment-history">
      <div className="landlord-section-heading">
        <div>
          <span className="method-number">TRANSACTION RECORDS</span>
          <h2>Payment history</h2>
          <p>Payments linked to your account and properties.</p>
        </div>
      </div>
      {error && <div className="payment-alert error" role="alert">{error}</div>}
      {loading && <p role="status">Loading payment history...</p>}
      {!loading && !error && payments.length === 0 && (
        <div className="empty">
          <h3>No payment history yet</h3>
          <p>Completed and pending payments linked to your account will appear here.</p>
        </div>
      )}
      {!loading && !error && payments.length > 0 && (
        <div className="table-scroll">
          <table className="payment-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference / details</th>
                <th>Payer</th>
                <th>Method</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.paid_at || payment.created_at)}</td>
                  <td>
                    {[
                      payment.reference,
                      payment.charge_reference,
                      payment.transaction_reference,
                      payment.description,
                    ].filter(Boolean).join(" · ") || `Payment #${payment.id}`}
                  </td>
                  <td>{payment.tenant_name || "—"}</td>
                  <td>{payment.payment_method || "—"}</td>
                  <td><span className={`payment-history-status status-${payment.status}`}>{payment.status || "unknown"}</span></td>
                  <td>{formatMoney(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
