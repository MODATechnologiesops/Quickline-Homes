"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

const emptyListing = {
  title: "",
  description: "",
  property_type: "apartment",
  listing_purpose: "rent",
  city: "",
  county: "",
  neighborhood: "",
  address: "",
  price: "",
  currency: "KES",
  bedrooms: 1,
  bathrooms: 1,
  floor_area: "",
  furnished: false,
  available_from: "",
  image_url: "",
  payment_terms: "",
  source_platform: "Quickline Homes",
  source_url: "",
};

export default function MarketerDashboard() {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [form, setForm] = useState(emptyListing);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [listingResponse, inquiryResponse] = await Promise.all([
      api("/marketer/listings"),
      api("/marketer/inquiries"),
    ]);
    setListings(listingResponse.listings || []);
    setInquiries(inquiryResponse.inquiries || []);
  }, []);

  useEffect(() => {
    let user;
    try {
      user = JSON.parse(localStorage.getItem("quickline_user") || "{}");
    } catch {
      router.replace("/login");
      return;
    }
    if (!localStorage.getItem("quickline_token") || user.role !== "marketer") {
      router.replace("/login");
      return;
    }
    loadData().catch((requestError) => setError(requestError.message));
  }, [loadData, router]);

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function createListing(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/marketer/listings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          floor_area: form.floor_area ? Number(form.floor_area) : null,
        }),
      });
      setForm(emptyListing);
      setNotice("Property listing published to the public marketplace.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveListing(id) {
    if (!window.confirm("Remove this property from the public marketplace?")) return;
    try {
      await api(`/marketer/listings/${id}`, { method: "DELETE" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateInquiry(id, status) {
    try {
      await api(`/marketer/inquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function logout() {
    localStorage.removeItem("quickline_token");
    localStorage.removeItem("quickline_user");
    router.replace("/login");
  }

  return (
    <main className="marketer-dashboard">
      <header className="marketplace-nav">
        <Link href="/marketplace" className="marketplace-brand">
          <span className="marketplace-logo">QH</span>
          <span><strong>Quickline Homes</strong><small>MARKETER WORKSPACE</small></span>
        </Link>
        <div className="marketer-nav-actions">
          <Link href="/marketplace">Public marketplace</Link>
          <button type="button" onClick={logout}>Log out</button>
        </div>
      </header>
      <section className="marketer-dashboard-content">
        <p className="marketplace-kicker">MARKETER WORKSPACE</p>
        <h1>Your property listings</h1>
        <p>Publish property details, photos and approved external listing references. Reservation requests are inquiries only; there is no online payment collection.</p>
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        {notice && <div className="marketplace-success" role="status">{notice}</div>}

        <div className="marketer-dashboard-grid">
          <section className="marketer-panel">
            <h2>Publish a property</h2>
            <form className="marketer-form" onSubmit={createListing}>
              <label>Property name<input required name="title" value={form.title} onChange={update} /></label>
              <div className="marketplace-form-row">
                <label>Type<select name="property_type" value={form.property_type} onChange={update}><option value="apartment">Apartment</option><option value="house">House</option><option value="villa">Villa</option><option value="commercial">Commercial</option><option value="office">Office</option><option value="land">Land</option><option value="other">Other</option></select></label>
                <label>Listing purpose<select name="listing_purpose" value={form.listing_purpose} onChange={update}><option value="rent">Rent</option><option value="sale">Sale</option></select></label>
              </div>
              <div className="marketplace-form-row">
                <label>Price<input required name="price" type="number" min="1" value={form.price} onChange={update} /></label>
                <label>Currency<input required name="currency" value={form.currency} onChange={update} /></label>
              </div>
              <div className="marketplace-form-row">
                <label>City<input name="city" value={form.city} onChange={update} /></label>
                <label>County<input name="county" value={form.county} onChange={update} /></label>
              </div>
              <label>Neighborhood<input name="neighborhood" value={form.neighborhood} onChange={update} /></label>
              <label>Address<input name="address" value={form.address} onChange={update} /></label>
              <div className="marketplace-form-row">
                <label>Bedrooms<input name="bedrooms" type="number" min="0" value={form.bedrooms} onChange={update} /></label>
                <label>Bathrooms<input name="bathrooms" type="number" min="0" value={form.bathrooms} onChange={update} /></label>
              </div>
              <label>Property image URL<input required type="url" name="image_url" placeholder="https://" value={form.image_url} onChange={update} /></label>
              <label>Description<textarea rows="4" name="description" value={form.description} onChange={update} /></label>
              <label>Payment terms or details<textarea rows="3" name="payment_terms" value={form.payment_terms} onChange={update} placeholder="State verified payment terms. Customers send an inquiry first; no online payment is taken." /></label>
              <div className="marketplace-form-row">
                <label>Listing source<select name="source_platform" value={form.source_platform} onChange={update}><option>Quickline Homes</option><option>Partner / Agency</option><option>Other</option></select></label>
                <label>Original listing URL<input type="url" name="source_url" placeholder="https://" value={form.source_url} onChange={update} /></label>
              </div>
              <button className="btn" disabled={busy}>{busy ? "Publishing..." : "Publish listing"}</button>
            </form>
          </section>

          <section className="marketer-panel">
            <h2>Your listings <span className="marketer-count">{listings.length}</span></h2>
            {!listings.length && <p>You have not published any properties yet.</p>}
            <div className="marketer-list">
              {listings.map((listing) => (
                <article className="marketer-listing" key={listing.id}>
                  <img src={listing.image_url || "/images/apartment-building.png"} alt={listing.title} />
                  <div>
                    <strong>{listing.title}</strong>
                    <span>{listing.currency} {Number(listing.price).toLocaleString()} · {listing.city || "Location pending"}</span>
                    <span>{listing.listing_status}</span>
                  </div>
                  <button type="button" onClick={() => archiveListing(listing.id)}>Archive</button>
                </article>
              ))}
            </div>

            <h2 className="marketer-inquiries-heading">Reservation inquiries <span className="marketer-count">{inquiries.length}</span></h2>
            {!inquiries.length && <p>New customer requests will appear here.</p>}
            <div className="marketer-list">
              {inquiries.map((inquiry) => (
                <article className="marketer-inquiry" key={inquiry.id}>
                  <strong>{inquiry.name} · {inquiry.listing_title}</strong>
                  <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                  <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                  {inquiry.message && <p>{inquiry.message}</p>}
                  <label>Status<select value={inquiry.status} onChange={(event) => updateInquiry(inquiry.id, event.target.value)}><option value="pending">Pending</option><option value="contacted">Contacted</option><option value="resolved">Resolved</option><option value="cancelled">Cancelled</option></select></label>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
