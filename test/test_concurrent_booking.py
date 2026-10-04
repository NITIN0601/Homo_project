"""
Unit and integration tests for concurrent appointment booking race conditions.
Verifies that:
1. When two patients simultaneously submit booking requests for the exact same time slot,
   the backend concurrency lock serializes the requests so exactly one succeeds (201 Created)
   and the conflicting request receives 409 Conflict.
2. A subsequent request for an already booked slot is rejected with 409 Conflict.
3. Concurrent requests for different time slots both succeed without conflict.
"""

import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app


class TestConcurrentAppointmentBooking(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        # Mock external Supabase sync in booking tests to run at in-memory speed
        self.sb_patch = patch("main.sync_appointment_to_supabase", new_callable=AsyncMock)
        self.mock_sb = self.sb_patch.start()
        self.mock_sb.return_value = {"id": "sb-mock-apt", "status": "synced"}

    def tearDown(self):
        self.sb_patch.stop()

    def test_concurrent_same_slot_booking_race_condition(self):
        """Simulate two patients submitting the exact same appointment slot concurrently."""
        booking_day = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d")
        slot_time = "11:30"
        start_iso = f"{booking_day}T{slot_time}:00"
        end_iso = f"{booking_day}T12:00:00"

        req_patient1 = {
            "user_email": "patient.one@example.com",
            "user_name": "Patient One",
            "start_time": start_iso,
            "end_time": end_iso,
            "description": "Consultation Patient 1"
        }

        req_patient2 = {
            "user_email": "patient.two@example.com",
            "user_name": "Patient Two",
            "start_time": start_iso,
            "end_time": end_iso,
            "description": "Consultation Patient 2"
        }

        def post_booking(payload):
            return self.client.post("/api/v1/book-appointment", json=payload)

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(post_booking, req_patient1)
            future2 = executor.submit(post_booking, req_patient2)

            res1 = future1.result()
            res2 = future2.result()

        status_codes = sorted([res1.status_code, res2.status_code])

        # Exactly one booking should succeed (201 Created) and the other should be rejected (409 Conflict)
        self.assertEqual(status_codes, [201, 409],
            f"Expected one 201 and one 409, but got {res1.status_code} and {res2.status_code}. "
            f"Bodies: {res1.text} vs {res2.text}")

        # The conflicting response must report slot already booked
        conflict_res = res1 if res1.status_code == 409 else res2
        self.assertIn("already booked", conflict_res.json().get("detail", "").lower())

    def test_sequential_duplicate_slot_rejected(self):
        """Verifies that a subsequent booking for an occupied slot is rejected with 409."""
        booking_day = (datetime.now() + timedelta(days=36)).strftime("%Y-%m-%d")
        slot_time = "14:00"
        start_iso = f"{booking_day}T{slot_time}:00"
        end_iso = f"{booking_day}T14:30:00"

        req1 = {
            "user_email": "primary.patient@example.com",
            "user_name": "Primary Patient",
            "start_time": start_iso,
            "end_time": end_iso,
            "description": "First booking"
        }
        res1 = self.client.post("/api/v1/book-appointment", json=req1)
        self.assertEqual(res1.status_code, 201)

        # Attempt to book the exact same slot
        req2 = {
            "user_email": "secondary.patient@example.com",
            "user_name": "Secondary Patient",
            "start_time": start_iso,
            "end_time": end_iso,
            "description": "Second booking attempt"
        }
        res2 = self.client.post("/api/v1/book-appointment", json=req2)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already booked", res2.json().get("detail", "").lower())

    def test_concurrent_different_slots_both_succeed(self):
        """Simulate two patients booking different available slots concurrently."""
        booking_day = (datetime.now() + timedelta(days=37)).strftime("%Y-%m-%d")
        start_slot_a = f"{booking_day}T09:00:00"
        start_slot_b = f"{booking_day}T16:00:00"

        req_a = {
            "user_email": "patient.a@example.com",
            "user_name": "Patient A",
            "start_time": start_slot_a,
            "end_time": f"{booking_day}T09:30:00",
            "description": "Slot A"
        }
        req_b = {
            "user_email": "patient.b@example.com",
            "user_name": "Patient B",
            "start_time": start_slot_b,
            "end_time": f"{booking_day}T16:30:00",
            "description": "Slot B"
        }

        def post_booking(payload):
            return self.client.post("/api/v1/book-appointment", json=payload)

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_a = executor.submit(post_booking, req_a)
            future_b = executor.submit(post_booking, req_b)

            res_a = future_a.result()
            res_b = future_b.result()

        self.assertEqual(res_a.status_code, 201)
        self.assertEqual(res_b.status_code, 201)


if __name__ == "__main__":
    unittest.main()
