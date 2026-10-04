"""
Unit and integration tests for route protection and RBAC authentication on EHR endpoints.
Verifies that:
1. Unauthenticated requests to /api/v1/patient-records?view=admin return 401 Unauthorized.
2. Invalid or malformed tokens return 401 Unauthorized.
3. Authenticated requests from non-admin accounts (e.g. role='patient') return 403 Forbidden.
4. Authenticated admin requests return 200 OK with full records.
5. Mobile view (/api/v1/patient-records?view=mobile) is accessible for mobile clients.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.auth_service import generate_local_jwt


class TestRouteProtection(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Generate tokens for testing
        cls.admin_token = generate_local_jwt({
            "id": "usr-admin-001",
            "name": "Dr. Bramarambha K",
            "email": "admin@agastyahomoeo.com",
            "role": "admin"
        })

        cls.patient_token = generate_local_jwt({
            "id": "usr-001",
            "name": "John Doe",
            "email": "john@agastyahomoeo.com",
            "role": "patient"
        })

    def test_admin_view_unauthenticated_returns_401(self):
        """Verifies that unauthorized requests to /api/v1/patient-records?view=admin return 401."""
        res = self.client.get("/api/v1/patient-records?view=admin")
        self.assertEqual(res.status_code, 401)
        self.assertIn("Missing Authorization header", res.json().get("detail", ""))

    def test_admin_view_invalid_bearer_format_returns_401(self):
        """Verifies that malformed Authorization header returns 401."""
        headers = {"Authorization": "Basic somecredentials123"}
        res = self.client.get("/api/v1/patient-records?view=admin", headers=headers)
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid Authorization header format", res.json().get("detail", ""))

    def test_admin_view_invalid_token_returns_401(self):
        """Verifies that invalid/tampered JWT returns 401."""
        headers = {"Authorization": "Bearer invalid.jwt.token.here"}
        res = self.client.get("/api/v1/patient-records?view=admin", headers=headers)
        self.assertEqual(res.status_code, 401)
        self.assertIn("Invalid or expired", res.json().get("detail", ""))

    def test_admin_view_patient_role_returns_403(self):
        """Verifies that authenticated non-admin (patient) token returns 403 Forbidden."""
        headers = {"Authorization": f"Bearer {self.patient_token}"}
        res = self.client.get("/api/v1/patient-records?view=admin", headers=headers)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Admin role required", res.json().get("detail", ""))

    def test_admin_view_authorized_admin_returns_200(self):
        """Verifies that authenticated admin token returns 200 OK with full records view."""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        res = self.client.get("/api/v1/patient-records?view=admin", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("view"), "patient_records_full")
        self.assertIn("records", data)

    def test_mobile_view_unauthenticated_allowed(self):
        """Verifies that default mobile view query remains accessible without admin credentials."""
        res = self.client.get("/api/v1/patient-records?view=mobile")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("view"), "mobile_patient_view")


if __name__ == "__main__":
    unittest.main()
