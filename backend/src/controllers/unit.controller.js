import pool from "../config/db.js";

// ==========================================
// CREATE UNIT
// ==========================================
export const createUnit = async (req, res) => {
    try {
        const { propertyId } = req.params;

        const {
            unitNumber,
            unitType,
            bedrooms,
            bathrooms,
            monthlyRent,
            status
        } = req.body;

        if (!unitNumber || monthlyRent === undefined) {
            return res.status(400).json({
                success: false,
                message: "Unit number and monthly rent are required."
            });
        }

        // Make sure this property belongs to the logged-in landlord
        const property = await pool.query(
            `SELECT id
             FROM properties
             WHERE id = $1
             AND landlord_id = $2`,
            [propertyId, req.user.id]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found or access denied."
            });
        }

        // Prevent duplicate unit numbers within the same property
        const existingUnit = await pool.query(
            `SELECT id
             FROM property_units
             WHERE property_id = $1
             AND unit_number = $2`,
            [propertyId, unitNumber]
        );

        if (existingUnit.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "A unit with this number already exists."
            });
        }

        const result = await pool.query(
            `INSERT INTO property_units
            (
                property_id,
                unit_number,
                unit_type,
                bedrooms,
                bathrooms,
                monthly_rent,
                status
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *`,
            [
                propertyId,
                unitNumber,
                unitType || null,
                bedrooms || 0,
                bathrooms || 0,
                monthlyRent,
                status || "vacant"
            ]
        );

        // Update property unit count
        await pool.query(
            `UPDATE properties
             SET total_units = (
                 SELECT COUNT(*)
                 FROM property_units
                 WHERE property_id = $1
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [propertyId]
        );

        res.status(201).json({
            success: true,
            message: "Unit created successfully.",
            unit: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE UNIT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create unit."
        });
    }
};


// ==========================================
// GET PROPERTY UNITS
// ==========================================
export const getPropertyUnits = async (req, res) => {
    try {
        const { propertyId } = req.params;

        const property = await pool.query(
            `SELECT id, name
             FROM properties
             WHERE id = $1
             AND landlord_id = $2`,
            [propertyId, req.user.id]
        );

        if (property.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Property not found or access denied."
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM property_units
             WHERE property_id = $1
             ORDER BY unit_number`,
            [propertyId]
        );

        res.json({
            success: true,
            property: property.rows[0],
            count: result.rows.length,
            units: result.rows
        });

    } catch (error) {
        console.error("GET UNITS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve units."
        });
    }
};


// ==========================================
// UPDATE UNIT
// ==========================================
export const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            unitNumber,
            unitType,
            bedrooms,
            bathrooms,
            monthlyRent,
            status
        } = req.body;

        const result = await pool.query(
            `UPDATE property_units pu
             SET
                unit_number = COALESCE($1, pu.unit_number),
                unit_type = COALESCE($2, pu.unit_type),
                bedrooms = COALESCE($3, pu.bedrooms),
                bathrooms = COALESCE($4, pu.bathrooms),
                monthly_rent = COALESCE($5, pu.monthly_rent),
                status = COALESCE($6, pu.status)
             FROM properties p
             WHERE pu.id = $7
             AND pu.property_id = p.id
             AND p.landlord_id = $8
             RETURNING pu.*`,
            [
                unitNumber,
                unitType,
                bedrooms,
                bathrooms,
                monthlyRent,
                status,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Unit not found or access denied."
            });
        }

        res.json({
            success: true,
            message: "Unit updated successfully.",
            unit: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE UNIT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update unit."
        });
    }
};


// ==========================================
// DELETE UNIT
// ==========================================
export const deleteUnit = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM property_units pu
             USING properties p
             WHERE pu.id = $1
             AND pu.property_id = p.id
             AND p.landlord_id = $2
             RETURNING pu.id, pu.property_id`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Unit not found or access denied."
            });
        }

        // Recalculate total units
        await pool.query(
            `UPDATE properties
             SET total_units = (
                 SELECT COUNT(*)
                 FROM property_units
                 WHERE property_id = $1
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [result.rows[0].property_id]
        );

        res.json({
            success: true,
            message: "Unit deleted successfully."
        });

    } catch (error) {
        console.error("DELETE UNIT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to delete unit."
        });
    }
};