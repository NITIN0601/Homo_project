import { HOSPITAL } from "../config/hospital";
import { CANONICAL_TIMEZONE_ABBREVIATIONS } from "./constants";
import type { HospitalTimeInfo, TimeOfDayPeriod } from "./types";

/**
 * Returns current date and time strictly in the hospital's operational timezone.
 * Supports multi-tenant timezone and locale configuration.
 */
export function getHospitalTimeInfo(customTimezone?: string, customLocale?: string): HospitalTimeInfo {
  const timeZone = customTimezone || HOSPITAL.TIMEZONE || "Asia/Kolkata";
  const now = new Date();

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

  const displayLocale = customLocale || (timeZone === "Asia/Kolkata" ? "en-IN" : "en-US");
  const displayTimeFormatter = new Intl.DateTimeFormat(displayLocale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const timeZoneNamePart =
    CANONICAL_TIMEZONE_ABBREVIATIONS[timeZone] ||
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ||
    (timeZone === "Asia/Kolkata" ? "IST" : timeZone);

  const formattedTime = `${displayTimeFormatter.format(now)} ${timeZoneNamePart}`;

  const displayDateFormatter = new Intl.DateTimeFormat(displayLocale, {
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
    label: timeZoneNamePart,
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
 * Checks whether a given slot on a given date has already elapsed in hospital timezone (IST).
 */
export function isSlotPassed(dateYMD: string, slot24: string): boolean {
  if (!dateYMD || !slot24) return false;
  const hospitalTime = getHospitalTimeInfo();
  const targetDateYMD = dateYMD.toLowerCase() === "today" ? hospitalTime.todayYMD : dateYMD;

  if (targetDateYMD < hospitalTime.todayYMD) return true;
  if (targetDateYMD > hospitalTime.todayYMD) return false;

  const [slotH, slotM] = slot24.split(":").map(Number);
  const slotTotalMinutes = slotH * 60 + slotM;
  return hospitalTime.currentTotalMinutes >= slotTotalMinutes;
}

/**
 * Normalizes aliases like "Today" and "Tomorrow" to "YYYY-MM-DD" in hospital operational timezone.
 */
export function normalizeDateAlias(dateStr: string): string {
  if (!dateStr) return "";
  const lower = dateStr.trim().toLowerCase();
  const hospital = getHospitalTimeInfo();
  if (lower === "today") return hospital.todayYMD;
  if (lower === "tomorrow") {
    const [y, m, d] = hospital.todayYMD.split("-").map(Number);
    const tom = new Date(y, m - 1, d + 1);
    return `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, "0")}-${String(tom.getDate()).padStart(2, "0")}`;
  }
  return dateStr;
}

/**
 * Checks if a given YMD string is in the past relative to the hospital's operational timezone.
 */
export function isDatePastHospitalTime(dateYMD: string): boolean {
  if (!dateYMD) return false;
  const hospitalTime = getHospitalTimeInfo();
  const normalized = normalizeDateAlias(dateYMD);
  return normalized < hospitalTime.todayYMD;
}

/**
 * Categorizes a 24-hour time into the 7 diurnal periods.
 */
export function getTimeOfDayPeriod(hour24: number, minutes = 0): TimeOfDayPeriod {
  const decimalHour = hour24 + minutes / 60;
  if (decimalHour >= 0 && decimalHour < 4) return "Late Night";
  if (decimalHour >= 4 && decimalHour < 7) return "Early Morning";
  if (decimalHour >= 7 && decimalHour < 12) return "Morning";
  if (decimalHour >= 12 && decimalHour < 16) return "Afternoon";
  if (decimalHour >= 16 && decimalHour < 19.5) return "Evening";
  if (decimalHour >= 19.5 && decimalHour < 22) return "Late Evening";
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
    default:              return "☀️";
  }
}
