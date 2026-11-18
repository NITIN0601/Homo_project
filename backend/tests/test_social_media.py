"""
Tests for Multi-Tenant Social Media & 3rd-Party Messaging Service.
Verifies per-hospital WhatsApp, Instagram, and social integration capabilities.
"""

import os
import sys
from pathlib import Path
import unittest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app
from services.hospital_service import get_hospital
from services.social_media_service import (
    get_hospital_social_config,
    send_hospital_instagram_dm,
    send_hospital_whatsapp_message,
    update_hospital_social_config,
)


class TestSocialMediaService(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.client = TestClient(app)

    async def test_get_hospital_social_config(self):
        """Verifies that hospital social config loads correctly from tenant registry."""
        config = get_hospital_social_config("agastya")
        self.assertIn("whatsapp", config)
        self.assertIn("instagram", config)
        self.assertEqual(config["instagram"]["handle"], "@agastyahomoeo")
        self.assertTrue(config["whatsapp"]["enabled"])
        self.assertIn("919845012345", config["whatsapp"]["chatUrl"])

    async def test_hospital_whatsapp_dispatch_simulation(self):
        """Verifies that WhatsApp dispatch utilizes tenant-specific identity and custom greetings."""
        res = await send_hospital_whatsapp_message(
            hospital_id="agastya",
            to_phone="+91 98450 99999",
            message_text="Test appointment reminder",
            template_name="test_template",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["channel"], "whatsapp")
        self.assertEqual(res["status"], "mock_delivered")
        self.assertEqual(res["hospital_id"], "agastya")
        self.assertIn("Agastya", res["hospital_name"])

    async def test_hospital_instagram_dm_simulation(self):
        """Verifies that Instagram DM dispatch simulates successfully for the hospital."""
        res = await send_hospital_instagram_dm(
            hospital_id="agastya",
            recipient_id="ig_patient_001",
            message_text="Hello from Agastya Homeopathy Instagram!",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["channel"], "instagram")
        self.assertEqual(res["hospital_id"], "agastya")

    def test_update_hospital_social_config(self):
        """Verifies that hospital social media settings can be updated atomically."""
        updated = update_hospital_social_config(
            "agastya",
            {
                "instagram": {"handle": "@agastyahomoeo_official"},
                "youtube": {"enabled": True, "channelUrl": "https://youtube.com/@AgastyaHomeo"},
            },
        )
        self.assertEqual(updated["socialMedia"]["instagram"]["handle"], "@agastyahomoeo_official")
        self.assertTrue(updated["socialMedia"]["youtube"]["enabled"])

        # Restore original handle
        update_hospital_social_config("agastya", {"instagram": {"handle": "@agastyahomoeo"}})

    def test_social_profiles_api_endpoint(self):
        """Verifies the public social profiles API endpoint for patient UI."""
        resp = self.client.get("/api/v1/social/agastya/profiles")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("socialMedia", data)
        self.assertIn("whatsapp", data["socialMedia"])


if __name__ == "__main__":
    unittest.main()
