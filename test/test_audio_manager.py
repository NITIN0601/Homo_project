"""
Unit tests for audio manager overlapping transcript stitching and boundary de-duplication.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.audio_manager import merge_overlapping_transcripts


class TestAudioManager(unittest.TestCase):
    def test_merge_empty_list(self):
        self.assertEqual(merge_overlapping_transcripts([]), "")

    def test_merge_single_segment(self):
        text = "Patient reports mild fever in the evening."
        self.assertEqual(merge_overlapping_transcripts([text]), text)

    def test_merge_partial_overlap(self):
        chunk1 = "Patient complained of severe cough and we prescribe Nux Vomica"
        chunk2 = "we prescribe Nux Vomica 30C twice daily after meals"
        result = merge_overlapping_transcripts([chunk1, chunk2])
        self.assertEqual(
            result,
            "Patient complained of severe cough and we prescribe Nux Vomica 30C twice daily after meals"
        )

    def test_merge_no_overlap(self):
        chunk1 = "First consultation segment."
        chunk2 = "Second consultation segment."
        result = merge_overlapping_transcripts([chunk1, chunk2])
        self.assertIn("First consultation segment.", result)
        self.assertIn("Second consultation segment.", result)


if __name__ == "__main__":
    unittest.main()

