import pool from "../config/db.js";

/**
 * Generate monthly rent charges for active leases.
 *
 * @param {Date|string} billingPeriodDate
 * @returns {Promise<object>}
 */
export const generateMonthlyRentCharges = async (billingPeriodDate = new Date()) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Always use the first day of the billing month.
        const billingDate = new Date(billingPeriodDate);

        if (Number.isNaN(billingDate.getTime())) {
            throw new Error("Invalid billing period.");
        }

        const year = billingDate.getUTCFullYear();
        const month = billingDate.getUTCMonth();

        const billingPeriod = new Date(Date.UTC(year, month, 1));

        const billingPeriodString =
            `${year}-${String(month + 1).padStart(2, "0")}-01`;

        /*
         * Rent charge type:
         * charge_types.id = 1
         */
        const rentChargeType = await client.query(
            `
            SELECT id, name
            FROM charge_types
            WHERE id = 1
              AND LOWER(name) = 'rent'
            LIMIT 1
            `
        );

        if (rentChargeType.rows.length === 0) {
            throw new Error(
                "Rent charge type was not found. Expected charge_types.id = 1."
            );
        }

        /*
         * Find active leases that should receive rent
         * for this billing period.
         */
        const leasesResult = await client.query(
            `
            SELECT
                l.id AS lease_id,
                l.tenant_id,
                l.unit_id,
                l.start_date,
                l.end_date,
                l.monthly_rent,

                t.full_name AS tenant_name,

                pu.unit_number,
                pu.property_id,

                p.landlord_id,
                p.name AS property_name

            FROM leases l

            INNER JOIN tenants t
                ON t.id = l.tenant_id

            INNER JOIN property_units pu
                ON pu.id = l.unit_id

            INNER JOIN properties p
                ON p.id = pu.property_id

            WHERE l.status = 'active'

              AND l.start_date <= $1

              AND (
                    l.end_date IS NULL
                    OR l.end_date >= $1
                  )

              AND l.monthly_rent > 0

            ORDER BY l.id
            `,
            [billingPeriodString]
        );

        let created = 0;
        let skipped = 0;

        const charges = [];

        for (const lease of leasesResult.rows) {

            /*
             * Safety check:
             * Never create the same rent charge twice
             * for the same lease and billing period.
             */
            const existingCharge = await client.query(
                `
                SELECT id
                FROM charges
                WHERE lease_id = $1
                  AND charge_type_id = 1
                  AND billing_period = $2
                LIMIT 1
                `,
                [
                    lease.lease_id,
                    billingPeriodString
                ]
            );

            if (existingCharge.rows.length > 0) {
                skipped++;

                continue;
            }

            const referenceNumber =
                `RENT-${lease.lease_id}-${year}-${String(month + 1).padStart(2, "0")}`;

            const description =
                `Monthly rent - ${lease.property_name} / Unit ${lease.unit_number} - ${billingPeriodString}`;

            /*
             * Current implementation:
             * rent is due on the first day of the billing month.
             */
            const dueDate = billingPeriodString;

            const chargeResult = await client.query(
                `
                INSERT INTO charges
                (
                    charge_type_id,
                    tenant_id,
                    landlord_id,
                    property_id,
                    unit_id,
                    lease_id,
                    description,
                    amount,
                    amount_paid,
                    balance,
                    due_date,
                    status,
                    reference_number,
                    billing_period,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    0,
                    $8,
                    $9,
                    'pending',
                    $10,
                    $9,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING *
                `,
                [
                    1,
                    lease.tenant_id,
                    lease.landlord_id,
                    lease.property_id,
                    lease.unit_id,
                    lease.lease_id,
                    description,
                    lease.monthly_rent,
                    dueDate,
                    referenceNumber
                ]
            );

            created++;

            charges.push(chargeResult.rows[0]);
        }

        await client.query("COMMIT");

        return {
            success: true,
            billing_period: billingPeriodString,
            total_active_leases: leasesResult.rows.length,
            charges_created: created,
            charges_skipped: skipped,
            charges
        };

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "GENERATE RENT CHARGES ERROR:",
            error
        );

        throw error;

    } finally {
        client.release();
    }
};