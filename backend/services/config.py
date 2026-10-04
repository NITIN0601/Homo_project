"""
Configuration and Environment Initialization for Agastya Clinic Backend.
Ensures .env is loaded reliably whether the application is started directly
from backend/ (e.g. `uvicorn main:app`), from the repository root, or inside Docker.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

# 1. Check parent repository root .env (base defaults)
root_env = ROOT_DIR / ".env"
if root_env.is_file():
    load_dotenv(root_env, override=False)

# 2. Check backend/.env (specific backend environment override)
backend_env = BACKEND_DIR / ".env"
if backend_env.is_file():
    load_dotenv(backend_env, override=True)

# 3. General fallback
load_dotenv()

# Common getters with dynamic runtime lookup
def get_supabase_rest_url() -> str:
    return os.getenv("SUPABASE_REST_URL", "http://127.0.0.1:54321/rest/v1")

def get_supabase_anon_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy")

def get_supabase_service_key() -> str:
    return os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_service")

def is_mock_enabled() -> bool:
    return os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")
