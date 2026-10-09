import pool from "../config/db.js";

// ==========================================
// CREATE LEASE
// ==========================================
export const createLease = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            tenantId,
            unitId,
            startDate,
            endDate,
            monthlyRent,
            depositAmount,
            status
        } = req.body;

        if (
            !tenantId ||
            !unitId ||
            !startDate ||
            monthlyRent === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Tenant, unit, start date and monthly rent are required."
            });
        }

        await client.query("BEGIN");

        // ------------------------------------------
        // Verify tenant exists
        // ------------------------------------------
        const tenant = await client.query(
            `
            SELECT id, full_name, status
            FROM tenants
            WHERE id = $1
            `,
            [tenantId]
        );

        if (tenant.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Tenant not found."
            });
        }

        // ------------------------------------------
        // Verify unit belongs to logged-in landlord
        // ------------------------------------------
        const unit = await client.query(
            `
            SELECT
                pu.*,
                p.id AS property_id,
                p.name AS property_name,
                p.landlord_id
            FROM property_units pu
            INNER JOIN properties p
                ON p.id = pu.property_id
            WHERE pu.id = $1
              AND p.landlord_id = $2
            `,
            [unitId, req.user.id]
        );

        if (unit.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message:
                    "Unit not found or you do not have access to it."
            });
        }

        const selectedUnit = unit.rows[0];

        // ------------------------------------------
        // Unit must be vacant
        // ------------------------------------------
        if (selectedUnit.status === "occupied") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "This unit is already occupied."
            });
        }

        // ------------------------------------------
        // Prevent another active lease
        // ------------------------------------------
        const existingLease = await client.query(
            `
            SELECT id
            FROM leases
            WHERE unit_id = $1
              AND status = 'active'
            LIMIT 1
            `,
            [unitId]
        );

        if (existingLease.rows.length > 0) {
            await client.query("ROLLBACK");

            return res.status(409).json({
                success: false,
                message: "This unit already has an active lease.",
                leaseId: existingLease.rows[0].id
            });
        }

        // ------------------------------------------
        // Create lease
        // ------------------------------------------
        const lease = await client.query(
            `
            INSERT INTO leases (
                tenant_id,
                unit_id,
                start_date,
                end_date,
                monthly_rent,
                deposit_amount,
                status
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
            `,
            [
                tenantId,
                unitId,
                startDate,
                endDate || null,
                monthlyRent,
                depositAmount || 0,
                status || "active"
            ]
        );

        // ------------------------------------------
        // Mark unit occupied
        // ------------------------------------------
        await client.query(
            `
            UPDATE property_units
            SET status = 'occupied'
            WHERE id = $1
            `,
            [unitId]
        );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "Lease created successfully.",
            lease: lease.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("CREATE LEASE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create lease."
        });

    } finally {
        client.release();
    }
};


// ==========================================
// GET LANDLORD LEASES
// ==========================================
export const getLeases = async (req, res) => {
    try {
        const {
            status,
            tenantId,
            unitId
        } = req.query;

        const values = [req.user.id];
        const conditions = [
            "p.landlord_id = $1"
        ];

        if (status) {
            values.push(status);
            conditions.push(
                `l.status = $${values.length}`
            );
        }

        if (tenantId) {
            values.push(tenantId);
            conditions.push(
                `l.tenant_id = $${values.length}`
            );
        }

        if (unitId) {
            values.push(unitId);
            conditions.push(
                `l.unit_id = $${values.length}`
            );
        }

        const result = await pool.query(
            `
            SELECT
                l.*,

                t.full_name AS tenant_name,
                t.phone AS tenant_phone,
                t.email AS tenant_email,

                pu.unit_number,
                pu.unit_type,

                p.id AS property_id,
                p.name AS property_name,
                p.address AS property_address

            FROM leases l

            INNER JOIN tenants t
                ON t.id = l.tenant_id

            INNER JOIN property_units pu
                ON pu.id = l.unit_id

            INNER JOIN properties p
                ON p.id = pu.property_id

            WHERE ${conditions.join(" AND ")}

            ORDER BY l.created_at DESC
            `,
            values
        );

        res.json({
            success: true,
            count: result.rows.length,
            leases: result.rows
        });

    } catch (error) {
        console.error("GET LEASES ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve leases."
        });
    }
};


// ==========================================
// GET SINGLE LEASE
// ==========================================
export const getLease = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                l.*,

                t.full_name AS tenant_name,
                t.phone AS tenant_phone,
                t.email AS tenant_email,

                pu.unit_number,
                pu.unit_type,
                pu.monthly_rent AS unit_monthly_rent,

                p.id AS property_id,
                p.name AS property_name,
                p.address AS property_address,
                p.city,
                p.county

            FROM leases l

            INNER JOIN tenants t
                ON t.id = l.tenant_id

            INNER JOIN property_units pu
                ON pu.id = l.unit_id

            INNER JOIN properties p
                ON p.id = pu.property_id

            WHERE l.id = $1
              AND p.landlord_id = $2
            `,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Lease not found."
            });
        }

        res.json({
            success: true,
            lease: result.rows[0]
        });

    } catch (error) {
        console.error("GET LEASE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve lease."
        });
    }
};


// ==========================================
// UPDATE LEASE
// ==========================================
export const updateLease = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            startDate,
            endDate,
            monthlyRent,
            depositAmount,
            status
        } = req.body;

        const result = await pool.query(
            `
            UPDATE leases l
            SET
                start_date = COALESCE($1, l.start_date),
                end_date = COALESCE($2, l.end_date),
                monthly_rent = COALESCE($3, l.monthly_rent),
                deposit_amount = COALESCE($4, l.deposit_amount),
                status = COALESCE($5, l.status)
            FROM property_units pu
            INNER JOIN properties p
                ON p.id = pu.property_id
            WHERE l.id = $6
              AND l.unit_id = pu.id
              AND p.landlord_id = $7
            RETURNING l.*
            `,
            [
                startDate || null,
                endDate || null,
                monthlyRent ?? null,
                depositAmount ?? null,
                status || null,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Lease not found."
            });
        }

        res.json({
            success: true,
            message: "Lease updated successfully.",
            lease: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE LEASE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update lease."
        });
    }
};


// ==========================================
// TERMINATE LEASE
// ==========================================
export const terminateLease = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        // ------------------------------------------
        // Get lease and verify landlord ownership
        // ------------------------------------------
        const lease = await client.query(
            `
            SELECT
                l.*,
                p.landlord_id
            FROM leases l

            INNER JOIN property_units pu
                ON pu.id = l.unit_id

            INNER JOIN properties p
                ON p.id = pu.property_id

            WHERE l.id = $1
              AND p.landlord_id = $2
            FOR UPDATE
            `,
            [id, req.user.id]
        );

        if (lease.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Lease not found."
            });
        }

        const currentLease = lease.rows[0];

        // ------------------------------------------
        // Terminate lease
        // ------------------------------------------
        await client.query(
            `
            UPDATE leases
            SET
                status = 'terminated',
                end_date = CURRENT_DATE
            WHERE id = $1
            `,
            [id]
        );

        // ------------------------------------------
        // Make unit vacant
        // ------------------------------------------
        await client.query(
            `
            UPDATE property_units
            SET status = 'vacant'
            WHERE id = $1
            `,
            [currentLease.unit_id]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Lease terminated successfully."
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("TERMINATE LEASE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to terminate lease."
        });

    } finally {
        client.release();
    }
};