import pool from "../config/db.js";

const serviceNames = new Map([
    ["property-management", "Property Management"],
    ["tenant-rent-management", "Tenant & Rent Management"],
    ["maintenance-repairs", "Maintenance & Repairs"],
    ["property-inspections", "Property Inspections"],
    ["professional-service", "Professional & Reliable Service"],
    ["project-planning-management", "Project Planning and Management"],
    ["property-valuation", "Property Valuation"],
    ["facility-management", "Facility Management"],
    ["property-investment-consultations", "Property Investment Consultations"],
    ["commercial-cleaning-services", "Commercial Cleaning Services"],
    ["estate-cleaning", "Estate Cleaning"],
    ["post-construction-cleaning", "Post-construction Cleaning"]
]);

function requiredText(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength
        ? value.trim()
        : null;
}

function validServiceDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime())
        && date.toISOString().slice(0, 10) === value
        && value >= new Date().toISOString().slice(0, 10);
}

export const createServiceRequest = async (req, res) => {
    const body = req.body || {};
    const serviceKey = requiredText(body.service_key, 80);
    const serviceName = serviceNames.get(serviceKey);
    const propertyName = requiredText(body.property_name, 255);
    const location = requiredText(body.location, 500);
    const serviceDate = body.service_date;
    const customerName = requiredText(body.customer_name, 200);
    const customerEmail = requiredText(body.customer_email, 255);
    const customerPhone = requiredText(body.customer_phone, 30);
    const details = body.details == null || body.details.trim?.() === ""
        ? null
        : requiredText(body.details, 4000);

    if (!serviceName || !propertyName || !location || !validServiceDate(serviceDate)
        || !customerName || !customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
        || !customerPhone || (body.details != null && typeof body.details !== "string")
        || (typeof body.details === "string" && body.details.trim() !== "" && details == null)) {
        return res.status(400).json({
            success: false,
            message: "Provide a valid service, property, location, future service date, and contact details."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO service_requests (
                service_key, service_name, property_name, location, service_date,
                customer_name, customer_email, customer_phone, details
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, service_name, property_name, location, service_date, status, created_at`,
            [
                serviceKey,
                serviceName,
                propertyName,
                location,
                serviceDate,
                customerName,
                customerEmail,
                customerPhone,
                details
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Your service request has been submitted. The Quickline Homes team will review it and set the service price.",
            request: result.rows[0]
        });
    } catch (error) {
        console.error("CREATE SERVICE REQUEST ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to submit the service request."
        });
    }
};

export const getServiceRequests = async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id, service_key, service_name, property_name, location, service_date,
                customer_name, customer_email, customer_phone, details, admin_price,
                status, priced_by, priced_at, created_at, updated_at
            FROM service_requests
            ORDER BY
                CASE status WHEN 'requested' THEN 0 WHEN 'booked' THEN 1 ELSE 2 END,
                service_date ASC,
                created_at DESC`
        );

        return res.json({
            success: true,
            requests: result.rows
        });
    } catch (error) {
        console.error("GET SERVICE REQUESTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve service requests."
        });
    }
};

export const updateServiceRequest = async (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status;

    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: "Invalid service request id." });
    }

    if (status === "booked") {
        const price = req.body?.admin_price;
        const priceText = typeof price === "number" ? String(price) : price?.trim?.();
        const amount = typeof priceText === "string" && /^\d{1,10}(?:\.\d{1,2})?$/.test(priceText)
            ? Number(priceText)
            : NaN;

        if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
            return res.status(400).json({
                success: false,
                message: "Enter a service price greater than zero."
            });
        }

        try {
            const result = await pool.query(
                `UPDATE service_requests
                SET admin_price = $1,
                    status = 'booked',
                    priced_by = $2,
                    priced_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND status = 'requested'
                RETURNING id, service_name, property_name, admin_price, status, priced_at`,
                [amount, req.user.id, id]
            );

            if (result.rows.length) {
                return res.json({
                    success: true,
                    message: "Price set and service booking confirmed.",
                    request: result.rows[0]
                });
            }

            return respondForMissingOrTransitionedRequest(id, res);
        } catch (error) {
            console.error("PRICE SERVICE REQUEST ERROR:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to set the service price."
            });
        }
    }

    if (status !== "completed" && status !== "cancelled") {
        return res.status(400).json({
            success: false,
            message: "Choose a valid service request status."
        });
    }

    try {
        const allowedPriorStatus = status === "completed" ? "booked" : ["requested", "booked"];
        const result = await pool.query(
            `UPDATE service_requests
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
                AND status = ANY($3::varchar[])
            RETURNING id, service_name, property_name, admin_price, status`,
            [status, id, Array.isArray(allowedPriorStatus) ? allowedPriorStatus : [allowedPriorStatus]]
        );

        if (result.rows.length) {
            return res.json({ success: true, request: result.rows[0] });
        }

        return respondForMissingOrTransitionedRequest(id, res);
    } catch (error) {
        console.error("UPDATE SERVICE REQUEST STATUS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update the service request."
        });
    }
};

async function respondForMissingOrTransitionedRequest(id, res) {
    try {
        const existing = await pool.query(
            "SELECT id FROM service_requests WHERE id = $1",
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, message: "Service request not found." });
        }

        return res.status(409).json({
            success: false,
            message: "This service request has already been updated."
        });
    } catch (error) {
        console.error("CHECK SERVICE REQUEST STATE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to verify the service request state."
        });
    }
}
