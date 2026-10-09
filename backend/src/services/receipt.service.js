import { randomUUID } from "node:crypto";

/**
 * Create a receipt using an existing PostgreSQL transaction.
 * The caller must have already created the payment.
 */
export const createReceipt = async (client, payment) => {
    if (!client || !payment?.id) {
        throw new Error("Database client and payment ID are required.");
    }

    const tenantResult = await client.query(
        `
        SELECT full_name
        FROM tenants
        WHERE id = $1
        LIMIT 1
        `,
        [payment.tenant_id]
    );

    const issuedTo =
        tenantResult.rows[0]?.full_name || "Quickline Homes tenant";

    const receiptNumber =
        `QLH-${new Date().getFullYear()}-${randomUUID()
            .replaceAll("-", "")
            .slice(0, 12)
            .toUpperCase()}`;

    const result = await client.query(
        `
        INSERT INTO receipts (
            payment_id,
            receipt_number,
            issued_to,
            amount,
            issued_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [
            payment.id,
            receiptNumber,
            issuedTo,
            payment.amount
        ]
    );

    return result.rows[0];
};