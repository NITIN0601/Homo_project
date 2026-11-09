"""
Unit tests for safe ID sanitization and PHI/PII context anonymization.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.audio_manager import sanitize_safe_id
from services.llm_scribe import sanitize_patient_context


class TestSanitize(unittest.TestCase):
    def test_sanitize_safe_id_path_traversal(self):
        self.assertEqual(sanitize_safe_id("../../etc/passwd"), "etcpasswd")
        self.assertEqual(sanitize_safe_id("..\\..\\windows\\system32"), "windowssystem32")

    def test_sanitize_safe_id_special_characters(self):
        cleaned = sanitize_safe_id("patient#123;drop table?")
        self.assertNotIn("#", cleaned)
        self.assertNotIn(";", cleaned)
        self.assertNotIn("?", cleaned)

    def test_sanitize_safe_id_null_byte_and_whitespace(self):
        self.assertEqual(sanitize_safe_id("usr\x00001  test"), "usr001test")

    def test_sanitize_patient_context_strips_pii(self):
        sample_transcript = (
            "Patient John Doe, email john.doe@example.com, called from +91 98450 12345. "
            "Another contact: 9876543210 or 080-23456789. "
            "Reported severe headache aggravation in the evening."
        )
        anonymized = sanitize_patient_context(sample_transcript, patient_name="John Doe")
        self.assertNotIn("john.doe@example.com", anonymized)
        self.assertNotIn("+91 98450 12345", anonymized)
        self.assertNotIn("John Doe", anonymized)
        self.assertIn("severe headache", anonymized)


if __name__ == "__main__":
    unittest.main()
