"""
Unit tests for production configuration validation and weak JWT rejection.
"""
import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.config import Settings


class TestConfigValidation(unittest.TestCase):
    def test_production_weak_jwt_raises(self):
        s = Settings()
        s.APP_ENV = "production"
        s.IS_PRODUCTION = True
        s.JWT_SECRET = "agastya-local-dummy"
        with self.assertRaises(RuntimeError):
            s.validate_production()

    def test_development_mode_bypasses_strict_validation(self):
        s = Settings()
        s.APP_ENV = "development"
        s.IS_PRODUCTION = False
        # In dev mode, validate_production returns cleanly without raising
        s.validate_production()


if __name__ == "__main__":
    unittest.main()

