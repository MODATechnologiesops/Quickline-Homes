import pool from "../config/db.js";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_METERS = 1000;
const PLACE_CATEGORIES = ["amenity", "shop", "leisure", "public_transport"];

function overpassQuery(latitude, longitude) {
    const nearby = PLACE_CATEGORIES
        .map((category) => `nwr(around:${SEARCH_RADIUS_METERS},${latitude},${longitude})[${category}];`)
        .join("\n");
    return `[out:json][timeout:25];\n(\n${nearby}\n);\nout center tags;`;
}

export function summarizeOpenStreetMap(data) {
    if (!data || !Array.isArray(data.elements)) {
        throw new Error("OpenStreetMap returned an invalid places response.");
    }
    const counts = Object.fromEntries(PLACE_CATEGORIES.map((category) => [category, 0]));
    const places = [];
    const seen = new Set();

    for (const element of data.elements) {
        const category = PLACE_CATEGORIES.find((key) => typeof element.tags?.[key] === "string");
        if (!category) continue;
        counts[category] += 1;

        const name = typeof element.tags.name === "string" ? element.tags.name.trim() : "";
        if (name && places.length < 20) {
            const identity = `${element.type}:${element.id}`;
            if (!seen.has(identity)) {
                seen.add(identity);
                places.push({
                    name: name.slice(0, 160),
                    category,
                    type: element.tags[category]
                });
            }
        }
    }

    return {
        radiusMeters: SEARCH_RADIUS_METERS,
        placeCounts: counts,
        places,
        attribution: "© OpenStreetMap contributors",
        attributionUrl: "https://www.openstreetmap.org/copyright",
        fetchedAt: new Date().toISOString()
    };
}

export async function getListingLocationIntelligence(listingId) {
    const result = await pool.query(
        `SELECT intelligence.openstreetmap_places, intelligence.fetched_at
         FROM property_listing_intelligence AS intelligence
         JOIN property_listings AS listing
           ON listing.id = intelligence.listing_id
         WHERE intelligence.listing_id = $1
           AND listing.listing_status = 'active'`,
        [listingId]
    );
    return result.rows[0] || null;
}

export async function refreshListingLocationIntelligence(listingId) {
    const listingResult = await pool.query(
        `SELECT id, latitude, longitude
         FROM property_listings
         WHERE id = $1 AND listing_status = 'active'`,
        [listingId]
    );
    const listing = listingResult.rows[0];
    if (!listing) {
        const error = new Error("Active listing not found.");
        error.statusCode = 404;
        throw error;
    }
    if (listing.latitude === null || listing.longitude === null) {
        const error = new Error("Add latitude and longitude to the listing before refreshing location intelligence.");
        error.statusCode = 400;
        throw error;
    }

    let response;
    try {
        response = await fetch(OVERPASS_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "QuicklineHomes/1.0 (open-data location intelligence)"
            },
            body: new URLSearchParams({
                data: overpassQuery(Number(listing.latitude), Number(listing.longitude))
            }),
            signal: AbortSignal.timeout(30_000)
        });
    } catch (error) {
        const providerError = new Error("Unable to reach the OpenStreetMap Overpass API.", { cause: error });
        providerError.statusCode = 502;
        throw providerError;
    }

    if (!response.ok) {
        const providerError = new Error(`OpenStreetMap Overpass API returned HTTP ${response.status}.`);
        providerError.statusCode = 502;
        throw providerError;
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        const providerError = new Error("OpenStreetMap Overpass API returned invalid JSON.", { cause: error });
        providerError.statusCode = 502;
        throw providerError;
    }

    const intelligence = summarizeOpenStreetMap(data);
    const result = await pool.query(
        `INSERT INTO property_listing_intelligence (listing_id, openstreetmap_places, fetched_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (listing_id)
         DO UPDATE SET openstreetmap_places = EXCLUDED.openstreetmap_places,
                       fetched_at = CURRENT_TIMESTAMP
         RETURNING openstreetmap_places, fetched_at`,
        [listingId, intelligence]
    );
    return result.rows[0];
}
