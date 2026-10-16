"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

const partnerFeedExample = {
  sourceName: "Partner Agency Name",
  listings: [
    {
      externalId: "AGENCY-123",
      title: "Two-bedroom apartment",
      propertyType: "apartment",
      listingPurpose: "rent",
      price: 85000,
      currency: "KES",
      city: "Nairobi",
      county: "Nairobi",
      country: "Kenya",
      neighborhood: "Westlands",
      address: "Example Road",
      latitude: -1.267,
      longitude: 36.811,
      bedrooms: 2,
      bathrooms: 1,
      imageUrl: "https://agency.example/images/agency-123.jpg",
      sourceUrl: "https://agency.example/listings/agency-123",
    },
  ],
};

function formatCounts(intelligence) {
  return Object.entries(intelligence?.openstreetmap_places?.placeCounts || {})
    .map(([category, count]) => `${category.replaceAll("_", " ")}: ${count}`)
    .join(" · ");
}

export default function ListingSourcesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [feed, setFeed] = useState("");
  const [feedFile, setFeedFile] = useState("");
  const [sourceListingId, setSourceListingId] = useState("");
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [intelligence, setIntelligence] = useState(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("quickline_user") || "{}");
      if (!localStorage.getItem("quickline_token") || user.role !== "admin") {
        router.replace("/login");
        return;
      }
      setAuthorized(true);
    } catch {
      router.replace("/login");
    }
  }, [router]);

  async function selectFeed(event) {
    setError("");
    setNotice("");
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 80 * 1024) {
      setError("Partner feed JSON files must be no larger than 80 KB and contain at most 50 listings.");
      event.target.value = "";
      return;
    }
    try {
      const content = await file.text();
      JSON.parse(content);
      setFeed(content);
      setFeedFile(file.name);
    } catch {
      setError("Select a valid JSON partner feed.");
      setFeed("");
      setFeedFile("");
      event.target.value = "";
    }
  }

  async function importPartnerFeed(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    let parsedFeed;
    try {
      parsedFeed = JSON.parse(feed);
    } catch {
      setError("Select a valid JSON partner feed before importing.");
      return;
    }
    setImporting(true);
    try {
      const response = await api("/listings/partners/import", {
        method: "POST",
        body: JSON.stringify(parsedFeed),
      });
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setImporting(false);
    }
  }

  async function refreshIntelligence(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIntelligence(null);
    setRefreshing(true);
    try {
      const response = await api(
        `/listings/${encodeURIComponent(sourceListingId.trim())}/intelligence/refresh`,
        { method: "POST", body: JSON.stringify({}) }
      );
      setIntelligence(response.intelligence);
      setNotice(response.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (!authorized) {
    return <main className="marketer-dashboard-content"><p role="status">Checking administrator access...</p></main>;
  }

  return (
    <main className="marketer-dashboard">
      <header className="marketplace-nav">
        <Link href="/dashboard" className="marketplace-brand">
          <span className="marketplace-logo">QH</span>
          <span><strong>Quickline Homes</strong><small>LISTING SOURCES</small></span>
        </Link>
        <Link href="/admin/marketers">← Marketer requests</Link>
      </header>

      <section className="marketer-dashboard-content">
        <p className="marketplace-kicker">ADMIN WORKSPACE</p>
        <h1>Three listing sources</h1>
        <div className="admin-applications">
          <article className="admin-application">
            <div>
              <span className="application-status status-approved">QUICKLINE-OWNED</span>
              <h2>Quickline Homes listings</h2>
              <p>
                Properties posted by landlords and approved marketers publish to the
                public marketplace as soon as they are submitted. No external provider
                approval or feed sync is required.
              </p>
              <Link href="/payments" className="btn">Open property posting</Link>
            </div>
          </article>

          <article className="admin-application">
            <div>
              <span className="application-status status-approved">OPEN-DATA INTELLIGENCE</span>
              <h2>Location context, not property listings</h2>
              <p>
                OpenStreetMap provides nearby mapped amenities. It is community-maintained,
                not a Kenyan government property registry. WorldPop publishes open
                population research data; the supplied API currently rejects GET requests,
                so its request schema must be confirmed before population estimates are
                displayed.
              </p>
              <form className="landlord-property-form" onSubmit={refreshIntelligence}>
                <div className="payment-field">
                  <label htmlFor="intelligence-listing-id">Quickline marketplace listing ID</label>
                  <input
                    id="intelligence-listing-id"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    required
                    value={sourceListingId}
                    onChange={(event) => setSourceListingId(event.target.value)}
                    placeholder="For example, 42"
                  />
                </div>
                <button className="btn" type="submit" disabled={refreshing}>
                  {refreshing ? "Refreshing nearby places..." : "Refresh OpenStreetMap intelligence"}
                </button>
              </form>
              {intelligence && (
                <div className="marketplace-success" role="status">
                  <p>{formatCounts(intelligence)} within {intelligence.openstreetmap_places.radiusMeters} m.</p>
                  <p>
                    Source: <a href={intelligence.openstreetmap_places.attributionUrl} target="_blank" rel="noreferrer">
                      {intelligence.openstreetmap_places.attribution}
                    </a>
                    {" · "}Updated {new Date(intelligence.fetched_at).toLocaleString()}
                  </p>
                  {intelligence.openstreetmap_places.places.map((place) => (
                    <span key={`${place.category}-${place.name}`}>{place.name} · {place.category}</span>
                  ))}
                </div>
              )}
            </div>
          </article>

          <article className="admin-application">
            <div>
              <span className="application-status status-approved">PARTNER / AGENCY FEEDS</span>
              <h2>Import a normalized JSON feed</h2>
              <p>
                Each agency has its own feed contract. Until a partner adapter is agreed,
                administrators can import a JSON file using Quickline&apos;s normalized
                format. Feeds are validated and upserted by partner name and external ID.
              </p>
              <details>
                <summary>View the required JSON format</summary>
                <pre className="partner-feed-example">{JSON.stringify(partnerFeedExample, null, 2)}</pre>
                <p>Import between 1 and 50 listings per file. Use HTTPS for image and source URLs.</p>
              </details>
              <form className="landlord-property-form" onSubmit={importPartnerFeed}>
                <div className="payment-field">
                  <label htmlFor="partner-feed">Partner JSON file (up to 80 KB)</label>
                  <input id="partner-feed" type="file" accept=".json,application/json" required onChange={selectFeed} />
                </div>
                {feedFile && <p role="status">Selected feed: {feedFile}</p>}
                <button className="btn" type="submit" disabled={importing || !feed}>
                  {importing ? "Importing listings..." : "Import partner listings"}
                </button>
              </form>
            </div>
          </article>
        </div>
        {error && <div className="marketplace-message" role="alert">{error}</div>}
        {notice && <div className="marketplace-success" role="status">{notice}</div>}
      </section>
    </main>
  );
}
