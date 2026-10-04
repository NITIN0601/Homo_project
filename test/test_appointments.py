"""
Unit tests for appointment scheduling, calendar validation, and event creation.
"""

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.google_calendar import (
    create_google_calendar_event,
    validate_email_address,
    validate_future_date,
)


class TestAppointmentsModule(unittest.IsolatedAsyncioTestCase):

    def test_email_validation(self):
        self.assertTrue(validate_email_address("patient@example.com"))
        self.assertTrue(validate_email_address("john.doe+clinic@agastyahomoeo.com"))
        self.assertFalse(validate_email_address("invalid-email"))
        self.assertFalse(validate_email_address("@nodomain.com"))
        self.assertFalse(validate_email_address(""))

    def test_future_date_validation(self):
        future_iso = (datetime.now() + timedelta(days=2)).isoformat()
        self.assertTrue(validate_future_date(future_iso))

        past_iso = (datetime.now() - timedelta(days=2)).isoformat()
        self.assertFalse(validate_future_date(past_iso))

    async def test_calendar_event_creation_simulation(self):
        start_time = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT10:00:00")
        end_time = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT10:30:00")

        res = await create_google_calendar_event(
            user_email="patient@example.com",
            user_name="John Doe",
            start_time_iso=start_time,
            end_time_iso=end_time,
            summary="Homoeopathy Consultation",
            description="Follow-up consultation"
        )
        self.assertTrue(res.get("success"))
        self.assertIn("gcal_sim_", res.get("event_id"))
        self.assertEqual(res.get("status"), "confirmed_simulation")

    async def test_calendar_event_rejects_past_date(self):
        past_start = "2020-01-01T10:00:00"
        past_end = "2020-01-01T10:30:00"

        res = await create_google_calendar_event(
            user_email="patient@example.com",
            user_name="John Doe",
            start_time_iso=past_start,
            end_time_iso=past_end
        )
        self.assertFalse(res.get("success"))
        self.assertEqual(res.get("code"), "PAST_DATE")


if __name__ == "__main__":
    unittest.main()
