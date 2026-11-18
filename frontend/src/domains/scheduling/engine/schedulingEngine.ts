/**
 * ─── Modular Scheduling & Synchronization Engine ─────────────────────────────
 * Single Source of Truth for hospital operational hours, multi-timezone slot
 * mapping, elapsed day detection, and real-time appointment availability.
 * Reusable across Patient Appointments, Admin/Doctor Calendar, and Slot Picker.
 */

import { ALL_TIME_SLOTS } from "../../../core/config/hospital";
import {
  getHospitalTimeInfo,
  getUserTimezone,
  normalizeSlotToTime,
  normalizeTimeToSlot,
  getTimeOfDayPeriod,
  getTimeOfDayEmoji,
  type TimeOfDayPeriod,
  type HospitalTimeInfo,
} from "../../../core/timezone";
import type { BlockedCalendarDate, DoctorSummary } from "@core/types";
import type { HospitalHoursConfig, HospitalDoctor, DoctorAvailability } from "@core/types/tenant";

export interface LocalizedConsultationSlot {
  /** Unique composite key: `${hospitalDateYMD}_${hospitalSlot24}` */
  slotKey: string;
  /** Hospital operational date: "YYYY-MM-DD" */
  hospitalDateYMD: string;
  /** Hospital operational slot (24-hr): e.g. "10:00" */
  hospitalSlot24: string;
  /** Hospital operational time with IST: e.g. "10:00 AM IST" */
  hospitalTime12: string;
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
  /** Reason string if doctor has blocked this slot (alias for blockedReason) */
  unavailableReason?: string;
  /** Whether the slot cannot be booked */
  disabled: boolean;
  /** Whether the slot cannot be booked (alias for disabled) */
  isUnavailable?: boolean;
  /** True if this slot originates from a Sunday in India (scheduled by prior appointment only) */
  isSundayPriorAppt?: boolean;
}

export interface HospitalDateOperatingStatus {
  dateYMD: string;
  /** True if this date's hospital operating hours in India have already ended */
  isHospitalDayEnded: boolean;
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
  /** True if any candidate slot on this local day originates from a Sunday hospital session */
  hasSundaySlots?: boolean;
}

/**
 * Parses time range string (e.g. "10:00 AM – 01:30 PM", "10:00 - 13:30", "17:30 to 20:00")
 * into normalized 24-hr start and end slots.
 */
function parseHourRange(rangeStr?: string): { startSlot: string; endSlot: string } | null {
  if (!rangeStr || !rangeStr.trim()) return null;
  const parts = rangeStr.split(/[–—-]| to /i);
  if (parts.length < 2) return null;
  const startSlot = normalizeTimeToSlot(parts[0].trim());
  const endSlot = normalizeTimeToSlot(parts[1].trim());
  if (startSlot && endSlot && startSlot < endSlot) {
    return { startSlot, endSlot };
  }
  return null;
}

/**
 * Generates discrete 24-hr time slots between start and end times at specified minute intervals.
 */
function generateSlotsBetween(startSlot: string, endSlot: string, stepMinutes: number = 30): string[] {
  const [sH, sM] = startSlot.split(":").map(Number);
  const [eH, eM] = endSlot.split(":").map(Number);
  let curTotal = sH * 60 + sM;
  const endTotal = eH * 60 + eM;
  const slots: string[] = [];
  while (curTotal < endTotal) {
    const h = Math.floor(curTotal / 60);
    const m = curTotal % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    curTotal += stepMinutes;
  }
  return slots;
}

/**
 * Verifies whether a given day of the week (e.g. "Monday", "Sunday") is allowed by the doctor's
 * availability or hospital's operating days definition.
 */
export function isDayAllowed(dayName: string, availableDaysStr?: string): boolean {
  if (!availableDaysStr || !availableDaysStr.trim()) return true;
  const clean = availableDaysStr.toLowerCase();
  const d3 = dayName.toLowerCase().slice(0, 3); // "mon", "sun", etc.

  // All days / Daily
  if (clean.includes("all days") || clean.includes("every day") || clean.includes("daily")) {
    return true;
  }

  // Mon - Sat
  if (clean.includes("mon – sat") || clean.includes("monday – saturday") || clean.includes("mon - sat") || clean.includes("monday to saturday")) {
    if (d3 === "sun") {
      // Check if Sunday has an explicit exception (e.g. "Sun by Prior Appt")
      return clean.includes("sun");
    }
    return true;
  }

  return clean.includes(d3);
}

/**
 * Dynamically resolves operational 24-hr consultation slots for a hospital/doctor.
 * Takes hospital session windows and physician availability into account.
 */
export function resolveOperationalSlots(
  hoursConfig?: HospitalHoursConfig,
  doctorAvailability?: DoctorAvailability
): readonly string[] {
  const stepMinutes = hoursConfig?.consultationSlotMinutes || 30;

  // Resolve Morning Range
  const morningRangeStr = doctorAvailability?.morningHours || hoursConfig?.morningDisplay;
  const morningParsed = parseHourRange(morningRangeStr);
  const morningSlots = morningParsed
    ? generateSlotsBetween(morningParsed.startSlot, morningParsed.endSlot, stepMinutes)
    : ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];

  // Resolve Evening Range
  const eveningRangeStr = doctorAvailability?.eveningHours || hoursConfig?.eveningDisplay;
  const eveningParsed = parseHourRange(eveningRangeStr);
  const eveningSlots = eveningParsed
    ? generateSlotsBetween(eveningParsed.startSlot, eveningParsed.endSlot, stepMinutes)
    : ["17:30", "18:00", "18:30", "19:00", "19:30"];

  const combined = [...morningSlots, ...eveningSlots];
  return combined.length > 0 ? combined : ALL_TIME_SLOTS;
}

/**
 * Checks if a given date's hospital operational hours have concluded in India (IST).
 * When hospital is on Nov 15 06:00 AM IST, Nov 14 operations in India have ended.
 */
export function isHospitalDateConcluded(dateYMD: string, hospitalTime?: HospitalTimeInfo, customSlots?: readonly string[]): boolean {
  if (!dateYMD) return true;
  const hospital = hospitalTime || getHospitalTimeInfo();

  // If date in India is strictly ahead of dateYMD, that hospital day is over
  if (hospital.todayYMD > dateYMD) {
    return true;
  }

  // If date is today in India, check if hospital operating hours have closed for the day
  if (hospital.todayYMD === dateYMD) {
    const slots = customSlots && customSlots.length > 0 ? customSlots : ALL_TIME_SLOTS;
    const lastSlot = slots[slots.length - 1];
    const [lastH, lastM] = lastSlot.split(":").map(Number);
    const hospitalCloseMinutes = lastH * 60 + lastM;
    return hospital.currentTotalMinutes >= hospitalCloseMinutes;
  }

  return false;
}

/**
 * Computes complete modular operating status and localized slots for any calendar date.
 * Dynamically customizable per hospital facility and consulting physician.
 */
export function getHospitalDateOperatingStatus(
  dateYMD: string,
  userTz?: string,
  bookedSlots: string[] = [],
  blockedDates: BlockedCalendarDate[] = [],
  hoursConfig?: HospitalHoursConfig,
  doctorConfig?: HospitalDoctor | DoctorSummary | null
): HospitalDateOperatingStatus {
  // Defensive guard: invalid or empty date strings
  if (!dateYMD || !dateYMD.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateYMD.trim())) {
    return {
      dateYMD: dateYMD || "",
      isHospitalDayEnded: false,
      isTodayInUserTz: false,
      isPastInUserTz: false,
      slots: [],
      periodGroups: [],
      availableSlotsCount: 0,
      allSlotsUnavailable: true,
      unavailabilityReason: "Please select a consultation date to view available time slots.",
    };
  }

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

  // Evaluate candidate hospital dates [-1, 0, 1] relative to the patient's selected local date
  const offsets = [-1, 0, 1];

  for (const offset of offsets) {
    const candDate = new Date(Date.UTC(year, month - 1, day + offset));
    const candY = candDate.getUTCFullYear();
    const candM = String(candDate.getUTCMonth() + 1).padStart(2, "0");
    const candD = String(candDate.getUTCDate()).padStart(2, "0");
    const hospitalDateYMD = `${candY}-${candM}-${candD}`;

    // Resolve dynamic operational slots for this hospital & doctor
    const docAvailability = (doctorConfig as any)?.availability;
    const operationalSlots = resolveOperationalSlots(hoursConfig, docAvailability);

    // Day of week in hospital timezone
    const dayOfWeek = candDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
    const docSchedule = docAvailability?.schedule;
    const offDays = docSchedule?.offDays || [];
    const isExplicitOffDay = offDays.some((d: string) => d.toLowerCase() === dayOfWeek.toLowerCase());
    const isDocDayOff = isExplicitOffDay || (docAvailability?.days ? !isDayAllowed(dayOfWeek, docAvailability.days) : false);

    // Specific doctor holiday date match (e.g. "YYYY-MM-DD")
    const isDocHolidayDate = docSchedule?.holidays?.includes(hospitalDateYMD);

    // Sunday in hospital timezone (UTC day 0)
    const isSundayInHospital = candDate.getUTCDay() === 0;
    const isSundayClosed = isSundayInHospital && hoursConfig?.sundayPolicy === "Closed";

    // Doctor blocks for this hospital date (scoped to doctor if specified)
    const activeDocId = doctorConfig?.id;
    const dayBlocks = blockedDates.filter((b) => {
      if (b.date !== hospitalDateYMD) return false;
      // If block has a specific doctorId, only block that doctor
      if (b.doctorId && activeDocId) {
        return b.doctorId === activeDocId;
      }
      return true; // Hospital-wide block
    });
    const fullDayBlocked = dayBlocks.find((b) => b.allDay !== false);

    // Appointment-only day check
    const isDocApptOnly = docSchedule?.appointmentOnlyDays?.some(
      (d: string) => d.toLowerCase() === dayOfWeek.toLowerCase() || d.toLowerCase() === "all days"
    );

    for (const slot24 of operationalSlots) {
      const [h24, m24] = slot24.split(":");
      const isoTimestamp = `${hospitalDateYMD}T${h24.padStart(2, "0")}:${m24.padStart(2, "0")}:00+05:30`;
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

      const slotKey = `${hospitalDateYMD}_${slot24}`;
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
      const hospitalTime12 = normalizeSlotToTime(slot24) + " IST";

      // Real-time elapsed check: based on absolute physical time
      const hasPassed = epochMs <= nowMs;

      // Double-booking check
      const isBooked = bookedSlots.includes(slot24) || bookedSlots.includes(slotKey);

      // Blocked / Availability check
      let blockedReason: string | undefined;

      if (isDocHolidayDate) {
        blockedReason = `${doctorConfig?.name ? doctorConfig.name.split(",")[0] : "Doctor"} is on scheduled leave / holiday on this date`;
      } else if (isDocDayOff) {
        blockedReason = `${doctorConfig?.name ? doctorConfig.name.split(",")[0] : "Doctor"} does not consult on ${dayOfWeek}s`;
      } else if (isSundayClosed) {
        blockedReason = "Facility is closed on Sundays";
      } else if (fullDayBlocked) {
        blockedReason = fullDayBlocked.reason || "Doctor Out of Office";
      } else {
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
      const isSundayPriorAppt =
        (isSundayInHospital && !isSundayClosed && hoursConfig?.sundayPolicy !== "Walk-in OPD") ||
        !!isDocApptOnly;

      slots.push({
        slotKey,
        hospitalDateYMD,
        hospitalSlot24: slot24,
        hospitalTime12,
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
        unavailableReason: blockedReason,
        disabled,
        isUnavailable: disabled,
        isSundayPriorAppt,
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

  // Hospital day ended check for this local date
  const isHospitalDayEnded = (isTodayInUserTz && allSlotsUnavailable) || isPastInUserTz;

  // Compute next suggested date if today has ended
  let suggestedNextDate: string | undefined;
  if (isHospitalDayEnded) {
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
    const commonBlockedReason = slots.find((s) => s.blockedReason)?.blockedReason;
    if (commonBlockedReason && slots.every((s) => s.blockedReason === commonBlockedReason)) {
      unavailabilityReason = `${commonBlockedReason}. Please choose another date.`;
    } else {
      unavailabilityReason = `All consultation slots for this date have already been reserved or blocked. Please choose an upcoming date.`;
    }
  }

  return {
    dateYMD,
    isHospitalDayEnded,
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

