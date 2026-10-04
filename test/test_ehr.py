"""
Unit tests for electronic health records (EHR) and anti-spam hash verification.
"""

import sys
import unittest
import uuid
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.supabase_service import (
    check_and_insert_file_hash,
    fetch_patient_records,
    insert_patient_record,
)


class TestEHRModule(unittest.IsolatedAsyncioTestCase):

    async def test_anti_spam_hash_insertion_and_duplicate_detection(self):
        unique_hash = f"sha256_test_hash_{uuid.uuid4().hex}"
        record = await check_and_insert_file_hash(
            file_hash=unique_hash,
            file_name="rx_snapshot.jpg",
            file_size_bytes=1024,
            uploaded_by="mobile_worker_test"
        )
        self.assertEqual(record["file_hash"], unique_hash)

        # Attempt to insert same hash again -> should raise DUPLICATE_HASH
        with self.assertRaises(ValueError) as ctx:
            await check_and_insert_file_hash(
                file_hash=unique_hash,
                file_name="rx_duplicate.jpg"
            )
        self.assertIn("DUPLICATE_HASH", str(ctx.exception))

    async def test_patient_record_creation_and_mobile_view_redaction(self):
        patient_name = f"Test Patient {uuid.uuid4().hex[:6]}"
        saved = await insert_patient_record(
            patient_name=patient_name,
            homeopathic_analysis={"diagnosis": "Allergic Rhinitis", "remedy": "Allium Cepa 30C"},
            visiting_date="2026-10-02",
            local_audio_path="/private/var/audio/secret_consultation.webm",
            prescription_image_path="/private/var/images/prescription_secret.jpg"
        )
        self.assertEqual(saved["patient_name"], patient_name)
        self.assertIsNotNone(saved.get("id"))

        # Fetch with mobile view (restricted view)
        mobile_records = await fetch_patient_records(is_mobile_view=True)
        matching_mobile = next((r for r in mobile_records if r.get("patient_name") == patient_name), None)
        self.assertIsNotNone(matching_mobile)
        self.assertNotIn("local_audio_path", matching_mobile)
        self.assertNotIn("prescription_image_path", matching_mobile)

        # Fetch with admin view (full view)
        admin_records = await fetch_patient_records(is_mobile_view=False)
        matching_admin = next((r for r in admin_records if r.get("patient_name") == patient_name), None)
        self.assertIsNotNone(matching_admin)
        self.assertIn("local_audio_path", matching_admin)


if __name__ == "__main__":
    unittest.main()
