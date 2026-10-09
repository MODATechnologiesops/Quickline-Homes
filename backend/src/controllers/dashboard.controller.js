import pool from "../config/db.js";


// ================================
// ADMIN DASHBOARD
// ================================
export const adminDashboard = async (req, res) => {
    try {
        const users = await pool.query(
            `SELECT COUNT(*) AS total FROM users`
        );

        const landlords = await pool.query(
            `SELECT COUNT(*) AS total
             FROM users
             WHERE role = 'landlord'`
        );

        const tenants = await pool.query(
            `SELECT COUNT(*) AS total
             FROM users
             WHERE role = 'tenant'`
        );

        const properties = await pool.query(
            `SELECT COUNT(*) AS total FROM properties`
        );

        const payments = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM rent_payments
             WHERE status = 'completed'`
        );

        res.json({
            success: true,
            dashboard: {
                totalUsers: Number(users.rows[0].total),
                totalLandlords: Number(landlords.rows[0].total),
                totalTenants: Number(tenants.rows[0].total),
                totalProperties: Number(properties.rows[0].total),
                totalPayments: Number(payments.rows[0].total)
            }
        });

    } catch (error) {
        console.error("ADMIN DASHBOARD ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load admin dashboard."
        });
    }
};


// ================================
// LANDLORD DASHBOARD
// ================================
export const landlordDashboard = async (req, res) => {
    try {
        const landlordId = req.user.id;

        const properties = await pool.query(
            `SELECT COUNT(*) AS total
             FROM properties
             WHERE landlord_id = $1`,
            [landlordId]
        );

        const units = await pool.query(
            `SELECT COUNT(*) AS total
             FROM property_units pu
             JOIN properties p
               ON pu.property_id = p.id
             WHERE p.landlord_id = $1`,
            [landlordId]
        );

        const occupiedUnits = await pool.query(
            `SELECT COUNT(*) AS total
             FROM property_units pu
             JOIN properties p
               ON pu.property_id = p.id
             WHERE p.landlord_id = $1
             AND pu.status = 'occupied'`,
            [landlordId]
        );

        const maintenance = await pool.query(
            `SELECT COUNT(*) AS total
             FROM maintenance_requests mr
             JOIN properties p
               ON mr.property_id = p.id
             WHERE p.landlord_id = $1
             AND mr.status NOT IN ('completed', 'cancelled')`,
            [landlordId]
        );

        const payments = await pool.query(
            `SELECT COALESCE(SUM(rp.amount), 0) AS total
             FROM rent_payments rp
             JOIN leases l
               ON rp.lease_id = l.id
             JOIN property_units pu
               ON l.unit_id = pu.id
             JOIN properties p
               ON pu.property_id = p.id
             WHERE p.landlord_id = $1
             AND rp.status = 'completed'`,
            [landlordId]
        );

        res.json({
            success: true,
            dashboard: {
                totalProperties: Number(properties.rows[0].total),
                totalUnits: Number(units.rows[0].total),
                occupiedUnits: Number(occupiedUnits.rows[0].total),
                pendingMaintenance: Number(maintenance.rows[0].total),
                totalCollected: Number(payments.rows[0].total)
            }
        });

    } catch (error) {
        console.error("LANDLORD DASHBOARD ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load landlord dashboard."
        });
    }
};


// ================================
// TENANT DASHBOARD
// ================================
export const tenantDashboard = async (req, res) => {
    try {
        const tenantId = req.user.id;

        const lease = await pool.query(
            `SELECT
                l.id,
                l.start_date,
                l.end_date,
                l.monthly_rent,
                l.deposit_amount,
                l.status,
                pu.unit_number,
                p.name AS property_name,
                p.address,
                p.city
             FROM leases l
             JOIN property_units pu
               ON l.unit_id = pu.id
             JOIN properties p
               ON pu.property_id = p.id
             WHERE l.tenant_id = $1
             AND l.status = 'active'
             LIMIT 1`,
            [tenantId]
        );

        const payments = await pool.query(
            `SELECT
                id,
                amount,
                payment_method,
                transaction_reference,
                payment_date,
                status
             FROM rent_payments
             WHERE tenant_id = $1
             ORDER BY payment_date DESC
             LIMIT 10`,
            [tenantId]
        );

        const maintenance = await pool.query(
            `SELECT
                id,
                title,
                description,
                priority,
                status,
                created_at
             FROM maintenance_requests
             WHERE tenant_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [tenantId]
        );

        res.json({
            success: true,
            dashboard: {
                lease: lease.rows[0] || null,
                recentPayments: payments.rows,
                maintenanceRequests: maintenance.rows
            }
        });

    } catch (error) {
        console.error("TENANT DASHBOARD ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load tenant dashboard."
        });
    }
};