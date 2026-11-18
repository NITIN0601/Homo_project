"""
Unit tests for Hospital and Doctor CRUD, atomic rollback, and customization operations.
Verifies microservice endpoints, soft deactivation, and single source of truth.
"""

import unittest
import uuid

from core.security import create_access_token
from fastapi.testclient import TestClient
from main import app
from services.doctor_service import DOCTORS_FILE, get_all_doctors, get_doctor
from services.hospital_service import HOSPITALS_FILE, get_all_hospitals, get_hospital, save_json


class TestHospitalDoctorCrud(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.super_admin_token = create_access_token(
            {
                "sub": "usr-superadmin",
                "email": "superadmin@platform.ehr",
                "role": "super_admin",
                "name": "Super Admin",
            }
        )
        cls.admin_token = create_access_token(
            {
                "sub": "usr-admin",
                "email": "admin@clinic.ehr",
                "role": "admin",
                "name": "Clinic Admin",
            }
        )
        cls.super_headers = {"Authorization": f"Bearer {cls.super_admin_token}"}
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def setUp(self):
        self.created_hospital_ids = []
        self.created_doctor_ids = []

    def tearDown(self):
        # Clean up any test records created
        if self.created_hospital_ids:
            all_h = [h for h in get_all_hospitals() if h.get("id") not in self.created_hospital_ids]
            save_json(HOSPITALS_FILE, all_h)
        if self.created_doctor_ids:
            all_d = [d for d in get_all_doctors() if d.get("id") not in self.created_doctor_ids]
            save_json(DOCTORS_FILE, all_d)

    def test_hospital_create_read_update_delete(self):
        """Test complete CRUD cycle for Hospital tenant."""
        slug = f"test-hosp-{uuid.uuid4().hex[:6]}"
        self.created_hospital_ids.append(slug)

        # 1. CREATE
        create_payload = {
            "id": slug,
            "name": "Unit Test Medical Center",
            "short_name": "UnitTest Med",
            "tagline": "Quality Care Guaranteed",
            "phone": "+1 555-0199",
            "email": f"admin@{slug}.org",
            "primary_color": "#0284c7",
            "accent_color": "#38bdf8",
        }
        res_create = self.client.post("/api/hospitals", json=create_payload, headers=self.super_headers)
        self.assertEqual(res_create.status_code, 200)
        self.assertEqual(res_create.json().get("status"), "created")

        # 2. READ
        res_get = self.client.get(f"/api/hospitals/{slug}")
        self.assertEqual(res_get.status_code, 200)
        hosp = res_get.json()
        self.assertEqual(hosp.get("name"), "Unit Test Medical Center")
        self.assertTrue(hosp.get("isActive"))

        # 3. UPDATE (Details & Customization)
        update_payload = {
            "name": "Unit Test Medical Center Updated",
            "contact": {"phone": "+1 555-9999"},
        }
        res_update = self.client.put(
            f"/api/hospitals/{slug}/customization", json=update_payload, headers=self.admin_headers
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["hospital"]["name"], "Unit Test Medical Center Updated")
        self.assertEqual(res_update.json()["hospital"]["contact"]["phone"], "+1 555-9999")

        # 4. DELETE (Soft Deactivation)
        res_delete = self.client.delete(f"/api/super-admin/hospitals/{slug}", headers=self.super_headers)
        self.assertEqual(res_delete.status_code, 200)
        self.assertFalse(res_delete.json().get("is_active"))

        # Verify soft-deactivation in store
        in_store = get_hospital(slug)
        self.assertFalse(in_store.get("isActive"))

    def test_doctor_create_read_update_delete(self):
        """Test complete CRUD cycle for Doctor."""
        h_slug = f"test-hosp-{uuid.uuid4().hex[:6]}"
        self.created_hospital_ids.append(h_slug)

        # First create hospital
        self.client.post(
            "/api/hospitals", json={"id": h_slug, "name": "Doctor Parent Hospital"}, headers=self.super_headers
        )

        doc_email = f"doc_{uuid.uuid4().hex[:6]}@clinic.org"
        create_doc_payload = {
            "hospital_id": h_slug,
            "name": "Dr. Alex Taylor",
            "email": doc_email,
            "phone": "+1 555-0122",
            "title": "Senior Consultant",
            "qualifications": "MD, FACP",
            "consultation_fee": 650.0,
            "is_primary": True,
        }
        res_create = self.client.post("/api/doctors", json=create_doc_payload, headers=self.admin_headers)
        self.assertEqual(res_create.status_code, 200)
        doc = res_create.json().get("doctor")
        doc_id = doc.get("id")
        self.created_doctor_ids.append(doc_id)

        # READ
        res_get = self.client.get(f"/api/doctors/{doc_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json().get("name"), "Dr. Alex Taylor")

        # UPDATE
        update_doc_payload = {
            "name": "Dr. Alex Taylor, MD",
            "consultationFee": 800.0,
        }
        res_update = self.client.put(
            f"/api/super-admin/hospitals/{h_slug}/doctors/{doc_id}",
            json=update_doc_payload,
            headers=self.admin_headers,
        )
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["doctor"]["name"], "Dr. Alex Taylor, MD")

        # DELETE (Soft deactivation)
        res_delete = self.client.delete(f"/api/doctors/{doc_id}", headers=self.admin_headers)
        self.assertEqual(res_delete.status_code, 200)
        self.assertFalse(res_delete.json().get("is_active"))

        doc_store = get_doctor(doc_id)
        self.assertFalse(doc_store.get("isActive"))


if __name__ == "__main__":
    unittest.main()
