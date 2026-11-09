"""
Pre-deploy Environment Validation Script.
Run before every production deployment.
Verifies all required env vars are present and non-default.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

REQUIRED = {
    "JWT_SECRET": lambda v: len(v) >= 32 and "agastya-local" not in v,
    "SUPABASE_ANON_KEY": lambda v: len(v) > 20 and "dummy" not in v,
    "SUPABASE_SERVICE_KEY": lambda v: len(v) > 20 and "dummy" not in v,
    "CLINIC_ADMIN_EMAIL": lambda v: "@" in v,
    "AUTHORIZED_ADMIN_EMAILS": lambda v: len(v) > 5,
}


def validate_environment() -> bool:
    errors = []
    print("🔍 Validating production environment variables...")
    for key, validator in REQUIRED.items():
        val = os.getenv(key, "")
        if not val or not validator(val):
            errors.append(f"  ✗ {key}: missing or invalid")
        else:
            print(f"  ✓ {key}: OK")

    if errors:
        print("\n❌ Deployment blocked — fix these env vars:\n" + "\n".join(errors))
        return False
    print("\n✅ All environment variables validated. Safe to deploy.")
    return True


if __name__ == "__main__":
    if not validate_environment():
        sys.exit(1)
