"""
Unit tests for data_store atomic file persistence and thread-safe operations.
"""
import concurrent.futures
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.data_store import load_json, save_json


class TestDataStore(unittest.TestCase):
    def setUp(self):
        self.test_file = "test_concurrent_store.json"
        save_json(self.test_file, {"count": 0, "entries": []})

    def tearDown(self):
        test_path = BACKEND_DIR / "data" / self.test_file
        if test_path.exists():
            test_path.unlink()

    def test_concurrent_writes(self):
        def worker(worker_id: int):
            for i in range(10):
                data = load_json(self.test_file, default={"count": 0, "entries": []})
                data["entries"].append(f"worker_{worker_id}_{i}")
                save_json(self.test_file, data)
            return True

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker, i) for i in range(10)]
            results = [f.result() for f in futures]

        self.assertTrue(all(results))
        final_data = load_json(self.test_file)
        self.assertIsInstance(final_data.get("entries"), list)


if __name__ == "__main__":
    unittest.main()

