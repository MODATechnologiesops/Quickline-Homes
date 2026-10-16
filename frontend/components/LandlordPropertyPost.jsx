"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const initialForm = {
  name: "",
  propertyType: "",
  listingPurpose: "rent",
  price: "",
  description: "",
  address: "",
  city: "",
  county: "",
  neighborhood: "",
  bedrooms: "0",
  bathrooms: "0",
  floorArea: "",
  totalUnits: "0",
  availableFrom: "",
  furnished: "false",
  paymentTerms: "",
};

export default function LandlordPropertyPost() {
  const [form, setForm] = useState(initialForm);
  const [images, setImages] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProperties = useCallback(async () => {
    const response = await api("/properties");
    setProperties(response.properties || []);
  }, []);

  useEffect(() => {
    loadProperties()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [loadProperties]);

  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    const previews = images.map((image) => URL.createObjectURL(image));
    setImagePreviews(previews);
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function chooseImages(event) {
    const selected = Array.from(event.target.files || []);
    setError("");
    if (selected.length > 8) {
      setError("Choose no more than 8 property images.");
      event.target.value = "";
      return;
    }
    const invalid = selected.find(
      (image) =>
        !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
        image.size > 5 * 1024 * 1024
    );
    if (invalid) {
      setError("Each property image must be JPEG, PNG, or WebP and no larger than 5 MB.");
      event.target.value = "";
      return;
    }
    setImages(selected);
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setNotice("");

    if (!images.length) {
      setError("Add at least one property image before publishing.");
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      images.forEach((image) => body.append("images", image));
      const response = await api("/properties/marketplace", {
        method: "POST",
        body,
      });
      setNotice(response.message || "Your property has been published.");
      setForm(initialForm);
      setImages([]);
      formElement.reset();
      await loadProperties();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="landlord-post-page">
      <section className="payment-card landlord-post-card">
        <div className="landlord-section-heading">
          <div>
            <span className="method-number">LANDLORD WORKSPACE</span>
            <h2>Post a property</h2>
            <p>Property details and photos are published to the public Quickline Homes marketplace.</p>
          </div>
        </div>
        {error && <div className="payment-alert error" role="alert">{error}</div>}
        {notice && <div className="payment-alert success" role="status">{notice}</div>}

        <form className="landlord-property-form" onSubmit={submit}>
          <div className="payment-method-grid">
            <div className="payment-field">
              <label htmlFor="listing-name">Property name</label>
              <input id="listing-name" maxLength="255" required value={form.name} onChange={(event) => change("name", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-type">Property type</label>
              <select id="listing-type" required value={form.propertyType} onChange={(event) => change("propertyType", event.target.value)}>
                <option value="">Select a type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="commercial">Commercial</option>
                <option value="office">Office</option>
                <option value="mall">Mall</option>
                <option value="hostel">Hostel</option>
                <option value="warehouse">Warehouse</option>
                <option value="land">Land</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="payment-field">
            <label htmlFor="listing-address">Street address</label>
            <input id="listing-address" maxLength="500" required value={form.address} onChange={(event) => change("address", event.target.value)} />
          </div>
          <div className="payment-method-grid">
            <div className="payment-field">
              <label htmlFor="listing-city">City / town</label>
              <input id="listing-city" maxLength="100" value={form.city} onChange={(event) => change("city", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-county">County</label>
              <input id="listing-county" maxLength="100" value={form.county} onChange={(event) => change("county", event.target.value)} />
            </div>
          </div>
          <div className="payment-field">
            <label htmlFor="listing-neighborhood">Neighborhood / area</label>
            <input id="listing-neighborhood" maxLength="150" value={form.neighborhood} onChange={(event) => change("neighborhood", event.target.value)} />
          </div>
          <div className="payment-field">
            <label htmlFor="listing-description">Property details</label>
            <textarea id="listing-description" rows="4" maxLength="8000" value={form.description} onChange={(event) => change("description", event.target.value)} placeholder="Describe the property and its features." />
          </div>

          <div className="landlord-listing-price-row">
            <div className="payment-field">
              <label htmlFor="listing-purpose">Listing purpose</label>
              <select id="listing-purpose" value={form.listingPurpose} onChange={(event) => change("listingPurpose", event.target.value)}>
                <option value="rent">For rent</option>
                <option value="sale">For sale</option>
              </select>
            </div>
            <div className="payment-field">
              <label htmlFor="listing-price">Price (KES)</label>
              <input id="listing-price" type="number" min="0.01" max="9999999999.99" step="0.01" required value={form.price} onChange={(event) => change("price", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-available">Available from</label>
              <input id="listing-available" type="date" value={form.availableFrom} onChange={(event) => change("availableFrom", event.target.value)} />
            </div>
          </div>
          <div className="landlord-listing-price-row">
            <div className="payment-field">
              <label htmlFor="listing-bedrooms">Bedrooms</label>
              <input id="listing-bedrooms" type="number" min="0" max="100" step="1" value={form.bedrooms} onChange={(event) => change("bedrooms", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-bathrooms">Bathrooms</label>
              <input id="listing-bathrooms" type="number" min="0" max="100" step="1" value={form.bathrooms} onChange={(event) => change("bathrooms", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-area">Floor area (m²)</label>
              <input id="listing-area" type="number" min="0.01" step="0.01" value={form.floorArea} onChange={(event) => change("floorArea", event.target.value)} />
            </div>
          </div>
          <div className="payment-method-grid">
            <div className="payment-field">
              <label htmlFor="listing-units">Number of units</label>
              <input id="listing-units" type="number" min="0" step="1" value={form.totalUnits} onChange={(event) => change("totalUnits", event.target.value)} />
            </div>
            <div className="payment-field">
              <label htmlFor="listing-furnished">Furnished</label>
              <select id="listing-furnished" value={form.furnished} onChange={(event) => change("furnished", event.target.value)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div className="payment-field">
            <label htmlFor="listing-payment-terms">Payment / booking details</label>
            <textarea id="listing-payment-terms" rows="3" maxLength="2000" value={form.paymentTerms} onChange={(event) => change("paymentTerms", event.target.value)} placeholder="Optional payment details or booking requirements." />
          </div>
          <div className="payment-field">
            <label htmlFor="listing-images">Property images (up to 8, 5 MB each)</label>
            <input id="listing-images" type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={chooseImages} />
          </div>
          {images.length > 0 && (
            <div className="property-image-preview-grid" aria-label="Selected property images">
              {images.map((image, index) => (
                <div className="property-image-preview" key={`${image.name}-${image.lastModified}`}>
                  <img src={imagePreviews[index]} alt={`Selected property photo ${index + 1}`} />
                  <span>{image.name}</span>
                </div>
              ))}
            </div>
          )}
          <button className="payment-button" type="submit" disabled={submitting}>
            {submitting ? "Publishing..." : "Publish property to marketplace"}
          </button>
        </form>
      </section>

      <section className="payment-card landlord-properties-list">
        <h2>Your properties</h2>
        {loading && <p role="status">Loading your properties...</p>}
        {!loading && !properties.length && <p>You have not posted a property yet.</p>}
        {properties.map((property) => (
          <article className="landlord-property-row" key={property.id}>
            {property.image_url && <img src={property.image_url} alt={property.name} />}
            <div>
              <strong>{property.name}</strong>
              <span>{[property.address, property.city, property.county].filter(Boolean).join(", ")}</span>
              <small>{property.property_type || "Property"} · {property.status || "active"}</small>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
