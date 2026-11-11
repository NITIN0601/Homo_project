"""
Unit & Integration Tests for Continuity of Care & Doctor Preference Architecture.
Validates:
1. Returning patient preference for previous treating physician.
2. Inactive/resigned doctor fallback with case transfer trigger.
3. Slot collision on preferred date with colleague recommendation.
4. First-time patient roster auto-triage.
5. End-to-end API response through FastAPI TestClient.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.continuity_service import resolve_patient_doctor_continuity


class TestContinuityOfCare(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("services.continuity_service.load_json")
    @patch("services.continuity_service.list_doctors")
    def test_new_patient_returns_hospital_roster(self, mock_list_docs, mock_load_json):
        mock_list_docs.return_value = [
            {"id": "doc-001", "name": "Dr. Bramarambha K", "isActive": True, "isPrimary": True},
            {"id": "doc-002", "name": "Dr. Ananya Rao", "isActive": True, "isPrimary": False},
        ]
        mock_load_json.return_value = []

        res = resolve_patient_doctor_continuity(
            hospital_id="agastya",
            patient_identifier="newpatient@example.com",
        )
        self.assertFalse(res["is_returning_patient"])
        self.assertEqual(res["status"], "new_patient")
        self.assertIsNotNone(res["preferred_doctor"])
        self.assertEqual(res["preferred_doctor"]["id"], "doc-001")
        self.assertEqual(len(res["hospital_doctors"]), 2)

    @patch("services.continuity_service.load_json")
    @patch("services.continuity_service.list_doctors")
    def test_returning_patient_preferences_previous_doctor(self, mock_list_docs, mock_load_json):
        mock_list_docs.return_value = [
            {"id": "doc-001", "name": "Dr. Bramarambha K", "isActive": True, "isPrimary": True},
            {"id": "doc-002", "name": "Dr. Ananya Rao", "isActive": True, "isPrimary": False},
        ]
        mock_load_json.return_value = [
            {
                "id": "apt-prev-001",
                "hospitalId": "agastya",
                "doctorId": "doc-001",
                "doctorName": "Dr. Bramarambha K",
                "patientEmail": "returning@example.com",
                "patientPhone": "+91 98450 11111",
                "date": "2026-10-15",
                "time": "10:30",
                "status": "Confirmed",
            }
        ]

        res = resolve_patient_doctor_continuity(
            hospital_id="agastya",
            patient_identifier="returning@example.com",
        )
        self.assertTrue(res["is_returning_patient"])
        self.assertEqual(res["status"], "preferred_doctor_available")
        self.assertEqual(res["preferred_doctor"]["id"], "doc-001")
        self.assertIn("Dr. Bramarambha K", res["message"])
        self.assertFalse(res["case_transfer_required"])

    @patch("services.continuity_service.load_json")
    @patch("services.continuity_service.list_doctors")
    def test_inactive_doctor_triggers_colleague_fallback_and_transfer(self, mock_list_docs, mock_load_json):
        mock_list_docs.return_value = [
            {"id": "doc-old", "name": "Dr. Old Physician", "isActive": False, "isPrimary": False},
            {"id": "doc-colleague", "name": "Dr. Colleague Active", "isActive": True, "isPrimary": True},
        ]
        mock_load_json.return_value = [
            {
                "id": "apt-prev-002",
                "hospitalId": "agastya",
                "doctorId": "doc-old",
                "doctorName": "Dr. Old Physician",
                "patientEmail": "patient.transfer@example.com",
                "date": "2026-09-01",
                "time": "11:00",
                "status": "Confirmed",
            }
        ]

        res = resolve_patient_doctor_continuity(
            hospital_id="agastya",
            patient_identifier="patient.transfer@example.com",
        )
        self.assertTrue(res["is_returning_patient"])
        self.assertEqual(res["status"], "doctor_inactive")
        self.assertTrue(res["case_transfer_required"])
        self.assertIsNotNone(res["recommended_alternate"])
        self.assertEqual(res["recommended_alternate"]["id"], "doc-colleague")
        self.assertIn("no longer practicing", res["message"])

    @patch("services.continuity_service.load_json")
    @patch("services.continuity_service.list_doctors")
    def test_doctor_unavailable_on_date_suggests_colleague_or_next_date(self, mock_list_docs, mock_load_json):
        mock_list_docs.return_value = [
            {"id": "doc-001", "name": "Dr. Bramarambha K", "isActive": True, "isPrimary": True},
            {"id": "doc-002", "name": "Dr. Ananya Rao", "isActive": True, "isPrimary": False},
        ]
        mock_load_json.return_value = [
            {
                "id": "apt-prev-003",
                "hospitalId": "agastya",
                "doctorId": "doc-001",
                "doctorName": "Dr. Bramarambha K",
                "patientEmail": "patient.busy@example.com",
                "date": "2026-10-01",
                "time": "10:00",
                "status": "Confirmed",
            },
            {
                # Collision on preferred slot
                "id": "apt-other-004",
                "hospitalId": "agastya",
                "doctorId": "doc-001",
                "doctorName": "Dr. Bramarambha K",
                "patientEmail": "other@example.com",
                "date": "2026-11-20",
                "slot": "10:30",
                "time": "10:30",
                "status": "Confirmed",
            },
        ]

        res = resolve_patient_doctor_continuity(
            hospital_id="agastya",
            patient_identifier="patient.busy@example.com",
            preferred_date="2026-11-20",
            preferred_slot="10:30",
        )
        self.assertTrue(res["is_returning_patient"])
        self.assertEqual(res["status"], "doctor_unavailable_on_date")
        self.assertEqual(res["recommended_alternate"]["id"], "doc-002")
        self.assertIsNotNone(res["next_available_date"])

    def test_api_endpoint_continuity_preference(self):
        response = self.client.get(
            "/api/v1/scheduling/continuity-preference",
            params={
                "hospital_id": "default",
                "identifier": "test.patient@example.com",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("is_returning_patient", data)
        self.assertIn("status", data)
        self.assertIn("message", data)
        self.assertIn("hospital_doctors", data)


if __name__ == "__main__":
    unittest.main()
