/**
 * ─── Timezone Domain Types ───────────────────────────────────────────────────
 * Canonical types and interfaces for multi-tenant clinic timezone calculations,
 * local diurnal periods, candidate slot localization, and geographic inference.
 */

export interface TimezoneOption {
  timeZone: string;
  label: string;
  region: string;
  offset?: string;
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

export type TimeOfDayPeriod =
  | "Early Morning"
  | "Morning"
  | "Afternoon"
  | "Evening"
  | "Late Evening"
  | "Night"
  | "Late Night";

export interface SlotTimeMapping {
  slot24: string;              // "17:30"
  clinicTime12: string;        // "05:30 PM IST"
  clinicDateFormatted: string; // "Friday, Oct 2, 2026"
  userTime12: string;          // "08:00 AM EDT"
  userShortLabel: string;      // "8:00 AM"
  userDateFormatted: string;   // "Friday, Oct 2, 2026"
  userDayOffsetDesc: "Same Day" | "Day Before" | "Day After";
  isDifferentDay: boolean;
  userTimeZone: string;
  isDifferentTimezone: boolean;
  fullComparison: string;      // "08:00 AM EDT (05:30 PM IST)"
  userDateWithTime: string;    // "Fri, Oct 2 · 8:00 AM EDT"
  userHour24: number;
  userMinute: number;
  timeOfDayPeriod: TimeOfDayPeriod;
  timeOfDayEmoji: string;
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
    sessionLabel: string;
    fullSessionName: string;
    daySpanLabel: string;
  };
  evening: {
    clinicRange: string;
    userRange: string;
    display: string;
    badge: string;
    mode: string;
    period: TimeOfDayPeriod;
    emoji: string;
    sessionLabel: string;
    fullSessionName: string;
    daySpanLabel: string;
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

export interface LocalizedUserSlot {
  slotKey: string;
  userDateYMD: string;
  userTime12: string;
  userShortLabel: string;
  userTime24: string;
  userHour24: number;
  userMinute: number;
  clinicDateYMD: string;
  clinicSlot24: string;
  clinicTime12: string;
  isoTimestamp: string;
  epochMs: number;
  period: TimeOfDayPeriod;
  periodEmoji: string;
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

export interface ClinicTimeInfo {
  todayYMD: string;
  currentHour: number;
  currentMinute: number;
  currentTotalMinutes: number;
  formattedTime: string;
  formattedDate: string;
  timeZone: string;
  label: string;
}

