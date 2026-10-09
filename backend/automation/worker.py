import time
import logging

from app.jobs.payment_reconciliation import reconcile_payments
from app.jobs.rent_reminders import process_rent_reminders
from app.jobs.notification_worker import process_notifications


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("quickline-automation")


def run_jobs():
    logger.info("Running payment reconciliation...")

    try:
        reconcile_payments()
    except Exception:
        logger.exception("Payment reconciliation failed")

    logger.info("Running rent reminder job...")

    try:
        process_rent_reminders()
    except Exception:
        logger.exception("Rent reminder job failed")

    logger.info("Running notification queue...")

    try:
        process_notifications()
    except Exception:
        logger.exception("Notification worker failed")


if __name__ == "__main__":

    logger.info(
        "Quickline Homes automation worker started"
    )

    while True:

        run_jobs()

        # Run every 60 seconds
        time.sleep(60)