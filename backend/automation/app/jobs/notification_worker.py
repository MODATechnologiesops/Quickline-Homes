import logging

from app.database import get_connection, release_connection


logger = logging.getLogger(__name__)


def process_notifications():

    connection = get_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                recipient_id,
                channel,
                destination,
                subject,
                message,
                attempts
            FROM notification_queue
            WHERE status = 'pending'
            AND scheduled_at <= CURRENT_TIMESTAMP
            AND attempts < 3
            ORDER BY scheduled_at ASC
            LIMIT 50
            """
        )

        notifications = cursor.fetchall()

        for notification in notifications:

            (
                notification_id,
                recipient_id,
                channel,
                destination,
                subject,
                message,
                attempts
            ) = notification

            logger.info(
                "Processing notification %s via %s",
                notification_id,
                channel
            )

            try:

                # Channel providers will be connected here.
                #
                # SMS      -> SMS provider
                # WhatsApp -> WhatsApp provider
                # Email    -> SMTP/provider
                # in_app   -> database notification

                if channel == "in_app":

                    cursor.execute(
                        """
                        INSERT INTO messages (
                            recipient_id,
                            subject,
                            message,
                            message_type,
                            channel,
                            status,
                            sent_at
                        )
                        VALUES (
                            %s,
                            %s,
                            %s,
                            'system',
                            'in_app',
                            'sent',
                            CURRENT_TIMESTAMP
                        )
                        """,
                        (
                            recipient_id,
                            subject,
                            message
                        )
                    )

                cursor.execute(
                    """
                    UPDATE notification_queue
                    SET
                        status = 'sent',
                        attempts = attempts + 1,
                        sent_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    [notification_id]
                )

            except Exception as error:

                cursor.execute(
                    """
                    UPDATE notification_queue
                    SET
                        attempts = attempts + 1,
                        last_error = %s,
                        status =
                            CASE
                                WHEN attempts + 1 >= 3
                                THEN 'failed'
                                ELSE 'pending'
                            END
                    WHERE id = %s
                    """,
                    (
                        str(error),
                        notification_id
                    )
                )

        connection.commit()

    except Exception:

        connection.rollback()

        logger.exception(
            "Notification processing failed"
        )

    finally:

        cursor.close()
        release_connection(connection)