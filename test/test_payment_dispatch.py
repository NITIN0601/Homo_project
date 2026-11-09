"""
Unit tests for PaymentValidator dynamic dispatch routing and auto-detection.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.payment_validator import PaymentMethod, PaymentValidator


class TestPaymentDispatch(unittest.TestCase):
    def test_dispatch_upi(self):
        result = PaymentValidator.validate_payment("upi", "patient@oksbi")
        self.assertTrue(result.is_valid)
        self.assertEqual(result.method, PaymentMethod.UPI)

    def test_dispatch_card_auto_detect_visa(self):
        # Visa begins with 4
        visa_num = "4532015112830366"
        result = PaymentValidator.validate_payment("card", visa_num)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.method, PaymentMethod.VISA)

    def test_dispatch_card_auto_detect_mastercard(self):
        # Mastercard begins with 51-55
        mc_num = "5425233430109903"
        result = PaymentValidator.validate_payment("card", mc_num)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.method, PaymentMethod.MASTERCARD)

    def test_dispatch_unknown_method(self):
        result = PaymentValidator.validate_payment("crypto", "0x123abc")
        self.assertFalse(result.is_valid)
        self.assertIn("Unsupported payment method", result.errors[0])


if __name__ == "__main__":
    unittest.main()

