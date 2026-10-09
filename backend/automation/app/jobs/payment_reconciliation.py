import logging

from app.database import get_connection, release_connection


logger = logging.getLogger(__name__)


def reconcile_payments():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                mpesa_receipt_number,
                payment_id,
                charge_id,
                amount,
                status
            FROM mpesa_transactions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 50
            """
        )

        transactions = cursor.fetchall()

        logger.info(
            "Found %s pending M-Pesa transactions",
            len(transactions)
        )

        for transaction in transactions:

            transaction_id = transaction[0]

            logger.info(
                "Reconciling M-Pesa transaction %s",
                transaction_id
            )

            # Actual Safaricom Transaction Status
            # integration will be added here.
            #
            # We deliberately don't mark a transaction
            # completed until Safaricom confirms it.

        connection.commit()

    except Exception:

        connection.rollback()

        logger.exception(
            "Payment reconciliation error"
        )

    finally:

        cursor.close()
        release_connection(connection)