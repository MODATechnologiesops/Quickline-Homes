import pool from "../config/db.js";

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
            conditions.push(`listing_status = $${param}`);
            values.push(status);
            param++;
        }

        // Property type
        if (property_type) {
            conditions.push(`property_type = $${param}`);
            values.push(property_type);
            param++;
        }

        // Rent / sale
        if (listing_purpose) {
            conditions.push(`listing_purpose = $${param}`);
            values.push(listing_purpose);
            param++;
        }

        // City
        if (city) {
            conditions.push(`LOWER(city) = LOWER($${param})`);
            values.push(city);
            param++;
        }

        // County
        if (county) {
            conditions.push(`LOWER(county) = LOWER($${param})`);
            values.push(county);
            param++;
        }

        // Neighborhood
        if (neighborhood) {
            conditions.push(`LOWER(neighborhood) LIKE LOWER($${param})`);
            values.push(`%${neighborhood}%`);
            param++;
        }

        // Search
        if (search) {
            conditions.push(`
                (
                    LOWER(title) LIKE LOWER($${param})
                    OR LOWER(description) LIKE LOWER($${param})
                    OR LOWER(city) LIKE LOWER($${param})
                    OR LOWER(neighborhood) LIKE LOWER($${param})
                    OR LOWER(address) LIKE LOWER($${param})
                )
            `);

            values.push(`%${search}%`);
            param++;
        }

        // Minimum price
        if (min_price) {
            conditions.push(`price >= $${param}`);
            values.push(Number(min_price));
            param++;
        }

        // Maximum price
        if (max_price) {
            conditions.push(`price <= $${param}`);
            values.push(Number(max_price));
            param++;
        }

        // Bedrooms
        if (bedrooms) {
            conditions.push(`bedrooms >= $${param}`);
            values.push(Number(bedrooms));
            param++;
        }

        // Bathrooms
        if (bathrooms) {
            conditions.push(`bathrooms >= $${param}`);
            values.push(Number(bathrooms));
            param++;
        }

        // Furnished
        if (furnished !== undefined) {
            conditions.push(`furnished = $${param}`);
            values.push(furnished === "true");
            param++;
        }

        // Featured
        if (featured !== undefined) {
            conditions.push(`featured = $${param}`);
            values.push(featured === "true");
            param++;
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // Sorting
        let orderBy = "published_at DESC";

        switch (sort) {
            case "price_low":
                orderBy = "price ASC";
                break;

            case "price_high":
                orderBy = "price DESC";
                break;

            case "oldest":
                orderBy = "published_at ASC";
                break;

            case "featured":
                orderBy = "featured DESC, published_at DESC";
                break;

            case "newest":
            default:
                orderBy = "published_at DESC";
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
                id,
                property_id,
                title,
                description,
                property_type,
                listing_purpose,
                listing_status,
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
                featured,
                published_at,
                created_at,
                updated_at
            FROM property_listings
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
            FROM property_listings
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
