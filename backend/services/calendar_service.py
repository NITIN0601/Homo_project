"""
Dynamic Calendar & Indian Holidays Service
Integrates with Google Calendar Public Holidays in India feed:
en.indian#holiday@group.v.calendar.google.com

Persists holidays locally to backend/data/holidays_{year}.json so the system
fetches once per year (e.g. on 1st Jan) and serves instantly from disk storage.
"""

import json
import logging
import os
from pathlib import Path
import re
import time
from typing import Any

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import urllib.request

try:
    import requests
    from ics import Calendar as IcsCalendar
    HAS_ICS_LIB = True
except ImportError:
    HAS_ICS_LIB = False

logger = logging.getLogger("calendar_service")

# Google Calendar Public Feed for Holidays in India
GOOGLE_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com"
GOOGLE_HOLIDAYS_ICS_URL = (
    "https://calendar.google.com/calendar/ical/"
    "en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics"
)

# Persistent storage directory
DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# In-memory cache for fast lookups
_HOLIDAYS_CACHE: dict[int, list[dict[str, Any]]] = {}
_CACHE_TIMESTAMP: dict[int, float] = {}
CACHE_TTL_SECONDS = 86400  # 24 hours


def get_holiday_file_path(year: int) -> Path:
    """Return persistent local JSON file path for a given year."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR / f"holidays_{year}.json"


def load_holidays_from_disk(year: int) -> list[dict[str, Any]] | None:
    """Load cached holidays for a year from local disk storage."""
    file_path = get_holiday_file_path(year)
    if file_path.is_file():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    logger.debug("Loaded %d holidays from disk: %s", len(data), file_path)
                    return data
        except Exception as err:
            logger.warning("Failed to read holidays from %s: %s", file_path, err)
    return None


def save_holidays_to_disk(year: int, holidays: list[dict[str, Any]]) -> None:
    """Persist structured holidays for a year to local disk storage."""
    file_path = get_holiday_file_path(year)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(holidays, f, indent=2, ensure_ascii=False)
        logger.info("Successfully persisted %d holidays to disk: %s", len(holidays), file_path)
    except Exception as err:
        logger.warning("Failed to write holidays to %s: %s", file_path, err)


# ─── Standardized Cultural Emoji Dictionary for Indian Festivals & Holidays ───
HOLIDAY_EMOJI_DICT: dict[str, str] = {
    # Harvest & Winter
    "bhogi": "🔥",
    "lohri": "🔥",
    "makar sankranti": "🪁",
    "pongal": "🪁",
    "sankranti": "🪁",
    "vasant panchami": "🛐",
    "basant panchami": "🛐",

    # National & Gazetted
    "republic day": "🇮🇳",
    "independence day": "🇮🇳",
    "gandhi jayanti": "🕊️",
    "ambedkar": "📜",

    # Hindu Festivals & Observances
    "maha shivaratri": "🥛",
    "shivaratri": "🥛",
    "holika dahan": "🔥",
    "chhoti holi": "🔥",
    "holi": "🎨",
    "ugadi": "🌿",
    "gudi padwa": "🌿",
    "rama navami": "👑",
    "ram navami": "👑",
    "buddha purnima": "🪷",
    "jagannath": "🛕",
    "ratha yatra": "🛕",
    "raksha bandhan": "👫",
    "rakhi": "👫",
    "krishna janmashtami": "👑",
    "janmashtami": "👑",
    "ganesh chaturthi": "🐘",
    "vinayaka": "🐘",
    "maha navami": "🔱",
    "durga puja": "🔱",
    "dussehra": "🏹",
    "dasara": "🏹",
    "vijayadashami": "🏹",
    "karwa chauth": "🌕",
    "naraka chaturdashi": "🪔",
    "diwali": "🪔",
    "deepavali": "🪔",
    "govardhan": "👫",
    "bhai dooj": "👫",
    "chhath puja": "☀️",
    "chhath": "☀️",

    # Islamic Holidays
    "eid al-fitr": "🌙",
    "ramadan": "🌙",
    "eid al-adha": "🐑",
    "bakrid": "🐑",
    "muharram": "🛐",
    "ashura": "🛐",
    "milad un-nabi": "🕌",
    "id-e-milad": "🕌",

    # Christian Holidays
    "good friday": "✝️",
    "easter": "🥚",
    "christmas": "🎄",

    # Sikh Holidays
    "guru nanak": "🪯",

    # State Holidays
    "rajyotsava": "💛",
}


def _map_emoji_for_holiday(name: str) -> str:
    """Map contextual emoji based on Indian festival/holiday name dictionary."""
    name_lower = name.lower()
    for keyword, emoji in HOLIDAY_EMOJI_DICT.items():
        if keyword in name_lower:
            return emoji
    return "✨"


def _clean_ics_text(text: str) -> str:
    """Unescape ICS multi-line wrapping and escaped commas/semicolons."""
    unfolded = re.sub(r"\r?\n[ \t]", "", text)
    unfolded = unfolded.replace(r"\,", ",").replace(r"\;", ";").replace(r"\n", " ").strip()
    return unfolded


async def fetch_google_calendar_indian_holidays(year: int, force_refresh: bool = False) -> list[dict[str, Any]]:
    """
    Fetch and parse Indian Holidays feed for a specific year.
    1. Reads from local persistent disk storage (holidays_{year}.json) if present.
    2. If missing or force_refresh is requested (e.g. 1st Jan yearly sync),
       fetches live from Google Calendar public iCal feed, parses, and saves to disk.
    """
    now = time.time()

    # Step 1: Return from memory cache if active and not forced
    if not force_refresh and year in _HOLIDAYS_CACHE and (now - _CACHE_TIMESTAMP.get(year, 0)) < CACHE_TTL_SECONDS:
        return _HOLIDAYS_CACHE[year]

    # Step 2: Try loading persistent JSON from disk (avoids network completely)
    if not force_refresh:
        disk_holidays = load_holidays_from_disk(year)
        if disk_holidays:
            _HOLIDAYS_CACHE[year] = disk_holidays
            _CACHE_TIMESTAMP[year] = now
            return disk_holidays

    logger.info("Fetching Google Calendar Indian Holidays feed for year %d (force_refresh=%s)", year, force_refresh)

    ics_content = ""
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
        logger.warning("Failed to fetch live ICS from Google Calendar: %s. Using disk or cached if available.", exc)
        disk_holidays = load_holidays_from_disk(year)
        if disk_holidays:
            _HOLIDAYS_CACHE[year] = disk_holidays
            _CACHE_TIMESTAMP[year] = now
            return disk_holidays
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

    # Sort each year's events chronologically, eliminate duplicates, and save to disk
    for yr, hols in holidays_by_year.items():
        seen = set()
        deduped = []
        for h in sorted(hols, key=lambda x: (x["date"], x["name"])):
            key = (h["date"], h["name"])
            if key not in seen:
                seen.add(key)
                deduped.append(h)
        _HOLIDAYS_CACHE[yr] = deduped
        _CACHE_TIMESTAMP[yr] = now
        # Persist to local JSON file
        save_holidays_to_disk(yr, deduped)

    return _HOLIDAYS_CACHE.get(year, [])


def filter_holidays_by_month(holidays: list[dict[str, Any]], month_1_indexed: int) -> list[dict[str, Any]]:
    """Filter holidays for a specific month (1=Jan .. 12=Dec)."""
    return [h for h in holidays if h.get("month") == month_1_indexed]


def filter_holidays_by_month(holidays: list[dict[str, Any]], month_1_indexed: int) -> list[dict[str, Any]]:
    """Filter holidays for a specific month (1=Jan .. 12=Dec)."""
    return [h for h in holidays if h.get("month") == month_1_indexed]
