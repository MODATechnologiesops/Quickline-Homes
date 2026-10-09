import pool from "../config/db.js";
import { createReceipt } from "./receipt.service.js";

import {
    recordDeveloperFee
} from "./developer-fee.service.js";

export const recordCompletedPayment = async ({
    chargeId,
    tenantId,
    landlordId,
    userId,
    amount,
    paymentMethod,
    reference,
    description,
    mpesaTransactionId = null
}) => {

    const record = await recordDeveloperFee();

    const receipt = await createReceipt(client, payment);

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        if (!chargeId) {
            throw new Error("Charge ID is required.");
        }

        if (!amount || Number(amount) <= 0) {
            throw new Error("Payment amount must be greater than zero.");
        }

        /*
         * Lock the charge while processing payment.
         * This prevents two simultaneous payments from
         * corrupting the balance.
         */
        const chargeResult = await client.query(
            `
            SELECT *
            FROM charges
            WHERE id = $1
            FOR UPDATE
            `,
            [chargeId]
        );

        if (chargeResult.rows.length === 0) {
            throw new Error("Charge not found.");
        }

        const charge = chargeResult.rows[0];

        const paymentAmount = Number(amount);
        const currentBalance = Number(charge.balance);

        if (paymentAmount > currentBalance) {
            throw new Error(
                `Payment exceeds outstanding balance of KES ${currentBalance.toFixed(2)}.`
            );
        }

        /*
         * Create payment.
         */
        const paymentResult = await client.query(
            `
            INSERT INTO payments
            (
                user_id,
                tenant_id,
                landlord_id,
                amount,
                payment_method,
                status,
                reference,
                description,
                paid_at,
                charge_id
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'completed',
                $6,
                $7,
                CURRENT_TIMESTAMP,
                $8
            )
            RETURNING *
            `,
            [
                userId || null,
                tenantId || charge.tenant_id,
                landlordId || charge.landlord_id,
                paymentAmount,
                paymentMethod,
                reference || null,
                description || charge.description,
                chargeId
            ]
        );

        const payment = paymentResult.rows[0];

        /*
         * Update charge balance.
         */
        const newAmountPaid =
            Number(charge.amount_paid) + paymentAmount;

        const newBalance =
            Number(charge.amount) - newAmountPaid;

        let newStatus = "partial";

        if (newBalance <= 0) {
            newStatus = "paid";
        }

        await client.query(
            `
            UPDATE charges
            SET
                amount_paid = $1,
                balance = $2,
                status = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            `,
            [
                newAmountPaid,
                Math.max(newBalance, 0),
                newStatus,
                chargeId
            ]
        );

        /*
         * Developer fee.
         *
         * We insert using the same transaction connection
         * so payment + fee ledger remain atomic.
         */
        const feePercentage = 0.0050;

        const feeAmount = Number(
            (paymentAmount * feePercentage).toFixed(2)
        );

        const feeResult = await client.query(
            `
            INSERT INTO developer_fee_ledger
            (
                payment_id,
                mpesa_transaction_id,
                gross_amount,
                fee_percentage,
                fee_amount,
                currency,
                status
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                'KES',
                'accrued'
            )
            ON CONFLICT (payment_id)
            WHERE payment_id IS NOT NULL
            DO NOTHING
            RETURNING *
            `,
            [
                payment.id,
                mpesaTransactionId,
                paymentAmount,
                feePercentage,
                feeAmount
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            payment,
            charge_id: chargeId,
            amount_paid: newAmountPaid,
            balance: Math.max(newBalance, 0),
            charge_status: newStatus,
            developer_fee: feeResult.rows[0] || null,
            receipt
        };

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "RECORD COMPLETED PAYMENT ERROR:",
            error
        );

        throw error;

    } finally {
        client.release();
    }
};