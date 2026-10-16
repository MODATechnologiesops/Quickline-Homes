"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import SiteHeader from "./SiteHeader";

const fallbackImage = "/images/apartment-building.png";

function formatPrice(listing) {
  if (listing.price === null || listing.price === undefined || listing.price === "") {
    return "Price on request";
  }
  const amount = Number(listing.price);
  if (!Number.isFinite(amount)) return "Price on request";
  return `${listing.currency || "KES"} ${amount.toLocaleString("en-KE")}${
    listing.listing_purpose === "rent" ? " / month" : ""
  }`;
}

export default function Marketplace({ embedded = false }) {
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [locationIntelligence, setLocationIntelligence] = useState(null);
  const [intelligenceError, setIntelligenceError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [inquiryError, setInquiryError] = useState("");

  useEffect(() => {
    api("/listings?limit=100&sort=featured")
      .then((response) => setListings(response.data || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!selected) {
      setLocationIntelligence(null);
      setIntelligenceError("");
      return;
    }
    let current = true;
    setLocationIntelligence(null);
    setIntelligenceError("");
    api(`/listings/${selected.id}/intelligence`)
      .then((response) => {
        if (current) setLocationIntelligence(response.intelligence);
      })
      .catch((requestError) => {
        if (current) setIntelligenceError(requestError.message);
      });
    return () => {
      current = false;
    };
  }, [selected]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesPurpose = !purpose || listing.listing_purpose === purpose;
      const searchable = [
        listing.title,
        listing.description,
        listing.city,
        listing.county,
        listing.country,
        listing.neighborhood,
        listing.property_type,
        listing.source_platform,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesPurpose && (!term || searchable.includes(term));
    });
  }, [listings, purpose, query]);

  function openListing(listing) {
    setSelected(listing);
    setNotice("");
    setInquiryError("");
    setForm({ name: "", email: "", phone: "", message: "" });
  }

  async function submitInquiry(event) {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setNotice("");
    setInquiryError("");
    try {
      const response = await api(`/listings/${selected.id}/inquiries`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNotice(response.message || "Your inquiry has been sent.");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (requestError) {
      setInquiryError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  const Wrapper = embedded ? "div" : "main";

  return (
    <Wrapper className={`marketplace${embedded ? " marketplace-embedded" : ""}`}>
      {!embedded && (
        <>
          <SiteHeader />

          <section className="marketplace-hero">
            <p className="marketplace-kicker">QUICKLINE HOMES / MARKETPLACE</p>
            <h1>Find a place to <em>feel at home.</em></h1>
            <p>Explore properties posted by Quickline marketers, including listings sourced from external platforms.</p>
            <div className="marketplace-search">
              <label className="marketplace-search-input">
                <span>Search by place or property</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try Nairobi, apartment, Westlands..."
                />
              </label>
              <label className="marketplace-search-purpose">
                <span>Looking to</span>
                <select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                  <option value="">Rent or buy</option>
                  <option value="rent">Rent</option>
                  <option value="sale">Buy</option>
                </select>
              </label>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  document.getElementById("marketplace-listings")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                Find properties
              </button>
            </div>
          </section>
        </>
      )}

      <section className={`marketplace-results${embedded ? " marketplace-results-embedded" : ""}`} id="marketplace-listings">
        {embedded && (
          <>
            <p className="marketplace-kicker">QUICKLINE HOMES MARKETPLACE</p>
            <div className="marketplace-search marketplace-embedded-search">
              <label className="marketplace-search-input">
                <span>Search by place or property</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Try Nairobi, apartment, Westlands..."
                />
              </label>
              <label className="marketplace-search-purpose">
                <span>Looking to</span>
                <select value={purpose} onChange={(event) => setPurpose(event.target.value)}>
                  <option value="">Rent or buy</option>
                  <option value="rent">Rent</option>
                  <option value="sale">Buy</option>
                </select>
              </label>
            </div>
          </>
        )}
        <div className="marketplace-results-heading">
          <div>
            <p className="marketplace-kicker">AVAILABLE PROPERTIES</p>
            <h2>{embedded ? "Find your next place" : "Explore the marketplace"}</h2>
          </div>
          <span>{filtered.length} {filtered.length === 1 ? "property" : "properties"}</span>
        </div>

        {busy && <p role="status">Loading available properties...</p>}
        {error && <div className="marketplace-message" role="alert">Could not load listings: {error}</div>}
        {!busy && !error && filtered.length === 0 && (
          <div className="marketplace-empty">
            <h3>No matching properties yet</h3>
            <p>Try another search, or check back as marketers add new properties.</p>
          </div>
        )}

        <div className="marketplace-grid">
          {filtered.map((listing) => (
            <article className="property-card" key={listing.id}>
              <div className="property-card-image">
                <img
                  src={listing.image_url || fallbackImage}
                  alt={listing.title}
                  onError={(event) => {
                    event.currentTarget.src = fallbackImage;
                  }}
                />
                <span>{listing.listing_purpose === "sale" ? "FOR SALE" : "FOR RENT"}</span>
              </div>
              <div className="property-card-content">
                <p className="property-card-source">
                  {listing.source_platform || "Quickline Homes"}
                </p>
                <h3>{listing.title}</h3>
                <p className="property-card-location">
                  {[listing.neighborhood, listing.city, listing.county, listing.country].filter(Boolean).join(", ") ||
                    "Location on request"}
                </p>
                <div className="property-card-features">
                  {listing.bedrooms != null && <span>{listing.bedrooms} beds</span>}
                  {listing.bathrooms != null && <span>{listing.bathrooms} baths</span>}
                  {listing.property_type && <span>{listing.property_type.replaceAll("_", " ")}</span>}
                </div>
                <div className="property-card-footer">
                  <strong>{formatPrice(listing)}</strong>
                  <button type="button" className="btn" onClick={() => openListing(listing)}>
                    View details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!embedded && (
        <section className="marketplace-marketer-cta">
          <div>
            <p className="marketplace-kicker">PROPERTY PROFESSIONALS</p>
            <h2>Are you a property marketer?</h2>
            <p>Request access to publish listings and manage customer reservation inquiries.</p>
          </div>
          <Link href="/marketer" className="btn">Request marketer access</Link>
        </section>
      )}

      {!embedded && (
        <footer className="marketplace-footer">
          <span>Quickline Homes · Your Property. Our Priority. Your Peace of Mind.</span>
          <Link href="/marketplace">Explore marketplace</Link>
        </footer>
      )}

      {selected && (
        <div
          className="marketplace-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="marketplace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-title"
          >
            <button
              type="button"
              className="marketplace-modal-close"
              aria-label="Close listing details"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <img
              className="marketplace-modal-image"
              src={selected.image_url || fallbackImage}
              alt={selected.title}
              onError={(event) => { event.currentTarget.src = fallbackImage; }}
            />
            <div className="marketplace-modal-body">
              <p className="marketplace-kicker">{selected.source_platform || "Quickline Homes"}</p>
              <h2 id="listing-title">{selected.title}</h2>
              <strong className="marketplace-detail-price">{formatPrice(selected)}</strong>
              <p>{[selected.address, selected.neighborhood, selected.city, selected.county, selected.country]
                .filter(Boolean).join(", ") || "Location details available from the marketer."}</p>
              {locationIntelligence?.openstreetmap_places && (
                <aside className="marketplace-location-intelligence">
                  <strong>Nearby mapped places</strong>
                  <p>
                    {Object.entries(locationIntelligence.openstreetmap_places.placeCounts)
                      .filter(([, count]) => count > 0)
                      .map(([category, count]) => `${count} ${category.replaceAll("_", " ")}`)
                      .join(" · ") || "No mapped nearby places were found."}
                    {" "}within {locationIntelligence.openstreetmap_places.radiusMeters} m.
                  </p>
                  <small>
                    <a
                      href={locationIntelligence.openstreetmap_places.attributionUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {locationIntelligence.openstreetmap_places.attribution}
                    </a>
                    {" · "}Updated {new Date(locationIntelligence.fetched_at).toLocaleDateString()}
                  </small>
                </aside>
              )}
              {intelligenceError && (
                <p className="marketplace-intelligence-error" role="status">
                  Location intelligence is temporarily unavailable.
                </p>
              )}
              <div className="marketplace-detail-features">
                <span>{selected.property_type?.replaceAll("_", " ") || "Property"}</span>
                {selected.bedrooms != null && <span>{selected.bedrooms} bedrooms</span>}
                {selected.bathrooms != null && <span>{selected.bathrooms} bathrooms</span>}
                {selected.floor_area && <span>{selected.floor_area} m²</span>}
                {selected.furnished && <span>Furnished</span>}
                {selected.available_from && <span>Available {selected.available_from}</span>}
              </div>
              {selected.description && <p className="marketplace-listing-description">{selected.description}</p>}
              {selected.payment_terms && (
                <div className="marketplace-payment-terms">
                  <strong>Payment details</strong>
                  <p>{selected.payment_terms}</p>
                </div>
              )}
              {!selected.payment_terms && (
                <p className="marketplace-payment-note">
                  Payment arrangements are confirmed directly with the marketer after availability is verified.
                  Do not send payment before receiving verified details and written terms.
                </p>
              )}
              {selected.source_url && (
                <a className="marketplace-source-link" href={selected.source_url} target="_blank" rel="noreferrer">
                  {selected.source_platform === "Quickline Homes" ? "View Quickline listing" : "View original listing ↗"}
                </a>
              )}
              <form className="marketplace-inquiry-form" onSubmit={submitInquiry}>
                <h3>Request a viewing or reservation</h3>
                <p>This sends an inquiry; it does not charge you or guarantee a booking.</p>
                {notice && <div className="marketplace-success" role="status">{notice}</div>}
                {inquiryError && <div className="marketplace-message" role="alert">{inquiryError}</div>}
                <div className="marketplace-form-row">
                  <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                  <label>Phone<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                </div>
                <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label>Message (optional)<textarea rows="3" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Ask about viewing times, availability, or terms." /></label>
                <button type="submit" className="btn" disabled={sending}>
                  {sending ? "Sending..." : "Send inquiry"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </Wrapper>
  );
}
