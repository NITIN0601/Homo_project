"""
Unit tests for Backend Pydantic Input Sanitization & Data Integrity.
"""

import unittest

from pydantic import ValidationError
from schemas.billing import (
    CreateConsultationInvoiceRequest,
    CreateOrderRequest,
    OrderItem,
    UpdateConsultationInvoiceRequest,
)


class TestInputSanitization(unittest.TestCase):
    def test_create_invoice_html_stripping(self):
        req = CreateConsultationInvoiceRequest(
            patientId="pat-101",
            patientName=" <script>alert('xss')</script> John Doe ",
            doctorName="Dr. Jane Smith & Co.",
            amountINR=850.50,
            description="Consultation for <img src=x onerror=alert(1)> dyspepsia.",
            transactionRef="UPI-UTR 123456#$!",
        )
        self.assertEqual(req.patientName, "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt; John Doe")
        self.assertEqual(req.doctorName, "Dr. Jane Smith &amp; Co.")
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", req.description)
        self.assertEqual(req.transactionRef, "UPI-UTR123456")

    def test_create_invoice_negative_amount_rejected(self):
        with self.assertRaises(ValidationError):
            CreateConsultationInvoiceRequest(
                patientId="pat-101",
                patientName="John Doe",
                doctorName="Dr. Smith",
                amountINR=-500,  # Negative amount must fail
                description="Follow up",
            )

    def test_create_invoice_zero_amount_rejected(self):
        with self.assertRaises(ValidationError):
            CreateConsultationInvoiceRequest(
                patientId="pat-101",
                patientName="John Doe",
                doctorName="Dr. Smith",
                amountINR=0,  # Zero amount must fail
                description="Follow up",
            )

    def test_update_invoice_transaction_ref_sanitization(self):
        req = UpdateConsultationInvoiceRequest(
            transactionRef="  UPI-123456789-IN@#$%^  ",
            bankName="<script>HDFC Bank</script>",
        )
        self.assertEqual(req.transactionRef, "UPI-123456789-IN")
        self.assertEqual(req.bankName, "&lt;script&gt;HDFC Bank&lt;/script&gt;")

    def test_create_order_item_sanitization(self):
        order = CreateOrderRequest(
            customerName="<b>Alice Wonder</b>",
            items=[
                OrderItem(
                    name="Arnica <i>Montana</i>",
                    potency="30C",
                    quantity=2,
                    priceINR=150.0,
                )
            ],
            totalAmountINR=300.0,
        )
        self.assertEqual(order.customerName, "&lt;b&gt;Alice Wonder&lt;/b&gt;")
        self.assertEqual(order.items[0].name, "Arnica &lt;i&gt;Montana&lt;/i&gt;")


if __name__ == "__main__":
    unittest.main()
