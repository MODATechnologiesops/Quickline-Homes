import pool from "../config/db.js";

// Get available subscription plans
export const getPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: 1,
                name: "Free",
                price: 0,
                duration: "30 days",
                features: [
                    "Basic property management",
                    "Limited property listings",
                    "Basic tenant management"
                ]
            },
            {
                id: 2,
                name: "Basic",
                price: 1500,
                duration: "30 days",
                features: [
                    "Property management",
                    "Tenant management",
                    "Rent tracking",
                    "Maintenance requests"
                ]
            },
            {
                id: 3,
                name: "Professional",
                price: 3500,
                duration: "30 days",
                features: [
                    "Unlimited properties",
                    "Tenant management",
                    "Rent collection",
                    "Maintenance management",
                    "Financial reports"
                ]
            },
            {
                id: 4,
                name: "Enterprise",
                price: 7500,
                duration: "30 days",
                features: [
                    "Multiple property portfolios",
                    "Advanced reports",
                    "Property valuation",
                    "Project management",
                    "Priority support"
                ]
            }
        ];

        res.json({
            success: true,
            plans
        });

    } catch (error) {
        console.error("Subscription plans error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load subscription plans"
        });
    }
};


// Get current user's subscription
export const getMySubscription = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const result = await pool.query(
            `
            SELECT *
            FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                subscription: null
            });
        }

        res.json({
            success: true,
            subscription: result.rows[0]
        });

    } catch (error) {
        console.error("Get subscription error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve subscription"
        });
    }
};


// Create subscription
export const createSubscription = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { planName, amount } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!planName || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "planName and amount are required"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO subscriptions
            (
                user_id,
                plan_name,
                amount,
                status,
                start_date,
                end_date
            )
            VALUES
            (
                $1,
                $2,
                $3,
                'active',
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '30 days'
            )
            RETURNING *
            `,
            [userId, planName, amount]
        );

        res.status(201).json({
            success: true,
            message: "Subscription created successfully",
            subscription: result.rows[0]
        });

    } catch (error) {
        console.error("Create subscription error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create subscription"
        });
    }
};