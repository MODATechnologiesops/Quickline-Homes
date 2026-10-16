BEGIN;

ALTER TABLE property_listings
    ALTER COLUMN price DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS source_listing_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS property_listings_source_listing
    ON property_listings (source_platform, source_listing_id);

CREATE TABLE IF NOT EXISTS property_listing_intelligence (
    listing_id INTEGER PRIMARY KEY
        REFERENCES property_listings(id) ON DELETE CASCADE,
    openstreetmap_places JSONB NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS external_listing_syncs;

COMMIT;
