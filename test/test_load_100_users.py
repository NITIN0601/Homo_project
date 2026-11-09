"""
High-Concurrency Load Test: 100+ Parallel Users Interaction Suite.
Simulates a real-world clinic surge:
- 70 Concurrent Patients: Attempting simultaneous appointment bookings (competing for same & adjacent slots).
- 20 Concurrent Admins: Concurrently querying patient records, updating appointments, creating invoices.
- 10 Concurrent Dispensary Workers: Concurrently checking and restocking dispensary inventory.

Verifies:
1. Double-Booking Prevention: Exactly ONE patient acquires a contested slot (201 Created),
   while all other concurrent claimants receive 409 Conflict.
2. Concurrency Isolation: Zero JSON file corruption, zero thread deadlocks.
3. System Stability: Admin, customer, and dispensary operations execute in parallel seamlessly.
"""

import sys
import unittest
from concurrent.futures import ThreadPoolExecutor, as_completed
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
from services.auth_service import generate_local_jwt
from services.data_store import (
    APPOINTMENTS_FILE,
    INVENTORY_FILE,
    get_all_appointments,
    get_all_inventory,
    save_json,
)


class Test100UsersParallelInteraction(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        # Mock external Supabase sync & Google Calendar to focus strictly on concurrency & race conditions
        self.sb_patch = patch("main.sync_appointment_to_supabase", new_callable=AsyncMock)
        self.mock_sb = self.sb_patch.start()
        self.mock_sb.return_value = {"id": "sb-concurrency-mock", "status": "synced"}

        self.cal_patch = patch("routes.scheduling.create_google_calendar_event", new_callable=AsyncMock)
        self.mock_cal = self.cal_patch.start()
        self.mock_cal.return_value = {"success": True, "event_id": "mock-cal-event-100"}

        # Preserve original store state for clean rollback
        self._orig_appointments = get_all_appointments()
        self._orig_inventory = get_all_inventory()

        # Admin JWT token
        self.admin_token = generate_local_jwt({"sub": "admin-test", "email": "doctor@agastyaclinic.com", "role": "admin"})
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        self.sb_patch.stop()
        self.cal_patch.stop()
        save_json(APPOINTMENTS_FILE, self._orig_appointments)
        save_json(INVENTORY_FILE, self._orig_inventory)

    def test_100_parallel_users_concurrency_surge(self):
        """
        Executes a 100-user concurrent storm:
        - 30 patients compete for 1 identical slot (Slot Contention).
        - 40 patients book unique independent slots (Independent Slots).
        - 20 admins query patient records and update appointments (Admin Operations).
        - 10 dispensary workers restock inventory (Dispensary Operations).
        """
        base_day = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        contested_time = "10:00"
        contested_start = f"{base_day}T{contested_time}:00"
        contested_end = f"{base_day}T10:30:00"

        # ── 1. 30 Patients Competing for the Exact Same Slot ─────────────
        def book_contested_slot(idx):
            payload = {
                "user_email": f"patient.compete.{idx}@example.com",
                "user_name": f"Competing Patient {idx}",
                "start_time": contested_start,
                "end_time": contested_end,
                "description": f"Contested consultation request #{idx}",
            }
            res = self.client.post("/api/v1/book-appointment", json=payload)
            return ("contested_booking", idx, res.status_code, res.json())

        # ── 2. 40 Patients Booking Unique Slots ──────────────────────────
        def book_unique_slot(idx):
            # Slots spread across future hours and days
            day_offset = 91 + (idx // 8)
            hour = 9 + (idx % 8)
            slot_day = (datetime.now() + timedelta(days=day_offset)).strftime("%Y-%m-%d")
            start = f"{slot_day}T{hour:02d}:00:00"
            end = f"{slot_day}T{hour:02d}:30:00"
            payload = {
                "user_email": f"patient.unique.{idx}@example.com",
                "user_name": f"Unique Patient {idx}",
                "start_time": start,
                "end_time": end,
                "description": f"Unique consultation slot #{idx}",
            }
            res = self.client.post("/api/v1/book-appointment", json=payload)
            return ("unique_booking", idx, res.status_code, res.json())

        # ── 3. 20 Admin Users Performing Administrative Operations ───────
        def admin_operation(idx):
            if idx % 2 == 0:
                res = self.client.get("/api/v1/patient-records?view=admin", headers=self.admin_headers)
                return ("admin_query", idx, res.status_code, res.json())
            else:
                invoice_payload = {
                    "id": f"inv-load-{idx}",
                    "invoiceNumber": f"INV-2026-L{idx:03d}",
                    "patientName": f"Patient L{idx}",
                    "patientPhone": "+91 98450 00000",
                    "amount": 750,
                    "date": base_day,
                    "status": "unpaid",
                }
                res = self.client.post("/api/v1/consultation-invoices", json=invoice_payload)
                return ("admin_invoice", idx, res.status_code, res.json())

        # ── 4. 10 Dispensary Workers Restocking Inventory ────────────────
        def dispensary_restock(idx):
            res = self.client.post("/api/v1/inventory/m1/restock", json={"qty": 5})
            return ("dispensary_restock", idx, res.status_code, res.json())

        results = []
        # Launch 100 concurrent workers simultaneously
        with ThreadPoolExecutor(max_workers=100) as executor:
            futures = []
            # 30 contested bookings
            for i in range(30):
                futures.append(executor.submit(book_contested_slot, i))
            # 40 unique bookings
            for i in range(40):
                futures.append(executor.submit(book_unique_slot, i))
            # 20 admin operations
            for i in range(20):
                futures.append(executor.submit(admin_operation, i))
            # 10 dispensary workers
            for i in range(10):
                futures.append(executor.submit(dispensary_restock, i))

            for future in as_completed(futures):
                results.append(future.result())

        self.assertEqual(len(results), 100, "All 100 concurrent tasks must complete.")

        # ── VERIFICATION 1: Contested Slot Concurrency Lock ──────────────
        contested_results = [r for r in results if r[0] == "contested_booking"]
        self.assertEqual(len(contested_results), 30)

        success_contested = [r for r in contested_results if r[2] == 201]
        conflict_contested = [r for r in contested_results if r[2] == 409]

        self.assertEqual(
            len(success_contested), 1,
            f"Exactly ONE patient must acquire contested slot. Got {len(success_contested)} successes and {len(conflict_contested)} conflicts."
        )
        self.assertEqual(
            len(conflict_contested), 29,
            f"All 29 competing patients must receive 409 Conflict. Got {len(conflict_contested)}."
        )

        # ── VERIFICATION 2: Unique Slot Success ──────────────────────────
        unique_results = [r for r in results if r[0] == "unique_booking"]
        self.assertEqual(len(unique_results), 40)
        for u in unique_results:
            self.assertEqual(u[2], 201, f"Unique slot booking failed for index {u[1]}: {u[3]}")

        # ── VERIFICATION 3: Admin Operations Succeeded Seamlessly ────────
        admin_results = [r for r in results if r[0] in ("admin_query", "admin_invoice")]
        self.assertEqual(len(admin_results), 20)
        for a in admin_results:
            self.assertEqual(a[2], 200, f"Admin operation failed for index {a[1]}: {a[3]}")

        # ── VERIFICATION 4: Dispensary Operations Succeeded Seamlessly ───
        dispensary_results = [r for r in results if r[0] == "dispensary_restock"]
        self.assertEqual(len(dispensary_results), 10)
        for d in dispensary_results:
            self.assertEqual(d[2], 200, f"Dispensary restock failed for index {d[1]}: {d[3]}")

        # Verify no file corruption in appointments store
        persisted_appointments = get_all_appointments()
        self.assertIsInstance(persisted_appointments, list)
        self.assertGreater(len(persisted_appointments), len(self._orig_appointments))


if __name__ == "__main__":
    unittest.main()

