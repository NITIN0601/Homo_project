/**
 * ─── Dynamic Indian Festivals & Google Calendar Public Feed Service ──────────
 *
 * Dynamically queries Indian holidays and festivals from:
 * 1. Backend FastAPI: GET /api/calendar/holidays?year={year}
 *    (Interacts with Google Calendar API & public calendar feed:
 *     en.indian#holiday@group.v.calendar.google.com)
 * 2. Public Google Calendar ICS Feed directly (fallback when backend is not running)
 * 3. Client-side local storage caching with 24-hour TTL for instant responsiveness
 */

export interface DynamicHoliday {
  date: string; // "YYYY-MM-DD"
  name: string;
  type: "national" | "festival" | "state";
  emoji?: string;
  description?: string;
  source: string;
  calendarId?: string;
}

const GOOGLE_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";
const GOOGLE_ICS_FEED_URL =
  "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

const CACHE_PREFIX = "agastya_dynamic_holidays_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory memory cache
const memoryCache = new Map<number, DynamicHoliday[]>();

function mapEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("republic") || n.includes("independence")) return "🇮🇳";
  if (n.includes("diwali") || n.includes("deepavali") || n.includes("naraka") || n.includes("lakshmi")) return "🪔";
  if (n.includes("holi") || n.includes("dahan")) return "🎨";
  if (n.includes("pongal") || n.includes("sankranti")) return "🌾";
  if (n.includes("shivaratri") || n.includes("shiva")) return "🔱";
  if (n.includes("ganesh") || n.includes("vinayaka")) return "🐘";
  if (n.includes("dussehra") || n.includes("dasara") || n.includes("vijayadashami") || n.includes("rama")) return "🏹";
  if (n.includes("durga") || n.includes("navratri") || n.includes("puja") || n.includes("ashtami") || n.includes("navami")) return "🪷";
  if (n.includes("eid") || n.includes("ramadan") || n.includes("ramzan") || n.includes("bakrid") || n.includes("muharram")) return "🌙";
  if (n.includes("christmas") || n.includes("xmas")) return "🎄";
  if (n.includes("buddha")) return "🪷";
  if (n.includes("guru") || n.includes("nanak")) return "🪔";
  if (n.includes("gandhi")) return "🕊️";
  if (n.includes("ambedkar")) return "📜";
  if (n.includes("rajyotsava")) return "💛";
  if (n.includes("ugadi") || n.includes("gudi padwa") || n.includes("new year")) return "🌿";
  return "✨";
}

function parseIcsText(icsText: string, targetYear: number): DynamicHoliday[] {
  // Remove line folding
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match: RegExpExecArray | null;

  const holidays: DynamicHoliday[] = [];
  const seen = new Set<string>();

  while ((match = eventRegex.exec(unfolded)) !== null) {
    const block = match[1];
    const dtstartMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    const summaryMatch = block.match(/SUMMARY:(.+?)(?:\r?\n|$)/);
    const descMatch = block.match(/DESCRIPTION:(.+?)(?:\r?\n|$)/);

    if (dtstartMatch && summaryMatch) {
      const rawDate = dtstartMatch[1];
      const y = parseInt(rawDate.substring(0, 4), 10);
      if (y !== targetYear) continue;

      const m = rawDate.substring(4, 6);
      const d = rawDate.substring(6, 8);
      const ymd = `${y}-${m}-${d}`;

      const rawName = summaryMatch[1].replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
      const rawDesc = descMatch ? descMatch[1].replace(/\\,/g, ",").replace(/\\n/g, " ").trim() : "";

      const dedupeKey = `${ymd}_${rawName}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const nameLower = rawName.toLowerCase();
      let holType: "national" | "festival" | "state" = "festival";
      if (nameLower.includes("republic") || nameLower.includes("independence") || nameLower.includes("gandhi jayanti")) {
        holType = "national";
      } else if (nameLower.includes("rajyotsava")) {
        holType = "state";
      }

      holidays.push({
        date: ymd,
        name: rawName,
        type: holType,
        description: rawDesc,
        emoji: mapEmoji(rawName),
        source: "google_calendar_feed",
        calendarId: GOOGLE_CALENDAR_ID,
      });
    }
  }

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch Indian holidays dynamically for a given year.
 */
export async function fetchIndianHolidays(year: number): Promise<DynamicHoliday[]> {
  // 1. Check in-memory cache
  if (memoryCache.has(year)) {
    return memoryCache.get(year)!;
  }

  // 2. Check localStorage cache
  try {
    const cachedItem = localStorage.getItem(`${CACHE_PREFIX}${year}`);
    if (cachedItem) {
      const parsed = JSON.parse(cachedItem);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.holidays)) {
        memoryCache.set(year, parsed.holidays);
        return parsed.holidays;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  // 3. Try Python Backend (FastAPI on localhost:8000 or proxy)
  try {
    const backendUrl = `http://localhost:8000/api/calendar/holidays?year=${year}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(backendUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data.holidays) && data.holidays.length > 0) {
        saveCache(year, data.holidays);
        return data.holidays;
      }
    }
  } catch {
    // Backend may not be running locally; fallback to direct feed or public endpoint
  }

  // 4. Try fetching Google Calendar public ICS directly
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(GOOGLE_ICS_FEED_URL, {
      signal: controller.signal,
      headers: { Accept: "text/calendar" },
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const icsText = await resp.text();
      const holidays = parseIcsText(icsText, year);
      if (holidays.length > 0) {
        saveCache(year, holidays);
        return holidays;
      }
    }
  } catch {
    // Direct CORS restriction might occur in certain browsers; use dynamic calendar feed
  }

  // 5. Fallback: Query Nager.Date API or dynamic generation if offline
  try {
    const nagerResp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
    if (nagerResp.ok && nagerResp.status === 200) {
      const data = await nagerResp.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: DynamicHoliday[] = data.map((d: any) => ({
          date: d.date,
          name: d.localName || d.name,
          type: d.types?.includes("Public") ? "national" : "festival",
          emoji: mapEmoji(d.name),
          source: "nager_date_api",
        }));
        saveCache(year, mapped);
        return mapped;
      }
    }
  } catch {
    // Offline or network error
  }

  return [];
}

function saveCache(year: number, holidays: DynamicHoliday[]) {
  memoryCache.set(year, holidays);
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${year}`,
      JSON.stringify({
        timestamp: Date.now(),
        holidays,
      })
    );
  } catch {
    // Ignore storage quota
  }
}
