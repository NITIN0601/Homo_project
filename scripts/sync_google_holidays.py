#!/usr/bin/env python3
"""
Annual Indian Holidays & Festivals Sync Script
==============================================
Fetches public holidays directly from Google's public iCal servers
(Calendar ID: en.indian#holiday@group.v.calendar.google.com) and persists
them locally to backend/data/holidays_{year}.json.

Scheduled to run once a year (on 1st January) or on demand.

Usage:
    python scripts/sync_google_holidays.py --year 2026
    python scripts/sync_google_holidays.py --year 2027 --country indian
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# Try standard libraries
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    import urllib.request

try:
    from ics import Calendar
    HAS_ICS = True
except ImportError:
    HAS_ICS = False


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


def map_emoji_for_holiday(name: str) -> str:
    """Map contextual emoji based on Indian festival/holiday name dictionary."""
    name_lower = name.lower()
    for keyword, emoji in HOLIDAY_EMOJI_DICT.items():
        if keyword in name_lower:
            return emoji
    return "✨"


def clean_ics_text(text: str) -> str:
    """Unescape ICS multi-line wrapping and escaped commas/semicolons."""
    unfolded = re.sub(r"\r?\n[ \t]", "", text)
    unfolded = unfolded.replace(r"\,", ",").replace(r"\;", ";").replace(r"\n", " ").strip()
    return unfolded


def fetch_google_holidays(country_id: str = "indian", language_code: str = "en", year: int = 2026) -> list[dict]:
    """
    Fetches public holidays directly from Google's public iCal servers without API keys.
    """
    calendar_id = f"{language_code}.{country_id}#holiday@group.v.calendar.google.com"
    encoded_cal = f"{language_code}.{country_id}%23holiday%40group.v.calendar.google.com"
    ical_url = f"https://calendar.google.com/calendar/ical/{encoded_cal}/public/basic.ics"

    print(f"Connecting to Google Calendar public servers for '{country_id.upper()}' ({year})...")
    print(f"Calendar ID: {calendar_id}")
    print(f"URL: {ical_url}")

    ics_text = ""
    if HAS_REQUESTS:
        try:
            resp = requests.get(ical_url, timeout=10, headers={"User-Agent": "AgastyaClinic-SyncScript/1.0"})
            if resp.status_code != 200:
                print(f"Error: Google returned status code {resp.status_code}")
                return []
            ics_text = resp.text
        except Exception as e:
            print(f"Network error occurred via requests: {e}")
            return []
    else:
        try:
            req = urllib.request.Request(ical_url, headers={"User-Agent": "AgastyaClinic-SyncScript/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                ics_text = resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"Network error occurred via urllib: {e}")
            return []

    holidays_found = []

    # If ics package is available, use it; otherwise use our fast RFC 5545 parser
    if HAS_ICS:
        try:
            cal = Calendar(ics_text)
            for event in cal.events:
                event_date = event.begin.date()
                if event_date.year == year:
                    name = event.name or "Holiday"
                    name_lower = name.lower()
                    if any(k in name_lower for k in ["republic day", "independence day", "gandhi jayanti"]):
                        hol_type = "national"
                    elif "rajyotsava" in name_lower:
                        hol_type = "state"
                    else:
                        hol_type = "festival"

                    holidays_found.append({
                        "date": event_date.strftime("%Y-%m-%d"),
                        "year": event_date.year,
                        "month": event_date.month,
                        "day": event_date.day,
                        "name": name,
                        "type": hol_type,
                        "description": event.description or "Public Holiday",
                        "emoji": map_emoji_for_holiday(name),
                        "source": "google_calendar_feed",
                        "calendar_id": calendar_id,
                    })
        except Exception as e:
            print(f"Warning: ics library failed to parse ({e}), falling back to regex parser...")
            holidays_found = []

    if not holidays_found:
        vevents = re.findall(r"BEGIN:VEVENT.*?END:VEVENT", ics_text, re.DOTALL)
        for event_str in vevents:
            dtstart_match = re.search(r"DTSTART(?:;VALUE=DATE)?:(\d{8})", event_str)
            summary_match = re.search(r"SUMMARY:(.+?)(?:\r?\n[^\t ]|\r?\n\r?\n|$)", event_str, re.DOTALL)
            desc_match = re.search(r"DESCRIPTION:(.+?)(?:\r?\n[^\t ]|\r?\n\r?\n|$)", event_str, re.DOTALL)

            if not dtstart_match or not summary_match:
                continue

            raw_date = dtstart_match.group(1)
            event_year = int(raw_date[:4])
            if event_year != year:
                continue

            event_month = int(raw_date[4:6])
            event_day = int(raw_date[6:8])
            ymd = f"{event_year:04d}-{event_month:02d}-{event_day:02d}"

            name = clean_ics_text(summary_match.group(1))
            desc = clean_ics_text(desc_match.group(1)) if desc_match else "Observance in India"

            name_lower = name.lower()
            if any(k in name_lower for k in ["republic day", "independence day", "gandhi jayanti"]):
                hol_type = "national"
            elif "rajyotsava" in name_lower:
                hol_type = "state"
            else:
                hol_type = "festival"

            holidays_found.append({
                "date": ymd,
                "year": event_year,
                "month": event_month,
                "day": event_day,
                "name": name,
                "type": hol_type,
                "description": desc,
                "emoji": map_emoji_for_holiday(name),
                "source": "google_calendar_feed",
                "calendar_id": calendar_id,
            })

    # Deduplicate by (date, name) and sort chronologically
    seen = set()
    deduped = []
    for h in sorted(holidays_found, key=lambda x: (x["date"], x["name"])):
        key = (h["date"], h["name"])
        if key not in seen:
            seen.add(key)
            deduped.append(h)

    return deduped


def main():
    parser = argparse.ArgumentParser(description="Sync Indian public holidays from Google Calendar into local system.")
    parser.add_argument("--year", type=int, default=datetime.now().year, help="Year to sync (default: current year)")
    parser.add_argument("--country", type=str, default="indian", help="Country ID (default: 'indian')")
    parser.add_argument("--output-dir", type=str, default="backend/data", help="Output directory for JSON file")
    args = parser.parse_args()

    holidays = fetch_google_holidays(country_id=args.country, year=args.year)
    if not holidays:
        print(f"Warning: No holidays retrieved for {args.year}.")
        sys.exit(1)

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"holidays_{args.year}.json"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(holidays, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Successfully synced {len(holidays)} holidays for {args.year}!")
    print(f"✓ Saved to local system storage: {out_file.resolve()}\n")
    print(f"--- Top 10 Holidays in {args.year} ---")
    for h in holidays[:10]:
        print(f"{h['date']} | {h.get('emoji', '✨')} {h['name']} ({h['type']})")


if __name__ == "__main__":
    main()

