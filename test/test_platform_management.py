"""
Test Super Admin RBAC, Dynamic Hospital/Doctor Creation, Invite Workflow, and Mock/Real Toggle.
"""

import unittest
from fastapi.testclient import TestClient
from main import app
from services.auth_service import generate_local_jwt

client = TestClient(app)


class TestSuperAdminAndPlatformMgmt(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.super_admin_token = generate_local_jwt(
            {"id": "usr-super-001", "role": "super_admin", "email": "superadmin@agastyahomoeo.com"}
        )
        cls.admin_token = generate_local_jwt(
            {"id": "usr-admin-001", "role": "admin", "email": "admin@agastyahomoeo.com"}
        )
        cls.patient_token = generate_local_jwt(
            {"id": "usr-001", "role": "patient", "email": "john@agastyahomoeo.com"}
        )

    def test_admin_cannot_access_super_admin_endpoint(self):
        """Admin is forbidden from creating new hospital tenants (Super Admin only)."""
        payload = {
            "id": "unauthorized-clinic",
            "name": "Unauthorized Clinic",
        }
        res = client.post(
            "/api/v1/hospitals",
            json=payload,
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Super administrator privileges required", res.json()["detail"])

    def test_super_admin_can_create_hospital(self):
        """Super Admin can register a new hospital tenant."""
        import uuid
        h_id = f"test-med-{uuid.uuid4().hex[:6]}"
        payload = {
            "id": h_id,
            "name": "Test Medical Center",
            "short_name": "Test Med",
            "phone": "+91 98450 12345",
            "email": "contact@testmed.org",
            "primary_color": "#2563eb",
        }
        res = client.post(
            "/api/v1/hospitals",
            json=payload,
            headers={"Authorization": f"Bearer {self.super_admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "created")
        self.assertEqual(data["hospital"]["id"], h_id)
        self.assertEqual(data["hospital"]["branding"]["primaryColor"], "#2563eb")

    def test_admin_can_create_doctor(self):
        """Admin can register a doctor for an existing hospital."""
        payload = {
            "hospital_id": "test-med-center",
            "name": "Dr. Sarah Connor, MD",
            "email": "sarah.connor@testmed.org",
            "experience_years": 8,
            "specialties": ["Integrative Medicine"],
        }
        res = client.post(
            "/api/v1/doctors",
            json=payload,
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "created")
        self.assertEqual(data["doctor"]["name"], "Dr. Sarah Connor, MD")
        self.assertEqual(data["doctor"]["hospitalId"], "test-med-center")

    def test_patient_cannot_create_doctor(self):
        """Patient is forbidden from provisioning doctors."""
        payload = {
            "hospital_id": "test-med-center",
            "name": "Hacker Doctor",
            "email": "hacker@test.com",
        }
        res = client.post(
            "/api/v1/doctors",
            json=payload,
            headers={"Authorization": f"Bearer {self.patient_token}"},
        )
        self.assertEqual(res.status_code, 403)

    def test_generate_and_accept_invite(self):
        """Admin generates onboarding invite, user accepts with password."""
        import uuid
        unique_email = f"alice.invited.{uuid.uuid4().hex[:6]}@example.com"
        invite_res = client.post(
            "/api/v1/auth/invite",
            json={
                "name": "Invited Patient Alice",
                "email": unique_email,
                "role": "patient",
                "hospital_id": "test-med-center",
            },
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(invite_res.status_code, 200)
        invite_data = invite_res.json()
        token = invite_data["invite"]["token"]
        self.assertTrue(token.startswith("inv_"))

        # Claim the invite
        accept_res = client.post(
            "/api/v1/auth/accept-invite",
            json={"token": token, "password": "SecurePassword123!"},
        )
        self.assertEqual(accept_res.status_code, 200)
        accept_data = accept_res.json()
        self.assertEqual(accept_data["status"], "success")
        self.assertEqual(accept_data["profile"]["email"], unique_email)
        self.assertIn("token", accept_data)

    def test_dev_mode_toggle(self):
        """Super Admin can toggle Mock Dev Mode."""
        res = client.post(
            "/api/v1/platform/toggle-dev-mode",
            json={"use_mock_data": True},
            headers={"Authorization": f"Bearer {self.super_admin_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["use_mock_data"])

