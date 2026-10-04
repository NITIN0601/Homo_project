"""
Unit tests for clinic authentication, PBKDF2 hashing, and JWT session handling.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.auth_service import (
    authenticate_user,
    generate_local_jwt,
    hash_password,
    validate_email,
    verify_local_jwt,
    verify_password,
)


class TestAuthModule(unittest.TestCase):

    def test_email_validation(self):
        self.assertEqual(validate_email("TEST@Domain.COM "), "test@domain.com")
        with self.assertRaises(ValueError):
            validate_email("invalid-email-address")

    def test_password_hashing_and_verification(self):
        pwd = "SecretPassword123!"
        hashed, salt = hash_password(pwd)
        self.assertTrue(verify_password(pwd, hashed, salt))
        self.assertFalse(verify_password("WrongPassword", hashed, salt))

    def test_password_minimum_length(self):
        with self.assertRaises(ValueError):
            hash_password("12345")

    def test_jwt_token_creation_and_verification(self):
        profile = {
            "id": "usr-test-123",
            "name": "Dr. Bramarambha K",
            "email": "doctor@agastyahomoeo.com",
            "role": "admin"
        }
        token = generate_local_jwt(profile)
        self.assertIsInstance(token, str)

        decoded = verify_local_jwt(token)
        self.assertIsNotNone(decoded)
        self.assertEqual(decoded.get("email"), "doctor@agastyahomoeo.com")
        self.assertEqual(decoded.get("role"), "admin")

    def test_authenticate_default_demo_account(self):
        profile, token = authenticate_user("admin@agastyahomoeo.com", "admin123")
        self.assertEqual(profile["role"], "admin")
        self.assertIsNotNone(token)

        with self.assertRaises(ValueError):
            authenticate_user("admin@agastyahomoeo.com", "wrong-password")


if __name__ == "__main__":
    unittest.main()
