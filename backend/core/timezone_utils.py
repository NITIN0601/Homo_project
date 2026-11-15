"""
Unified Location-to-Timezone Resolution Utility.
Calculates and infers the operational IANA timezone based on facility/doctor location
(Country, State/Province, City), eliminating time entering confusion across multi-tenant clinics.
"""

from datetime import datetime
from typing import Any
import zoneinfo

COMMON_TIMEZONES: list[dict[str, str]] = [
    {"timeZone": "Asia/Kolkata", "label": "India Standard Time (IST, UTC+5:30)", "region": "India (Clinic SSOT)", "offset": "UTC+05:30"},
    {"timeZone": "America/New_York", "label": "US Eastern Time (EDT / EST)", "region": "United States (Eastern)", "offset": "UTC-05:00"},
    {"timeZone": "America/Chicago", "label": "US Central Time (CDT / CST)", "region": "United States (Central)", "offset": "UTC-06:00"},
    {"timeZone": "America/Denver", "label": "US Mountain Time (MDT / MST)", "region": "United States (Mountain)", "offset": "UTC-07:00"},
    {"timeZone": "America/Phoenix", "label": "US Arizona (MST, No DST)", "region": "United States (Arizona)", "offset": "UTC-07:00"},
    {"timeZone": "America/Los_Angeles", "label": "US Pacific Time (PDT / PST)", "region": "United States (Pacific)", "offset": "UTC-08:00"},
    {"timeZone": "Europe/London", "label": "UK / London (BST / GMT)", "region": "United Kingdom", "offset": "UTC+00:00"},
    {"timeZone": "Europe/Paris", "label": "Central European Time (CET / CEST)", "region": "Western Europe", "offset": "UTC+01:00"},
    {"timeZone": "Asia/Dubai", "label": "Gulf Standard Time (GST, UTC+4)", "region": "United Arab Emirates", "offset": "UTC+04:00"},
    {"timeZone": "Asia/Singapore", "label": "Singapore Time (SGT, UTC+8)", "region": "Singapore", "offset": "UTC+08:00"},
    {"timeZone": "Australia/Sydney", "label": "Sydney / Melbourne (AEST / AEDT)", "region": "Australia (Eastern)", "offset": "UTC+10:00"},
    {"timeZone": "Australia/Perth", "label": "Western Australia (AWST)", "region": "Australia (Western)", "offset": "UTC+08:00"},
    {"timeZone": "America/Toronto", "label": "Eastern Canada (EDT / EST)", "region": "Canada (Eastern)", "offset": "UTC-05:00"},
    {"timeZone": "America/Vancouver", "label": "Pacific Canada (PDT / PST)", "region": "Canada (Pacific)", "offset": "UTC-08:00"},
    {"timeZone": "Asia/Tokyo", "label": "Japan Standard Time (JST, UTC+9)", "region": "Japan", "offset": "UTC+09:00"},
    {"timeZone": "Pacific/Auckland", "label": "New Zealand Time (NZST / NZDT)", "region": "New Zealand", "offset": "UTC+12:00"},
]


def get_timezone_details(tz_name: str) -> dict[str, str]:
    """Computes offset and abbreviation for a given timezone."""
    try:
        tz = zoneinfo.ZoneInfo(tz_name)
        now = datetime.now(tz)
        offset_sec = now.utcoffset().total_seconds() if now.utcoffset() else 0
        sign = "+" if offset_sec >= 0 else "-"
        abs_sec = abs(int(offset_sec))
        hours = abs_sec // 3600
        minutes = (abs_sec % 3600) // 60
        offset_str = f"UTC{sign}{hours:02d}:{minutes:02d}"
        abbr = now.tzname() or tz_name
        return {
            "timeZone": tz_name,
            "label": abbr,
            "offset": offset_str,
            "formattedDescription": f"{tz_name} ({abbr}, {offset_str})",
        }
    except Exception:
        return {
            "timeZone": tz_name,
            "label": tz_name,
            "offset": "UTC+05:30",
            "formattedDescription": f"{tz_name} (UTC+05:30)",
        }


def infer_timezone_from_location(
    country: str | None = None,
    state: str | None = None,
    city: str | None = None,
) -> dict[str, Any]:
    """
    Infers the operational timezone from facility location coordinates.
    Returns timezone identifier, offset, abbreviation, and confidence rating.
    """
    c_clean = (country or "").strip().lower()
    s_clean = (state or "").strip().lower()
    city_clean = (city or "").strip().lower()

    def build_res(tz: str, confidence: str, matched_by: str, matched_loc: str) -> dict[str, Any]:
        details = get_timezone_details(tz)
        return {
            **details,
            "confidence": confidence,
            "matchedBy": matched_by,
            "matchedLocation": matched_loc,
        }

    # 1. City-Level Matching
    if city_clean:
        indian_cities = [
            "bengaluru", "bangalore", "mumbai", "bombay", "delhi", "new delhi", "chennai", "madras",
            "hyderabad", "secunderabad", "kolkata", "calcutta", "pune", "ahmedabad", "jaipur", "lucknow",
            "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam", "patna", "vadodara",
            "ghaziabad", "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi",
            "srinagar", "aurangabad", "dhanbad", "amritsar", "navi mumbai", "allahabad", "prayagraj",
            "ranchi", "howrah", "coimbatore", "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai",
            "raipur", "kota", "chandigarh", "guwahati", "solapur", "hubli", "dharwad", "mysore", "mysuru",
            "kochi", "cochin", "trivandrum", "thiruvananthapuram", "dehradun", "mangalore", "mangaluru",
            "belgaum", "belagavi", "noida", "gurgaon", "gurugram"
        ]
        if any(c in city_clean or city_clean in c for c in indian_cities):
            return build_res("Asia/Kolkata", "high", "city", city or "India")

        us_pacific_cities = [
            "los angeles", "san francisco", "san jose", "san diego", "sacramento", "seattle", "tacoma",
            "portland", "eugene", "las vegas", "reno", "oakland", "fresno", "long beach", "spokane"
        ]
        if any(c in city_clean or city_clean in c for c in us_pacific_cities):
            return build_res("America/Los_Angeles", "high", "city", city or "US Pacific")

        us_mountain_cities = [
            "denver", "boulder", "colorado springs", "salt lake city", "albuquerque", "santa fe",
            "boise", "cheyenne", "billings"
        ]
        if any(c in city_clean or city_clean in c for c in us_mountain_cities):
            return build_res("America/Denver", "high", "city", city or "US Mountain")

        us_arizona_cities = ["phoenix", "tucson", "mesa", "scottsdale", "chandler", "gilbert", "tempe", "flagstaff"]
        if any(c in city_clean or city_clean in c for c in us_arizona_cities):
            return build_res("America/Phoenix", "high", "city", city or "Arizona")

        us_central_cities = [
            "chicago", "dallas", "houston", "austin", "san antonio", "fort worth", "minneapolis",
            "st. paul", "saint louis", "st. louis", "kansas city", "milwaukee", "nashville", "memphis",
            "new orleans", "oklahoma city", "omaha", "des moines", "little rock"
        ]
        if any(c in city_clean or city_clean in c for c in us_central_cities):
            return build_res("America/Chicago", "high", "city", city or "US Central")

        us_eastern_cities = [
            "new york", "nyc", "brooklyn", "manhattan", "queens", "boston", "cambridge", "philadelphia",
            "pittsburgh", "washington", "baltimore", "atlanta", "miami", "orlando", "tampa", "charlotte",
            "raleigh", "richmond", "newark", "jersey city", "cleveland", "columbus", "cincinnati", "detroit",
            "jacksonville", "buffalo"
        ]
        if any(c in city_clean or city_clean in c for c in us_eastern_cities):
            return build_res("America/New_York", "high", "city", city or "US Eastern")

        uk_cities = [
            "london", "manchester", "birmingham", "leeds", "glasgow", "edinburgh", "liverpool",
            "bristol", "sheffield", "newcastle", "belfast", "cardiff", "oxford", "cambridge", "southampton"
        ]
        if any(c in city_clean or city_clean in c for c in uk_cities):
            return build_res("Europe/London", "high", "city", city or "UK")

        uae_cities = ["dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah", "doha", "riyadh", "jeddah", "muscat", "manama", "kuwait city"]
        if any(c in city_clean or city_clean in c for c in uae_cities):
            return build_res("Asia/Dubai", "high", "city", city or "Gulf")

        if "singapore" in city_clean:
            return build_res("Asia/Singapore", "high", "city", "Singapore")

        aus_sydney_cities = ["sydney", "melbourne", "brisbane", "canberra", "gold coast", "hobart"]
        if any(c in city_clean or city_clean in c for c in aus_sydney_cities):
            return build_res("Australia/Sydney", "high", "city", city or "Australia")
        if "perth" in city_clean:
            return build_res("Australia/Perth", "high", "city", "Perth, Australia")

        canada_east_cities = ["toronto", "ottawa", "montreal", "quebec", "mississauga", "hamilton"]
        if any(c in city_clean or city_clean in c for c in canada_east_cities):
            return build_res("America/Toronto", "high", "city", city or "Canada")
        canada_west_cities = ["vancouver", "victoria", "burnaby", "surrey", "richmond"]
        if any(c in city_clean or city_clean in c for c in canada_west_cities):
            return build_res("America/Vancouver", "high", "city", city or "Canada")

        europe_cities = ["paris", "berlin", "munich", "frankfurt", "amsterdam", "madrid", "barcelona", "rome", "milan", "zurich", "geneva", "brussels", "vienna"]
        if any(c in city_clean or city_clean in c for c in europe_cities):
            return build_res("Europe/Paris", "high", "city", city or "Europe")

    # 2. State-Level Matching
    if s_clean:
        indian_states = [
            "karnataka", "maharashtra", "delhi", "tamil nadu", "telangana", "andhra pradesh", "kerala",
            "gujarat", "west bengal", "uttar pradesh", "rajasthan", "punjab", "haryana", "bihar",
            "madhya pradesh", "odisha", "assam", "goa", "jammu", "kashmir", "himachal", "uttarakhand",
            "jharkhand", "chhattisgarh", "chandigarh", "puducherry"
        ]
        if any(s in s_clean or s_clean in s for s in indian_states):
            return build_res("Asia/Kolkata", "high", "state", state or "India")

        us_pacific_states = ["california", "washington", "oregon", "nevada", "ca", "wa", "or", "nv"]
        if any(s_clean == s or s in s_clean for s in us_pacific_states):
            return build_res("America/Los_Angeles", "high", "state", state or "US Pacific")

        us_mountain_states = ["colorado", "utah", "new mexico", "wyoming", "montana", "idaho", "co", "ut", "nm", "wy", "mt", "id"]
        if any(s_clean == s or s in s_clean for s in us_mountain_states):
            return build_res("America/Denver", "high", "state", state or "US Mountain")
        if s_clean == "az" or "arizona" in s_clean:
            return build_res("America/Phoenix", "high", "state", "Arizona")

        us_central_states = [
            "texas", "illinois", "minnesota", "missouri", "wisconsin", "iowa", "kansas", "nebraska",
            "oklahoma", "arkansas", "louisiana", "mississippi", "alabama", "tennessee",
            "tx", "il", "mn", "mo", "wi", "ia", "ks", "ne", "ok", "ar", "la", "ms", "al", "tn"
        ]
        if any(s_clean == s or s in s_clean for s in us_central_states):
            return build_res("America/Chicago", "high", "state", state or "US Central")

        us_eastern_states = [
            "new york", "florida", "georgia", "north carolina", "virginia", "massachusetts", "pennsylvania",
            "ohio", "michigan", "new jersey", "maryland", "south carolina", "connecticut", "indiana",
            "ny", "fl", "ga", "nc", "va", "ma", "pa", "oh", "mi", "nj", "md", "sc", "ct", "in"
        ]
        if any(s_clean == s or s in s_clean for s in us_eastern_states):
            return build_res("America/New_York", "high", "state", state or "US Eastern")

        if any(s in s_clean for s in ["england", "scotland", "wales", "northern ireland"]):
            return build_res("Europe/London", "high", "state", state or "UK")

        if any(s in s_clean for s in ["new south wales", "nsw", "victoria", "vic", "queensland", "qld"]):
            return build_res("Australia/Sydney", "high", "state", state or "Australia")
        if "western australia" in s_clean or s_clean == "wa":
            return build_res("Australia/Perth", "high", "state", "Western Australia")

    # 3. Country-Level Matching
    if c_clean:
        if c_clean in ["india", "bharat", "in"]:
            return build_res("Asia/Kolkata", "medium", "country", country or "India")
        if c_clean in ["united states", "usa", "us", "u.s.", "united states of america"]:
            return build_res("America/New_York", "medium", "country", country or "United States")
        if c_clean in ["united kingdom", "uk", "great britain", "gb", "britain"]:
            return build_res("Europe/London", "high", "country", country or "United Kingdom")
        if c_clean in ["united arab emirates", "uae", "ae", "qatar", "saudi arabia", "kuwait", "bahrain", "oman"]:
            return build_res("Asia/Dubai", "high", "country", country or "UAE / Gulf")
        if c_clean in ["singapore", "sg"]:
            return build_res("Asia/Singapore", "high", "country", "Singapore")
        if c_clean in ["australia", "au"]:
            return build_res("Australia/Sydney", "medium", "country", country or "Australia")
        if c_clean in ["canada", "ca"]:
            return build_res("America/Toronto", "medium", "country", country or "Canada")
        if c_clean in ["germany", "de", "deutschland"]:
            return build_res("Europe/Berlin", "high", "country", "Germany")
        if c_clean in ["france", "fr"]:
            return build_res("Europe/Paris", "high", "country", "France")
        if c_clean in ["japan", "jp"]:
            return build_res("Asia/Tokyo", "high", "country", "Japan")
        if c_clean in ["new zealand", "nz"]:
            return build_res("Pacific/Auckland", "high", "country", "New Zealand")

    # 4. Default Fallback
    return build_res("Asia/Kolkata", "fallback", "default", "Default IST")

