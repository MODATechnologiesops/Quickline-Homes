import pool from "../config/db.js";

export const getMaintenanceRequests = async (req, res) => {
    try {
        const values = [];
        let accessFilter = "";

        if (req.user.role === "landlord") {
            values.push(req.user.id);
            accessFilter = `
                WHERE property_landlord.user_id = $1
            `;
        } else if (req.user.role === "tenant") {
            values.push(req.user.id);
            accessFilter = `
                WHERE tenant.user_id = $1
            `;
        } else if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view maintenance requests"
            });
        }

        const result = await pool.query(
            `
            SELECT
                mr.id,
                mr.tenant_id,
                mr.property_id,
                mr.unit_id,
                mr.title,
                mr.description,
                mr.priority,
                mr.status,
                mr.created_at,
                mr.updated_at,
                property.name AS property_name,
                unit.unit_number,
                CONCAT_WS(' ', tenant.first_name, tenant.last_name) AS tenant_name
            FROM maintenance_requests AS mr
            LEFT JOIN properties AS property
                ON property.id = mr.property_id
            LEFT JOIN landlords AS property_landlord
                ON property_landlord.id = property.landlord_id
            LEFT JOIN property_units AS unit
                ON unit.id = mr.unit_id
            LEFT JOIN tenants AS tenant
                ON tenant.id = mr.tenant_id
            ${accessFilter}
            ORDER BY mr.created_at DESC, mr.id DESC
            `,
            values
        );

        return res.json({
            success: true,
            count: result.rows.length,
            requests: result.rows
        });
    } catch (error) {
        console.error("GET MAINTENANCE REQUESTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve maintenance requests"
        });
    }
};
