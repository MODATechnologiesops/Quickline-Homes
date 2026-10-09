import { recordDeveloperFee } from "../services/developer-fee.service.js";
import pool from "../config/db.js";
import { initiateSTKPush } from "../services/mpesa.service.js";
// Initiate STK Push for a charge
export const stkPush = async (req, res) => {

    try {

        const {
            chargeId,
            phoneNumber,
            amount
        } = req.body;

        if (!chargeId || !phoneNumber || !amount) {

            return res.status(400).json({
                success: false,
                message:
                    "chargeId, phoneNumber and amount are required"
            });

        }

       const chargeResult = await pool.query(
    `
    SELECT
        c.*,
        t.id AS tenant_id
    FROM charges c
    LEFT JOIN tenants t
        ON t.id = c.tenant_id
    WHERE c.id = $1
    `,
    [chargeId]
);

if (chargeResult.rows.length === 0) {
    return res.status(404).json({
        success: false,
        message: "Charge not found"
    });
}

const charge = chargeResult.rows[0];

const outstanding =
    Number(charge.amount) -
    Number(charge.amount_paid || 0);

if (outstanding <= 0) {
    return res.status(400).json({
        success: false,
        message: "This charge has already been fully paid"
    });
}

if (Number(amount) > outstanding) {
    return res.status(400).json({
        success: false,
        message:
            `Payment cannot exceed outstanding balance of KSh ${outstanding}`
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
            VALUES (
                $1,$2,$3,$4,'mpesa','processing',$5
            )
            RETURNING *
            `,
            [
                req.user?.id || null,
                charge.tenant_id,
                charge.landlord_id,
                amount,
                charge.description
            ]
        );

        const payment = paymentResult.rows[0];

        const transactionResult = await pool.query(
            `
            INSERT INTO payment_transactions (
                payment_id,
                charge_id,
                amount,
                provider,
                status
            )
            VALUES ($1,$2,$3,'mpesa','pending')
            RETURNING *
            `,
            [
                payment.id,
                chargeId,
                amount
            ]
        );

        const stkResponse = await initiateSTKPush({

            phoneNumber,

            amount,

            accountReference:
                charge.reference_number,

            transactionDesc:
                charge.description ||
                "Quickline Homes payment"
        });


        await pool.query(
            `
            INSERT INTO mpesa_transactions (
                payment_id,
                checkout_request_id,
                merchant_request_id,
                phone_number,
                amount,
                status
            )
            VALUES ($1,$2,$3,$4,$5,'initiated')
            `,
            [
                payment.id,
                stkResponse.CheckoutRequestID,
                stkResponse.MerchantRequestID,
                phoneNumber,
                amount
            ]
        );


        res.json({

            success: true,

            message:
                "STK Push initiated successfully",

            paymentId:
                payment.id,

            checkoutRequestId:
                stkResponse.CheckoutRequestID,

            merchantRequestId:
                stkResponse.MerchantRequestID,

            response:
                stkResponse
        });

    } catch (error) {

        console.error(
            "STK Push error:",
            error.response?.data ||
            error.message
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to initiate M-Pesa STK Push",

            error:
                error.response?.data ||
                error.message
        });
    }
};

// Handle M-Pesa Daraja callback
export const mpesaCallback = async (req, res) => {
    const client = await pool.connect();

    try {
        console.log(
            "M-Pesa Callback:",
            JSON.stringify(req.body, null, 2)
        );

        const callbackData =
            req.body?.Body?.stkCallback;

        if (!callbackData) {
            return res.status(400).json({
                ResultCode: 1,
                ResultDesc: "Invalid callback data"
            });
        }

        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = callbackData;

        await client.query("BEGIN");

        await recordDeveloperFee({
    client,
    paymentId,
    mpesaTransactionId: mpesaTransaction.id,
    grossAmount: amount
});

        // Find our M-Pesa transaction
        const transactionResult = await client.query(
            `
            SELECT *
            FROM mpesa_transactions
            WHERE checkout_request_id = $1
            FOR UPDATE
            `,
            [CheckoutRequestID]
        );

        if (transactionResult.rows.length === 0) {

            console.warn(
                "M-Pesa transaction not found:",
                CheckoutRequestID
            );

            await client.query("COMMIT");

            return res.json({
                ResultCode: 0,
                ResultDesc: "Callback received"
            });
        }

        const mpesaTransaction =
            transactionResult.rows[0];

        const paymentId =
            mpesaTransaction.payment_id;

        // Payment successful
        if (Number(ResultCode) === 0) {

            const metadata = {};

            if (CallbackMetadata?.Item) {

                for (
                    const item
                    of CallbackMetadata.Item
                ) {

                    metadata[item.Name] =
                        item.Value;
                }
            }

            const receiptNumber =
                metadata.MpesaReceiptNumber || null;

            const amount =
                Number(metadata.Amount || mpesaTransaction.amount);

            const phoneNumber =
                metadata.PhoneNumber ||
                mpesaTransaction.phone_number;

            const transactionDate =
                metadata.TransactionDate
                    ? parseMpesaDate(
                        metadata.TransactionDate
                    )
                    : new Date();


            // Update M-Pesa transaction
            await client.query(
                `
                UPDATE mpesa_transactions
                SET
                    merchant_request_id = $1,
                    mpesa_receipt_number = $2,
                    phone_number = $3,
                    amount = $4,
                    transaction_date = $5,
                    result_code = $6,
                    result_description = $7,
                    status = 'completed',
                    raw_callback = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE checkout_request_id = $9
                `,
                [
                    MerchantRequestID,
                    receiptNumber,
                    phoneNumber,
                    amount,
                    transactionDate,
                    ResultCode,
                    ResultDesc,
                    req.body,
                    CheckoutRequestID
                ]
            );


            // Update payment
            const paymentResult =
                await client.query(
                    `
                    UPDATE payments
                    SET
                        status = 'completed',
                        paid_at = CURRENT_TIMESTAMP,
                        reference = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        receiptNumber,
                        paymentId
                    ]
                );

            const payment =
                paymentResult.rows[0];


            // Find charges attached to payment
            const chargeTransactions =
                await client.query(
                    `
                    SELECT
                        charge_id,
                        amount
                    FROM payment_transactions
                    WHERE payment_id = $1
                    `,
                    [paymentId]
                );


            for (
                const transaction
                of chargeTransactions.rows
            ) {

                if (!transaction.charge_id) {
                    continue;
                }

                await client.query(
                    `
                    UPDATE charges
                    SET
                        amount_paid =
                            LEAST(
                                amount,
                                amount_paid + $1
                            ),

                        status =
                            CASE
                                WHEN amount_paid + $1 >= amount
                                    THEN 'paid'

                                WHEN amount_paid + $1 > 0
                                    THEN 'partially_paid'

                                ELSE status
                            END,

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE id = $2
                    `,
                    [
                        transaction.amount,
                        transaction.charge_id
                    ]
                );
            }


            // Update payment transaction
            await client.query(
                `
                UPDATE payment_transactions
                SET
                    provider_transaction_id = $1,
                    transaction_reference = $2,
                    status = 'completed'
                WHERE payment_id = $3
                `,
                [
                    receiptNumber,
                    CheckoutRequestID,
                    paymentId
                ]
            );


            // Generate receipt
            const generatedReceipt =
                `RCP-${Date.now()}-${Math.floor(
                    Math.random() * 10000
                )}`;

            await client.query(
                `
                INSERT INTO receipts (
                    payment_id,
                    receipt_number,
                    issued_to,
                    amount
                )
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (receipt_number)
                DO NOTHING
                `,
                [
                    paymentId,
                    generatedReceipt,
                    phoneNumber,
                    amount
                ]
            );


            await client.query("COMMIT");

            console.log(
                "M-Pesa payment completed:",
                receiptNumber
            );

        } else {

            // Payment failed/cancelled
            await client.query(
                `
                UPDATE mpesa_transactions
                SET
                    merchant_request_id = $1,
                    result_code = $2,
                    result_description = $3,
                    status = 'failed',
                    raw_callback = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE checkout_request_id = $5
                `,
                [
                    MerchantRequestID,
                    ResultCode,
                    ResultDesc,
                    req.body,
                    CheckoutRequestID
                ]
            );


            await client.query(
                `
                UPDATE payments
                SET
                    status = 'failed',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                `,
                [paymentId]
            );


            await client.query(
                `
                UPDATE payment_transactions
                SET
                    status = 'failed'
                WHERE payment_id = $1
                `,
                [paymentId]
            );


            await client.query("COMMIT");

            console.log(
                "M-Pesa payment failed:",
                ResultDesc
            );
        }


        // Daraja expects this response
        return res.json({
            ResultCode: 0,
            ResultDesc: "Callback processed successfully"
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "M-Pesa callback error:",
            error
        );

        return res.status(500).json({
            ResultCode: 1,
            ResultDesc: "Callback processing failed"
        });

    } finally {
        client.release();
    }
};


// Convert Daraja's YYYYMMDDHHmmss format
function parseMpesaDate(value) {

    const text = String(value);

    if (text.length !== 14) {
        return new Date();
    }

    const year =
        Number(text.substring(0, 4));

    const month =
        Number(text.substring(4, 6)) - 1;

    const day =
        Number(text.substring(6, 8));

    const hour =
        Number(text.substring(8, 10));

    const minute =
        Number(text.substring(10, 12));

    const second =
        Number(text.substring(12, 14));

    return new Date(
        year,
        month,
        day,
        hour,
        minute,
        second
    );
}

export const c2bValidation = async (req, res) => {
    try {
        console.log(
            "C2B Validation:",
            JSON.stringify(req.body, null, 2)
        );

        const {
            TransID,
            TransAmount,
            BillRefNumber,
            MSISDN
        } = req.body;

        if (!TransID || !TransAmount) {
            return res.status(400).json({
                ResultCode: "C2B00011",
                ResultDesc: "Invalid transaction"
            });
        }

        /*
         * BillRefNumber can contain:
         *
         * RENT-123
         * CHARGE-123
         * INVOICE-123
         *
         * We will use it to match the customer's
         * payment to a Quickline Homes charge.
         */

        console.log("C2B reference:", BillRefNumber);
        console.log("C2B phone:", MSISDN);

        // Accept transaction
        return res.json({
            ResultCode: "0",
            ResultDesc: "Accepted"
        });

    } catch (error) {

        console.error(
            "C2B validation error:",
            error
        );

        return res.status(500).json({
            ResultCode: "C2B00012",
            ResultDesc: "Validation failed"
        });
    }
};

export const c2bConfirmation = async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        console.log(
            "C2B Confirmation:",
            JSON.stringify(req.body, null, 2)
        );

        const {
            TransID,
            TransTime,
            TransAmount,
            BusinessShortCode,
            BillRefNumber,
            InvoiceNumber,
            MSISDN,
            FirstName,
            MiddleName,
            LastName
        } = req.body;

        if (!TransID || !TransAmount) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                ResultCode: "C2B00011",
                ResultDesc: "Invalid transaction"
            });
        }

        const amount = Number(TransAmount);

        if (!Number.isFinite(amount) || amount <= 0) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                ResultCode: "C2B00011",
                ResultDesc: "Invalid amount"
            });
        }


        // ------------------------------------------------
        // 1. Prevent duplicate C2B transactions
        // ------------------------------------------------

        const duplicate = await client.query(
            `
            SELECT id
            FROM mpesa_transactions
            WHERE mpesa_receipt_number = $1
            LIMIT 1
            `,
            [TransID]
        );

        if (duplicate.rows.length > 0) {

            await client.query("COMMIT");

            return res.json({
                ResultCode: "0",
                ResultDesc: "Transaction already processed"
            });
        }


        // ------------------------------------------------
        // 2. Find matching charge
        // ------------------------------------------------

        let charge = null;

        if (BillRefNumber) {

            const chargeResult = await client.query(
                `
                SELECT *
                FROM charges
                WHERE reference_number = $1
                LIMIT 1
                `,
                [BillRefNumber]
            );

            if (chargeResult.rows.length > 0) {
                charge = chargeResult.rows[0];
            }
        }


        // ------------------------------------------------
        // 3. Find payment if charge exists
        // ------------------------------------------------

        let paymentId = null;

        if (charge) {

            const paymentResult = await client.query(
                `
                SELECT id
                FROM payments
                WHERE charge_id = $1
                AND status IN ('pending', 'processing')
                ORDER BY created_at ASC
                LIMIT 1
                `,
                [charge.id]
            );

            if (paymentResult.rows.length > 0) {
                paymentId = paymentResult.rows[0].id;
            }
        }


        // ------------------------------------------------
        // 4. Record M-Pesa transaction
        // ------------------------------------------------
const mpesaResult = await client.query(
    `
    INSERT INTO mpesa_transactions (
        payment_id,
        charge_id,
        merchant_request_id,
        checkout_request_id,
        mpesa_receipt_number,
        phone_number,
        amount,
        transaction_date,
        result_code,
        result_description,
        status,
        raw_callback
    )
    VALUES (
        $1,
        $2,
        NULL,
        NULL,
        $3,
        $4,
        $5,
        $6,
        0,
        'C2B transaction successful',
        'completed',
        $7
    )
    RETURNING *
    `,
    [
        paymentId,
        charge ? charge.id : null,
        TransID,
        MSISDN || null,
        amount,
        parseC2BDate(TransTime),
        req.body
    ]
);

        const mpesaTransaction =
            mpesaResult.rows[0];


        // ------------------------------------------------
        // 5. Update charge
        // ------------------------------------------------

        if (charge) {

            const newPaidAmount =
                Number(charge.amount_paid || 0) +
                amount;

            let newStatus = "partially_paid";

            if (newPaidAmount >= Number(charge.amount)) {
                newStatus = "paid";
            }

            await client.query(
                `
                UPDATE charges
                SET
                    amount_paid = LEAST(amount, $1),
                    status = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                `,
                [
                    newPaidAmount,
                    newStatus,
                    charge.id
                ]
            );
        }


        // ------------------------------------------------
        // 6. Update payment
        // ------------------------------------------------

        if (paymentId) {

            await client.query(
                `
                UPDATE payments
                SET
                    status = 'completed',
                    paid_at = CURRENT_TIMESTAMP,
                    reference = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                    TransID,
                    paymentId
                ]
            );
        }


        // ------------------------------------------------
        // 7. Record developer fee
        // ------------------------------------------------

        const developerFee =
            amount * (0.01 / 100);

        await client.query(
            `
            INSERT INTO developer_fee_ledger (
                payment_id,
                mpesa_transaction_id,
                gross_amount,
                fee_percentage,
                fee_amount,
                currency,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                0.010000,
                $4,
                'KES',
                'accrued'
            )
            `,
            [
                paymentId,
                mpesaTransaction.id,
                amount,
                developerFee
            ]
        );


        // ------------------------------------------------
        // 8. Record payment transaction
        // ------------------------------------------------

        if (paymentId) {

            await client.query(
                `
                INSERT INTO payment_transactions (
                    payment_id,
                    provider_transaction_id,
                    transaction_reference,
                    amount,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    'completed'
                )
                `,
                [
                    paymentId,
                    TransID,
                    BillRefNumber || InvoiceNumber || null,
                    amount
                ]
            );
        }


        // ------------------------------------------------
        // 9. Generate receipt
        // ------------------------------------------------

        if (paymentId) {

            const receiptNumber =
                `RCP-C2B-${TransID}`;

            await client.query(
                `
                INSERT INTO receipts (
                    payment_id,
                    receipt_number,
                    issued_to,
                    amount
                )
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (receipt_number)
                DO NOTHING
                `,
                [
                    paymentId,
                    receiptNumber,
                    MSISDN || "C2B Customer",
                    amount
                ]
            );
        }


        await client.query("COMMIT");


        console.log(
            `C2B ${TransID} successfully processed`
        );

        console.log(
            `Developer fee accrued: KSh ${developerFee}`
        );


        return res.json({
            ResultCode: "0",
            ResultDesc: "Confirmation received successfully"
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "C2B confirmation error:",
            error
        );

        return res.status(500).json({
            ResultCode: "C2B00012",
            ResultDesc: "Confirmation processing failed"
        });

    } finally {

        client.release();
    }
};

function parseC2BDate(value) {

    if (!value) {
        return new Date();
    }

    const text = String(value);

    if (text.length !== 14) {
        return new Date();
    }

    const year =
        Number(text.substring(0, 4));

    const month =
        Number(text.substring(4, 6)) - 1;

    const day =
        Number(text.substring(6, 8));

    const hour =
        Number(text.substring(8, 10));

    const minute =
        Number(text.substring(10, 12));

    const second =
        Number(text.substring(12, 14));

    return new Date(
        year,
        month,
        day,
        hour,
        minute,
        second
    );
}