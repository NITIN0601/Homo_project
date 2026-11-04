/**
 * ─── Dynamic Indian Festivals & Google Calendar Public Feed Service ──────────
 *
 * Dynamically queries Indian holidays and festivals with 24h client-side caching
 * and built-in offline static Indian holidays fallback to ensure zero UI freezes.
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

export const GOOGLE_CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";
const CACHE_PREFIX = "agastya_dynamic_holidays_v5_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache
const memoryCache = new Map<number, DynamicHoliday[]>();

// ─── Standardized Cultural Emoji Dictionary for Indian Festivals & Holidays ───
export const HOLIDAY_EMOJI_DICT: Record<string, string> = {
  // Harvest & Winter
  "bhogi": "🔥",
  "lohri": "🔥",
  "makar sankranti": "🪁",
  "pongal": "🪁",
  "sankranti": "🪁",
  "vasant panchami": "🛐",
  "basant panchami": "🛐",

  // National & Gazetted
  "republic day": "🇮🇳",
  "independence day": "🇮🇳",
  "gandhi jayanti": "🕊️",
  "ambedkar": "📜",

  // Hindu Festivals & Observances
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

  // Islamic Holidays
  "eid al-fitr": "🌙",
  "ramadan": "🌙",
  "eid al-adha": "🐑",
  "bakrid": "🐑",
  "muharram": "🛐",
  "ashura": "🛐",
  "milad un-nabi": "🕌",
  "id-e-milad": "🕌",

  // Christian Holidays
  "good friday": "✝️",
  "easter": "🥚",
  "christmas": "🎄",

  // Sikh Holidays
  "guru nanak": "🪯",

  // State Holidays
  "rajyotsava": "💛",
};

export function mapEmoji(name: string): string {
  const n = name.toLowerCase();
  for (const [key, emoji] of Object.entries(HOLIDAY_EMOJI_DICT)) {
    if (n.includes(key)) return emoji;
  }
  return "✨";
}

/** Built-in guaranteed Indian Public Holidays and Festivals by year */
function getStaticIndianHolidays(year: number): DynamicHoliday[] {
  return [
    { date: `${year}-01-13`, name: "Bhogi / Lohri", type: "festival", emoji: "🔥", source: "static_seed" },
    { date: `${year}-01-14`, name: "Makar Sankranti / Pongal", type: "festival", emoji: "🪁", source: "static_seed" },
    { date: `${year}-01-23`, name: "Vasant Panchami", type: "festival", emoji: "🛐", source: "static_seed" },
    { date: `${year}-01-26`, name: "Republic Day", type: "national", emoji: "🇮🇳", source: "static_seed" },
    { date: `${year}-02-15`, name: "Maha Shivaratri", type: "festival", emoji: "🥛", source: "static_seed" },
    { date: `${year}-03-03`, name: "Chhoti Holi (Holika Dahan)", type: "festival", emoji: "🔥", source: "static_seed" },
    { date: `${year}-03-04`, name: "Holi", type: "festival", emoji: "🎨", source: "static_seed" },
    { date: `${year}-03-19`, name: "Ugadi / Gudi Padwa", type: "festival", emoji: "🌿", source: "static_seed" },
    { date: `${year}-03-20`, name: "Eid al-Fitr (Ramadan Eid)", type: "festival", emoji: "🌙", source: "static_seed" },
    { date: `${year}-03-26`, name: "Rama Navami", type: "festival", emoji: "👑", source: "static_seed" },
    { date: `${year}-04-03`, name: "Good Friday", type: "festival", emoji: "✝️", source: "static_seed" },
    { date: `${year}-04-05`, name: "Easter Sunday", type: "festival", emoji: "🥚", source: "static_seed" },
    { date: `${year}-04-14`, name: "Dr. B.R. Ambedkar Jayanti", type: "national", emoji: "📜", source: "static_seed" },
    { date: `${year}-05-01`, name: "Buddha Purnima", type: "festival", emoji: "🪷", source: "static_seed" },
    { date: `${year}-05-27`, name: "Eid al-Adha (Bakrid)", type: "festival", emoji: "🐑", source: "static_seed" },
    { date: `${year}-07-16`, name: "Jagannath Ratha Yatra", type: "festival", emoji: "🛕", source: "static_seed" },
    { date: `${year}-07-26`, name: "Muharram (Ashura)", type: "festival", emoji: "🛐", source: "static_seed" },
    { date: `${year}-08-15`, name: "Independence Day", type: "national", emoji: "🇮🇳", source: "static_seed" },
    { date: `${year}-08-25`, name: "Milad un-Nabi (Id-E-Milad)", type: "festival", emoji: "🕌", source: "static_seed" },
    { date: `${year}-08-28`, name: "Raksha Bandhan", type: "festival", emoji: "👫", source: "static_seed" },
    { date: `${year}-09-04`, name: "Krishna Janmashtami", type: "festival", emoji: "👑", source: "static_seed" },
    { date: `${year}-09-14`, name: "Ganesh Chaturthi", type: "festival", emoji: "🐘", source: "static_seed" },
    { date: `${year}-10-02`, name: "Mahatma Gandhi Jayanti", type: "national", emoji: "🕊️", source: "static_seed" },
    { date: `${year}-10-19`, name: "Maha Navami", type: "festival", emoji: "🔱", source: "static_seed" },
    { date: `${year}-10-20`, name: "Dussehra (Vijayadashami)", type: "festival", emoji: "🏹", source: "static_seed" },
    { date: `${year}-10-29`, name: "Karwa Chauth", type: "festival", emoji: "🌕", source: "static_seed" },
    { date: `${year}-11-01`, name: "Kannada Rajyotsava", type: "state", emoji: "💛", source: "static_seed" },
    { date: `${year}-11-07`, name: "Naraka Chaturdashi", type: "festival", emoji: "🪔", source: "static_seed" },
    { date: `${year}-11-08`, name: "Diwali (Deepavali)", type: "festival", emoji: "🪔", source: "static_seed" },
    { date: `${year}-11-09`, name: "Govardhan Puja / Bhai Dooj", type: "festival", emoji: "👫", source: "static_seed" },
    { date: `${year}-11-15`, name: "Chhath Puja", type: "festival", emoji: "☀️", source: "static_seed" },
    { date: `${year}-11-24`, name: "Guru Nanak Jayanti", type: "festival", emoji: "🪯", source: "static_seed" },
    { date: `${year}-12-25`, name: "Christmas Day", type: "festival", emoji: "🎄", source: "static_seed" },
  ];
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
    const cachedItem = typeof window !== "undefined" ? localStorage.getItem(`${CACHE_PREFIX}${year}`) : null;
    if (cachedItem) {
      const parsed = JSON.parse(cachedItem);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.holidays) && parsed.holidays.length > 0) {
        memoryCache.set(year, parsed.holidays);
        return parsed.holidays;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  // 3. Try Relative Endpoint (FastAPI proxy via Vite)
  try {
    const backendUrl = `/api/calendar/holidays?year=${year}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
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
    // Fallback to static seed
  }

  // 4. Default to guaranteed static Indian holidays
  const staticHolidays = getStaticIndianHolidays(year);
  saveCache(year, staticHolidays);
  return staticHolidays;
}

function saveCache(year: number, holidays: DynamicHoliday[]) {
  memoryCache.set(year, holidays);
  if (typeof window !== "undefined") {
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
}
