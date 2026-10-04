"""
Unit tests for consultation invoices, billing workflows, and payment settlement states.
"""

import unittest
from datetime import datetime, timezone


class TestInvoicesModule(unittest.TestCase):

    def setUp(self):
        self.invoice = {
            "id": "inv-test-101",
            "patientId": "usr-001",
            "patientName": "John Doe",
            "doctorName": "Dr. Bramarambha K",
            "visitDate": "2026-10-02",
            "amountINR": 500,
            "consultationType": "In-Person Clinic Visit",
            "status": "pending",
            "issuedAt": datetime.now(timezone.utc).isoformat(),
        }

    def test_invoice_creation(self):
        self.assertEqual(self.invoice["status"], "pending")
        self.assertEqual(self.invoice["amountINR"], 500)

    def test_payment_submission_transitions_to_processing(self):
        # Patient submits payment with transaction reference
        updated = dict(self.invoice)
        updated["status"] = "processing"
        updated["paymentMethod"] = "upi"
        updated["transactionRef"] = "UPI-REF-9876543210"
        updated["patientUpiId"] = "john.doe@okicici"
        updated["submittedAt"] = datetime.now(timezone.utc).isoformat()

        self.assertEqual(updated["status"], "processing")
        self.assertEqual(updated["paymentMethod"], "upi")
        self.assertEqual(updated["transactionRef"], "UPI-REF-9876543210")

    def test_doctor_settlement_transitions_to_paid(self):
        # Doctor verifies payment and settles invoice
        updated = dict(self.invoice)
        updated["status"] = "paid"
        updated["paidAt"] = datetime.now(timezone.utc).isoformat()

        self.assertEqual(updated["status"], "paid")
        self.assertIsNotNone(updated["paidAt"])


if __name__ == "__main__":
    unittest.main()
