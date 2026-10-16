"use client";

import { useState } from "react";
import { api } from "../lib/api";

const initialForm = {
  property_name: "",
  location: "",
  service_date: "",
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  details: "",
};

export default function ServiceRequestForm({ service }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const today = new Date();
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSubmittedRequest(null);
    try {
      const response = await api("/services/requests", {
        method: "POST",
        body: JSON.stringify({ ...form, service_key: service.slug }),
      });
      setSubmittedRequest(response.request);
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="service-booking">
      <div>
        <p className="marketplace-kicker">BOOK A SERVICE</p>
        <h2>Request {service.name}</h2>
        <p>
          Share the property and visit details. Our admin/service team will review your request
          and set the price; no service price is preset here.
        </p>
      </div>

      {submittedRequest && (
        <div className="marketplace-success" role="status">
          <strong>Request submitted</strong>
          <p>
            Your request for {submittedRequest.property_name} is with the service team.
            They will contact you after setting the service price.
          </p>
        </div>
      )}
      {error && <div className="marketplace-message" role="alert">{error}</div>}

      <form className="service-request-form" onSubmit={submit}>
        <div className="marketplace-form-row">
          <label>
            Property name
            <input maxLength="255" required value={form.property_name} onChange={(event) => update("property_name", event.target.value)} />
          </label>
          <label>
            Location
            <input maxLength="500" required value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Area, town, and address" />
          </label>
        </div>
        <div className="marketplace-form-row">
          <label>
            Requested service date
            <input type="date" min={minimumDate} required value={form.service_date} onChange={(event) => update("service_date", event.target.value)} />
          </label>
          <label>
            Your name
            <input maxLength="200" required value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} />
          </label>
        </div>
        <div className="marketplace-form-row">
          <label>
            Email
            <input type="email" maxLength="255" required value={form.customer_email} onChange={(event) => update("customer_email", event.target.value)} />
          </label>
          <label>
            Phone
            <input type="tel" maxLength="30" required value={form.customer_phone} onChange={(event) => update("customer_phone", event.target.value)} />
          </label>
        </div>
        <label>
          Request details
          <textarea rows="4" maxLength="4000" value={form.details} onChange={(event) => update("details", event.target.value)} placeholder="Describe the work or service you need." />
        </label>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit service request"}
        </button>
      </form>
    </section>
  );
}
