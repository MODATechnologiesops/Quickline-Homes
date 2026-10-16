import pool from "../config/db.js";
import {
    getListingLocationIntelligence as readLocationIntelligence,
    refreshListingLocationIntelligence as refreshLocationIntelligenceData
} from "../services/open-data-intelligence.service.js";

export const getLocationIntelligence = async (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId) || listingId < 1) {
        return res.status(400).json({
            success: false,
            message: "A valid listing ID is required."
        });
    }
    try {
        const intelligence = await readLocationIntelligence(listingId);
        return res.json({ success: true, intelligence });
    } catch (error) {
        console.error("GET LISTING LOCATION INTELLIGENCE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve location intelligence."
        });
    }
};

export const refreshLocationIntelligence = async (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId) || listingId < 1) {
        return res.status(400).json({
            success: false,
            message: "A valid listing ID is required."
        });
    }
    try {
        const intelligence = await refreshLocationIntelligenceData(listingId);
        return res.json({
            success: true,
            message: "OpenStreetMap location intelligence refreshed.",
            intelligence
        });
    } catch (error) {
        console.error("REFRESH LISTING LOCATION INTELLIGENCE ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode === 400 || error.statusCode === 404
                ? error.message
                : error.statusCode === 502
                    ? "OpenStreetMap could not provide nearby location data."
                    : "Unable to refresh location intelligence."
        });
    }
};

/**
 * GET /api/listings
 * Search and filter property listings
 */
export const getListings = async (req, res) => {
    try {
        const {
            search,
            property_type,
            listing_purpose,
            city,
            county,
            country,
            neighborhood,
            min_price,
            max_price,
            bedrooms,
            bathrooms,
            furnished,
            status = "active",
            featured,
            sort = "newest",
            page = 1,
            limit = 20
        } = req.query;

        const values = [];
        const conditions = [];

        let param = 1;

        // Status
        if (status) {
            conditions.push(`listing.listing_status = $${param}`);
            values.push(status);
            param++;
        }

        // Property type
        if (property_type) {
            conditions.push(`listing.property_type = $${param}`);
            values.push(property_type);
            param++;
        }

        // Rent / sale
        if (listing_purpose) {
            conditions.push(`listing.listing_purpose = $${param}`);
            values.push(listing_purpose);
            param++;
        }

        // City
        if (city) {
            conditions.push(`LOWER(listing.city) = LOWER($${param})`);
            values.push(city);
            param++;
        }

        // County
        if (county) {
            conditions.push(`LOWER(listing.county) = LOWER($${param})`);
            values.push(county);
            param++;
        }

        if (country) {
            conditions.push(`LOWER(listing.country) = LOWER($${param})`);
            values.push(country);
            param++;
        }

        // Neighborhood
        if (neighborhood) {
            conditions.push(`LOWER(listing.neighborhood) LIKE LOWER($${param})`);
            values.push(`%${neighborhood}%`);
            param++;
        }

        // Search
        if (search) {
            conditions.push(`
                (
                    LOWER(listing.title) LIKE LOWER($${param})
                    OR LOWER(listing.description) LIKE LOWER($${param})
                    OR LOWER(listing.city) LIKE LOWER($${param})
                    OR LOWER(listing.country) LIKE LOWER($${param})
                    OR LOWER(listing.neighborhood) LIKE LOWER($${param})
                    OR LOWER(listing.address) LIKE LOWER($${param})
                )
            `);

            values.push(`%${search}%`);
            param++;
        }

        // Minimum price
        if (min_price) {
            conditions.push(`listing.price >= $${param}`);
            values.push(Number(min_price));
            param++;
        }

        // Maximum price
        if (max_price) {
            conditions.push(`listing.price <= $${param}`);
            values.push(Number(max_price));
            param++;
        }

        // Bedrooms
        if (bedrooms) {
            conditions.push(`listing.bedrooms >= $${param}`);
            values.push(Number(bedrooms));
            param++;
        }

        // Bathrooms
        if (bathrooms) {
            conditions.push(`listing.bathrooms >= $${param}`);
            values.push(Number(bathrooms));
            param++;
        }

        // Furnished
        if (furnished !== undefined) {
            conditions.push(`listing.furnished = $${param}`);
            values.push(furnished === "true");
            param++;
        }

        // Featured
        if (featured !== undefined) {
            conditions.push(`listing.featured = $${param}`);
            values.push(featured === "true");
            param++;
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // Sorting
        let orderBy = "listing.published_at DESC";

        switch (sort) {
            case "price_low":
                orderBy = "listing.price ASC NULLS LAST";
                break;

            case "price_high":
                orderBy = "listing.price DESC NULLS LAST";
                break;

            case "oldest":
                orderBy = "listing.published_at ASC";
                break;

            case "featured":
                orderBy = "listing.featured DESC, listing.published_at DESC";
                break;

            case "newest":
            default:
                orderBy = "listing.published_at DESC";
        }

        const pageNumber = Math.max(Number(page), 1);
        const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
        const offset = (pageNumber - 1) * limitNumber;

        values.push(limitNumber);
        const limitParam = param;
        param++;

        values.push(offset);
        const offsetParam = param;

        const query = `
            SELECT
                listing.id,
                listing.property_id,
                listing.title,
                listing.description,
                listing.property_type,
                listing.listing_purpose,
                listing.listing_status,
                listing.city,
                listing.county,
                listing.country,
                listing.neighborhood,
                listing.address,
                listing.latitude,
                listing.longitude,
                listing.price,
                listing.currency,
                listing.bedrooms,
                listing.bathrooms,
                listing.floor_area,
                listing.furnished,
                listing.available_from,
                listing.featured,
                COALESCE(
                    listing.image_url,
                    listing_image.image_url,
                    property_image.image_url
                ) AS image_url,
                listing.payment_terms,
                listing.source_platform,
                listing.source_url,
                CONCAT_WS(' ', marketer.first_name, marketer.last_name) AS marketer_name,
                listing.published_at,
                listing.created_at,
                listing.updated_at
            FROM property_listings AS listing
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM property_listing_images
                WHERE listing_id = listing.id
                ORDER BY is_primary DESC, display_order ASC, id ASC
                LIMIT 1
            ) AS listing_image ON TRUE
            LEFT JOIN LATERAL (
                SELECT image_url
                FROM property_images
                WHERE property_id = listing.property_id
                ORDER BY is_primary DESC, id ASC
                LIMIT 1
            ) AS property_image ON TRUE
            LEFT JOIN users AS marketer
                ON marketer.id = listing.marketer_id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${limitParam}
            OFFSET $${offsetParam}
        `;

        const result = await pool.query(query, values);

        // Total count
        const countValues = values.slice(0, values.length - 2);

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM property_listings AS listing
            ${whereClause}
        `;

        const countResult = await pool.query(countQuery, countValues);

        const total = Number(countResult.rows[0].total);

        res.json({
            success: true,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber)
            },
            data: result.rows
        });

    } catch (error) {
        console.error("Get listings error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve property listings"
        });
    }
};


/**
 * GET /api/listings/:id
 */
export const getListingById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT *
            FROM property_listings
            WHERE id = $1
              AND listing_status = 'active'
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property listing not found"
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Get listing error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve listing"
        });
    }
};


/**
 * POST /api/listings
 */
export const createListing = async (req, res) => {
    try {
        const {
            property_id,
            title,
            description,
            property_type,
            listing_purpose,
            city,
            county,
            neighborhood,
            address,
            latitude,
            longitude,
            price,
            currency = "KES",
            bedrooms = 0,
            bathrooms = 0,
            floor_area,
            furnished = false,
            available_from,
            featured = false
        } = req.body;

        if (!title || !property_type || !listing_purpose || !price) {
            return res.status(400).json({
                success: false,
                message:
                    "title, property_type, listing_purpose and price are required"
            });
        }

        if (!["rent", "sale"].includes(listing_purpose)) {
            return res.status(400).json({
                success: false,
                message: "listing_purpose must be rent or sale"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO property_listings (
                property_id,
                title,
                description,
                property_type,
                listing_purpose,
                city,
                county,
                neighborhood,
                address,
                latitude,
                longitude,
                price,
                currency,
                bedrooms,
                bathrooms,
                floor_area,
                furnished,
                available_from,
                featured
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19
            )
            RETURNING *
            `,
            [
                property_id || null,
                title,
                description || null,
                property_type,
                listing_purpose,
                city || null,
                county || null,
                neighborhood || null,
                address || null,
                latitude || null,
                longitude || null,
                price,
                currency,
                bedrooms,
                bathrooms,
                floor_area || null,
                furnished,
                available_from || null,
                featured
            ]
        );

        res.status(201).json({
            success: true,
            message: "Property listing created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Create listing error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create property listing"
        });
    }
};


/**
 * PUT /api/listings/:id
 */
export const updateListing = async (req, res) => {
    try {
        const { id } = req.params;

        const allowedFields = [
            "title",
            "description",
            "property_type",
            "listing_purpose",
            "listing_status",
            "city",
            "county",
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
            "featured"
        ];

        const updates = [];
        const values = [];
        let param = 1;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${param}`);
                values.push(req.body[field]);
                param++;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields supplied for update"
            });
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");

        values.push(id);

        const result = await pool.query(
            `
            UPDATE property_listings
            SET ${updates.join(", ")}
            WHERE id = $${param}
            RETURNING *
            `,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property listing not found"
            });
        }

        res.json({
            success: true,
            message: "Property listing updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Update listing error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update listing"
        });
    }
};


/**
 * DELETE /api/listings/:id
 *
 * We soft-delete rather than physically deleting the listing.
 */
export const deleteListing = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            UPDATE property_listings
            SET
                listing_status = 'inactive',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, listing_status
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property listing not found"
            });
        }

        res.json({
            success: true,
            message: "Property listing deactivated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Delete listing error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to deactivate listing"
        });
    }
};
