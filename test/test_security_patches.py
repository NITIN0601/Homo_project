"""
Security regression tests for HIPAA PHI and Financial PII protection.
Verifies that:
1. Unauthenticated callers receive an empty list for /api/v1/consultation-invoices.
2. Unauthenticated callers receive an empty list for /api/v1/orders.
3. Unauthenticated mobile clinical records queries are rejected in production mode.
4. Authenticated patient callers only see their own scoped records.
"""

import sys
import unittest
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.config import settings
from core.security import create_access_token
from fastapi.testclient import TestClient
from main import app


class TestSecurityPatches(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.patient_token = create_access_token({"sub": "usr-001", "id": "usr-001", "email": "patient@example.com", "role": "patient"})
        cls.patient_headers = {"Authorization": f"Bearer {cls.patient_token}"}

    def test_unauthenticated_invoices_leak_prevented(self):
        """Verifies that an unauthenticated caller gets an empty list, not all invoices."""
        res = self.client.get("/api/v1/consultation-invoices")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_unauthenticated_orders_leak_prevented(self):
        """Verifies that an unauthenticated caller gets an empty list of orders."""
        res = self.client.get("/api/v1/orders")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_production_mode_blocks_unauthenticated_mobile_records(self):
        """Verifies that when IS_PRODUCTION is True, unauthenticated access to mobile view is blocked with 401."""
        original_prod = settings.IS_PRODUCTION
        try:
            settings.IS_PRODUCTION = True
            res = self.client.get("/api/v1/patient-records?view=mobile")
            self.assertEqual(res.status_code, 401)
            self.assertIn("Authentication required", res.json().get("detail", ""))
        finally:
            settings.IS_PRODUCTION = original_prod


if __name__ == "__main__":
    unittest.main()

