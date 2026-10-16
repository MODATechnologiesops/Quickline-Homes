import assert from "node:assert/strict";
import test from "node:test";
import {
    normalizePartnerFeed,
    PartnerFeedValidationError
} from "../src/services/partner-feed.service.js";
import { summarizeOpenStreetMap } from "../src/services/open-data-intelligence.service.js";

const validFeed = {
    sourceName: "Nairobi Partner Agency",
    listings: [{
        externalId: "APT-204",
        title: "Westlands apartment",
        propertyType: "apartment",
        listingPurpose: "rent",
        price: 85000,
        currency: "KES",
        city: "Nairobi",
        country: "Kenya",
        latitude: -1.267,
        longitude: 36.811,
        imageUrl: "https://agency.example/images/apt-204.jpg",
        sourceUrl: "https://agency.example/listings/apt-204"
    }]
};

test("normalizes partner JSON listings and preserves provider identity", () => {
    const [listing] = normalizePartnerFeed(validFeed);
    assert.equal(listing.source_platform, "Nairobi Partner Agency");
    assert.equal(listing.source_listing_id, "APT-204");
    assert.equal(listing.listing_status, "active");
    assert.equal(listing.price, 85000);
    assert.equal(listing.country, "Kenya");
});

test("rejects reserved sources and non-HTTPS partner media links", () => {
    assert.throws(
        () => normalizePartnerFeed({ ...validFeed, sourceName: "Quickline Homes" }),
        PartnerFeedValidationError
    );
    assert.throws(
        () => normalizePartnerFeed({
            ...validFeed,
            listings: [{ ...validFeed.listings[0], imageUrl: "http://agency.example/image.jpg" }]
        }),
        PartnerFeedValidationError
    );
});

test("requires paired coordinates and unique external feed identities", () => {
    assert.throws(
        () => normalizePartnerFeed({
            ...validFeed,
            listings: [{ ...validFeed.listings[0], longitude: undefined }]
        }),
        /both latitude and longitude/
    );
    assert.throws(
        () => normalizePartnerFeed({
            ...validFeed,
            listings: [validFeed.listings[0], validFeed.listings[0]]
        }),
        /unique externalId/
    );
});

test("summarizes OpenStreetMap amenities and returns only named places", () => {
    const intelligence = summarizeOpenStreetMap({
        elements: [
            { type: "node", id: 1, tags: { amenity: "school", name: "Example School" } },
            { type: "way", id: 2, tags: { shop: "supermarket" } },
            { type: "node", id: 3, tags: { public_transport: "station", name: "Westlands" } }
        ]
    });
    assert.deepEqual(intelligence.placeCounts, {
        amenity: 1,
        shop: 1,
        leisure: 0,
        public_transport: 1
    });
    assert.equal(intelligence.places.length, 2);
    assert.equal(intelligence.attribution, "© OpenStreetMap contributors");
});
