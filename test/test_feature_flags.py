"""
Unit tests for multi-tenant feature flags endpoint and admin permissions.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.auth_service import generate_local_jwt


class TestFeatureFlags(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_token = generate_local_jwt({"id": "adm-001", "role": "admin", "email": "admin@agastyahomoeo.com"})
        cls.patient_token = generate_local_jwt({"id": "usr-001", "role": "patient", "email": "john@agastyahomoeo.com"})

    def test_get_hospital_features(self):
        res = self.client.get("/api/v1/hospitals/agastya/features")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("hospital_id"), "agastya")
        self.assertIn("features", data)

    def test_update_features_unauthorized(self):
        res = self.client.patch("/api/v1/hospitals/agastya/features", json={"enableECommerce": True})
        self.assertEqual(res.status_code, 401)

    def test_update_features_patient_forbidden(self):
        res = self.client.patch(
            "/api/v1/hospitals/agastya/features",
            json={"enableECommerce": True},
            headers={"Authorization": f"Bearer {self.patient_token}"},
        )
        self.assertEqual(res.status_code, 403)

    def test_update_features_admin_success(self):
        res = self.client.patch(
            "/api/v1/hospitals/agastya/features",
            json={"enableECommerce": True},
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("features", {}).get("enableECommerce"))


if __name__ == "__main__":
    unittest.main()

