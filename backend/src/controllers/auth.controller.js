import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import * as passwordStrength from "../services/password_strength.service.js";

const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Anyone may register as one of these. "admin" can only be created by a
// signed-in administrator (or with scripts/create-admin.mjs).
const SELF_SERVICE_ROLES = ["landlord", "tenant"];
const ALL_ROLES = ["admin", ...SELF_SERVICE_ROLES];

// ======================================================
// HELPERS
// ======================================================

const isText = (value) => typeof value === "string" && value.trim() !== "";

function signToken(user) {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set. Add it to the backend .env file.");
    }

    return jwt.sign(
        {
            id: user.id,
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
}

// A real bcrypt hash to compare against when the email is unknown, so a login
// for a missing account takes as long as one for a real account and cannot be
// told apart by timing.
let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("timing-equaliser", BCRYPT_ROUNDS));

// Internal error text only goes to the client outside production.
function serverError(res, label, message, error) {
    console.error(`${label}:`, error);

    return res.status(500).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && { error: error.message })
    });
}

// ======================================================
// REGISTER
// ======================================================

export const register = async (req, res) => {
    try {
        const body = req.body || {};

        const { password, role, phone } = body;

        const firstName = isText(body.first_name) ? body.first_name.trim() : "";
        const lastName = isText(body.last_name) ? body.last_name.trim() : "";
        const email = isText(body.email) ? body.email.trim().toLowerCase() : "";

        // Check required fields
        if (!firstName || !lastName || !email || typeof password !== "string" || password === "") {
            return res.status(400).json({
                success: false,
                message: "First name, last name, email and password are required"
            });
        }

        if (!EMAIL_PATTERN.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address"
            });
        }

        // Only allow our three system roles
        const userRole = role || "tenant";

        if (!ALL_ROLES.includes(userRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role"
            });
        }

        // Without this check, anyone could register themselves as an admin.
        if (!SELF_SERVICE_ROLES.includes(userRole) && req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only an administrator can create administrator accounts"
            });
        }

        // Password strength, checked against the person's own details
        const strength = passwordStrength.checkPasswordStrength(password, [
            firstName,
            lastName,
            email,
            phone
        ]);

        if (!strength.acceptable) {
            return res.status(400).json({
                success: false,
                message: "Password is too weak",
                errors: strength.issues,
                suggestions: strength.suggestions,
                strength: { score: strength.score, label: strength.label }
            });
        }

        // Check whether email already exists
        const existingUser = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Check phone if supplied
        const phoneValue = isText(phone) ? phone.trim() : null;

        if (phoneValue) {
            const existingPhone = await pool.query(
                `SELECT id FROM users WHERE phone = $1`,
                [phoneValue]
            );

            if (existingPhone.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number is already registered"
                });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Create user
        const result = await pool.query(
            `INSERT INTO users
            (
                first_name,
                last_name,
                email,
                phone,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                first_name,
                last_name,
                email,
                phone,
                role,
                is_active,
                created_at`,
            [
                firstName,
                lastName,
                email,
                phoneValue,
                passwordHash,
                userRole
            ]
        );

        const user = result.rows[0];

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token: signToken(user),
            user
        });

    } catch (error) {
        // Two simultaneous sign-ups with the same email or phone: the database
        // unique constraint catches the one the checks above missed.
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email or phone number is already registered"
            });
        }

        return serverError(res, "REGISTER ERROR", "Registration failed", error);
    }
};


// ======================================================
// LOGIN
// ======================================================

export const login = async (req, res) => {
    try {
        const body = req.body || {};
        const { password } = body;
        const email = isText(body.email) ? body.email.trim().toLowerCase() : "";

        if (!email || typeof password !== "string" || password === "") {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const result = await pool.query(
            `SELECT *
             FROM users
             WHERE email = $1`,
            [email]
        );

        const user = result.rows[0];

        // Compare password. An unknown email is compared against a dummy hash
        // so the response time does not reveal whether the account exists.
        const passwordMatch = await bcrypt.compare(
            password,
            user?.password_hash || (await getDummyHash())
        );

        if (!user || !passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check account status only after the password is right, so an
        // inactive account is not revealed to someone who does not know it.
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        const token = signToken(user);

        // Never send password hash to frontend
        delete user.password_hash;

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        return serverError(res, "LOGIN ERROR", "Login failed", error);
    }
};


// ======================================================
// PASSWORD STRENGTH (live feedback while the user types)
// ======================================================

// POST body: { password, first_name?, last_name?, email?, phone? }
// Nothing is stored and the password is never logged.
export const checkPasswordStrength = (req, res) => {
    const { password, first_name, last_name, email, phone } = req.body || {};

    if (typeof password !== "string") {
        return res.status(400).json({
            success: false,
            message: "password is required"
        });
    }

    const { score, label, acceptable, issues, suggestions } =
        passwordStrength.checkPasswordStrength(password, [first_name, last_name, email, phone]);

    return res.json({
        success: true,
        strength: { score, label, acceptable, issues, suggestions }
    });
};


// ======================================================
// CURRENT USER
// ======================================================

export const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                first_name,
                last_name,
                email,
                phone,
                role,
                is_active,
                created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("GET ME ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user"
        });
    }
};