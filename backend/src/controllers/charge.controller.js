import pool from "../config/db.js";

// Get charge types
export const getChargeTypes = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT *
            FROM charge_types
            WHERE is_active = TRUE
            ORDER BY name
            `
        );

        res.json({
            success: true,
            chargeTypes: result.rows
        });

    } catch (error) {
        console.error("Charge types error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve charge types"
        });
    }
};


// Create a charge
export const createCharge = async (req, res) => {
    try {
        const {
            chargeTypeId,
            tenantId,
            landlordId,
            propertyId,
            unitId,
            leaseId,
            description,
            amount,
            dueDate
        } = req.body;

        if (!chargeTypeId || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "chargeTypeId and amount are required"
            });
        }

        const referenceNumber =
            `CHG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        const result = await pool.query(
            `
            INSERT INTO charges (
                charge_type_id,
                tenant_id,
                landlord_id,
                property_id,
                unit_id,
                lease_id,
                description,
                amount,
                due_date,
                reference_number
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
            )
            RETURNING *
            `,
            [
                chargeTypeId,
                tenantId || null,
                landlordId || null,
                propertyId || null,
                unitId || null,
                leaseId || null,
                description || null,
                amount,
                dueDate || null,
                referenceNumber
            ]
        );

        res.status(201).json({
            success: true,
            message: "Charge created successfully",
            charge: result.rows[0]
        });

    } catch (error) {
        console.error("Create charge error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create charge"
        });
    }
};


// Get all charges
export const getCharges = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT
                c.*,
                ct.name AS charge_type_name,
                t.first_name AS tenant_first_name,
                t.last_name AS tenant_last_name
            FROM charges c
            JOIN charge_types ct
                ON c.charge_type_id = ct.id
            LEFT JOIN tenants t
                ON c.tenant_id = t.id
            ORDER BY c.created_at DESC
            `
        );

        res.json({
            success: true,
            count: result.rows.length,
            charges: result.rows
        });

    } catch (error) {
        console.error("Get charges error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve charges"
        });
    }
};


// Get charges for a tenant
export const getTenantCharges = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const result = await pool.query(
            `
            SELECT
                c.*,
                ct.name AS charge_type_name
            FROM charges c
            JOIN charge_types ct
                ON c.charge_type_id = ct.id
            WHERE c.tenant_id = $1
            ORDER BY c.due_date ASC NULLS LAST
            `,
            [tenantId]
        );

        res.json({
            success: true,
            tenantId,
            charges: result.rows
        });

    } catch (error) {
        console.error("Tenant charges error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve tenant charges"
        });
    }
};