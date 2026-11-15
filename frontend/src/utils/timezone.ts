/**
 * ─── Clinic Operational Timezone & Global User Localization Utility ──────────
 * Single Source of Truth for clinic timezone (Asia/Kolkata / IST UTC+5:30),
 * real-time elapsed time slot detection, double-booking conflict prevention,
 * and dynamic mapping to the patient's local timezone (USA, UK, UAE, etc.).
 */

import { CLINIC, OFFICE_HOURS, ALL_TIME_SLOTS } from "../config/clinic";

export interface ClinicTimeInfo {
  /** ISO date in clinic timezone: "YYYY-MM-DD" */
  todayYMD: string;
  /** Current hour (0-23) in clinic timezone */
  currentHour: number;
  /** Current minute (0-59) in clinic timezone */
  currentMinute: number;
  /** Total elapsed minutes from midnight (hour * 60 + minute) */
  currentTotalMinutes: number;
  /** Human-readable time e.g. "6:15 PM IST" */
  formattedTime: string;
  /** Human-readable date e.g. "Friday, Oct 2, 2026" */
  formattedDate: string;
  /** Timezone identifier e.g. "Asia/Kolkata" */
  timeZone: string;
  /** Abbreviation label e.g. "IST" */
  label: string;
}

/**
 * Returns current date and time strictly in the clinic's operational timezone (Asia/Kolkata / IST).
 * Immune to the patient's device clock or geographical location.
 */
export function getClinicTimeInfo(): ClinicTimeInfo {
  const timeZone = CLINIC.TIMEZONE || "Asia/Kolkata";
  const now = new Date();

  // Extract date and time parts formatted for Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = getVal("year");
  const month = getVal("month");
  const day = getVal("day");
  const hour = parseInt(getVal("hour"), 10) || 0;
  const minute = parseInt(getVal("minute"), 10) || 0;

  const todayYMD = `${year}-${month}-${day}`;
  const currentTotalMinutes = hour * 60 + minute;

  const displayTimeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const formattedTime = `${displayTimeFormatter.format(now)} IST`;

  const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedDate = displayDateFormatter.format(now);

  return {
    todayYMD,
    currentHour: hour,
    currentMinute: minute,
    currentTotalMinutes,
    formattedTime,
    formattedDate,
    timeZone,
    label: "IST",
  };
}

/**
 * Converts a 24-hr slot string ("18:00") to 12-hr display ("06:00 PM")
 */
export function normalizeSlotToTime(slot24: string): string {
  if (!slot24) return "";
  const [hStr, mStr] = slot24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

/**
 * Converts any time string (e.g. "10:00 AM", "02:30 PM", "14:30") to 24-hr slot ("14:30")
 */
export function normalizeTimeToSlot(timeStr: string): string {
  if (!timeStr) return "";
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");
  const numbers = clean.replace(/[^0-9:]/g, "");
  const [hStr, mStr] = numbers.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/**
 * Checks whether a given slot on a given date has already elapsed in clinic timezone (IST).
 * @param dateYMD "YYYY-MM-DD" or "Today"
 * @param slot24 "HH:mm" (e.g. "18:00")
 */
export function isSlotPassed(dateYMD: string, slot24: string): boolean {
  if (!dateYMD || !slot24) return false;
  const clinicTime = getClinicTimeInfo();

  // Normalize "Today" alias to actual YMD in clinic timezone
  const targetDateYMD = dateYMD.toLowerCase() === "today" ? clinicTime.todayYMD : dateYMD;

  // Past dates: all slots have elapsed
  if (targetDateYMD < clinicTime.todayYMD) {
    return true;
  }

  // Future dates: slots have not elapsed
  if (targetDateYMD > clinicTime.todayYMD) {
    return false;
  }

  // If the date is TODAY in clinic time:
  const [slotH, slotM] = slot24.split(":").map(Number);
  const slotTotalMinutes = slotH * 60 + slotM;

  // If current clinic time is at or beyond slot start time, slot is closed
  return clinicTime.currentTotalMinutes >= slotTotalMinutes;
}

/**
 * Normalizes aliases like "Today" and "Tomorrow" to "YYYY-MM-DD" in clinic operational timezone.
 */
export function normalizeDateAlias(dateStr: string): string {
  if (!dateStr) return "";
  const lower = dateStr.trim().toLowerCase();
  const clinic = getClinicTimeInfo();
  if (lower === "today") return clinic.todayYMD;
  if (lower === "tomorrow") {
    const [y, m, d] = clinic.todayYMD.split("-").map(Number);
    const tom = new Date(y, m - 1, d + 1);
    return `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, "0")}-${String(tom.getDate()).padStart(2, "0")}`;
  }
  return dateStr;
}

/**
 * Checks if a given YMD string is in the past relative to the clinic's operational timezone.
 */
export function isDatePastClinicTime(dateYMD: string): boolean {
  if (!dateYMD) return false;
  const clinicTime = getClinicTimeInfo();
  const normalized = normalizeDateAlias(dateYMD);
  return normalized < clinicTime.todayYMD;
}

// ─── Timezone Selection & Global Localization ─────────────────────────────────

export interface TimezoneOption {
  timeZone: string;
  label: string;
  region: string;
  offset?: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { timeZone: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)", region: "India (Clinic SSOT)", offset: "UTC+05:30" },
  { timeZone: "America/New_York", label: "US Eastern Time (EDT / EST)", region: "United States (Eastern)", offset: "UTC-05:00" },
  { timeZone: "America/Chicago", label: "US Central Time (CDT / CST)", region: "United States (Central)", offset: "UTC-06:00" },
  { timeZone: "America/Denver", label: "US Mountain Time (MDT / MST)", region: "United States (Mountain)", offset: "UTC-07:00" },
  { timeZone: "America/Phoenix", label: "US Arizona (MST, No DST)", region: "United States (Arizona)", offset: "UTC-07:00" },
  { timeZone: "America/Los_Angeles", label: "US Pacific Time (PDT / PST)", region: "United States (Pacific)", offset: "UTC-08:00" },
  { timeZone: "Europe/London", label: "UK / London (BST / GMT)", region: "United Kingdom", offset: "UTC+00:00" },
  { timeZone: "Europe/Paris", label: "Central European Time (CET / CEST)", region: "Western Europe", offset: "UTC+01:00" },
  { timeZone: "Asia/Dubai", label: "Gulf Standard Time (GST, UTC+4)", region: "United Arab Emirates", offset: "UTC+04:00" },
  { timeZone: "Asia/Singapore", label: "Singapore Time (SGT, UTC+8)", region: "Singapore", offset: "UTC+08:00" },
  { timeZone: "Australia/Sydney", label: "Sydney / Melbourne (AEST / AEDT)", region: "Australia (Eastern)", offset: "UTC+10:00" },
  { timeZone: "Australia/Perth", label: "Western Australia (AWST)", region: "Australia (Western)", offset: "UTC+08:00" },
  { timeZone: "America/Toronto", label: "Eastern Canada (EDT / EST)", region: "Canada (Eastern)", offset: "UTC-05:00" },
  { timeZone: "America/Vancouver", label: "Pacific Canada (PDT / PST)", region: "Canada (Pacific)", offset: "UTC-08:00" },
  { timeZone: "Asia/Tokyo", label: "Japan Standard Time (JST, UTC+9)", region: "Japan", offset: "UTC+09:00" },
  { timeZone: "Pacific/Auckland", label: "New Zealand Time (NZST / NZDT)", region: "New Zealand", offset: "UTC+12:00" },
];

/**
 * Returns formatted UTC offset string (e.g. "UTC+05:30", "UTC-04:00") for any IANA timezone.
 */
export function getTimezoneOffsetString(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value || "";
    // e.g. "GMT+05:30" -> "UTC+05:30"
    if (offsetPart.startsWith("GMT")) {
      return offsetPart.replace("GMT", "UTC");
    }
    return offsetPart || "UTC";
  } catch {
    return "UTC";
  }
}

const CANONICAL_TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "America/New_York": "EST/EDT",
  "America/Chicago": "CST/CDT",
  "America/Denver": "MST/MDT",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PST/PDT",
  "Europe/London": "GMT/BST",
  "Europe/Paris": "CET/CEST",
  "Europe/Berlin": "CET/CEST",
  "Asia/Dubai": "GST",
  "Asia/Singapore": "SGT",
  "Australia/Sydney": "AEST/AEDT",
  "Australia/Perth": "AWST",
  "America/Toronto": "EST/EDT",
  "America/Vancouver": "PST/PDT",
  "Asia/Tokyo": "JST",
  "Pacific/Auckland": "NZST/NZDT",
};

/**
 * Returns human-readable abbreviation (e.g. "IST", "EST/EDT", "BST") for an IANA timezone.
 */
export function getTimezoneAbbreviation(timeZone: string): string {
  if (CANONICAL_TIMEZONE_ABBREVIATIONS[timeZone]) {
    return CANONICAL_TIMEZONE_ABBREVIATIONS[timeZone];
  }
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

export interface DetectedLocationTimezone {
  timeZone: string;
  label: string;
  offset: string;
  formattedDescription: string;
  confidence: "high" | "medium" | "fallback";
  matchedBy: "city" | "state" | "country" | "browser" | "default";
  matchedLocation: string;
}

/**
 * Calculates / infers the operational timezone based on facility or doctor location
 * (Country, State/Province, City). Eliminates confusion during hospital and doctor onboarding.
 */
export function inferTimezoneFromLocation(
  country?: string,
  state?: string,
  city?: string
): DetectedLocationTimezone {
  const cClean = (country || "").trim().toLowerCase();
  const sClean = (state || "").trim().toLowerCase();
  const cityClean = (city || "").trim().toLowerCase();

  // Helper to build result
  const buildResult = (
    tz: string,
    confidence: "high" | "medium" | "fallback",
    matchedBy: "city" | "state" | "country" | "browser" | "default",
    matchedLocation: string
  ): DetectedLocationTimezone => {
    const offset = getTimezoneOffsetString(tz);
    const abbr = getTimezoneAbbreviation(tz);
    return {
      timeZone: tz,
      label: abbr,
      offset,
      formattedDescription: `${tz} (${abbr}, ${offset})`,
      confidence,
      matchedBy,
      matchedLocation,
    };
  };

  // ── 1. City-Level Matching (Highest Precision) ───────────────────────────
  if (cityClean) {
    // Indian cities
    const indianCities = [
      "bengaluru", "bangalore", "mumbai", "bombay", "delhi", "new delhi", "chennai", "madras",
      "hyderabad", "secunderabad", "kolkata", "calcutta", "pune", "ahmedabad", "jaipur", "lucknow",
      "kanpur", "nagpur", "indore", "thane", "bhopal", "visakhapatnam", "patna", "vadodara",
      "ghaziabad", "ludhiana", "agra", "nashik", "faridabad", "meerut", "rajkot", "varanasi",
      "srinagar", "aurangabad", "dhanbad", "amritsar", "navi mumbai", "allahabad", "prayagraj",
      "ranchi", "howrah", "coimbatore", "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai",
      "raipur", "kota", "chandigarh", "guwahati", "solapur", "hubli", "dharwad", "mysore", "mysuru",
      "kochi", "cochin", "trivandrum", "thiruvananthapuram", "dehradun", "mangalore", "mangaluru",
      "belgaum", "belagavi", "noida", "gurgaon", "gurugram"
    ];
    if (indianCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Asia/Kolkata", "high", "city", city?.trim() || "India");
    }

    // US Pacific
    const usPacificCities = [
      "los angeles", "san francisco", "san jose", "san diego", "sacramento", "seattle", "tacoma",
      "portland", "eugene", "las vegas", "reno", "oakland", "fresno", "long beach", "spokane"
    ];
    if (usPacificCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Los_Angeles", "high", "city", city?.trim() || "US Pacific");
    }

    // US Mountain
    const usMountainCities = [
      "denver", "boulder", "colorado springs", "salt lake city", "albuquerque", "santa fe",
      "boise", "cheyenne", "billings"
    ];
    if (usMountainCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Denver", "high", "city", city?.trim() || "US Mountain");
    }

    // US Arizona
    const usArizonaCities = ["phoenix", "tucson", "mesa", "scottsdale", "chandler", "gilbert", "tempe", "flagstaff"];
    if (usArizonaCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Phoenix", "high", "city", city?.trim() || "Arizona");
    }

    // US Central
    const usCentralCities = [
      "chicago", "dallas", "houston", "austin", "san antonio", "fort worth", "minneapolis",
      "st. paul", "saint louis", "st. louis", "kansas city", "milwaukee", "nashville", "memphis",
      "new orleans", "oklahoma city", "omaha", "des moines", "little rock"
    ];
    if (usCentralCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Chicago", "high", "city", city?.trim() || "US Central");
    }

    // US Eastern
    const usEasternCities = [
      "new york", "nyc", "brooklyn", "manhattan", "queens", "boston", "cambridge", "philadelphia",
      "pittsburgh", "washington", "baltimore", "atlanta", "miami", "orlando", "tampa", "charlotte",
      "raleigh", "richmond", "newark", "jersey city", "cleveland", "columbus", "cincinnati", "detroit",
      "jacksonville", "buffalo"
    ];
    if (usEasternCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/New_York", "high", "city", city?.trim() || "US Eastern");
    }

    // UK
    const ukCities = [
      "london", "manchester", "birmingham", "leeds", "glasgow", "edinburgh", "liverpool",
      "bristol", "sheffield", "newcastle", "belfast", "cardiff", "oxford", "cambridge", "southampton"
    ];
    if (ukCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Europe/London", "high", "city", city?.trim() || "UK");
    }

    // UAE / Middle East
    const uaeCities = ["dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah", "doha", "riyadh", "jeddah", "muscat", "manama", "kuwait city"];
    if (uaeCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Asia/Dubai", "high", "city", city?.trim() || "Gulf");
    }

    // Singapore
    if (cityClean.includes("singapore")) {
      return buildResult("Asia/Singapore", "high", "city", "Singapore");
    }

    // Australia
    const ausSydneyCities = ["sydney", "melbourne", "brisbane", "canberra", "gold coast", "hobart"];
    if (ausSydneyCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Australia/Sydney", "high", "city", city?.trim() || "Australia");
    }
    if (cityClean.includes("perth")) {
      return buildResult("Australia/Perth", "high", "city", "Perth, Australia");
    }

    // Canada
    const canadaEastCities = ["toronto", "ottawa", "montreal", "quebec", "mississauga", "hamilton"];
    if (canadaEastCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Toronto", "high", "city", city?.trim() || "Canada");
    }
    const canadaWestCities = ["vancouver", "victoria", "burnaby", "surrey", "richmond"];
    if (canadaWestCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Vancouver", "high", "city", city?.trim() || "Canada");
    }

    // Western Europe
    const europeCities = ["paris", "berlin", "munich", "frankfurt", "amsterdam", "madrid", "barcelona", "rome", "milan", "zurich", "geneva", "brussels", "vienna"];
    if (europeCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Europe/Paris", "high", "city", city?.trim() || "Europe");
    }
  }

  // ── 2. State / Province-Level Matching ──────────────────────────────────
  if (sClean) {
    const indianStates = [
      "karnataka", "maharashtra", "delhi", "tamil nadu", "telangana", "andhra pradesh", "kerala",
      "gujarat", "west bengal", "uttar pradesh", "rajasthan", "punjab", "haryana", "bihar",
      "madhya pradesh", "odisha", "assam", "goa", "jammu", "kashmir", "himachal", "uttarakhand",
      "jharkhand", "chhattisgarh", "chandigarh", "puducherry"
    ];
    if (indianStates.some((s) => sClean.includes(s) || s.includes(sClean))) {
      return buildResult("Asia/Kolkata", "high", "state", state?.trim() || "India");
    }

    // US Pacific States
    const usPacificStates = ["california", "washington", "oregon", "nevada", "ca", "wa", "or", "nv"];
    if (usPacificStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Los_Angeles", "high", "state", state?.trim() || "US Pacific");
    }

    // US Mountain States
    const usMountainStates = ["colorado", "utah", "new mexico", "wyoming", "montana", "idaho", "co", "ut", "nm", "wy", "mt", "id"];
    if (usMountainStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Denver", "high", "state", state?.trim() || "US Mountain");
    }
    if (sClean === "az" || sClean.includes("arizona")) {
      return buildResult("America/Phoenix", "high", "state", "Arizona");
    }

    // US Central States
    const usCentralStates = [
      "texas", "illinois", "minnesota", "missouri", "wisconsin", "iowa", "kansas", "nebraska",
      "oklahoma", "arkansas", "louisiana", "mississippi", "alabama", "tennessee",
      "tx", "il", "mn", "mo", "wi", "ia", "ks", "ne", "ok", "ar", "la", "ms", "al", "tn"
    ];
    if (usCentralStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Chicago", "high", "state", state?.trim() || "US Central");
    }

    // US Eastern States
    const usEasternStates = [
      "new york", "florida", "georgia", "north carolina", "virginia", "massachusetts", "pennsylvania",
      "ohio", "michigan", "new jersey", "maryland", "south carolina", "connecticut", "indiana",
      "ny", "fl", "ga", "nc", "va", "ma", "pa", "oh", "mi", "nj", "md", "sc", "ct", "in"
    ];
    if (usEasternStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/New_York", "high", "state", state?.trim() || "US Eastern");
    }

    // UK
    if (["england", "scotland", "wales", "northern ireland"].some((s) => sClean.includes(s))) {
      return buildResult("Europe/London", "high", "state", state?.trim() || "UK");
    }

    // Australia
    if (["new south wales", "nsw", "victoria", "vic", "queensland", "qld"].some((s) => sClean.includes(s))) {
      return buildResult("Australia/Sydney", "high", "state", state?.trim() || "Australia");
    }
    if (sClean.includes("western australia") || sClean === "wa") {
      return buildResult("Australia/Perth", "high", "state", "Western Australia");
    }
  }

  // ── 3. Country-Level Matching ───────────────────────────────────────────
  if (cClean) {
    if (["india", "bharat", "in"].includes(cClean)) {
      return buildResult("Asia/Kolkata", "medium", "country", country?.trim() || "India");
    }
    if (["united states", "usa", "us", "u.s.", "united states of america"].includes(cClean)) {
      return buildResult("America/New_York", "medium", "country", country?.trim() || "United States");
    }
    if (["united kingdom", "uk", "great britain", "gb", "britain"].includes(cClean)) {
      return buildResult("Europe/London", "high", "country", country?.trim() || "United Kingdom");
    }
    if (["united arab emirates", "uae", "ae", "qatar", "saudi arabia", "kuwait", "bahrain", "oman"].includes(cClean)) {
      return buildResult("Asia/Dubai", "high", "country", country?.trim() || "UAE / Gulf");
    }
    if (["singapore", "sg"].includes(cClean)) {
      return buildResult("Asia/Singapore", "high", "country", "Singapore");
    }
    if (["australia", "au"].includes(cClean)) {
      return buildResult("Australia/Sydney", "medium", "country", country?.trim() || "Australia");
    }
    if (["canada", "ca"].includes(cClean)) {
      return buildResult("America/Toronto", "medium", "country", country?.trim() || "Canada");
    }
    if (["germany", "de", "deutschland"].includes(cClean)) {
      return buildResult("Europe/Berlin", "high", "country", "Germany");
    }
    if (["france", "fr"].includes(cClean)) {
      return buildResult("Europe/Paris", "high", "country", "France");
    }
    if (["japan", "jp"].includes(cClean)) {
      return buildResult("Asia/Tokyo", "high", "country", "Japan");
    }
    if (["new zealand", "nz"].includes(cClean)) {
      return buildResult("Pacific/Auckland", "high", "country", "New Zealand");
    }
  }

  // ── 4. Fallback to Browser or Clinic Default (Asia/Kolkata) ─────────────
  try {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz) {
      return buildResult(browserTz, "fallback", "browser", "Browser Environment");
    }
  } catch {
    // Ignore and fallback
  }

  return buildResult("Asia/Kolkata", "fallback", "default", "Default IST");
}

export interface UserTimezoneInfo {
  timeZone: string;
  label: string;
  formattedTime: string;
  formattedDate: string;
  todayYMD: string;
  offset: string;
  regionName: string;
  isClinicTimezone: boolean;
}

/**
 * Returns detected local timezone information from the patient's browser environment,
 * or from a user-selected timezone override.
 */
export function getUserTimezone(customTz?: string): UserTimezoneInfo {
  const clinicTz: string = CLINIC.TIMEZONE || "Asia/Kolkata";
  let timeZone = customTz;
  if (!timeZone) {
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || clinicTz;
    } catch {
      timeZone = clinicTz;
    }
  }

  const now = new Date();
  let label = "";
  let formattedTime = "";
  let formattedDate = "";
  let todayYMD = "";
  let offset = "";

  try {
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    formattedTime = timeFormatter.format(now);
    const parts = timeFormatter.formatToParts(now);
    label = parts.find((p) => p.type === "timeZoneName")?.value || "";

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    formattedDate = dateFormatter.format(now);

    const ymdFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const ymdParts = ymdFormatter.formatToParts(now);
    const getP = (t: string) => ymdParts.find((p) => p.type === t)?.value || "";
    todayYMD = `${getP("year")}-${getP("month")}-${getP("day")}`;

    const offsetFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const offParts = offsetFormatter.formatToParts(now);
    offset = offParts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    formattedTime = now.toLocaleTimeString();
    formattedDate = now.toLocaleDateString();
    todayYMD = now.toISOString().slice(0, 10);
  }

  const common = COMMON_TIMEZONES.find((c) => c.timeZone === timeZone);
  const regionName = common ? common.label : timeZone.replace(/_/g, " ");
  const isClinicTimezone = timeZone === clinicTz || timeZone === "Asia/Calcutta" || timeZone === "Asia/Kolkata";

  return {
    timeZone,
    label: isClinicTimezone ? "IST" : (label || timeZone),
    formattedTime,
    formattedDate,
    todayYMD,
    offset,
    regionName,
    isClinicTimezone,
  };
}

export type TimeOfDayPeriod =
  | "Early Morning"
  | "Morning"
  | "Afternoon"
  | "Evening"
  | "Late Evening"
  | "Night"
  | "Late Night";

/**
 * Categorizes a 24-hour time into the 7 user-requested diurnal periods:
 * - 00:00 – 03:59: Late Night (e.g. 12:30 AM EDT)
 * - 04:00 – 06:59: Early Morning (e.g. 5:00 AM PDT)
 * - 07:00 – 11:59: Morning (e.g. 8:00 AM EDT, 10:00 AM IST)
 * - 12:00 – 15:59: Afternoon (e.g. 1:00 PM BST)
 * - 16:00 – 19:29: Evening (e.g. 5:30 PM IST)
 * - 19:30 – 21:59: Late Evening (e.g. 8:30 PM)
 * - 22:00 – 23:59: Night (e.g. 10:00 PM)
 */
export function getTimeOfDayPeriod(hour24: number, minutes = 0): TimeOfDayPeriod {
  const decimalHour = hour24 + minutes / 60;
  if (decimalHour >= 0 && decimalHour < 4) {
    return "Late Night";
  }
  if (decimalHour >= 4 && decimalHour < 7) {
    return "Early Morning";
  }
  if (decimalHour >= 7 && decimalHour < 12) {
    return "Morning";
  }
  if (decimalHour >= 12 && decimalHour < 16) {
    return "Afternoon";
  }
  if (decimalHour >= 16 && decimalHour < 19.5) {
    return "Evening";
  }
  if (decimalHour >= 19.5 && decimalHour < 22) {
    return "Late Evening";
  }
  return "Night";
}

export function getTimeOfDayEmoji(period: TimeOfDayPeriod): string {
  switch (period) {
    case "Early Morning": return "🌅";
    case "Morning":       return "☀️";
    case "Afternoon":     return "🌤️";
    case "Evening":       return "🌆";
    case "Late Evening":  return "🌇";
    case "Night":         return "🌙";
    case "Late Night":    return "🌌";
  }
}

export interface SlotTimeMapping {
  slot24: string;           // "17:30"
  clinicTime12: string;     // "05:30 PM IST"
  clinicDateFormatted: string; // "Friday, Oct 2, 2026"
  userTime12: string;       // "08:00 AM EDT"
  userShortLabel: string;   // "8:00 AM"
  userDateFormatted: string; // "Friday, Oct 2, 2026"
  userDayOffsetDesc: "Same Day" | "Day Before" | "Day After";
  isDifferentDay: boolean;
  userTimeZone: string;
  isDifferentTimezone: boolean;
  fullComparison: string;   // "08:00 AM EDT (05:30 PM IST)"
  userDateWithTime: string; // "Fri, Oct 2 · 8:00 AM EDT"
  userHour24: number;
  userMinute: number;
  timeOfDayPeriod: TimeOfDayPeriod;
  timeOfDayEmoji: string;
}

/**
 * Maps a clinic time slot (Asia/Kolkata) to the patient's local timezone.
 * Allows patients abroad (e.g. USA, UK, UAE) to see consultation times in their local clock
 * while anchoring firmly to the IST Single Source of Truth.
 */
export function mapClinicSlotToUserTime(
  dateYMD: string,
  slot24: string,
  userTz?: string
): SlotTimeMapping {
  const clinicTz = CLINIC.TIMEZONE || "Asia/Kolkata";
  const clinicTime12 = normalizeSlotToTime(slot24) + " IST";
  const normalizedYMD = normalizeDateAlias(dateYMD || "today");

  let targetTz = userTz;
  if (!targetTz) {
    try {
      targetTz = Intl.DateTimeFormat().resolvedOptions().timeZone || clinicTz;
    } catch {
      targetTz = clinicTz;
    }
  }

  const isDifferentTimezone = targetTz !== clinicTz && targetTz !== "Asia/Calcutta";

  // Parse exact clinic timestamp with +05:30 fixed offset
  const [hStr, mStr] = slot24.split(":");
  const clinicH = parseInt(hStr || "0", 10);
  const clinicM = parseInt(mStr || "0", 10);
  const isoClinicString = `${normalizedYMD}T${(hStr || "00").padStart(2, "0")}:${(mStr || "00").padStart(2, "0")}:00+05:30`;
  const dateObj = new Date(isoClinicString);

  // Clinic date formatted
  let clinicDateFormatted = normalizedYMD;
  try {
    const cdf = new Intl.DateTimeFormat("en-US", {
      timeZone: clinicTz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    clinicDateFormatted = cdf.format(dateObj);
  } catch {}

  const clinicPeriod = getTimeOfDayPeriod(clinicH, clinicM);
  const clinicEmoji = getTimeOfDayEmoji(clinicPeriod);

  if (!isDifferentTimezone) {
    return {
      slot24,
      clinicTime12,
      clinicDateFormatted,
      userTime12: clinicTime12,
      userShortLabel: normalizeSlotToTime(slot24),
      userDateFormatted: clinicDateFormatted,
      userDayOffsetDesc: "Same Day",
      isDifferentDay: false,
      userTimeZone: clinicTz,
      isDifferentTimezone: false,
      fullComparison: clinicTime12,
      userDateWithTime: `${clinicDateFormatted} · ${clinicTime12}`,
      userHour24: clinicH,
      userMinute: clinicM,
      timeOfDayPeriod: clinicPeriod,
      timeOfDayEmoji: clinicEmoji,
    };
  }

  try {
    const userFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
    const userTime12 = userFormatter.format(dateObj);

    const shortFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const userShortLabel = shortFormatter.format(dateObj);

    const user24Formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    const timeParts = user24Formatter.formatToParts(dateObj);
    const userHour24 = parseInt(timeParts.find((p) => p.type === "hour")?.value || "0", 10);
    const userMinute = parseInt(timeParts.find((p) => p.type === "minute")?.value || "0", 10);
    const userPeriod = getTimeOfDayPeriod(userHour24, userMinute);
    const userEmoji = getTimeOfDayEmoji(userPeriod);

    // Check if the slot crosses into a different calendar date in patient's timezone
    const userDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = userDateFormatter.formatToParts(dateObj);
    const getV = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const userYMD = `${getV("year")}-${getV("month")}-${getV("day")}`;

    const userLongDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const userDateFormatted = userLongDateFormatter.format(dateObj);

    const isDifferentDay = userYMD !== normalizedYMD;
    let userDayOffsetDesc: "Same Day" | "Day Before" | "Day After" = "Same Day";
    if (userYMD < normalizedYMD) userDayOffsetDesc = "Day Before";
    if (userYMD > normalizedYMD) userDayOffsetDesc = "Day After";

    return {
      slot24,
      clinicTime12,
      clinicDateFormatted,
      userTime12,
      userShortLabel,
      userDateFormatted,
      userDayOffsetDesc,
      isDifferentDay,
      userTimeZone: targetTz,
      isDifferentTimezone: true,
      fullComparison: userTime12,
      userDateWithTime: `${userDateFormatted} · ${userTime12}`,
      userHour24,
      userMinute,
      timeOfDayPeriod: userPeriod,
      timeOfDayEmoji: userEmoji,
    };
  } catch {
    return {
      slot24,
      clinicTime12,
      clinicDateFormatted,
      userTime12: clinicTime12,
      userShortLabel: normalizeSlotToTime(slot24),
      userDateFormatted: clinicDateFormatted,
      userDayOffsetDesc: "Same Day",
      isDifferentDay: false,
      userTimeZone: targetTz,
      isDifferentTimezone: false,
      fullComparison: clinicTime12,
      userDateWithTime: `${clinicDateFormatted} · ${clinicTime12}`,
      userHour24: clinicH,
      userMinute: clinicM,
      timeOfDayPeriod: clinicPeriod,
      timeOfDayEmoji: clinicEmoji,
    };
  }
}

export interface MappedSessionHours {
  morning: {
    clinicRange: string;
    userRange: string;
    display: string;
    badge: string;
    mode: string;
    period: TimeOfDayPeriod;
    emoji: string;
    sessionLabel: string;      // e.g. "Morning", "Late Night", "Early Morning", etc.
    fullSessionName: string;   // e.g. "Morning Session" or "Late Night Session"
    daySpanLabel: string;      // e.g. "Mon – Sat (Late Night)"
  };
  evening: {
    clinicRange: string;
    userRange: string;
    display: string;
    badge: string;
    mode: string;
    period: TimeOfDayPeriod;
    emoji: string;
    sessionLabel: string;      // e.g. "Evening", "Morning", "Afternoon", etc.
    fullSessionName: string;   // e.g. "Evening Session" or "Morning Session"
    daySpanLabel: string;      // e.g. "Mon – Sat (Morning)"
  };
  walkin: {
    clinicRange: string;
    userRange: string;
    display: string;
    policy: string;
    period: TimeOfDayPeriod;
  };
  sunday: {
    clinicRange: string;
    userRange: string;
    display: string;
    mode: string;
  };
  monSatSummary: string;
  sundaySummary: string;
  summary: string;
  isDifferentTimezone: boolean;
  userTimezoneLabel: string;
}

/**
 * Returns clinic operational session ranges dynamically mapped to the patient's local timezone.
 * Strictly presents a single unified timezone matching the patient's location with zero dual-conversions,
 * and dynamically classifies diurnal labels (Early Morning, Morning, Afternoon, Evening, Late Evening, Night, Late Night).
 */
export function getMappedSessionHours(
  dateYMD?: string,
  userTz?: string
): MappedSessionHours {
  const normYMD = normalizeDateAlias(dateYMD || "today");
  const mStart = mapClinicSlotToUserTime(normYMD, "10:00", userTz);
  const mEnd = mapClinicSlotToUserTime(normYMD, "13:00", userTz);
  const eStart = mapClinicSlotToUserTime(normYMD, "17:30", userTz);
  const eEnd = mapClinicSlotToUserTime(normYMD, "20:00", userTz);

  const isDifferentTimezone = mStart.isDifferentTimezone;
  const tzLabel = mStart.userTime12.split(" ").pop() || "";

  const morningUserRange = isDifferentTimezone
    ? `${mStart.userShortLabel} – ${mEnd.userShortLabel} ${tzLabel}`
    : "10:00 AM – 1:00 PM IST";

  const eveningUserRange = isDifferentTimezone
    ? `${eStart.userShortLabel} – ${eEnd.userShortLabel} ${tzLabel}`
    : "5:30 PM – 8:00 PM IST";

  const morningDisplay = morningUserRange;
  const eveningDisplay = eveningUserRange;
  const walkinDisplay = eveningUserRange;

  const morningPeriod = mStart.timeOfDayPeriod;
  const morningEmoji = mStart.timeOfDayEmoji;
  const eveningPeriod = eStart.timeOfDayPeriod;
  const eveningEmoji = eStart.timeOfDayEmoji;

  const morningDaySpanLabel = `Mon – Sat (${morningPeriod})`;
  const eveningDaySpanLabel = `Mon – Sat (${eveningPeriod})`;

  const walkinPolicy = `Walk-ins are welcomed Monday through Saturday during ${eveningPeriod} OPD (${eveningUserRange}). ${morningPeriod} sessions and Sundays are strictly by prior appointment.`;

  const monSatSummary = `Mon – Sat: ${mStart.userShortLabel} – ${mEnd.userShortLabel} (${morningPeriod}) & ${eStart.userShortLabel} – ${eEnd.userShortLabel} (${eveningPeriod}) ${tzLabel}`;
  const sundaySummary = "Sunday: Prior appt only";
  const summary = `${monSatSummary} · ${sundaySummary}`;

  return {
    morning: {
      clinicRange: "10:00 AM – 01:00 PM IST",
      userRange: morningUserRange,
      display: morningDisplay,
      badge: OFFICE_HOURS.MORNING.badge,
      mode: OFFICE_HOURS.MORNING.mode,
      period: morningPeriod,
      emoji: morningEmoji,
      sessionLabel: morningPeriod,
      fullSessionName: `${morningPeriod} Session`,
      daySpanLabel: morningDaySpanLabel,
    },
    evening: {
      clinicRange: "05:30 PM – 08:00 PM IST",
      userRange: eveningUserRange,
      display: eveningDisplay,
      badge: OFFICE_HOURS.EVENING.badge,
      mode: OFFICE_HOURS.EVENING.mode,
      period: eveningPeriod,
      emoji: eveningEmoji,
      sessionLabel: eveningPeriod,
      fullSessionName: `${eveningPeriod} Session`,
      daySpanLabel: eveningDaySpanLabel,
    },
    walkin: {
      clinicRange: "05:30 PM – 08:00 PM IST",
      userRange: eveningUserRange,
      display: walkinDisplay,
      policy: walkinPolicy,
      period: eveningPeriod,
    },
    sunday: {
      clinicRange: OFFICE_HOURS.SUNDAY.hours,
      userRange: OFFICE_HOURS.SUNDAY.hours,
      display: OFFICE_HOURS.SUNDAY.hours,
      mode: OFFICE_HOURS.SUNDAY.mode,
    },
    monSatSummary,
    sundaySummary,
    summary,
    isDifferentTimezone,
    userTimezoneLabel: tzLabel,
  };
}

/**
 * Returns formatted date and time in both user local timezone and clinic IST timezone.
 */
export function formatDualDateTime(
  dateOrIso: Date | string,
  userTz?: string
): { userDateTime: string; clinicDateTime: string; isDifferentTimezone: boolean } {
  const dateObj = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  const clinicTz = CLINIC.TIMEZONE || "Asia/Kolkata";

  const clinicFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: clinicTz,
    dateStyle: "full",
    timeStyle: "short",
  });
  const clinicDateTime = `${clinicFormatter.format(dateObj)} IST`;

  const tzInfo = getUserTimezone(userTz);
  if (tzInfo.isClinicTimezone) {
    return {
      userDateTime: clinicDateTime,
      clinicDateTime,
      isDifferentTimezone: false,
    };
  }

  const userFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzInfo.timeZone,
    dateStyle: "full",
    timeStyle: "short",
  });
  const userDateTime = `${userFormatter.format(dateObj)} (${tzInfo.label || tzInfo.timeZone})`;

  return {
    userDateTime,
    clinicDateTime,
    isDifferentTimezone: true,
  };
}

// ─── Localized Internal Availability Engine ──────────────────────────────────

export interface LocalizedUserSlot {
  /** Unique key combining clinic date & clinic slot: e.g. "2026-11-15_10:00" */
  slotKey: string;
  /** Patient's local date: "YYYY-MM-DD" */
  userDateYMD: string;
  /** Patient's local time formatted (12-hr): e.g. "07:00 AM" or "11:30 PM" */
  userTime12: string;
  /** Patient's local time short: e.g. "7:00 AM" */
  userShortLabel: string;
  /** Patient's local 24-hr time: e.g. "07:00" */
  userTime24: string;
  /** Patient's local hour (0-23) */
  userHour24: number;
  /** Patient's local minute (0-59) */
  userMinute: number;
  /** Clinic operational date: e.g. "2026-11-14" */
  clinicDateYMD: string;
  /** Clinic operational slot (24-hr): e.g. "17:30" */
  clinicSlot24: string;
  /** Clinic operational time (12-hr with IST): e.g. "05:30 PM IST" */
  clinicTime12: string;
  /** ISO timestamp: e.g. "2026-11-14T17:30:00+05:30" */
  isoTimestamp: string;
  /** Milliseconds epoch timestamp for reliable sorting */
  epochMs: number;
  /** Diurnal period in patient's local timezone */
  period: TimeOfDayPeriod;
  /** Emoji for the diurnal period */
  periodEmoji: string;
}

/**
 * Calculates doctor consultation availability mapped strictly to the patient's local calendar date.
 *
 * When a patient in New York views Friday 2026-11-14:
 * The clinic in India (Asia/Kolkata) operates on IST slots.
 * We internally evaluate candidate clinic dates [-1, 0, +1] around the patient's date,
 * convert each clinic slot into the patient's timezone, and return ONLY the slots
 * that fall on the patient's selected local date.
 * No dual clocks, no "IST" badges, no day offset warnings are shown to the patient.
 */
export function getLocalizedSlotsForDate(
  userDateYMD: string,
  userTz?: string
): LocalizedUserSlot[] {
  if (!userDateYMD) return [];

  const clinicTz = CLINIC.TIMEZONE || "Asia/Kolkata";
  let targetTz = userTz;
  if (!targetTz) {
    try {
      targetTz = Intl.DateTimeFormat().resolvedOptions().timeZone || clinicTz;
    } catch {
      targetTz = clinicTz;
    }
  }

  // Parse patient's selected local date components
  const [yStr, mStr, dStr] = userDateYMD.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (!year || !month || !day) return [];

  // Reusable formatters for target timezone
  const ymdFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter12 = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const timeFormatter24 = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTz,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });

  const results: LocalizedUserSlot[] = [];
  const seenSlotKeys = new Set<string>();

  // Evaluate candidate clinic dates [-1, 0, 1] relative to userDateYMD
  const offsets = [-1, 0, 1];

  for (const offset of offsets) {
    const candDate = new Date(Date.UTC(year, month - 1, day + offset));
    const candY = candDate.getUTCFullYear();
    const candM = String(candDate.getUTCMonth() + 1).padStart(2, "0");
    const candD = String(candDate.getUTCDate()).padStart(2, "0");
    const clinicDateYMD = `${candY}-${candM}-${candD}`;

    for (const slot24 of ALL_TIME_SLOTS) {
      const [h24, m24] = slot24.split(":");
      const isoTimestamp = `${clinicDateYMD}T${h24.padStart(2, "0")}:${m24.padStart(2, "0")}:00+05:30`;
      const dateObj = new Date(isoTimestamp);
      const epochMs = dateObj.getTime();

      // What calendar date is this in the patient's local timezone?
      const ymdParts = ymdFormatter.formatToParts(dateObj);
      const getP = (t: string) => ymdParts.find((p) => p.type === t)?.value || "";
      const slotUserDateYMD = `${getP("year")}-${getP("month")}-${getP("day")}`;

      // Only include slots that fall on the patient's selected local date!
      if (slotUserDateYMD !== userDateYMD) {
        continue;
      }

      const slotKey = `${clinicDateYMD}_${slot24}`;
      if (seenSlotKeys.has(slotKey)) {
        continue;
      }
      seenSlotKeys.add(slotKey);

      // Patient local time
      const userTime12 = timeFormatter12.format(dateObj);
      const userShortLabel = userTime12;

      const time24Parts = timeFormatter24.formatToParts(dateObj);
      const userHour24 = parseInt(time24Parts.find((p) => p.type === "hour")?.value || "0", 10);
      const userMinute = parseInt(time24Parts.find((p) => p.type === "minute")?.value || "0", 10);
      const userTime24 = `${String(userHour24).padStart(2, "0")}:${String(userMinute).padStart(2, "0")}`;

      const period = getTimeOfDayPeriod(userHour24, userMinute);
      const periodEmoji = getTimeOfDayEmoji(period);
      const clinicTime12 = normalizeSlotToTime(slot24) + " IST";

      results.push({
        slotKey,
        userDateYMD,
        userTime12,
        userShortLabel,
        userTime24,
        userHour24,
        userMinute,
        clinicDateYMD,
        clinicSlot24: slot24,
        clinicTime12,
        isoTimestamp,
        epochMs,
        period,
        periodEmoji,
      });
    }
  }

  // Sort slots chronologically in the patient's day
  results.sort((a, b) => a.epochMs - b.epochMs);
  return results;
}

/**
 * Checks whether a localized appointment slot has already passed in absolute real time.
 */
export function isUserSlotPassed(isoTimestamp: string): boolean {
  if (!isoTimestamp) return false;
  return new Date(isoTimestamp).getTime() <= Date.now();
}
