"""
Test Suite for Hospital & Doctor Domain Services.
Validates multi-tenant hospital resolution, multi-doctor roster scoping,
and dynamic scheduling dispatch without hardcoded clinic identities.
"""

import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from main import app
from services.doctor_service import get_primary_doctor, list_doctors
from services.hospital_service import get_hospital, list_hospitals


class TestHospitalDoctorServices(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_list_hospitals_service_and_api(self):
        # Service level
        hospitals = list_hospitals()
        self.assertGreaterEqual(len(hospitals), 2)
        ids = [h["id"] for h in hospitals]
        self.assertIn("agastya", ids)
        self.assertIn("apollo", ids)

        # API endpoint level
        res = self.client.get("/api/v1/hospitals")
        self.assertEqual(res.status_code, 200)
        api_hospitals = res.json()
        self.assertGreaterEqual(len(api_hospitals), 2)

    def test_get_hospital_by_id(self):
        h = get_hospital("agastya")
        self.assertEqual(h["id"], "agastya")
        self.assertIn("contact", h)
        self.assertIn("branding", h)

        apollo = get_hospital("apollo")
        self.assertEqual(apollo["id"], "apollo")
        self.assertIn("Apollo", apollo["name"])

        # Fallback for unknown ID returns default
        unknown = get_hospital("non-existent-clinic-99")
        self.assertEqual(unknown["id"], "default")

    def test_resolve_hospital_via_header(self):
        # Header resolution for Apollo
        res = self.client.get("/api/v1/hospitals/active", headers={"X-Tenant-ID": "apollo"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], "apollo")

        # Default header resolution returns neutral default tenant
        res_default = self.client.get("/api/v1/hospitals/active")
        self.assertEqual(res_default.status_code, 200)
        self.assertEqual(res_default.json()["id"], "default")

    def test_doctor_roster_scoping(self):
        # Doctor roster for Agastya (strictly 1 doctor: Dr. Bramarambha K)
        agastya_docs = list_doctors(hospital_id="agastya")
        self.assertEqual(len(agastya_docs), 1)
        self.assertEqual(agastya_docs[0]["id"], "doc-001")
        self.assertIn("Bramarambha", agastya_docs[0]["name"])

        # Primary doctor for Agastya
        primary = get_primary_doctor("agastya")
        self.assertEqual(primary["id"], "doc-001")
        self.assertTrue(primary.get("isPrimary"))

        # Doctors for Apollo (multi-doctor roster)
        apollo_docs = list_doctors(hospital_id="apollo")
        self.assertGreaterEqual(len(apollo_docs), 2)
        apollo_doc_ids = [d["id"] for d in apollo_docs]
        self.assertIn("doc-002", apollo_doc_ids)
        self.assertIn("doc-003", apollo_doc_ids)

        # API endpoint for Agastya doctors
        res = self.client.get("/api/v1/hospitals/agastya/doctors")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
        self.assertEqual(res.json()[0]["id"], "doc-001")

    def test_booking_with_custom_hospital_and_doctor(self):
        import time

        from services.data_store import update_appointment_status
        unique_min = int(time.time()) % 50 + 10
        start_iso = f"2026-12-25T11:{unique_min:02d}:00"
        end_iso = f"2026-12-25T11:{unique_min+15:02d}:00"

        payload = {
            "user_email": "patient.multi@example.com",
            "user_name": "Multi Tenant Patient",
            "user_phone": "+91 99000 11223",
            "start_time": start_iso,
            "end_time": end_iso,
            "summary": "Apollo Internal Medicine Consultation",
            "hospital_id": "apollo",
            "doctor_id": "doc-003",
        }
        res = self.client.post("/api/v1/book-appointment", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["status"], "success")

        appointment = data["appointment"]
        apt_id = appointment.get("id")
        try:
            self.assertEqual(appointment["hospitalId"], "apollo")
            self.assertEqual(appointment["doctorId"], "doc-003")
            self.assertIn("Apollo", appointment["hospitalName"])
            self.assertIn("Ramesh Nair", appointment["doctorName"])
        finally:
            if apt_id:
                update_appointment_status(apt_id, "Cancelled")


if __name__ == "__main__":
    unittest.main()
