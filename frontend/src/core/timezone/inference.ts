import type { DetectedLocationTimezone } from "./types";
import { CANONICAL_TIMEZONE_ABBREVIATIONS } from "./constants";

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
    if (offsetPart.startsWith("GMT")) {
      return offsetPart.replace("GMT", "UTC");
    }
    return offsetPart || "UTC";
  } catch {
    return "UTC";
  }
}

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

  // 1. City-Level Matching
  if (cityClean) {
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

    const usPacificCities = [
      "los angeles", "san francisco", "san jose", "san diego", "sacramento", "seattle", "tacoma",
      "portland", "eugene", "las vegas", "reno", "oakland", "fresno", "long beach", "spokane"
    ];
    if (usPacificCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Los_Angeles", "high", "city", city?.trim() || "US Pacific");
    }

    const usMountainCities = [
      "denver", "boulder", "colorado springs", "salt lake city", "albuquerque", "santa fe",
      "boise", "cheyenne", "billings"
    ];
    if (usMountainCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Denver", "high", "city", city?.trim() || "US Mountain");
    }

    const usArizonaCities = ["phoenix", "tucson", "mesa", "scottsdale", "chandler", "gilbert", "tempe", "flagstaff"];
    if (usArizonaCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Phoenix", "high", "city", city?.trim() || "Arizona");
    }

    const usCentralCities = [
      "chicago", "dallas", "houston", "austin", "san antonio", "fort worth", "minneapolis",
      "st. paul", "saint louis", "st. louis", "kansas city", "milwaukee", "nashville", "memphis",
      "new orleans", "oklahoma city", "omaha", "des moines", "little rock"
    ];
    if (usCentralCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Chicago", "high", "city", city?.trim() || "US Central");
    }

    const usEasternCities = [
      "new york", "nyc", "brooklyn", "manhattan", "queens", "boston", "cambridge", "philadelphia",
      "pittsburgh", "washington", "baltimore", "atlanta", "miami", "orlando", "tampa", "charlotte",
      "raleigh", "richmond", "newark", "jersey city", "cleveland", "columbus", "cincinnati", "detroit",
      "jacksonville", "buffalo"
    ];
    if (usEasternCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/New_York", "high", "city", city?.trim() || "US Eastern");
    }

    const ukCities = [
      "london", "manchester", "birmingham", "leeds", "glasgow", "edinburgh", "liverpool",
      "bristol", "sheffield", "newcastle", "belfast", "cardiff", "oxford", "cambridge", "southampton"
    ];
    if (ukCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Europe/London", "high", "city", city?.trim() || "UK");
    }

    const uaeCities = ["dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah", "doha", "riyadh", "jeddah", "muscat", "manama", "kuwait city"];
    if (uaeCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Asia/Dubai", "high", "city", city?.trim() || "Gulf");
    }

    if (cityClean.includes("singapore")) {
      return buildResult("Asia/Singapore", "high", "city", "Singapore");
    }

    const ausSydneyCities = ["sydney", "melbourne", "brisbane", "canberra", "gold coast", "hobart"];
    if (ausSydneyCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Australia/Sydney", "high", "city", city?.trim() || "Australia");
    }
    if (cityClean.includes("perth")) {
      return buildResult("Australia/Perth", "high", "city", "Perth, Australia");
    }

    const canadaEastCities = ["toronto", "ottawa", "montreal", "quebec", "mississauga", "hamilton"];
    if (canadaEastCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Toronto", "high", "city", city?.trim() || "Canada");
    }
    const canadaWestCities = ["vancouver", "victoria", "burnaby", "surrey", "richmond"];
    if (canadaWestCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("America/Vancouver", "high", "city", city?.trim() || "Canada");
    }

    const europeCities = ["paris", "berlin", "munich", "frankfurt", "amsterdam", "madrid", "barcelona", "rome", "milan", "zurich", "geneva", "brussels", "vienna"];
    if (europeCities.some((c) => cityClean.includes(c) || c.includes(cityClean))) {
      return buildResult("Europe/Paris", "high", "city", city?.trim() || "Europe");
    }
  }

  // 2. State-Level Matching
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

    const usPacificStates = ["california", "washington", "oregon", "nevada", "ca", "wa", "or", "nv"];
    if (usPacificStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Los_Angeles", "high", "state", state?.trim() || "US Pacific");
    }

    const usMountainStates = ["colorado", "utah", "new mexico", "wyoming", "montana", "idaho", "co", "ut", "nm", "wy", "mt", "id"];
    if (usMountainStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Denver", "high", "state", state?.trim() || "US Mountain");
    }
    if (sClean === "az" || sClean.includes("arizona")) {
      return buildResult("America/Phoenix", "high", "state", "Arizona");
    }

    const usCentralStates = [
      "texas", "illinois", "minnesota", "missouri", "wisconsin", "iowa", "kansas", "nebraska",
      "oklahoma", "arkansas", "louisiana", "mississippi", "alabama", "tennessee",
      "tx", "il", "mn", "mo", "wi", "ia", "ks", "ne", "ok", "ar", "la", "ms", "al", "tn"
    ];
    if (usCentralStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/Chicago", "high", "state", state?.trim() || "US Central");
    }

    const usEasternStates = [
      "new york", "florida", "georgia", "north carolina", "virginia", "massachusetts", "pennsylvania",
      "ohio", "michigan", "new jersey", "maryland", "south carolina", "connecticut", "indiana",
      "ny", "fl", "ga", "nc", "va", "ma", "pa", "oh", "mi", "nj", "md", "sc", "ct", "in"
    ];
    if (usEasternStates.some((s) => sClean === s || sClean.includes(s))) {
      return buildResult("America/New_York", "high", "state", state?.trim() || "US Eastern");
    }

    if (["england", "scotland", "wales", "northern ireland"].some((s) => sClean.includes(s))) {
      return buildResult("Europe/London", "high", "state", state?.trim() || "UK");
    }

    if (["new south wales", "nsw", "victoria", "vic", "queensland", "qld"].some((s) => sClean.includes(s))) {
      return buildResult("Australia/Sydney", "high", "state", state?.trim() || "Australia");
    }
    if (sClean.includes("western australia") || sClean === "wa") {
      return buildResult("Australia/Perth", "high", "state", "Western Australia");
    }
  }

  // 3. Country-Level Matching
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

  // 4. Default Fallback
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

