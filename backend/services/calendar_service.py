"""
Dynamic Calendar & Indian Holidays Service
Integrates with Google Calendar Public Holidays in India feed:
en.indian#holiday@group.v.calendar.google.com
"""

import logging
import re
import time
from typing import Any

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import urllib.request

logger = logging.getLogger("calendar_service")

# Google Calendar Public Feed for Holidays in India
GOOGLE_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com"
GOOGLE_HOLIDAYS_ICS_URL = (
    "https://calendar.google.com/calendar/ical/"
    "en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics"
)

# In-memory cache for parsed events with TTL
_HOLIDAYS_CACHE: dict[int, list[dict[str, Any]]] = {}
_CACHE_TIMESTAMP: dict[int, float] = {}
CACHE_TTL_SECONDS = 86400  # 24 hours



def _map_emoji_for_holiday(name: str) -> str:
    """Map contextual emoji based on Indian festival/holiday name."""
    name_lower = name.lower()
    if any(k in name_lower for k in ["republic", "independence"]):
        return "🇮🇳"
    if any(k in name_lower for k in ["diwali", "deepavali", "naraka", "lakshmi"]):
        return "🪔"
    if any(k in name_lower for k in ["holi", "dahan", "colour"]):
        return "🎨"
    if any(k in name_lower for k in ["pongal", "sankranti"]):
        return "🌾"
    if any(k in name_lower for k in ["shivaratri", "shiva"]):
        return "🔱"
    if any(k in name_lower for k in ["ganesh", "vinayaka"]):
        return "🐘"
    if any(k in name_lower for k in ["dussehra", "dasara", "vijayadashami", "ram", "rama"]):
        return "🏹"
    if any(k in name_lower for k in ["durga", "navratri", "puja", "ashtami", "navami"]):
        return "🪷"
    if any(k in name_lower for k in ["eid", "ramadan", "ramzan", "bakrid", "muharram"]):
        return "🌙"
    if any(k in name_lower for k in ["christmas", "xmas"]):
        return "🎄"
    if any(k in name_lower for k in ["buddha"]):
        return "🪷"
    if any(k in name_lower for k in ["guru", "nanak"]):
        return "🪔"
    if any(k in name_lower for k in ["gandhi"]):
        return "🕊️"
    if any(k in name_lower for k in ["ambedkar"]):
        return "📜"
    if any(k in name_lower for k in ["rajyotsava"]):
        return "💛"
    if any(k in name_lower for k in ["ugadi", "gudi padwa", "new year"]):
        return "🌿"
    return "✨"


def _clean_ics_text(text: str) -> str:
    """Unescape ICS multi-line wrapping and escaped commas/semicolons."""
    # Remove ICS folding (line break followed by single whitespace)
    unfolded = re.sub(r"\r?\n[ \t]", "", text)
    # Unescape escaped characters
    unfolded = unfolded.replace(r"\,", ",").replace(r"\;", ";").replace(r"\n", " ").strip()
    return unfolded


async def fetch_google_calendar_indian_holidays(year: int) -> list[dict[str, Any]]:
    """
    Fetch and parse the live Google Calendar Indian Holidays public feed for a specific year.
    Returns structured list of holidays.
    """
    now = time.time()
    # Check cache
    if year in _HOLIDAYS_CACHE and (now - _CACHE_TIMESTAMP.get(year, 0)) < CACHE_TTL_SECONDS:
        return _HOLIDAYS_CACHE[year]

    logger.info("Fetching real-time Google Calendar Indian Holidays feed for year %d", year)

    try:
        if HAS_HTTPX:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(
                    GOOGLE_HOLIDAYS_ICS_URL,
                    headers={"User-Agent": "AgastyaClinic-AppointmentEngine/1.0"}
                )
                resp.raise_for_status()
                ics_content = resp.text
        else:
            req = urllib.request.Request(
                GOOGLE_HOLIDAYS_ICS_URL,
                headers={"User-Agent": "AgastyaClinic-AppointmentEngine/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                ics_content = resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        logger.warning("Failed to fetch live ICS from Google Calendar: %s. Using cached if available.", exc)
        if year in _HOLIDAYS_CACHE:
            return _HOLIDAYS_CACHE[year]
        return []

    # Parse VEVENT blocks
    vevents = re.findall(r"BEGIN:VEVENT.*?END:VEVENT", ics_content, re.DOTALL)
    holidays_by_year: dict[int, list[dict[str, Any]]] = {}

    for event_str in vevents:
        dtstart_match = re.search(r"DTSTART(?:;VALUE=DATE)?:(\d{8})", event_str)
        summary_match = re.search(r"SUMMARY:(.+?)(?:\r?\n[^\t ]|\r?\n\r?\n|$)", event_str, re.DOTALL)
        desc_match = re.search(r"DESCRIPTION:(.+?)(?:\r?\n[^\t ]|\r?\n\r?\n|$)", event_str, re.DOTALL)

        if not dtstart_match or not summary_match:
            continue

        raw_date = dtstart_match.group(1)
        event_year = int(raw_date[:4])
        event_month = int(raw_date[4:6])
        event_day = int(raw_date[6:8])
        ymd = f"{event_year:04d}-{event_month:02d}-{event_day:02d}"

        name = _clean_ics_text(summary_match.group(1))
        desc = _clean_ics_text(desc_match.group(1)) if desc_match else "Observance in India"

        # Determine type
        name_lower = name.lower()
        if any(k in name_lower for k in ["republic day", "independence day", "gandhi jayanti"]):
            hol_type = "national"
        elif "rajyotsava" in name_lower:
            hol_type = "state"
        else:
            hol_type = "festival"

        entry = {
            "date": ymd,
            "year": event_year,
            "month": event_month,
            "day": event_day,
            "name": name,
            "type": hol_type,
            "description": desc,
            "emoji": _map_emoji_for_holiday(name),
            "source": "google_calendar_feed",
            "calendar_id": GOOGLE_CALENDAR_ID,
        }

        holidays_by_year.setdefault(event_year, []).append(entry)

    # Sort each year's events chronologically and eliminate exact duplicates
    for yr, hols in holidays_by_year.items():
        # Deduplicate by (date, name)
        seen = set()
        deduped = []
        for h in sorted(hols, key=lambda x: (x["date"], x["name"])):
            key = (h["date"], h["name"])
            if key not in seen:
                seen.add(key)
                deduped.append(h)
        _HOLIDAYS_CACHE[yr] = deduped
        _CACHE_TIMESTAMP[yr] = now

    return _HOLIDAYS_CACHE.get(year, [])


def filter_holidays_by_month(holidays: list[dict[str, Any]], month_1_indexed: int) -> list[dict[str, Any]]:
    """Filter holidays for a specific month (1=Jan .. 12=Dec)."""
    return [h for h in holidays if h.get("month") == month_1_indexed]
