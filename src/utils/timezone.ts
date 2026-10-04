/**
 * ─── Clinic Operational Timezone & Global User Localization Utility ──────────
 * Single Source of Truth for clinic timezone (Asia/Kolkata / IST UTC+5:30),
 * real-time elapsed time slot detection, double-booking conflict prevention,
 * and dynamic mapping to the patient's local timezone (USA, UK, UAE, etc.).
 */

import { CLINIC, OFFICE_HOURS } from "../config/clinic";

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
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { timeZone: "America/New_York", label: "US Eastern Time (EDT / EST)", region: "United States (Eastern)" },
  { timeZone: "America/Chicago", label: "US Central Time (CDT / CST)", region: "United States (Central)" },
  { timeZone: "America/Denver", label: "US Mountain Time (MDT / MST)", region: "United States (Mountain)" },
  { timeZone: "America/Los_Angeles", label: "US Pacific Time (PDT / PST)", region: "United States (Pacific)" },
  { timeZone: "Europe/London", label: "UK / London (BST / GMT)", region: "United Kingdom" },
  { timeZone: "Asia/Dubai", label: "Gulf Standard Time (GST, UTC+4)", region: "United Arab Emirates" },
  { timeZone: "Asia/Singapore", label: "Singapore Time (SGT, UTC+8)", region: "Singapore" },
  { timeZone: "Australia/Sydney", label: "Sydney / Melbourne (AEST / AEDT)", region: "Australia" },
  { timeZone: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)", region: "India (Clinic SSOT)" },
];

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

  return {
    timeZone,
    label: label || (timeZone === clinicTz ? "IST" : timeZone),
    formattedTime,
    formattedDate,
    todayYMD,
    offset,
    regionName,
    isClinicTimezone: timeZone === clinicTz || timeZone === "Asia/Calcutta",
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
