import pool from "../config/db.js";

const DEVELOPER_FEE_PERCENTAGE = 0.00500; // 0.5%


export const recordDeveloperFee= async (
    paymentId,
    mpesaTransactionId,
    grossAmount
) => {
    const feePercentage = getDeveloperFeePercentage();
    const amount = Number(grossAmount);
    const feeAmount = Number((amount * feePercentage).toFixed(2));

    return await createDeveloperFeeLedger(paymentId, mpesaTransactionId, grossAmount);
};

export const createDeveloperFeeLedger = async (
    paymentId,
    mpesaTransactionId,
    grossAmount
) => {
    if (!paymentId) {
        throw new Error("Payment ID is required.");
    }

    if (!grossAmount || Number(grossAmount) <= 0) {
        throw new Error("Valid gross payment amount is required.");
    }

    const existing = await pool.query(
        `
        SELECT *
        FROM developer_fee_ledger
        WHERE payment_id = $1
        LIMIT 1
        `,
        [paymentId]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    const amount = Number(grossAmount);

    const feeAmount = Number(
        (amount * DEVELOPER_FEE_PERCENTAGE).toFixed(2)
    );

    const result = await pool.query(
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
        RETURNING *
        `,
        [
            paymentId,
            mpesaTransactionId || null,
            amount,
            DEVELOPER_FEE_PERCENTAGE,
            feeAmount
        ]
    );

    return result.rows[0];
};