/**
 * ─── Modular Scheduling & Synchronization Engine ─────────────────────────────
 * Single Source of Truth for clinic operational hours, multi-timezone slot
 * mapping, elapsed day detection, and real-time appointment availability.
 * Reusable across Patient Appointments, Admin/Doctor Calendar, and Slot Picker.
 */

import { CLINIC, ALL_TIME_SLOTS, OFFICE_HOURS } from "../config/clinic";
import {
  getClinicTimeInfo,
  getUserTimezone,
  normalizeSlotToTime,
  getTimeOfDayPeriod,
  getTimeOfDayEmoji,
  type TimeOfDayPeriod,
  type ClinicTimeInfo,
  type UserTimezoneInfo,
} from "./timezone";
import type { BlockedCalendarDate } from "../types";

export interface LocalizedConsultationSlot {
  /** Unique composite key: `${clinicDateYMD}_${clinicSlot24}` */
  slotKey: string;
  /** Clinic operational date: "YYYY-MM-DD" */
  clinicDateYMD: string;
  /** Clinic operational slot (24-hr): e.g. "10:00" */
  clinicSlot24: string;
  /** Clinic operational time with IST: e.g. "10:00 AM IST" */
  clinicTime12: string;
  /** Patient's local date: "YYYY-MM-DD" */
  userDateYMD: string;
  /** Patient's local time (12-hr): e.g. "07:00 AM" */
  userTime12: string;
  /** Patient's local short time: e.g. "7:00 AM" */
  userShortLabel: string;
  /** Patient's local 24-hr hour */
  userHour24: number;
  /** Patient's local minute */
  userMinute: number;
  /** Exact ISO timestamp */
  isoTimestamp: string;
  /** Epoch milliseconds */
  epochMs: number;
  /** Diurnal period in patient's timezone */
  period: TimeOfDayPeriod;
  /** Emoji for the diurnal period */
  periodEmoji: string;
  /** Whether this slot has elapsed in real time */
  hasPassed: boolean;
  /** Whether this slot is reserved by another patient */
  isBooked: boolean;
  /** Reason string if doctor has blocked this slot */
  blockedReason?: string;
  /** Whether the slot cannot be booked */
  disabled: boolean;
  /** True if this slot originates from a Sunday in India (scheduled by prior appointment only) */
  isSundayPriorAppt?: boolean;
}

export interface ClinicDateOperatingStatus {
  dateYMD: string;
  /** True if this date's clinic operating hours in India have already ended */
  isClinicDayEnded: boolean;
  /** True if this date is today in patient's local timezone */
  isTodayInUserTz: boolean;
  /** True if this date is past in patient's local timezone */
  isPastInUserTz: boolean;
  /** Localized consultation slots */
  slots: LocalizedConsultationSlot[];
  /** Slots grouped by diurnal period */
  periodGroups: { period: TimeOfDayPeriod; emoji: string; slots: LocalizedConsultationSlot[] }[];
  /** Total bookable slots available */
  availableSlotsCount: number;
  /** True if all consultation slots for this date are unavailable */
  allSlotsUnavailable: boolean;
  /** Human-readable explanation if unavailable */
  unavailabilityReason?: string;
  /** Recommended next date with open availability (if current date has ended) */
  suggestedNextDate?: string;
  /** True if any candidate slot on this local day originates from a Sunday clinic session */
  hasSundaySlots?: boolean;
}

/**
 * Checks if a given date's clinic operational hours have concluded in India (IST).
 * When clinic is on Nov 15 06:00 AM IST, Nov 14 operations in India have ended.
 */
export function isClinicDateConcluded(dateYMD: string, clinicTime?: ClinicTimeInfo): boolean {
  if (!dateYMD) return true;
  const clinic = clinicTime || getClinicTimeInfo();

  // If date in India is strictly ahead of dateYMD, that clinic day is over
  if (clinic.todayYMD > dateYMD) {
    return true;
  }

  // If date is today in India, check if clinic operating hours have closed for the day
  // Evening OPD closes at 8:00 PM IST (20:00 = 1200 minutes)
  if (clinic.todayYMD === dateYMD) {
    const lastSlot = ALL_TIME_SLOTS[ALL_TIME_SLOTS.length - 1]; // "19:30"
    const [lastH, lastM] = lastSlot.split(":").map(Number);
    const clinicCloseMinutes = lastH * 60 + lastM; // 19:30
    return clinic.currentTotalMinutes >= clinicCloseMinutes;
  }

  return false;
}

/**
 * Computes complete modular operating status and localized slots for any calendar date.
 * Reusable across CalendarPicker, AppointmentSlotPicker, AppointmentsPage, and Doctor Dashboard.
 *
 * Cross-Timezone Invariant:
 * When a patient in America/New_York (EST, UTC-5) selects date D (e.g. Saturday, Nov 14):
 * - Candidate clinic slots are evaluated across adjacent clinic dates in India (D-1, D, D+1).
 * - Slots are strictly filtered by slotUserDateYMD === dateYMD so no cross-day bleeding occurs.
 * - Nov 15 10:00 AM IST maps to Nov 14 11:30 PM EST. At 8:00 PM EST, it is upcoming and bookable!
 * - Nov 15 10:30 AM – 12:30 PM IST maps to Nov 15 12:00 AM – 2:00 AM EST (Sunday Late Night).
 * - Every slot correctly respects its origin clinic day rules (Sunday: Prior Appointment Only).
 */
export function getClinicDateOperatingStatus(
  dateYMD: string,
  userTz?: string,
  bookedSlots: string[] = [],
  blockedDates: BlockedCalendarDate[] = []
): ClinicDateOperatingStatus {
  // Defensive guard: invalid or empty date strings
  if (!dateYMD || !dateYMD.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateYMD.trim())) {
    return {
      dateYMD: dateYMD || "",
      isClinicDayEnded: false,
      isTodayInUserTz: false,
      isPastInUserTz: false,
      slots: [],
      periodGroups: [],
      availableSlotsCount: 0,
      allSlotsUnavailable: true,
      unavailabilityReason: "Please select a consultation date to view available time slots.",
    };
  }

  const clinic = getClinicTimeInfo();
  const userTzInfo = getUserTimezone(userTz);
  const targetTz = userTzInfo.timeZone;

  const isPastInUserTz = dateYMD < userTzInfo.todayYMD;
  const isTodayInUserTz = dateYMD === userTzInfo.todayYMD;

  // Formatters for target user timezone
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

  const [yStr, mStr, dStr] = dateYMD.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  const slots: LocalizedConsultationSlot[] = [];
  const seenSlotKeys = new Set<string>();
  const nowMs = Date.now();

  // Evaluate candidate clinic dates [-1, 0, 1] relative to the patient's selected local date
  const offsets = [-1, 0, 1];

  for (const offset of offsets) {
    const candDate = new Date(Date.UTC(year, month - 1, day + offset));
    const candY = candDate.getUTCFullYear();
    const candM = String(candDate.getUTCMonth() + 1).padStart(2, "0");
    const candD = String(candDate.getUTCDate()).padStart(2, "0");
    const clinicDateYMD = `${candY}-${candM}-${candD}`;

    // Sunday in clinic timezone (UTC day 0)
    const isSundayInClinic = candDate.getUTCDay() === 0;

    // Doctor blocks for this clinic date
    const dayBlocks = blockedDates.filter((b) => b.date === clinicDateYMD);
    const fullDayBlocked = dayBlocks.find((b) => b.allDay !== false);

    for (const slot24 of ALL_TIME_SLOTS) {
      const [h24, m24] = slot24.split(":");
      const isoTimestamp = `${clinicDateYMD}T${h24.padStart(2, "0")}:${m24.padStart(2, "0")}:00+05:30`;
      const dateObj = new Date(isoTimestamp);
      if (isNaN(dateObj.getTime())) continue;
      const epochMs = dateObj.getTime();

      // Format in patient's local timezone
      const ymdParts = ymdFormatter.formatToParts(dateObj);
      const getP = (t: string) => ymdParts.find((p) => p.type === t)?.value || "";
      const slotUserDateYMD = `${getP("year")}-${getP("month")}-${getP("day")}`;

      // Strictly include ONLY slots that fall on the patient's selected local date!
      if (slotUserDateYMD !== dateYMD) {
        continue;
      }

      const slotKey = `${clinicDateYMD}_${slot24}`;
      if (seenSlotKeys.has(slotKey)) {
        continue;
      }
      seenSlotKeys.add(slotKey);

      const userTime12 = timeFormatter12.format(dateObj);
      const userShortLabel = userTime12;

      const time24Parts = timeFormatter24.formatToParts(dateObj);
      const userHour24 = parseInt(time24Parts.find((p) => p.type === "hour")?.value || "0", 10);
      const userMinute = parseInt(time24Parts.find((p) => p.type === "minute")?.value || "0", 10);

      const period = getTimeOfDayPeriod(userHour24, userMinute);
      const periodEmoji = getTimeOfDayEmoji(period);
      const clinicTime12 = normalizeSlotToTime(slot24) + " IST";

      // Real-time elapsed check: based on absolute physical time
      const hasPassed = epochMs <= nowMs;

      // Double-booking check
      const isBooked = bookedSlots.includes(slot24) || bookedSlots.includes(slotKey);

      // Blocked check
      let blockedReason: string | undefined = fullDayBlocked ? fullDayBlocked.reason : undefined;
      if (!blockedReason) {
        const partial = dayBlocks.find((b) => {
          if (b.slots && b.slots.includes(slot24)) return true;
          if (b.startTime && b.endTime) {
            return slot24 >= b.startTime && slot24 <= b.endTime;
          }
          return false;
        });
        if (partial) blockedReason = partial.reason;
      }

      const disabled = hasPassed || isBooked || !!blockedReason;

      slots.push({
        slotKey,
        clinicDateYMD,
        clinicSlot24: slot24,
        clinicTime12,
        userDateYMD: slotUserDateYMD,
        userTime12,
        userShortLabel,
        userHour24,
        userMinute,
        isoTimestamp,
        epochMs,
        period,
        periodEmoji,
        hasPassed,
        isBooked,
        blockedReason,
        disabled,
        isSundayPriorAppt: isSundayInClinic,
      });
    }
  }

  // Sort slots strictly in chronological order
  slots.sort((a, b) => a.epochMs - b.epochMs);

  // Group slots by diurnal period
  const groupMap = new Map<TimeOfDayPeriod, { period: TimeOfDayPeriod; emoji: string; slots: LocalizedConsultationSlot[] }>();
  for (const slot of slots) {
    if (!groupMap.has(slot.period)) {
      groupMap.set(slot.period, { period: slot.period, emoji: slot.periodEmoji, slots: [] });
    }
    groupMap.get(slot.period)!.slots.push(slot);
  }
  const periodGroups = Array.from(groupMap.values());

  const availableSlotsCount = slots.filter((s) => !s.disabled).length;
  const allSlotsUnavailable = availableSlotsCount === 0;
  const hasSundaySlots = slots.some((s) => s.isSundayPriorAppt);

  // Clinic day ended check for this local date
  const isClinicDayEnded = (isTodayInUserTz && allSlotsUnavailable) || isPastInUserTz;

  // Compute next suggested date if today has ended
  let suggestedNextDate: string | undefined;
  if (isClinicDayEnded) {
    const nextObj = new Date(Date.UTC(year, month - 1, day + 1));
    if (nextObj.getUTCDay() === 0) {
      nextObj.setUTCDate(nextObj.getUTCDate() + 1);
    }
    suggestedNextDate = `${nextObj.getUTCFullYear()}-${String(nextObj.getUTCMonth() + 1).padStart(2, "0")}-${String(nextObj.getUTCDate()).padStart(2, "0")}`;
  }

  // Explanation message if unavailable
  let unavailabilityReason: string | undefined;
  if (isTodayInUserTz && allSlotsUnavailable) {
    unavailabilityReason = `All consultation appointments for today have concluded or are fully booked. Please select an upcoming date on the calendar above.`;
  } else if (isPastInUserTz) {
    unavailabilityReason = `This date has already elapsed. Please select an upcoming consultation date.`;
  } else if (allSlotsUnavailable) {
    unavailabilityReason = `All consultation slots for this date have already been reserved or blocked. Please choose an upcoming date.`;
  }

  return {
    dateYMD,
    isClinicDayEnded,
    isTodayInUserTz,
    isPastInUserTz,
    slots,
    periodGroups,
    availableSlotsCount,
    allSlotsUnavailable,
    unavailabilityReason,
    suggestedNextDate,
  };
}

