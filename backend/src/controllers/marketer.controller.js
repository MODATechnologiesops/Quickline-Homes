import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import * as passwordStrength from "../services/password_strength.service.js";

const PASSWORD_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LISTING_SOURCES = new Set([
    "Quickline Homes",
    "Partner / Agency",
    "Other"
]);
const LISTING_FIELDS = [
    "title",
    "description",
    "property_type",
    "listing_purpose",
    "city",
    "county",
    "neighborhood",
    "address",
    "price",
    "currency",
    "bedrooms",
    "bathrooms",
    "floor_area",
    "furnished",
    "available_from",
    "image_url",
    "payment_terms",
    "source_platform",
    "source_url"
];

function hashToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

function isHttpUrl(value) {
    if (!value) return true;
    try {
        return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
        return false;
    }
}

function isValidListing(body) {
    return (
        typeof body.title === "string" &&
        body.title.trim().length > 0 &&
        typeof body.property_type === "string" &&
        ["rent", "sale"].includes(body.listing_purpose) &&
        Number.isFinite(Number(body.price)) &&
        Number(body.price) > 0 &&
        (body.source_platform === undefined ||
            LISTING_SOURCES.has(body.source_platform)) &&
        isHttpUrl(body.image_url) &&
        isHttpUrl(body.source_url)
    );
}

function signToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
}

export const createMarketerApplication = async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        portfolioUrl,
        message
    } = req.body || {};
    const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
        !firstName?.trim() ||
        !lastName?.trim() ||
        !EMAIL_PATTERN.test(normalizedEmail) ||
        !phone?.trim() ||
        !isHttpUrl(portfolioUrl)
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide your name, a valid email, phone, and a valid portfolio URL."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO marketer_applications
                (first_name, last_name, email, phone, company_name, portfolio_url, message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, status, created_at`,
            [
                firstName.trim(),
                lastName.trim(),
                normalizedEmail,
                phone.trim(),
                companyName?.trim() || null,
                portfolioUrl?.trim() || null,
                message?.trim() || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Your marketer request was sent to Quickline Homes for review.",
            application: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "There is already an open marketer request for this email."
            });
        }

        console.error("CREATE MARKETER APPLICATION ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to submit the marketer request."
        });
    }
};

export const getMarketerApplications = async (_req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, phone, company_name,
                    portfolio_url, message, status, created_at
             FROM marketer_applications
             ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
                      created_at DESC`
        );

        return res.json({ success: true, applications: result.rows });
    } catch (error) {
        console.error("GET MARKETER APPLICATIONS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve marketer requests."
        });
    }
};

export const reviewMarketerApplication = async (req, res) => {
    const applicationId = Number(req.params.id);
    const decision = req.body?.decision;

    if (!Number.isInteger(applicationId) || applicationId < 1) {
        return res.status(400).json({
            success: false,
            message: "A valid application ID is required."
        });
    }
    if (!["approve", "reject"].includes(decision)) {
        return res.status(400).json({
            success: false,
            message: "Decision must be approve or reject."
        });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const application = await client.query(
            `SELECT id, status
             FROM marketer_applications
             WHERE id = $1
             FOR UPDATE`,
            [applicationId]
        );

        const requestIsPending =
            application.rowCount && application.rows[0].status === "pending";
        const approvedInviteExpired =
            application.rowCount &&
            application.rows[0].status === "approved" &&
            decision === "approve";
        if (!requestIsPending && !approvedInviteExpired) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Pending request or previously approved request not found."
            });
        }

        const invitationCode =
            decision === "approve"
                ? randomBytes(32).toString("base64url")
                : null;
        await client.query(
            `UPDATE marketer_applications
             SET status = $1,
                 invitation_token_hash = $2,
                 invitation_expires_at = $3,
                 reviewed_by = $4,
                 reviewed_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [
                decision === "approve" ? "approved" : "rejected",
                invitationCode ? hashToken(invitationCode) : null,
                invitationCode ? new Date(Date.now() + 7 * 86400000) : null,
                req.user.id,
                applicationId
            ]
        );
        await client.query("COMMIT");

        return res.json({
            success: true,
            message:
                decision === "approve"
                    ? "Request approved. Copy the one-time invite code and send it to the applicant."
                    : "Request rejected.",
            ...(invitationCode && { invitationCode })
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("REVIEW MARKETER APPLICATION ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to review marketer request."
        });
    } finally {
        client.release();
    }
};

export const registerMarketer = async (req, res) => {
    const {
        invitationCode,
        firstName,
        lastName,
        email,
        phone,
        password
    } = req.body || {};
    const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";

    if (
        typeof invitationCode !== "string" ||
        !firstName?.trim() ||
        !lastName?.trim() ||
        !EMAIL_PATTERN.test(normalizedEmail) ||
        typeof password !== "string" ||
        password.length < 8
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide a valid invitation, name, email, and password of at least 8 characters."
        });
    }
    const strength = passwordStrength.checkPasswordStrength(password, [
        firstName,
        lastName,
        normalizedEmail,
        phone
    ]);
    if (!strength.acceptable) {
        return res.status(400).json({
            success: false,
            message: "Password is too weak.",
            errors: strength.issues,
            suggestions: strength.suggestions
        });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const application = await client.query(
            `SELECT id, first_name, last_name, email, phone
             FROM marketer_applications
             WHERE invitation_token_hash = $1
               AND email = $2
               AND status = 'approved'
               AND invitation_expires_at > CURRENT_TIMESTAMP
               AND user_id IS NULL
             FOR UPDATE`,
            [hashToken(invitationCode), normalizedEmail]
        );
        if (!application.rowCount) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: "This invitation is invalid, expired, or does not match the approved email."
            });
        }

        const applicant = application.rows[0];
        const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
        const userResult = await client.query(
            `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
             VALUES ($1, $2, $3, $4, $5, 'marketer')
             RETURNING id, first_name, last_name, email, phone, role, is_active, created_at`,
            [
                applicant.first_name,
                applicant.last_name,
                normalizedEmail,
                phone?.trim() || applicant.phone,
                passwordHash
            ]
        );
        const user = userResult.rows[0];
        await client.query(
            `UPDATE marketer_applications
             SET status = 'registered',
                 user_id = $1,
                 invitation_token_hash = NULL,
                 invitation_expires_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [user.id, applicant.id]
        );
        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Marketer account created.",
            token: signToken(user),
            user
        });
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account already exists for this email or phone."
            });
        }
        console.error("REGISTER MARKETER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create marketer account."
        });
    } finally {
        client.release();
    }
};

export const getMarketerListings = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM property_listings
             WHERE marketer_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        return res.json({ success: true, listings: result.rows });
    } catch (error) {
        console.error("GET MARKETER LISTINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve your listings."
        });
    }
};

export const createMarketerListing = async (req, res) => {
    if (!isValidListing(req.body || {})) {
        return res.status(400).json({
            success: false,
            message: "Provide a title, property type, rent or sale purpose, non-negative price, and valid image/source URLs."
        });
    }

    try {
        const columns = [...LISTING_FIELDS, "marketer_id"];
        const values = LISTING_FIELDS.map((field) => req.body[field] ?? null);
        values[LISTING_FIELDS.indexOf("currency")] ||= "KES";
        values[LISTING_FIELDS.indexOf("source_platform")] ||= "Quickline Homes";
        values.push(req.user.id);
        const placeholders = values.map((_, index) => `$${index + 1}`);
        const result = await pool.query(
            `INSERT INTO property_listings (${columns.join(", ")})
             VALUES (${placeholders.join(", ")})
             RETURNING *`,
            values
        );
        return res.status(201).json({
            success: true,
            listing: result.rows[0]
        });
    } catch (error) {
        console.error("CREATE MARKETER LISTING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create listing."
        });
    }
};

export const updateMarketerListing = async (req, res) => {
    const listingId = Number(req.params.id);
    const updates = LISTING_FIELDS.filter(
        (field) => req.body?.[field] !== undefined
    );
    if (!Number.isInteger(listingId) || listingId < 1 || !updates.length) {
        return res.status(400).json({
            success: false,
            message: "Provide a valid listing ID and at least one listing field."
        });
    }
    if (
        (req.body.listing_purpose !== undefined &&
            !["rent", "sale"].includes(req.body.listing_purpose)) ||
        (req.body.price !== undefined &&
            (!Number.isFinite(Number(req.body.price)) ||
                Number(req.body.price) < 0)) ||
        (req.body.source_platform !== undefined &&
            !LISTING_SOURCES.has(req.body.source_platform)) ||
        !isHttpUrl(req.body.image_url) ||
        !isHttpUrl(req.body.source_url)
    ) {
        return res.status(400).json({
            success: false,
            message: "One or more listing fields are invalid."
        });
    }

    try {
        const values = updates.map((field) => req.body[field]);
        values.push(listingId, req.user.id);
        const result = await pool.query(
            `UPDATE property_listings
             SET ${updates.map((field, index) => `${field} = $${index + 1}`).join(", ")},
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $${values.length - 1}
               AND marketer_id = $${values.length}
             RETURNING *`,
            values
        );
        if (!result.rowCount) {
            return res.status(404).json({
                success: false,
                message: "Listing not found."
            });
        }
        return res.json({ success: true, listing: result.rows[0] });
    } catch (error) {
        console.error("UPDATE MARKETER LISTING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update listing."
        });
    }
};

export const archiveMarketerListing = async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE property_listings
             SET listing_status = 'inactive', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND marketer_id = $2
             RETURNING id`,
            [req.params.id, req.user.id]
        );
        if (!result.rowCount) {
            return res.status(404).json({
                success: false,
                message: "Listing not found."
            });
        }
        return res.json({ success: true, message: "Listing archived." });
    } catch (error) {
        console.error("ARCHIVE MARKETER LISTING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to archive listing."
        });
    }
};

export const createReservationInquiry = async (req, res) => {
    const { name, email, phone, message } = req.body || {};
    const normalizedEmail =
        typeof email === "string" ? email.trim().toLowerCase() : "";
    if (
        !name?.trim() ||
        !EMAIL_PATTERN.test(normalizedEmail) ||
        !phone?.trim() ||
        (message && message.length > 2000)
    ) {
        return res.status(400).json({
            success: false,
            message: "Provide your name, valid email, phone number, and a message under 2,000 characters."
        });
    }

    try {
        const listing = await pool.query(
            `SELECT id FROM property_listings
             WHERE id = $1 AND listing_status = 'active'`,
            [req.params.id]
        );
        if (!listing.rowCount) {
            return res.status(404).json({
                success: false,
                message: "This property is no longer available."
            });
        }

        const result = await pool.query(
            `INSERT INTO reservation_inquiries (listing_id, name, email, phone, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, status, created_at`,
            [
                listing.rows[0].id,
                name.trim(),
                normalizedEmail,
                phone.trim(),
                message?.trim() || null
            ]
        );
        return res.status(201).json({
            success: true,
            message: "Your reservation inquiry was sent. The marketer will contact you to confirm availability and payment arrangements.",
            inquiry: result.rows[0]
        });
    } catch (error) {
        console.error("CREATE RESERVATION INQUIRY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to send reservation inquiry."
        });
    }
};

export const getMarketerInquiries = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT inquiry.id, inquiry.listing_id, inquiry.name, inquiry.email,
                    inquiry.phone, inquiry.message, inquiry.status, inquiry.created_at,
                    listing.title AS listing_title
             FROM reservation_inquiries AS inquiry
             JOIN property_listings AS listing ON listing.id = inquiry.listing_id
             WHERE listing.marketer_id = $1
             ORDER BY inquiry.created_at DESC`,
            [req.user.id]
        );
        return res.json({ success: true, inquiries: result.rows });
    } catch (error) {
        console.error("GET MARKETER INQUIRIES ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve reservation inquiries."
        });
    }
};

export const updateMarketerInquiry = async (req, res) => {
    const allowedStatuses = ["pending", "contacted", "resolved", "cancelled"];
    if (!allowedStatuses.includes(req.body?.status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservation inquiry status."
        });
    }
    try {
        const result = await pool.query(
            `UPDATE reservation_inquiries AS inquiry
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             FROM property_listings AS listing
             WHERE inquiry.id = $2
               AND listing.id = inquiry.listing_id
               AND listing.marketer_id = $3
             RETURNING inquiry.id, inquiry.status`,
            [req.body.status, req.params.id, req.user.id]
        );
        if (!result.rowCount) {
            return res.status(404).json({
                success: false,
                message: "Reservation inquiry not found."
            });
        }
        return res.json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        console.error("UPDATE MARKETER INQUIRY ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update reservation inquiry."
        });
    }
};
