"""Run as `python -m app.notification_worker` in a separate Compose service."""
import logging
import time
from app import models
from app.db.session import SessionLocal
from app.services.scheduling_service import materialize_notifications

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    while True:
        try:
            with SessionLocal() as db:
                materialize_notifications(db)
        except Exception:
            logging.exception("Notification delivery failed; retrying in 30 seconds")
        time.sleep(30)
