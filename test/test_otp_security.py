"""
Unit tests for OTP generation security, numeric constraints, and mock bypass rules.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.auth_service import generate_otp, verify_otp_code


class TestOtpSecurity(unittest.TestCase):
    def test_otp_format_and_length(self):
        email = "test.otp@agastyahomoeo.com"
        otp = generate_otp(email)
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

    def test_otp_verification_success(self):
        email = "verify.otp@agastyahomoeo.com"
        otp = generate_otp(email)
        self.assertTrue(verify_otp_code(email, otp))

    def test_otp_invalid_code_rejected(self):
        email = "invalid.otp@agastyahomoeo.com"
        generate_otp(email)
        self.assertFalse(verify_otp_code(email, "000000"))

    def test_otp_single_use(self):
        email = "singleuse.otp@agastyahomoeo.com"
        otp = generate_otp(email)
        self.assertTrue(verify_otp_code(email, otp))
        # Re-use must fail
        self.assertFalse(verify_otp_code(email, otp))


if __name__ == "__main__":
    unittest.main()

