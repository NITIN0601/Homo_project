"""
Unit tests for concurrent audit log writes and thread safety.
"""
import concurrent.futures
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.audit import record_audit_entry


class TestAuditLock(unittest.TestCase):
    def test_concurrent_audit_writes(self):
        def write_entry(idx: int):
            record_audit_entry({
                "test_id": idx,
                "action": "CONCURRENT_TEST",
                "timestamp": "2026-11-09T00:00:00Z"
            })
            return True

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(write_entry, i) for i in range(50)]
            results = [f.result() for f in futures]

        self.assertEqual(len(results), 50)
        self.assertTrue(all(results))


if __name__ == "__main__":
    unittest.main()

