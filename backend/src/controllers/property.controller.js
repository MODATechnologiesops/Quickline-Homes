import pool from "../config/db.js";

// ==========================================
// CREATE PROPERTY
// ==========================================
export const createProperty = async (req, res) => {
    try {
        const {
            name,
            propertyType,
            description,
            address,
            city,
            county,
            latitude,
            longitude,
            totalUnits
        } = req.body;

        if (!name || !address) {
            return res.status(400).json({
                success: false,
                message: "Property name and address are required."
            });
        }

        const result = await pool.query(
            `INSERT INTO properties
            (
                landlord_id,
                name,
                property_type,
                description,
                address,
                city,
                county,
                latitude,
                longitude,
                total_units
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING *`,
            [
                req.user.id,
                name,
                propertyType || null,
                description || null,
                address,
                city || null,
                county || null,
                latitude || null,
                longitude || null,
                totalUnits || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Property created successfully.",
            property: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create property."
        });
    }
};


// ==========================================
// GET LANDLORD PROPERTIES
// ==========================================
export const getProperties = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.*,
                COUNT(pu.id)::INTEGER AS unit_count,
                COUNT(
                    CASE
                        WHEN pu.status = 'occupied'
                        THEN 1
                    END
                )::INTEGER AS occupied_units,
                COUNT(
                    CASE
                        WHEN pu.status = 'vacant'
                        THEN 1
                    END
                )::INTEGER AS vacant_units
             FROM properties p
             LEFT JOIN property_units pu
                ON p.id = pu.property_id
             WHERE p.landlord_id = $1
             GROUP BY p.id
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            count: result.rows.length,
            properties: result.rows
        });

    } catch (error) {
        console.error("GET PROPERTIES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve properties."
        });
    }
};


// ==========================================
// GET SINGLE PROPERTY
// ==========================================
export const getProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const property = await pool.query(
            `SELECT *
             FROM properties
             WHERE id = $1
             AND landlord_id = $2`,
            [id, req.user.id]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        const units = await pool.query(
            `SELECT *
             FROM property_units
             WHERE property_id = $1
             ORDER BY unit_number`,
            [id]
        );

        res.json({
            success: true,
            property: property.rows[0],
            units: units.rows
        });

    } catch (error) {
        console.error("GET PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve property."
        });
    }
};


// ==========================================
// UPDATE PROPERTY
// ==========================================
export const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            propertyType,
            description,
            address,
            city,
            county,
            latitude,
            longitude,
            totalUnits
        } = req.body;

        const result = await pool.query(
            `UPDATE properties
             SET
                name = COALESCE($1, name),
                property_type = COALESCE($2, property_type),
                description = COALESCE($3, description),
                address = COALESCE($4, address),
                city = COALESCE($5, city),
                county = COALESCE($6, county),
                latitude = COALESCE($7, latitude),
                longitude = COALESCE($8, longitude),
                total_units = COALESCE($9, total_units),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $10
             AND landlord_id = $11
             RETURNING *`,
            [
                name,
                propertyType,
                description,
                address,
                city,
                county,
                latitude,
                longitude,
                totalUnits,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        res.json({
            success: true,
            message: "Property updated successfully.",
            property: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update property."
        });
    }
};


// ==========================================
// DELETE PROPERTY
// ==========================================
export const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM properties
             WHERE id = $1
             AND landlord_id = $2
             RETURNING id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found."
            });
        }

        res.json({
            success: true,
            message: "Property deleted successfully."
        });

    } catch (error) {
        console.error("DELETE PROPERTY ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete property."
        });
    }
};