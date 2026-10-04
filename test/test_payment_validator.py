"""
test_payment_validator.py
Unit tests for the offline payment validation engine.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from services.payment_validator import (
        luhn_checksum,
        validate_mastercard,
        validate_payment,
        validate_upi,
        validate_visa,
    )
except ImportError:
    from backend.services.payment_validator import (
        luhn_checksum,
        validate_mastercard,
        validate_payment,
        validate_upi,
        validate_visa,
    )


class TestPaymentValidator(unittest.TestCase):

    # ── LUHN CHECKSUM TESTS ──────────────────────────────────────────────────
    def test_luhn_checksum_valid(self):
        # Known valid numbers
        self.assertTrue(luhn_checksum("49927398716"))
        self.assertTrue(luhn_checksum("4532015112830366"))
        self.assertTrue(luhn_checksum("5424180123456789"))

    def test_luhn_checksum_invalid(self):
        # Alter last digit
        self.assertFalse(luhn_checksum("49927398717"))
        self.assertFalse(luhn_checksum("4532015112830367"))
        self.assertFalse(luhn_checksum(""))
        self.assertFalse(luhn_checksum("abc"))

    # ── VISA TESTS ───────────────────────────────────────────────────────────
    def test_valid_visa_16_digits(self):
        # Valid 16-digit Visa with spaces and hyphens
        raw = "4532-0151 1283-0366"
        res = validate_visa(raw)
        self.assertTrue(res.is_valid, f"Expected valid, got errors: {res.errors}")
        self.assertEqual(res.sanitized_input, "4532015112830366")
        self.assertEqual(res.metadata["card_brand"], "Visa")
        self.assertEqual(len(res.errors), 0)
        self.assertEqual(len(res.field_flags), 0)

    def test_valid_visa_13_and_19_digits(self):
        # Valid 13-digit Visa
        res13 = validate_visa("4012888888881")
        self.assertTrue(res13.is_valid, f"Expected valid, got: {res13.errors}")

        # Valid 19-digit Visa
        res19 = validate_visa("4000000000000000006")
        self.assertTrue(res19.is_valid, f"Expected valid, got: {res19.errors}")

    def test_invalid_visa_prefix(self):
        res = validate_visa("5532015112830366")
        self.assertFalse(res.is_valid)
        self.assertTrue(any("must begin with digit '4'" in err for err in res.errors))
        self.assertIn("card_number", res.field_flags)

    def test_invalid_visa_length(self):
        res = validate_visa("45320151128303")  # 14 digits
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Invalid Visa card length" in err for err in res.errors))

    def test_invalid_visa_luhn_failure(self):
        # Valid format and length, but failed checksum
        res = validate_visa("4532015112830367")
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Luhn checksum" in err for err in res.errors))

    # ── MASTERCARD TESTS ─────────────────────────────────────────────────────
    def test_valid_mastercard_legacy_51_55(self):
        raw = "5424-1801 2345-6789"
        res = validate_mastercard(raw)
        self.assertTrue(res.is_valid, f"Expected valid, got errors: {res.errors}")
        self.assertEqual(res.sanitized_input, "5424180123456789")
        self.assertEqual(res.metadata["card_brand"], "Mastercard")

    def test_valid_mastercard_2series_range(self):
        # Valid 2-series (2221-2720) Mastercard
        raw = "2223001234567894"
        res = validate_mastercard(raw)
        self.assertTrue(res.is_valid, f"Expected valid, got: {res.errors}")

    def test_invalid_mastercard_prefix(self):
        res = validate_mastercard("5624180123456789")  # 56 is outside 51-55
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Invalid Mastercard prefix" in err for err in res.errors))

    def test_invalid_mastercard_length(self):
        res = validate_mastercard("542418012345678")  # 15 digits
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Invalid Mastercard length" in err for err in res.errors))

    def test_invalid_mastercard_luhn_failure(self):
        res = validate_mastercard("5424180123456780")
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Luhn checksum" in err for err in res.errors))

    # ── UPI / VPA TESTS ──────────────────────────────────────────────────────
    def test_valid_upi_patterns(self):
        valid_examples = [
            "patient.raghav@oksbi",
            "ananya_sharma123@icici",
            "clinic-fees.pay@okhdfcbank",
            "user.name-123_456@axisbank",
            "dr.agastya@ybl",
        ]
        for vpa in valid_examples:
            res = validate_upi(vpa)
            self.assertTrue(res.is_valid, f"Expected '{vpa}' to be valid, got: {res.errors}")
            self.assertEqual(res.sanitized_input, vpa)
            self.assertEqual(len(res.errors), 0)

    def test_invalid_upi_missing_at(self):
        res = validate_upi("invalidhandle.bank")
        self.assertFalse(res.is_valid)
        self.assertTrue(any("missing '@'" in err for err in res.errors))
        self.assertIn("upi_id", res.field_flags)

    def test_invalid_upi_bad_characters(self):
        # '@' inside username or illegal chars like '$', '!'
        res = validate_upi("user$name@okhdfc")
        self.assertFalse(res.is_valid)
        self.assertIn("upi_id", res.field_flags)

    def test_invalid_upi_handle_numeric(self):
        # Bank handle must be [a-zA-Z]{2,64}, not digits
        res = validate_upi("username@1234")
        self.assertFalse(res.is_valid)

    # ── DYNAMIC ROUTER TESTS ─────────────────────────────────────────────────
    def test_router_with_method_string(self):
        res = validate_payment("visa", "4532015112830366")
        self.assertTrue(res.is_valid)
        self.assertEqual(res.method, "visa")

        res_mc = validate_payment("mastercard", "5424180123456789")
        self.assertTrue(res_mc.is_valid)

        res_upi = validate_payment("upi", "patient@icici")
        self.assertTrue(res_upi.is_valid)

    def test_router_with_dict_payload(self):
        payload = {"card_number": "4532-0151-1283-0366"}
        res = validate_payment("visa", payload)
        self.assertTrue(res.is_valid)

        vpa_payload = {"upi_id": "clinic@okhdfcbank"}
        res_vpa = validate_payment("vpa", vpa_payload)
        self.assertTrue(res_vpa.is_valid)

    def test_router_auto_detect_card(self):
        # Auto-detect Visa
        res_v = validate_payment("card", "4532015112830366")
        self.assertTrue(res_v.is_valid)
        self.assertEqual(res_v.metadata.get("card_brand"), "Visa")

        # Auto-detect Mastercard
        res_m = validate_payment("debit_card", "5424180123456789")
        self.assertTrue(res_m.is_valid)
        self.assertEqual(res_m.metadata.get("card_brand"), "Mastercard")

    def test_router_unsupported_method(self):
        res = validate_payment("crypto", "0x123abc...")
        self.assertFalse(res.is_valid)
        self.assertTrue(any("Unsupported payment method" in err for err in res.errors))
        self.assertIn("payment_method", res.field_flags)


if __name__ == "__main__":
    unittest.main()
