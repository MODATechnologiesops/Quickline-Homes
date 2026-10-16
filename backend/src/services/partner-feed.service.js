import pool from "../config/db.js";

const MAX_LISTINGS_PER_IMPORT = 50;
const MAX_SOURCE_NAME_LENGTH = 80;
const PROPERTY_TYPES = new Set([
    "apartment",
    "house",
    "villa",
    "commercial",
    "office",
    "mall",
    "hostel",
    "warehouse",
    "land",
    "other"
]);
const RESERVED_SOURCES = new Set([
    "quickline homes",
    "government open data",
    "openstreetmap",
    "worldpop"
]);

export class PartnerFeedValidationError extends Error {}
const COLUMNS = [
    "source_platform",
    "source_listing_id",
    "title",
    "description",
    "property_type",
    "listing_purpose",
    "listing_status",
    "city",
    "county",
    "country",
    "neighborhood",
    "address",
    "latitude",
    "longitude",
    "price",
    "currency",
    "bedrooms",
    "bathrooms",
    "floor_area",
    "furnished",
    "available_from",
    "image_url",
    "payment_terms",
    "source_url"
];

function optionalText(value, maxLength, field) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || value.trim().length > maxLength) {
        throw new PartnerFeedValidationError(`${field} must be a string with no more than ${maxLength} characters.`);
    }
    return value.trim() || null;
}

function optionalNumber(value, { field, minimum = 0, maximum = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum || (integer && !Number.isInteger(number))) {
        throw new PartnerFeedValidationError(`${field} is outside its supported range.`);
    }
    return number;
}

function optionalHttpsUrl(value, field) {
    const text = optionalText(value, 2048, field);
    if (!text) return null;
    let url;
    try {
        url = new URL(text);
    } catch {
        throw new PartnerFeedValidationError(`${field} must be a valid HTTPS URL.`);
    }
    if (url.protocol !== "https:") throw new PartnerFeedValidationError(`${field} must be a valid HTTPS URL.`);
    return url.toString();
}

function mapPartnerListing(sourceName, listing, index) {
    if (!listing || typeof listing !== "object" || Array.isArray(listing)) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} must be a JSON object.`);
    }
    const sourceListingId = optionalText(listing.externalId, 100, `Listing ${index + 1} externalId`);
    const title = optionalText(listing.title, 200, `Listing ${index + 1} title`);
    if (!sourceListingId || !title) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} requires externalId and title.`);
    }
    if (!PROPERTY_TYPES.has(listing.propertyType)) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} has an unsupported propertyType.`);
    }
    if (!["rent", "sale"].includes(listing.listingPurpose)) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} listingPurpose must be rent or sale.`);
    }
    if (listing.status !== undefined && !["active", "inactive"].includes(listing.status)) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} status must be active or inactive.`);
    }
    if (listing.furnished !== undefined && typeof listing.furnished !== "boolean") {
        throw new PartnerFeedValidationError(`Listing ${index + 1} furnished must be a boolean.`);
    }
    if (listing.availableFrom !== undefined && listing.availableFrom !== null && listing.availableFrom !== "") {
        const date = typeof listing.availableFrom === "string"
            && /^\d{4}-\d{2}-\d{2}$/.test(listing.availableFrom)
            ? new Date(`${listing.availableFrom}T00:00:00.000Z`)
            : null;
        if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== listing.availableFrom) {
            throw new PartnerFeedValidationError(`Listing ${index + 1} availableFrom must be a valid YYYY-MM-DD date.`);
        }
    }

    const latitude = optionalNumber(listing.latitude, {
        field: `Listing ${index + 1} latitude`,
        minimum: -90,
        maximum: 90
    });
    const longitude = optionalNumber(listing.longitude, {
        field: `Listing ${index + 1} longitude`,
        minimum: -180,
        maximum: 180
    });
    if ((latitude === null) !== (longitude === null)) {
        throw new PartnerFeedValidationError(`Listing ${index + 1} must provide both latitude and longitude.`);
    }

    return {
        source_platform: sourceName,
        source_listing_id: sourceListingId,
        title,
        description: optionalText(listing.description, 8000, `Listing ${index + 1} description`),
        property_type: listing.propertyType,
        listing_purpose: listing.listingPurpose,
        listing_status: listing.status || "active",
        city: optionalText(listing.city, 100, `Listing ${index + 1} city`),
        county: optionalText(listing.county, 100, `Listing ${index + 1} county`),
        country: optionalText(listing.country, 100, `Listing ${index + 1} country`),
        neighborhood: optionalText(listing.neighborhood, 150, `Listing ${index + 1} neighborhood`),
        address: optionalText(listing.address, 500, `Listing ${index + 1} address`),
        latitude,
        longitude,
        price: optionalNumber(listing.price, {
            field: `Listing ${index + 1} price`,
            minimum: 0.01,
            maximum: 9999999999.99
        }),
        currency: optionalText(listing.currency || "KES", 10, `Listing ${index + 1} currency`),
        bedrooms: optionalNumber(listing.bedrooms, {
            field: `Listing ${index + 1} bedrooms`,
            maximum: 100,
            integer: true
        }) ?? 0,
        bathrooms: optionalNumber(listing.bathrooms, {
            field: `Listing ${index + 1} bathrooms`,
            maximum: 100,
            integer: true
        }) ?? 0,
        floor_area: optionalNumber(listing.floorArea, {
            field: `Listing ${index + 1} floorArea`,
            minimum: 0.01,
            maximum: 99999999
        }),
        furnished: listing.furnished ?? false,
        available_from: listing.availableFrom || null,
        image_url: optionalHttpsUrl(listing.imageUrl, `Listing ${index + 1} imageUrl`),
        payment_terms: optionalText(listing.paymentTerms, 2000, `Listing ${index + 1} paymentTerms`),
        source_url: optionalHttpsUrl(listing.sourceUrl, `Listing ${index + 1} sourceUrl`)
    };
}

export function normalizePartnerFeed(body) {
    const sourceName = optionalText(body?.sourceName, MAX_SOURCE_NAME_LENGTH, "sourceName");
    if (!sourceName || RESERVED_SOURCES.has(sourceName.toLowerCase())) {
        throw new PartnerFeedValidationError("Provide a partner or agency sourceName that is not reserved for Quickline or open data.");
    }
    if (!Array.isArray(body?.listings) || body.listings.length < 1 || body.listings.length > MAX_LISTINGS_PER_IMPORT) {
        throw new PartnerFeedValidationError(`Provide between 1 and ${MAX_LISTINGS_PER_IMPORT} partner listings.`);
    }

    const listings = body.listings.map((listing, index) => mapPartnerListing(sourceName, listing, index));
    const uniqueIds = new Set(listings.map((listing) => listing.source_listing_id));
    if (uniqueIds.size !== listings.length) {
        throw new PartnerFeedValidationError("Each listing in a partner feed must have a unique externalId.");
    }
    return listings;
}

export async function importPartnerFeed(body) {
    const listings = normalizePartnerFeed(body);
    const values = [];
    const placeholders = listings.map((listing, rowIndex) => {
        const firstParameter = rowIndex * COLUMNS.length + 1;
        values.push(...COLUMNS.map((column) => listing[column]));
        return `(${COLUMNS.map((_, columnIndex) => `$${firstParameter + columnIndex}`).join(", ")})`;
    });
    const updates = COLUMNS
        .filter((column) => !["source_platform", "source_listing_id"].includes(column))
        .map((column) => `${column} = EXCLUDED.${column}`);
    updates.push("updated_at = CURRENT_TIMESTAMP");

    const result = await pool.query(
        `INSERT INTO property_listings (${COLUMNS.join(", ")})
         VALUES ${placeholders.join(", ")}
         ON CONFLICT (source_platform, source_listing_id)
         DO UPDATE SET ${updates.join(", ")}
         RETURNING id`,
        values
    );
    return { imported: result.rowCount, sourceName: listings[0].source_platform };
}
