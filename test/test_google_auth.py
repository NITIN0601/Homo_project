import sys
import unittest
import uuid
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.config import settings
from main import app
from services.auth_service import create_user_invite

client = TestClient(app)


class TestGoogleAuthFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from services.auth_service import ACCOUNTS_FILE, INVITES_FILE
        from services.data_store import load_json
        cls._orig_accounts = load_json(ACCOUNTS_FILE, default={})
        cls._orig_invites = load_json(INVITES_FILE, default={})
        cls._orig_mock = settings.USE_MOCK_DATA
        settings.USE_MOCK_DATA = True

    @classmethod
    def tearDownClass(cls):
        from services.auth_service import ACCOUNTS_FILE, INVITES_FILE
        from services.data_store import save_json
        save_json(ACCOUNTS_FILE, cls._orig_accounts)
        save_json(INVITES_FILE, cls._orig_invites)
        settings.USE_MOCK_DATA = cls._orig_mock
    def test_patient_google_signup_passwordless(self):
        """Verify patient can register & login with Google without setting a password."""
        test_email = f"patient_{uuid.uuid4().hex[:6]}@gmail.com"
        res = client.post(
            "/api/v1/auth/google",
            json={
                "email": test_email,
                "name": "Jane Google Patient",
                "portal_intent": "patient",
                "hospital_id": "default",
            },
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(body["role"], "patient")
        self.assertIn("token", body)
        self.assertEqual(body["profile"]["email"], test_email)
        self.assertEqual(body["profile"]["provider"], "google")

        # Second login with same Google account preserves persistent identity
        login_res = client.post(
            "/api/v1/auth/google",
            json={
                "email": test_email,
                "name": "Jane Google Patient",
                "portal_intent": "patient",
                "hospital_id": "default",
            },
        )
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.json()["profile"]["id"], body["profile"]["id"])

    def test_unauthorized_google_admin_blocked(self):
        """Verify non-whitelisted Google account cannot gain administrative privileges."""
        res = client.post(
            "/api/v1/auth/google",
            json={
                "email": "intruder@gmail.com",
                "name": "Unauthorized Intruder",
                "portal_intent": "admin",
            },
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Access Denied", res.json()["detail"])

    def test_claim_doctor_invite_with_google(self):
        """Verify patient can claim a doctor's clinic invitation using Google without creating a password."""
        invite = create_user_invite(
            email=f"invited_{uuid.uuid4().hex[:6]}@gmail.com",
            name="Invited Recipient",
            role="patient",
            hospital_id="default",
        )
        token = invite["token"]

        claim_res = client.post(
            "/api/v1/auth/accept-invite-google",
            json={
                "token": token,
                "email": invite["email"],
                "name": "Invited Recipient",
            },
        )
        self.assertEqual(claim_res.status_code, 200)
        self.assertEqual(claim_res.json()["status"], "success")
        self.assertIn("token", claim_res.json())
        self.assertEqual(claim_res.json()["profile"]["email"], invite["email"])


if __name__ == "__main__":
    unittest.main()
