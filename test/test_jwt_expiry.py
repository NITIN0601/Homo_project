"""
Unit tests for JWT session token lifetime, expiration enforcement, and tamper detection.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.security import create_access_token, verify_access_token


class TestJwtExpiry(unittest.TestCase):
    def test_valid_token_decodes(self):
        payload = {"sub": "usr-123", "role": "patient"}
        token = create_access_token(payload, expires_days=1)
        decoded = verify_access_token(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded.get("sub"), "usr-123")

    def test_expired_token_rejected(self):
        # Create token that expired 10 seconds ago
        payload = {"sub": "usr-123", "role": "patient"}
        token = create_access_token(payload, expires_days=-1)
        decoded = verify_access_token(token)
        self.assertIsNone(decoded)

    def test_tampered_token_rejected(self):
        payload = {"sub": "usr-123", "role": "patient"}
        token = create_access_token(payload, expires_days=1)
        parts = token.split(".")
        # Tamper payload
        tampered_token = f"{parts[0]}.eyJyZXBsYWNlZCI6dHJ1ZX0.{parts[2]}"
        decoded = verify_access_token(tampered_token)
        self.assertIsNone(decoded)


if __name__ == "__main__":
    unittest.main()
