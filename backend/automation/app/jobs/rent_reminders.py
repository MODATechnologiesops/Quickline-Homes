import logging

from app.database import get_connection, release_connection


logger = logging.getLogger(__name__)


def process_rent_reminders():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                c.id,
                c.tenant_id,
                c.amount,
                c.amount_paid,
                c.due_date
            FROM charges c
            WHERE c.status IN (
                'pending',
                'partially_paid'
            )
            AND c.due_date <= CURRENT_DATE + INTERVAL '3 days'
            AND c.due_date >= CURRENT_DATE
            ORDER BY c.due_date ASC
            """
        )

        charges = cursor.fetchall()

        logger.info(
            "Found %s upcoming rent charges",
            len(charges)
        )

        for charge in charges:

            charge_id = charge[0]
            tenant_id = charge[1]
            amount = charge[2]
            amount_paid = charge[3]
            due_date = charge[4]

            outstanding = (
                float(amount) -
                float(amount_paid or 0)
            )

            if outstanding <= 0:
                continue

            message = (
                f"Your rent payment of KSh "
                f"{outstanding:.2f} is due on "
                f"{due_date}."
            )

            cursor.execute(
                """
                INSERT INTO notification_queue (
                    recipient_id,
                    channel,
                    destination,
                    subject,
                    message,
                    status
                )
                SELECT
                    %s,
                    'in_app',
                    CAST(%s AS VARCHAR),
                    'Rent Payment Reminder',
                    %s,
                    'pending'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM notification_queue
                    WHERE recipient_id = %s
                    AND message = %s
                    AND created_at::date = CURRENT_DATE
                )
                """,
                (
                    tenant_id,
                    tenant_id,
                    message,
                    tenant_id,
                    message
                )
            )

        connection.commit()

    except Exception:

        connection.rollback()

        logger.exception(
            "Rent reminder processing failed"
        )

    finally:

        cursor.close()
        release_connection(connection)