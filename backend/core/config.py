"""
Central Configuration SSOT for Backend.
Loads environment variables from root and backend .env files.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

# 1. Base defaults from root .env
root_env = ROOT_DIR / ".env"
if root_env.is_file():
    load_dotenv(root_env, override=False)

# 2. Specific backend overrides from backend/.env
backend_env = BACKEND_DIR / ".env"
if backend_env.is_file():
    load_dotenv(backend_env, override=True)

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Agastya Classical Homeopathy Clinic Engine"
    API_V1_STR: str = "/api/v1"
    
    # Supabase / PostgreSQL Configuration
    SUPABASE_REST_URL: str = os.getenv("SUPABASE_REST_URL", "http://127.0.0.1:54321/rest/v1").rstrip("/")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_service")
    
    # Authentication & Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "agastya-local-jwt-secret-key-2026-secure-auth")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    
    # Feature Flags
    USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")

    # Multi-Tenant & Domain Entity Pointers (Default SSOT)
    DEFAULT_HOSPITAL_ID: str = os.getenv("DEFAULT_HOSPITAL_ID", "agastya")
    DEFAULT_DOCTOR_ID: str = os.getenv("DEFAULT_DOCTOR_ID", "doc-001")

    # Clinic Profile & Identity (Configurable via Environment)
    CLINIC_NAME: str = os.getenv("CLINIC_NAME", "Agastya Classical Homeopathy Clinic")
    CLINIC_DOMAIN: str = os.getenv("CLINIC_DOMAIN", "agastyahomoeo.com")
    CLINIC_LOCATION: str = os.getenv("CLINIC_LOCATION", "Bengaluru, India")
    CLINIC_ADDRESS: str = os.getenv("CLINIC_ADDRESS", "No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru – 560003")
    CLINIC_PHONE: str = os.getenv("CLINIC_PHONE", "+91 98450 12345")
    CLINIC_ADMIN_EMAIL: str = os.getenv("CLINIC_ADMIN_EMAIL", "admin@agastyahomoeo.com")
    DOCTOR_NAME: str = os.getenv("DOCTOR_NAME", "Dr. Bramarambha K, MD (Homoeopathy)")
    DOCTOR_SHORT_NAME: str = os.getenv("DOCTOR_SHORT_NAME", "Dr. Bramarambha K")
    DOCTOR_EMAIL: str = os.getenv("DOCTOR_EMAIL", "doctor@agastyahomoeo.com")
    DEFAULT_COURIER_PARTNER: str = os.getenv("DEFAULT_COURIER_PARTNER", "BlueDart Express 🚚")

    # Authorized Admin Emails (Comma-separated in env, converted to list of lowercase strings)
    AUTHORIZED_ADMIN_EMAILS: list[str] = [
        email.strip().lower()
        for email in os.getenv(
            "AUTHORIZED_ADMIN_EMAILS",
            "admin@agastyahomoeo.com,doctor@agastyahomoeo.com,drbramarambha@agastyahomoeo.com,vaishnavikshetty@gmail.com",
        ).split(",")
        if email.strip()
    ]
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


settings = Settings()


# Common getters for compatibility and dynamic runtime lookup
def get_supabase_rest_url() -> str:
    return os.getenv("SUPABASE_REST_URL", settings.SUPABASE_REST_URL).rstrip("/")


def get_supabase_anon_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)


def get_supabase_service_key() -> str:
    return os.getenv("SUPABASE_SERVICE_KEY", settings.SUPABASE_SERVICE_KEY)


def is_mock_enabled() -> bool:
    return os.getenv("USE_MOCK_DATA", str(settings.USE_MOCK_DATA)).lower() in ("true", "1", "yes")


