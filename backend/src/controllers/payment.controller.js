import pool from "../config/db.js";


// Create a payment record
export const createPayment = async (req, res) => {
    try {
        const {
            userId,
            tenantId,
            landlordId,
            amount,
            paymentMethod,
            description,
            chargeId
        } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid payment amount is required"
            });
        }

        const paymentResult = await pool.query(
            `
            INSERT INTO payments (
                user_id,
                tenant_id,
                landlord_id,
                amount,
                payment_method,
                status,
                description
            )
            VALUES ($1,$2,$3,$4,$5,'pending',$6)
            RETURNING *
            `,
            [
                userId || null,
                tenantId || null,
                landlordId || null,
                amount,
                paymentMethod || "mpesa",
                description || null
            ]
        );

        const payment = paymentResult.rows[0];

        // Connect payment to charge
        if (chargeId) {
            await pool.query(
                `
                INSERT INTO payment_transactions (
                    payment_id,
                    charge_id,
                    amount,
                    provider,
                    status
                )
                VALUES ($1,$2,$3,$4,$5)
                `,
                [
                    payment.id,
                    chargeId,
                    amount,
                    paymentMethod || "mpesa",
                    "pending"
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment
        });

    } catch (error) {
        console.error("Create payment error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create payment"
        });
    }
};


// Get payment by ID
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT *
            FROM payments
            WHERE id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        res.json({
            success: true,
            payment: result.rows[0]
        });

    } catch (error) {
        console.error("Get payment error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve payment"
        });
    }
};


// Get user's payment history
export const getUserPayments = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `
            SELECT
                p.*,
                pt.charge_id,
                pt.provider,
                pt.provider_transaction_id,
                pt.status AS transaction_status
            FROM payments p
            LEFT JOIN payment_transactions pt
                ON p.id = pt.payment_id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
            `,
            [userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            payments: result.rows
        });

    } catch (error) {
        console.error("Payment history error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve payment history"
        });
    }
};


// Mark payment as completed
export const completePayment = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        const paymentResult = await client.query(
            `
            UPDATE payments
            SET
                status = 'completed',
                paid_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
            `,
            [id]
        );

        if (paymentResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        const payment = paymentResult.rows[0];

        // Find linked charges
        const transactionResult = await client.query(
            `
            SELECT charge_id, amount
            FROM payment_transactions
            WHERE payment_id = $1
            `,
            [id]
        );

        for (const transaction of transactionResult.rows) {

            if (!transaction.charge_id) continue;

            await client.query(
                `
                UPDATE charges
                SET
                    amount_paid = amount_paid + $1,
                    status =
                        CASE
                            WHEN amount_paid + $1 >= amount
                                THEN 'paid'
                            WHEN amount_paid + $1 > 0
                                THEN 'partially_paid'
                            ELSE status
                        END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    transaction.amount,
                    transaction.charge_id
                ]
            );
        }

        // Update payment transactions
        await client.query(
            `
            UPDATE payment_transactions
            SET
                status = 'completed'
            WHERE payment_id = $1
            `,
            [id]
        );

        // Generate receipt number
        const receiptNumber =
            `RCP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        await client.query(
            `
            INSERT INTO receipts (
                payment_id,
                receipt_number,
                issued_to,
                amount
            )
            VALUES ($1,$2,$3,$4)
            `,
            [
                payment.id,
                receiptNumber,
                payment.user_id
                    ? `User #${payment.user_id}`
                    : "Customer",
                payment.amount
            ]
        );

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Payment completed successfully",
            payment
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("Complete payment error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to complete payment"
        });

    } finally {
        client.release();
    }
};