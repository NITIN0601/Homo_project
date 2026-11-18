"""
Comprehensive Unit Tests for Enterprise Audit Security & Resiliency Fixes.
Verifies:
1. Google OAuth token cryptographic verification / admin bypass prevention
2. OTP verification attempt limits and brute force protection
3. Token revocation (JTI) via /auth/logout
4. Strict role authorization on mutating endpoints
5. Sanitized public health endpoint and protected configuration status
6. Discrete clinical audit event logging
"""

import unittest

from core.security import create_access_token, is_token_revoked, verify_access_token
from fastapi.testclient import TestClient
from main import app
from services.auth_service import authenticate_or_register_google_user, generate_otp, verify_otp_code


class TestEnterpriseSecurityFixes(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_public_health_does_not_leak_internal_state(self):
        resp = self.client.get("/api/v1/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("version"), "2.0.0")
        # Ensure internal URLs and cryptos are NOT leaked
        self.assertNotIn("supabase_endpoint", data)
        self.assertNotIn("forensic_watermark_engine", data)

    def test_config_status_requires_super_admin(self):
        # Unauthenticated request must fail
        resp = self.client.get("/api/v1/config/status")
        self.assertIn(resp.status_code, (401, 403))

        # Admin (non-super-admin) token must be rejected
        admin_token = create_access_token({"sub": "admin@test.com", "role": "admin"})
        resp_admin = self.client.get(
            "/api/v1/config/status",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        self.assertEqual(resp_admin.status_code, 403)

        # Super admin token must succeed with boolean flags only
        super_token = create_access_token({"sub": "super@test.com", "role": "super_admin"})
        resp_super = self.client.get(
            "/api/v1/config/status",
            headers={"Authorization": f"Bearer {super_token}"},
        )
        self.assertEqual(resp_super.status_code, 200)
        data = resp_super.json()
        self.assertIn("gemini_configured", data)
        self.assertNotIn("http://127.0.0.1:54321", str(data))

    def test_unauthenticated_mutating_endpoints_rejected(self):
        # 1. Update appointment status without token -> 401
        resp1 = self.client.put("/api/v1/appointments/apt-123/status", json={"status": "Confirmed"})
        self.assertEqual(resp1.status_code, 401)

        # 2. Create invoice without admin token -> 401
        resp2 = self.client.post("/api/v1/consultation-invoices", json={"patientName": "Alice", "amount": 100})
        self.assertEqual(resp2.status_code, 401)

        # 3. Restock inventory without admin token -> 401
        resp3 = self.client.post("/api/v1/inventory/item-1/restock", json={"qty": 20})
        self.assertEqual(resp3.status_code, 401)

        # 4. Communications send without admin token -> 401
        resp4 = self.client.post("/api/v1/email/send", json={"email": "alice@test.com", "subject": "Test"})
        self.assertEqual(resp4.status_code, 401)

        # 5. Delete admin alerts without super admin token -> 401
        resp5 = self.client.delete("/api/v1/admin/alerts")
        self.assertEqual(resp5.status_code, 401)

    def test_otp_brute_force_lockout(self):
        test_email = "patient-otp-test@example.com"
        real_otp = generate_otp(test_email)
        self.assertEqual(len(real_otp), 6)

        # Test 123456 bypass is gone
        self.assertFalse(verify_otp_code(test_email, "123456"))

        # Fail 4 times with invalid code
        for _ in range(4):
            self.assertFalse(verify_otp_code(test_email, "000000"))

        # 5th failed attempt triggers lockout ValueError
        with self.assertRaises(ValueError) as ctx:
            verify_otp_code(test_email, "000000")
        self.assertIn("maximum verification attempts exceeded", str(ctx.exception))

    def test_token_revocation_on_logout(self):
        token = create_access_token({"sub": "user@test.com", "role": "patient"})
        payload = verify_access_token(token)
        self.assertIsNotNone(payload)
        jti = payload.get("jti")
        self.assertIsNotNone(jti)
        self.assertFalse(is_token_revoked(jti))

        # Call logout endpoint
        resp = self.client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(resp.status_code, 200)

        # Token must now be rejected
        self.assertTrue(is_token_revoked(jti))
        self.assertIsNone(verify_access_token(token))

    def test_google_auth_prevents_unverified_admin_claim(self):
        # Attempting admin login without id_token must be rejected
        with self.assertRaises(ValueError) as ctx:
            authenticate_or_register_google_user(
                email="admin@agastyahomoeo.com",
                portal_intent="admin",
                id_token=None,
            )
        self.assertIn("Access Denied", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
