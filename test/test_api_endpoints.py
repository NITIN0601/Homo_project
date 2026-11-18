"""
Unit and integration tests for Phase 1 Frontend <-> Backend REST endpoints.
Validates all connected endpoints for auth OTP, patient EHR files, prescribed remedies,
prescription uploads, email notifications, WhatsApp messages, and dispensary inventory.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from core.security import create_access_token
from main import app
from services.auth_service import _OTP_CACHE


class TestPhase1ApiEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from services.data_store import INVENTORY_FILE, VISIT_SUMMARIES_FILE, load_json
        from services.supabase_service import HASHES_FILE, RECORDS_FILE

        cls._orig_inventory = load_json(INVENTORY_FILE, default=[])
        cls._orig_records = load_json(RECORDS_FILE, default=[])
        cls._orig_hashes = load_json(HASHES_FILE, default=[])
        cls._orig_visits = load_json(VISIT_SUMMARIES_FILE, default={})

        cls.client = TestClient(app)
        cls.admin_token = create_access_token({"sub": "usr-admin-001", "role": "admin", "hospital_id": "default"})
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}
        cls.super_admin_token = create_access_token({"sub": "usr-super-001", "role": "super_admin", "hospital_id": "default"})
        cls.super_admin_headers = {"Authorization": f"Bearer {cls.super_admin_token}"}

    @classmethod
    def tearDownClass(cls):
        from services.data_store import INVENTORY_FILE, VISIT_SUMMARIES_FILE, save_json
        from services.supabase_service import HASHES_FILE, RECORDS_FILE

        save_json(INVENTORY_FILE, cls._orig_inventory)
        save_json(RECORDS_FILE, cls._orig_records)
        save_json(HASHES_FILE, cls._orig_hashes)
        save_json(VISIT_SUMMARIES_FILE, cls._orig_visits)

    def test_auth_send_and_verify_otp(self):
        # 1. Send OTP
        email = "patient.test@agastyahomoeo.com"
        res = self.client.post("/api/v1/auth/send-otp", json={"email": email})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

        # 2. Verify with valid generated OTP from cache
        otp_code = _OTP_CACHE.get(email, {}).get("otp", "123456")
        res_verify = self.client.post("/api/v1/auth/verify-otp", json={
            "email": email,
            "otp": otp_code
        })
        self.assertEqual(res_verify.status_code, 200)
        self.assertTrue(res_verify.json().get("valid"))

        # 3. Verify with invalid OTP
        res_invalid = self.client.post("/api/v1/auth/verify-otp", json={
            "email": email,
            "otp": "000000"
        })
        self.assertEqual(res_invalid.status_code, 200)
        self.assertFalse(res_invalid.json().get("valid"))

    def test_patient_medical_file_and_remedies(self):
        # Retrieve medical file for demo patient John Doe (usr-001)
        res = self.client.get("/api/v1/patients/usr-001/visits")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("patientId"), "usr-001")
        self.assertGreaterEqual(len(data.get("visits", [])), 1)

        # Retrieve prescribed remedies
        res_rem = self.client.get("/api/v1/remedies/prescribed/usr-001")
        self.assertEqual(res_rem.status_code, 200)
        remedies = res_rem.json()
        self.assertIsInstance(remedies, list)
        self.assertTrue(any("Arnica" in r.get("medicineName", "") for r in remedies))

    def test_upload_prescription_and_auto_parse(self):
        # Upload prescription for patient usr-001
        res = self.client.post("/api/v1/patients/usr-001/upload-prescription")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("id").startswith("vis-"))
        self.assertIn("prescribedRemedies", data)
        self.assertGreaterEqual(len(data["prescribedRemedies"]), 1)

    def test_email_notification_dispatch(self):
        res = self.client.post("/api/v1/email/send", json={
            "email": "test.patient@example.com",
            "subject": "Prescription Follow-up Review",
            "body": "Dear patient, please review your latest prescription dosage."
        }, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("success"))

    def test_whatsapp_integration(self):
        # 1. Register Admin WhatsApp settings
        res_reg = self.client.post("/api/v1/whatsapp/register-admin", json={
            "doctorName": "Dr. Bramarambha K",
            "whatsappNumber": "+91 98450 12345",
            "autoNotifyRegistration": True,
            "autoNotifyPrescriptions": True
        }, headers=self.admin_headers)
        self.assertEqual(res_reg.status_code, 200)
        self.assertTrue(res_reg.json().get("success"))

        # 2. Send message
        res_msg = self.client.post("/api/v1/whatsapp/send-message", json={
            "phone": "+91 98123 45678",
            "message": "Your appointment is confirmed for tomorrow 10:30 AM",
            "type": "registration"
        }, headers=self.admin_headers)
        self.assertEqual(res_msg.status_code, 200)
        self.assertTrue(res_msg.json().get("success"))
        self.assertIn("messageId", res_msg.json())

    def test_inventory_management(self):
        # 1. Fetch inventory
        res = self.client.get("/api/v1/inventory")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)

        # 2. Restock item m1
        res_restock = self.client.post("/api/v1/inventory/m1/restock", json={"qty": 15}, headers=self.admin_headers)
        self.assertEqual(res_restock.status_code, 200)
        self.assertTrue(res_restock.json().get("success"))

    def test_root_api_alias_parity(self):
        # Verify /api/inventory matches /api/v1/inventory
        res_v1 = self.client.get("/api/v1/inventory")
        res_root = self.client.get("/api/inventory")
        self.assertEqual(res_v1.status_code, res_root.status_code)
        self.assertEqual(len(res_v1.json()), len(res_root.json()))

    def test_sync_status_and_reconciliation(self):
        # 1. Fetch sync status
        res_status = self.client.get("/api/v1/sync/status", headers=self.admin_headers)
        self.assertEqual(res_status.status_code, 200)
        data = res_status.json()
        self.assertIn("supabase", data)
        self.assertIn("sync", data)
        self.assertIn("pending_sync_records", data["sync"])

        # 2. Trigger reconciliation
        res_rec = self.client.post("/api/v1/sync/reconcile", headers=self.super_admin_headers)
        self.assertEqual(res_rec.status_code, 200)
        rec_data = res_rec.json()
        self.assertIn("status", rec_data)

    def test_admin_alerts_tracking_and_clear(self):
        # 1. Retrieve admin alerts
        res_alerts = self.client.get("/api/v1/admin/alerts", headers=self.admin_headers)
        self.assertEqual(res_alerts.status_code, 200)
        self.assertIn("alerts", res_alerts.json())

        # 2. Clear alerts
        res_clear = self.client.delete("/api/v1/admin/alerts", headers=self.super_admin_headers)
        self.assertEqual(res_clear.status_code, 200)
        self.assertTrue(res_clear.json().get("success"))

        # 3. Verify zero alerts after clear
        res_after = self.client.get("/api/v1/admin/alerts", headers=self.admin_headers)
        self.assertEqual(res_after.json().get("count"), 0)


if __name__ == "__main__":
    unittest.main()

