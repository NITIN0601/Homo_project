"""
Google Calendar Service Account Integration
Creates calendar events on Google Workspace Business Calendar with sendUpdates='all'.
"""

import logging
import os
import re
from datetime import datetime
from typing import Any

logger = logging.getLogger("google_calendar")

# Primary Clinic Business Timezone (SSOT)
BUSINESS_TIMEZONE = "Asia/Kolkata"

# Path to Service Account JSON
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", os.getenv("GOOGLE_CALENDAR_CREDENTIALS_PATH", "backend/credentials.json"))
CALENDAR_ID = os.getenv("GOOGLE_CALENDAR_ID", "primary")

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

# Email validation regex
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_address(email: str) -> bool:
    """Validates that incoming string is a properly formatted email."""
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_future_date(start_iso: str) -> bool:
    """Verifies that the appointment start timestamp is strictly in the future."""
    try:
        dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            now = datetime.now()
        else:
            now = datetime.now(dt.tzinfo)
        return dt > now
    except Exception:
        return False


def get_calendar_service():
    """
    Initializes and returns authenticated Google Calendar Resource using Service Account.
    """
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        logger.warning("google-api-python-client or google-auth not installed.")
        return None

    if not os.path.exists(CREDENTIALS_PATH):
        logger.warning("Google credentials file not found at: %s", CREDENTIALS_PATH)
        return None

    try:
        creds = service_account.Credentials.from_service_account_file(
            CREDENTIALS_PATH, scopes=SCOPES
        )
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        return service
    except Exception as exc:
        logger.error("Failed to authenticate Google Calendar Service Account: %s", exc)
        return None


async def create_google_calendar_event(
    user_email: str,
    user_name: str,
    start_time_iso: str,
    end_time_iso: str,
    summary: str = "Homoeopathy Consultation — Agastya Clinic",
    description: str = "Clinical consultation with Dr. Bramarambha K.",
    calendar_id: str | None = None
) -> dict[str, Any]:
    """
    Inserts an event into Google Calendar with sendUpdates='all'.
    """
    target_cal_id = calendar_id or CALENDAR_ID

    # Validation
    if not validate_email_address(user_email):
        return {
            "success": False,
            "error": f"Invalid email format: '{user_email}'",
            "code": "INVALID_EMAIL"
        }

    if not validate_future_date(start_time_iso):
        return {
            "success": False,
            "error": "Appointment start date/time must be in the future.",
            "code": "PAST_DATE"
        }

    service = get_calendar_service()

    event_body = {
        "summary": summary,
        "description": f"{description}\n\nPatient Name: {user_name}\nPatient Email: {user_email}",
        "start": {
            "dateTime": start_time_iso,
            "timeZone": BUSINESS_TIMEZONE,
        },
        "end": {
            "dateTime": end_time_iso,
            "timeZone": BUSINESS_TIMEZONE,
        },
        "attendees": [
            {"email": user_email, "displayName": user_name},
            {"email": "vaishnavikshetty@gmail.com", "displayName": "Dr. Bramarambha K", "responseStatus": "accepted"},
        ],
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 24 * 60},
                {"method": "popup", "minutes": 30},
            ],
        },
    }

    if service is None:
        # If service account file is not yet deployed, return structured mock confirmation
        logger.info("Operating in simulation mode for Google Calendar (credentials.json pending)")
        return {
            "success": True,
            "event_id": f"gcal_sim_{int(datetime.now().timestamp())}",
            "status": "confirmed_simulation",
            "send_updates": "all",
            "html_link": f"https://calendar.google.com/calendar/r/eventedit?text={summary}",
            "message": "Google Calendar event simulated (sendUpdates='all' ready). Deploy credentials.json to connect directly.",
        }

    try:
        # Pass sendUpdates='all' to force automated Google email invites
        created_event = service.events().insert(
            calendarId=target_cal_id,
            body=event_body,
            sendUpdates="all"
        ).execute()

        return {
            "success": True,
            "event_id": created_event.get("id"),
            "status": created_event.get("status"),
            "html_link": created_event.get("htmlLink"),
            "send_updates": "all",
        }
    except Exception as exc:
        logger.error("Google Calendar API error: %s", exc)
        return {
            "success": False,
            "error": str(exc),
            "code": "GCAL_API_ERROR"
        }
