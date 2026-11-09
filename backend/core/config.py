"""
Central Configuration SSOT for Backend.
Loads environment variables from root and backend .env files.
"""

import os
import sys
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
    # Environment Mode
    APP_ENV: str = os.getenv("APP_ENV", "development")
    USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")
    IS_PRODUCTION: bool = APP_ENV.lower() == "production"

    PROJECT_NAME: str = "Agastya Classical Homeopathy Clinic Engine"
    API_V1_STR: str = "/api/v1"

    # Supabase / PostgreSQL Configuration
    SUPABASE_REST_URL: str = os.getenv("SUPABASE_REST_URL", "http://127.0.0.1:54321/rest/v1").rstrip("/")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_service")

    # Authentication & Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "agastya-local-jwt-secret-key-2026-secure-auth")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

    # Multi-Tenant & Domain Entity Pointers (Default SSOT)
    DEFAULT_HOSPITAL_ID: str = os.getenv("DEFAULT_HOSPITAL_ID", "agastya")
    DEFAULT_DOCTOR_ID: str = os.getenv("DEFAULT_DOCTOR_ID", "doc-001")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

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
            "admin@agastyahomoeo.com,doctor@agastyahomoeo.com,drbramarambha@agastyahomoeo.com",
        ).split(",")
        if email.strip()
    ]

    # CORS
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
        ).split(",")
        if o.strip()
    ]

    # 3rd-Party API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OLLAMA_ENDPOINT: str = os.getenv("OLLAMA_ENDPOINT", "http://127.0.0.1:11434")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "Agastya Clinic <onboarding@resend.dev>")
    GOOGLE_CALENDAR_ID: str = os.getenv("GOOGLE_CALENDAR_ID", "en.indian#holiday@group.v.calendar.google.com")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "backend/credentials.json")
    TYPESAFE_API_KEY: str = os.getenv("TYPESAFE_API_KEY", "")
    CLINICAL_WATERMARK_SECRET: str = os.getenv("CLINICAL_WATERMARK_SECRET", "replace_with_a_secure_random_64_char_hex_secret_here")

    # Voice Studio / Transcription
    VOICESTUDIO_URL: str = os.getenv("VOICESTUDIO_URL", "http://127.0.0.1:3900/v1/audio/transcriptions")

    # WhatsApp / Communications
    WHATSAPP_BUSINESS_PHONE: str = os.getenv("WHATSAPP_BUSINESS_PHONE", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_ID: str = os.getenv("WHATSAPP_PHONE_ID", "100609346426085")

    # Rate Limiting
    RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "5/minute")
    RATE_LIMIT_AI: str = os.getenv("RATE_LIMIT_AI", "10/minute")
    RATE_LIMIT_UPLOAD: str = os.getenv("RATE_LIMIT_UPLOAD", "20/minute")

    def __init__(self):
        _insecure_patterns = ["agastya-local", "dummy", "super-secret", "example", "changeme"]
        if self.IS_PRODUCTION and (
            not self.JWT_SECRET or any(p in self.JWT_SECRET.lower() for p in _insecure_patterns)
        ):
            sys.exit(
                "FATAL: JWT_SECRET must be a secure random value in production. "
                'Generate with: python -c "import secrets; print(secrets.token_hex(64))"'
            )

    def validate_production(self) -> None:
        """Call during app lifespan. Raises RuntimeError for missing production config."""
        if not self.IS_PRODUCTION:
            return
        errors: list[str] = []
        _weak_jwt = ["agastya-local", "dummy", "super-secret", "example", "changeme", ""]
        if any(p in self.JWT_SECRET.lower() for p in _weak_jwt):
            errors.append("JWT_SECRET is missing or uses a weak/default value")
        if not self.SUPABASE_ANON_KEY or "dummy" in self.SUPABASE_ANON_KEY:
            errors.append("SUPABASE_ANON_KEY is missing or uses a placeholder value")
        if not self.AUTHORIZED_ADMIN_EMAILS:
            errors.append("AUTHORIZED_ADMIN_EMAILS must have at least one entry")
        if self.USE_MOCK_DATA:
            errors.append("USE_MOCK_DATA must be false in production")
        if errors:
            raise RuntimeError("Production config validation failed:\n" + "\n".join(f"  • {e}" for e in errors))


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


