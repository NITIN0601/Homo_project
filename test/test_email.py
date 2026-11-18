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

from services.email_service import HOSPITAL_ADMIN_EMAIL, send_appointment_confirmation
from services.notification_service import send_user_invite_notification


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
        self.assertEqual(res.get("cc"), HOSPITAL_ADMIN_EMAIL)

    async def test_appointment_confirmation_custom_doctor(self):
        res = await send_appointment_confirmation(
            customer_email="john@agastyahomoeo.com",
            customer_name="John Doe",
            appointment_time="2026-10-20 11:30 AM IST",
            doctor_name="Dr. Bramarambha K",
            hospital_location="Malleshwaram, Bengaluru"
        )
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("customer_email"), "john@agastyahomoeo.com")

    async def test_dynamic_user_invite_clinic_dispatch(self):
        """Verifies dynamic clinic branding, custom message, and WhatsApp invite generation."""
        res = await send_user_invite_notification(
            email="patient.test@example.com",
            name="Rahul Sharma",
            role="patient",
            hospital_id="agastya",
            invite_url="https://agastyahomoeo.com/join?token=inv_test123",
            phone="+91 98450 11111",
            custom_message="Please join our clinic portal to view your homeopathic constitutional remedy.",
            send_email=True,
            send_sms=True,
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["facility_type"], "clinic")
        self.assertEqual(res["facility_label"], "Clinic")
        self.assertIn("Agastya", res["facility_name"])
        self.assertEqual(res["email"]["status"], "mock_delivered")
        self.assertEqual(res["sms"]["status"], "mock_delivered")
        self.assertIn("constitutional remedy", res["sms"]["message"])
        self.assertIn("Clinic Portal Invitation", res["sms"]["message"])

    async def test_dynamic_user_invite_hospital_doctor_dispatch(self):
        """Verifies dynamic hospital branding for doctor onboarding."""
        res = await send_user_invite_notification(
            email="dr.smith@apollo.org",
            name="Dr. Smith",
            role="doctor",
            hospital_id="default",
            invite_url="https://hospital.org/join?token=inv_doc456",
            phone="+91 98450 22222",
            custom_message="Welcome to our multispecialty inpatient care roster.",
            send_email=True,
            send_sms=True,
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["facility_label"], "Hospital")
        self.assertEqual(res["email"]["status"], "mock_delivered")
        self.assertIn("multispecialty", res["sms"]["message"])


if __name__ == "__main__":
    unittest.main()
