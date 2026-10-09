import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";


// ======================================================
// REGISTER
// ======================================================

export const register = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            password,
            role
        } = req.body;

        // Check required fields
        if (
            !first_name ||
            !last_name ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "First name, last name, email and password are required"
            });
        }

        // Only allow our three system roles
        const allowedRoles = [
            "admin",
            "landlord",
            "tenant"
        ];

        const userRole = role || "tenant";

        if (!allowedRoles.includes(userRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role"
            });
        }

        // Check whether email already exists
        const existingUser = await pool.query(
            `SELECT id FROM users WHERE email = $1`,
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        // Check phone if supplied
        if (phone) {
            const existingPhone = await pool.query(
                `SELECT id FROM users WHERE phone = $1`,
                [phone]
            );

            if (existingPhone.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number is already registered"
                });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

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
                first_name,
                last_name,
                email.toLowerCase(),
                phone || null,
                passwordHash,
                userRole
            ]
        );

        const user = result.rows[0];

        // Create JWT
        const token = jwt.sign(
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

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message
        });
    }
};


// ======================================================
// LOGIN
// ======================================================

export const login = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
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
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = result.rows[0];

        // Check account status
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
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

        // Never send password hash to frontend
        delete user.password_hash;

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message
        });
    }
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