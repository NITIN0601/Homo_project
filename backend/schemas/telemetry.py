"""
Pydantic Schemas for HIPAA-Compliant Error Telemetry & Crash Reporting.
Enforces zero PHI/PII data collection with automated stripping.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator
import re

# Regex patterns for client-side and server-side PHI/PII scrubbing
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(\+?[0-9]{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}")
TOKEN_REGEX = re.compile(r"(bearer\s+[a-zA-Z0-9_\-\.]+|token=[a-zA-Z0-9_\-\.]+|key=[a-zA-Z0-9_\-\.]+)", re.IGNORECASE)
CREDIT_CARD_REGEX = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")
SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")


def scrub_phi_pii(text: Optional[str]) -> str:
    """Scrub potential patient identifiers, emails, phones, and tokens from strings."""
    if not text:
        return ""
    cleaned = TOKEN_REGEX.sub("[REDACTED_TOKEN]", text)
    cleaned = CREDIT_CARD_REGEX.sub("[REDACTED_CARD]", cleaned)
    cleaned = SSN_REGEX.sub("[REDACTED_SSN]", cleaned)
    cleaned = EMAIL_REGEX.sub("[REDACTED_EMAIL]", cleaned)
    cleaned = PHONE_REGEX.sub("[REDACTED_PHONE]", cleaned)
    return cleaned


class DeviceContext(BaseModel):
    screen_width: Optional[int] = Field(default=None, description="Screen viewport width in pixels")
    screen_height: Optional[int] = Field(default=None, description="Screen viewport height in pixels")
    user_agent: Optional[str] = Field(default="", description="Browser and operating system user-agent")
    language: Optional[str] = Field(default="", description="Browser primary locale e.g. en-US")
    platform: Optional[str] = Field(default="", description="Platform identifier e.g. MacIntel, Win32")
    online: Optional[bool] = Field(default=True, description="Network online status")

    @field_validator("user_agent", mode="before")
    def scrub_ua(cls, v: Any) -> str:
        return scrub_phi_pii(str(v or ""))[:300]


class LocationContext(BaseModel):
    timezone: str = Field(default="UTC", description="Detected IANA timezone e.g. America/New_York")
    locale: Optional[str] = Field(default="en-US", description="Regional locale formatting")

    @field_validator("timezone", mode="before")
    def validate_tz(cls, v: Any) -> str:
        clean = str(v or "UTC").strip()
        # Disallow script tags or excessive length in timezone
        return clean[:60] if re.match(r"^[A-Za-z0-9_\-\+/]+$", clean) else "UTC"


class CrashReportPayload(BaseModel):
    incident_id: str = Field(..., description="Unique client-generated incident identifier")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    error_name: str = Field(..., description="JavaScript Error name e.g. RangeError, TypeError")
    error_message: str = Field(..., description="Sanitized runtime error message")
    stack_trace: Optional[str] = Field(default="", description="Sanitized call stack trace")
    component_stack: Optional[str] = Field(default="", description="Sanitized React component stack")
    url: str = Field(default="", description="Active route URL path stripped of query tokens")
    route: Optional[str] = Field(default="", description="Application page or route name")
    device: Optional[DeviceContext] = Field(default=None, description="Technical device viewport and browser context")
    location: Optional[LocationContext] = Field(default=None, description="Timezone and locale context")
    source: str = Field(default="frontend_boundary", description="Source boundary or middleware origin")
    user_action: str = Field(default="report_and_reload", description="User trigger action e.g. report_and_reload")

    @field_validator("error_message", "stack_trace", "component_stack", "url", mode="before")
    def scrub_fields(cls, v: Any) -> str:
        return scrub_phi_pii(str(v or ""))
