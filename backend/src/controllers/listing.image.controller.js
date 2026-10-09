import pool from "../config/db.js";

export const getListingImages = async (req, res) => {
    try {
        const { listingId } = req.params;

        const result = await pool.query(
            `
            SELECT *
                  id,
                listing_id,
                image_url,
                thumbnail_url,
                alt_text,
                is_primary,
                display_order,
                created_at
            FROM property_listing_images
            WHERE listing_id = $1
            ORDER BY is_primary DESC, display_order ASC, id ASC
            `,
            [listingId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error("Get listing images error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve listing images"
        });
    }
};


export const addListingImage = async (req, res) => {
    try {
        const { listingId } = req.params;

        const {
            image_url,
            thumbnail_url,
            alt_text,
            is_primary = false,
            display_order = 0
        } = req.body;

        if (!image_url) {
            return res.status(400).json({
                success: false,
                message: "image_url is required"
            });
        }

        const listing = await pool.query(
            `
            SELECT id
            FROM property_listings
            WHERE id = $1
            `,
            [listingId]
        );

        if (listing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Listing not found"
            });
        }

        // If this image becomes primary, remove primary
        // status from existing images.
        if (is_primary) {
            await pool.query(
                `
                UPDATE property_listing_images
                SET is_primary = FALSE
                WHERE listing_id = $1
                `,
                [listingId]
            );
        }

        const result = await pool.query(
            `
            INSERT INTO property_listing_images (
                listing_id,
                image_url,
                thumbnail_url,
                alt_text,
                is_primary,
                display_order
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                listingId,
                image_url,
                thumbnail_url || null,
                alt_text || null,
                is_primary,
                display_order
            ]
        );

        res.status(201).json({
            success: true,
            message: "Listing image added successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Add listing image error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to add listing image"
        });
    }
};


 export const deleteListingImage = async (req, res) => {
    try {
        const { listingId, imageId } = req.params;

        const result = await pool.query(
            `
            DELETE FROM property_listing_images
            WHERE id = $1 AND listing_id = $2
            RETURNING id
            `,
            [imageId, listingId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Listing image not found"
            });
        }

        res.json({
            success: true,
            message: "Listing image deleted successfully"
        });

    } catch (error) {
        console.error("Delete listing image error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete listing image"
        });
    }
};
