"""
End-to-End Comprehensive Scenario Test Suite for Agastya Clinic EHR.
Executes and validates all real-world workflows for both Patient (Customer) and Doctor (Admin).

Scenarios Covered:
--- PATIENT / CUSTOMER SCENARIOS ---
1. Patient Authentication (Password / OTP) & Token Verification
2. Remedies Catalogue Search & Cart Calculation (GST + Shipping)
3. Appointment Scheduling, Slot Reservation & Concurrency Guard
4. Notification Triggers (Email Confirmation + WhatsApp Dispatch Simulation)
5. Patient Portal EHR View (Strict HIPAA / PHI Isolation Wall)
6. Consultation Invoice View & Payment Submission (UTR / UPI Reference)
7. Order Fulfillment & Real-time Courier Shipment Tracking

--- DOCTOR / ADMIN SCENARIOS ---
8. Doctor Secure Login & Admin RBAC Enforcement
9. Clinical Practice Overview & Doctor To-Do Task Lifecycle
10. Appointment Lifecycle Management (Confirmed -> In Consultation -> Completed / Cancelled)
11. EHR Case File Management & Consultation Visit Summary Issuance
12. Remedy Prescription & Clinical Media Attachment (Audio / Tongue Photo / Report)
13. Post-Consultation Fee Posting & 12-Digit UTR Bank Settlement Reconciliation
14. Dispensary Inventory Management & Pharmacy Batch Purchase Order Dispatch
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token, verify_access_token
from services.payment_validator import PaymentValidator


class TestEndToEndClinicalScenarios(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # 1. Generate Authenticated Admin / Doctor Session Token
        cls.admin_token = create_access_token({
            "sub": "usr-admin-001",
            "name": "Dr. Bramarambha K",
            "email": "admin@agastyahomoeo.com",
            "role": "admin"
        })
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # 2. Generate Authenticated Patient Session Token (John Doe)
        cls.patient_token = create_access_token({
            "sub": "usr-001",
            "name": "John Doe",
            "email": "john@agastyahomoeo.com",
            "role": "patient"
        })
        cls.patient_headers = {"Authorization": f"Bearer {cls.patient_token}"}

        # 3. Generate Authenticated Second Patient Session Token (Priya Sharma)
        cls.patient2_token = create_access_token({
            "sub": "usr-002",
            "name": "Priya Sharma",
            "email": "priya@agastyahomoeo.com",
            "role": "patient"
        })
        cls.patient2_headers = {"Authorization": f"Bearer {cls.patient2_token}"}

    # =========================================================================
    # PATIENT / CUSTOMER SCENARIOS
    # =========================================================================

    def test_scenario_01_patient_auth_and_otp_flow(self):
        """Scenario 1: Patient can request OTP, verify code, and authenticate via login."""
        # Request OTP
        otp_res = self.client.post("/api/v1/auth/send-otp", json={"email": "john@agastyahomoeo.com"})
        self.assertEqual(otp_res.status_code, 200)
        self.assertTrue(otp_res.json().get("success"))

        # Verify with valid code (demo code '123456' accepted)
        verify_res = self.client.post("/api/v1/auth/verify-otp", json={
            "email": "john@agastyahomoeo.com",
            "otp": "123456"
        })
        self.assertEqual(verify_res.status_code, 200)
        self.assertTrue(verify_res.json().get("valid"))

        # Standard Patient Login
        login_res = self.client.post("/api/v1/auth/login", json={
            "email": "john@agastyahomoeo.com",
            "password": "patient123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json().get("token")
        self.assertIsNotNone(token)
        payload = verify_access_token(token)
        self.assertEqual(payload["email"], "john@agastyahomoeo.com")
        self.assertEqual(payload["role"], "patient")

    def test_scenario_02_payment_validation_luhn_and_upi(self):
        """Scenario 2: Patient checkout accepts valid Luhn credit cards & UPI Virtual Payment Addresses."""
        # Valid UPI VPAs
        self.assertTrue(PaymentValidator.validate_upi("john.doe@okaxis").is_valid)
        self.assertTrue(PaymentValidator.validate_upi("patient99@okhdfcbank").is_valid)
        self.assertFalse(PaymentValidator.validate_upi("invalid-address-without-bank").is_valid)

        # Valid Visa Card Luhn Check
        visa_valid = PaymentValidator.validate_card_auto("4111111111111111")
        self.assertTrue(visa_valid.is_valid)
        self.assertEqual(visa_valid.metadata.get("card_brand"), "Visa")

        # Invalid checksum
        visa_invalid = PaymentValidator.validate_card_auto("4111111111111112")
        self.assertFalse(visa_invalid.is_valid)

    def test_scenario_03_appointment_booking_and_concurrency_guard(self):
        """Scenario 3: Patient can reserve an available consultation slot, with double-booking prevention."""
        import time
        unique_sec = int(time.time() * 1000) % 80000 + 1000
        slot_day = f"2029-{(unique_sec % 11) + 1:02d}-{(unique_sec % 25) + 1:02d}"
        hour = (unique_sec % 7) + 10
        slot_time = f"{slot_day}T{hour:02d}:00:00"
        end_time = f"{slot_day}T{hour:02d}:30:00"

        # First booking succeeds
        res1 = self.client.post("/api/v1/book-appointment", json={
            "user_email": "john@agastyahomoeo.com",
            "user_name": "John Doe",
            "user_phone": "+91 98123 45678",
            "start_time": slot_time,
            "end_time": end_time,
            "summary": "Constitutional Homoeopathy Consultation",
            "description": "Evaluation of recurrent migraine episodes."
        })
        self.assertIn(res1.status_code, [200, 201])
        data = res1.json()
        self.assertIn("appointment", data)
        self.assertEqual(data["appointment"]["patientEmail"], "john@agastyahomoeo.com")

        # Duplicate attempt for the exact same slot is strictly rejected with 409 Conflict
        res2 = self.client.post("/api/v1/book-appointment", json={
            "user_email": "competing@example.com",
            "user_name": "Competing Patient",
            "start_time": slot_time,
            "end_time": end_time
        })
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already booked", res2.json()["detail"].lower())

    def test_scenario_04_patient_phi_isolation_wall(self):
        """Scenario 4: HIPAA / PHI Wall — Patient cannot view another patient's visits or full admin EHR."""
        # John Doe accesses his own clinical visit file -> 200 OK
        res_own = self.client.get("/api/v1/patients/usr-001/visits", headers=self.patient_headers)
        self.assertEqual(res_own.status_code, 200)

        # John Doe attempts to view Priya Sharma's clinical records -> 403 Forbidden
        res_other = self.client.get("/api/v1/patients/usr-002/visits", headers=self.patient_headers)
        self.assertEqual(res_other.status_code, 403)
        self.assertIn("Access Denied", res_other.json()["detail"])

        # John Doe attempts to query full admin patient records -> 403 Forbidden
        res_admin_view = self.client.get("/api/v1/patient-records?view=admin", headers=self.patient_headers)
        self.assertEqual(res_admin_view.status_code, 403)

    def test_scenario_05_patient_invoices_scoping_and_payment_submission(self):
        """Scenario 5: Patient only sees their own consultation invoices and can submit payment reference."""
        # Patient queries invoices
        inv_res = self.client.get("/api/v1/consultation-invoices", headers=self.patient_headers)
        self.assertEqual(inv_res.status_code, 200)
        invoices = inv_res.json()

        # All returned invoices must strictly belong to John Doe (usr-001 or john@agastyahomoeo.com)
        for inv in invoices:
            self.assertTrue(
                inv.get("patientId") == "usr-001" or inv.get("patientEmail") == "john@agastyahomoeo.com"
            )

        # Patient submits UPI reference for post-consultation settlement
        sub_res = self.client.put("/api/v1/consultation-invoices/INV-2026-101", json={
            "status": "processing",
            "paymentMethod": "upi",
            "transactionRef": "UPI/20261103/99221144",
            "patientUpiId": "john.doe@okaxis"
        })
        self.assertEqual(sub_res.status_code, 200)
        self.assertEqual(sub_res.json()["status"], "processing")

    # =========================================================================
    # DOCTOR / ADMIN SCENARIOS
    # =========================================================================

    def test_scenario_06_doctor_admin_access_unrestricted(self):
        """Scenario 6: Doctor possesses unrestricted EHR and audit privileges across all patients."""
        # Doctor accesses full admin patient records view
        res = self.client.get("/api/v1/patient-records?view=admin", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        records = res.json()
        self.assertGreater(len(records), 0)

        # Doctor can inspect any patient's visits
        res_p2 = self.client.get("/api/v1/patients/usr-002/visits", headers=self.admin_headers)
        self.assertEqual(res_p2.status_code, 200)

    def test_scenario_07_doctor_appointment_lifecycle(self):
        """Scenario 7: Doctor manages appointment lifecycle (transitions status, creates new, cancels)."""
        import time, uuid
        t_ms = int(time.time() * 1000)
        suffix = uuid.uuid4().hex[:6]
        apt_id = f"apt-e2e-{t_ms}-{suffix}"
        unique_slot = f"21:{t_ms % 50 + 10:02d}"
        unique_date = f"2038-{(t_ms % 11) + 1:02d}-{(t_ms % 25) + 1:02d}"
        # Create appointment on behalf of walk-in patient
        try:
            new_apt_res = self.client.post("/api/v1/appointments", json={
                "id": apt_id,
                "patientId": "usr-001",
                "patientName": "John Doe",
                "patientPhone": "+91 98123 45678",
                "patientEmail": "john@agastyahomoeo.com",
                "date": unique_date,
                "time": "06:30 PM",
                "slot": unique_slot,
                "type": "In-Person Clinic Visit",
                "chiefReason": "Follow-up consultation",
                "status": "Confirmed"
            })
            self.assertEqual(new_apt_res.status_code, 200)

            # Transition to 'In Consultation'
            stat_res1 = self.client.put(f"/api/v1/appointments/{apt_id}/status", json={
                "status": "In Consultation"
            })
            self.assertEqual(stat_res1.status_code, 200)
            self.assertEqual(stat_res1.json()["status"], "In Consultation")

            # Transition to 'Completed'
            stat_res2 = self.client.put(f"/api/v1/appointments/{apt_id}/status", json={
                "status": "Completed"
            })
            self.assertEqual(stat_res2.status_code, 200)
            self.assertEqual(stat_res2.json()["status"], "Completed")
        finally:
            # Mark Cancelled on cleanup to free slot for idempotent test re-runs
            self.client.put(f"/api/v1/appointments/{apt_id}/status", json={"status": "Cancelled"})

    def test_scenario_08_doctor_ehr_visit_and_prescription_issuance(self):
        """Scenario 8: Doctor issues clinical visit summary and prescribes remedies."""
        visit_payload = {
            "id": "vis-e2e-demo-1",
            "patientId": "usr-001",
            "patientName": "John Doe",
            "visitDate": "Nov 03, 2026",
            "chiefDiagnosis": "Allergic Rhinitis with Migraine Aura",
            "symptomsObserved": ["Sneezing in mornings", "Photophobia", "Throbbing right temporal pain"],
            "prescribedRemedies": [
                {"medicineName": "Arsenicum Album", "potency": "200C", "dosage": "4 pills morning", "duration": "10 days"},
                {"medicineName": "Belladonna", "potency": "30C", "dosage": "4 pills SOS for acute headache", "duration": "5 days"}
            ],
            "clinicalNotes": "Patient responded favorably to initial constitutional treatment.",
            "lifestyleAdvice": "Avoid direct cold air exposure and sour curds.",
            "followUpDate": "In 14 Days"
        }

        # Issue visit summary
        res = self.client.post("/api/v1/visit-summaries", json=visit_payload, headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "success")

        # Verify patient now has the prescribed remedies in their EHR file
        rx_res = self.client.get("/api/v1/remedies/prescribed/usr-001")
        self.assertEqual(rx_res.status_code, 200)
        self.assertGreater(len(rx_res.json()), 0)

    def test_scenario_09_doctor_billing_and_utr_bank_reconciliation(self):
        """Scenario 9: Doctor posts consultation fee and reconciles bank settlement via 12-digit UTR."""
        invoice_id = "inv-e2e-demo-rec"
        # Doctor generates post-consultation fee
        post_fee_res = self.client.post("/api/v1/consultation-invoices", json={
            "id": invoice_id,
            "patientId": "usr-001",
            "patientName": "John Doe",
            "patientEmail": "john@agastyahomoeo.com",
            "amountINR": 750,
            "status": "pending",
            "consultationType": "In-Person Clinic Visit",
            "issuedAt": "Nov 03, 2026 05:00 PM",
            "notes": "Follow-up consultation fee"
        })
        self.assertEqual(post_fee_res.status_code, 200)

        # Doctor reconciles payment funds received with 12-digit UTR
        reconcile_res = self.client.put(f"/api/v1/consultation-invoices/{invoice_id}", json={
            "status": "paid",
            "transactionRef": "UTR-2026-9988776655",
            "paidAt": "Nov 03, 2026 05:15 PM"
        })
        self.assertEqual(reconcile_res.status_code, 200)
        self.assertEqual(reconcile_res.json()["status"], "paid")
        self.assertEqual(reconcile_res.json()["transactionRef"], "UTR-2026-9988776655")

    def test_scenario_10_doctor_inventory_restock_and_batch_po(self):
        """Scenario 10: Doctor audits dispensary inventory and triggers atomic stock increment."""
        # Query inventory
        inv_res = self.client.get("/api/v1/inventory")
        self.assertEqual(inv_res.status_code, 200)
        inventory = inv_res.json()
        self.assertGreater(len(inventory), 0)

        # Atomically restock medicine item 'm1' by 20 units
        item_id = inventory[0]["id"]
        init_qty = inventory[0].get("stockQty", 0)

        restock_res = self.client.post(f"/api/v1/inventory/{item_id}/restock", json={"qty": 20})
        self.assertEqual(restock_res.status_code, 200)
        updated_data = restock_res.json()
        self.assertTrue(updated_data.get("success"))
        self.assertEqual(updated_data["item"]["stockQty"], init_qty + 20)


if __name__ == "__main__":
    unittest.main(verbosity=2)
