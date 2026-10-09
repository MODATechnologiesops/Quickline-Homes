// ==========================================
// QUICKLINE HOMES - TENANT CONTROLLER
// ==========================================

import pool from "../config/db.js";

// ==========================================
// CREATE TENANT
// POST /api/tenants
// ==========================================

export const createTenant = async (req, res) => {
    try {
        const {
            full_name,
            phone,
            email,
            national_id,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            employment_status,
            employer_name
        } = req.body;

        if (!full_name || !phone) {
            return res.status(400).json({
                success: false,
                message: "full_name and phone are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO tenants (
                full_name,
                phone,
                email,
                national_id,
                address,
                emergency_contact_name,
                emergency_contact_phone,
                employment_status,
                employer_name,
                status,
                created_at,
                updated_at
            )
            VALUES (
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9,
                'active',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING *
            `,
            [
                full_name,
                phone,
                email || null,
                national_id || null,
                address || null,
                emergency_contact_name || null,
                emergency_contact_phone || null,
                employment_status || null,
                employer_name || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Tenant created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE TENANT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create tenant"
        });
    }
};


// ==========================================
// GET ALL TENANTS
// GET /api/tenants
// ==========================================

export const getTenants = async (req, res) => {
    try {
        const {
            search,
            status,
            page = 1,
            limit = 20
        } = req.query;

        const conditions = [];
        const values = [];
        let index = 1;

        if (search) {
            conditions.push(`
                (
                    full_name ILIKE $${index}
                    OR phone ILIKE $${index}
                    OR email ILIKE $${index}
                    OR national_id ILIKE $${index}
                )
            `);

            values.push(`%${search}%`);
            index++;
        }

        if (status) {
            conditions.push(
                `status = $${index}`
            );

            values.push(status);
            index++;
        }

        const where =
            conditions.length
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        const pageNumber = Math.max(
            Number(page) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const offset =
            (pageNumber - 1) * limitNumber;

        const result = await pool.query(
            `
            SELECT *
            FROM tenants
            ${where}
            ORDER BY created_at DESC
            LIMIT $${index}
            OFFSET $${index + 1}
            `,
            [
                ...values,
                limitNumber,
                offset
            ]
        );

        const countResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM tenants
            ${where}
            `,
            values
        );

        const total =
            Number(countResult.rows[0].total);

        return res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(
                    total / limitNumber
                )
            }
        });

    } catch (error) {
        console.error("GET TENANTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve tenants"
        });
    }
};


// ==========================================
// GET TENANT BY ID
// GET /api/tenants/:id
// ==========================================

export const getTenantById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT *
            FROM tenants
            WHERE id = $1
            `,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error("GET TENANT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve tenant"
        });
    }
};


// ==========================================
// UPDATE TENANT
// PUT /api/tenants/:id
// ==========================================

export const updateTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const allowedFields = [
            "full_name",
            "phone",
            "email",
            "national_id",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "employment_status",
            "employer_name",
            "status"
        ];

        const updates = [];
        const values = [];

        let index = 1;

        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(
                    req.body,
                    field
                )
            ) {
                updates.push(
                    `${field} = $${index}`
                );

                values.push(req.body[field]);
                index++;
            }
        }

        if (!updates.length) {
            return res.status(400).json({
                success: false,
                message: "No fields supplied for update"
            });
        }

        updates.push(
            "updated_at = CURRENT_TIMESTAMP"
        );

        values.push(id);

        const result = await pool.query(
            `
            UPDATE tenants
            SET ${updates.join(", ")}
            WHERE id = $${index}
            RETURNING *
            `,
            values
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tenant updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE TENANT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update tenant"
        });
    }
};


// ==========================================
// DEACTIVATE TENANT
// DELETE /api/tenants/:id
// ==========================================

export const deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            UPDATE tenants
            SET
                status = 'inactive',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, status
            `,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tenant deactivated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("DELETE TENANT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate tenant"
        });
    }
};