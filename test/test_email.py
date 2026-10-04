"""
Unit tests and dispatch simulator for Resend email notifications.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.email_service import CLINIC_ADMIN_EMAIL, send_appointment_confirmation


class TestEmailService(unittest.IsolatedAsyncioTestCase):

    async def test_appointment_confirmation_simulation(self):
        """In dev/test without live API key, service should simulate delivery gracefully."""
        res = await send_appointment_confirmation(
            customer_email="patient@example.com",
            customer_name="Test Patient",
            appointment_time="2026-10-15 10:00 AM IST",
            api_key="re_YourFreeApiKeyHere"
        )
        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("status"), "mock_delivered")
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("cc"), CLINIC_ADMIN_EMAIL)

    async def test_appointment_confirmation_custom_doctor(self):
        res = await send_appointment_confirmation(
            customer_email="john@agastyahomoeo.com",
            customer_name="John Doe",
            appointment_time="2026-10-20 11:30 AM IST",
            doctor_name="Dr. Bramarambha K",
            clinic_location="Malleshwaram, Bengaluru"
        )
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("customer_email"), "john@agastyahomoeo.com")


if __name__ == "__main__":
    unittest.main()
