import { HOSPITAL, OFFICE_HOURS, ALL_TIME_SLOTS } from "../../config/hospital";
import type {
  UserTimezoneInfo,
  SlotTimeMapping,
  MappedSessionHours,
  LocalizedUserSlot,
} from "./types";
import { COMMON_TIMEZONES } from "./constants";
import {
  normalizeSlotToTime,
  normalizeDateAlias,
  getTimeOfDayPeriod,
  getTimeOfDayEmoji,
} from "./hospitalClock";

/**
 * Returns detected local timezone information from the patient's browser environment,
 * or from a user-selected timezone override.
 */
export function getUserTimezone(customTz?: string): UserTimezoneInfo {
  const hospitalTz: string = HOSPITAL.TIMEZONE || "Asia/Kolkata";
  let timeZone = customTz;
  if (!timeZone) {
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || hospitalTz;
    } catch {
      timeZone = hospitalTz;
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
  const isHospitalTimezone = timeZone === hospitalTz || timeZone === "Asia/Calcutta" || timeZone === "Asia/Kolkata";

  return {
    timeZone,
    label: isHospitalTimezone ? "IST" : (label || timeZone),
    formattedTime,
    formattedDate,
    todayYMD,
    offset,
    regionName,
    isHospitalTimezone,
  };
}

/**
 * Maps a hospital time slot (Asia/Kolkata) to the patient's local timezone.
 */
export function mapHospitalSlotToUserTime(
  dateYMD: string,
  slot24: string,
  userTz?: string
): SlotTimeMapping {
  const hospitalTz = HOSPITAL.TIMEZONE || "Asia/Kolkata";
  const hospitalTime12 = normalizeSlotToTime(slot24) + " IST";
  const normalizedYMD = normalizeDateAlias(dateYMD || "today");

  let targetTz = userTz;
  if (!targetTz) {
    try {
      targetTz = Intl.DateTimeFormat().resolvedOptions().timeZone || hospitalTz;
    } catch {
      targetTz = hospitalTz;
    }
  }

  const isDifferentTimezone = targetTz !== hospitalTz && targetTz !== "Asia/Calcutta";

  const [hStr, mStr] = slot24.split(":");
  const hospitalH = parseInt(hStr || "0", 10);
  const hospitalM = parseInt(mStr || "0", 10);
  const isoHospitalString = `${normalizedYMD}T${(hStr || "00").padStart(2, "0")}:${(mStr || "00").padStart(2, "0")}:00+05:30`;
  const dateObj = new Date(isoHospitalString);

  let hospitalDateFormatted = normalizedYMD;
  try {
    const cdf = new Intl.DateTimeFormat("en-US", {
      timeZone: hospitalTz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    hospitalDateFormatted = cdf.format(dateObj);
  } catch {}

  const hospitalPeriod = getTimeOfDayPeriod(hospitalH, hospitalM);
  const hospitalEmoji = getTimeOfDayEmoji(hospitalPeriod);

  if (!isDifferentTimezone) {
    return {
      slot24,
      hospitalTime12,
      hospitalDateFormatted,
      userTime12: hospitalTime12,
      userShortLabel: normalizeSlotToTime(slot24),
      userDateFormatted: hospitalDateFormatted,
      userDayOffsetDesc: "Same Day",
      isDifferentDay: false,
      userTimeZone: hospitalTz,
      isDifferentTimezone: false,
      fullComparison: hospitalTime12,
      userDateWithTime: `${hospitalDateFormatted} · ${hospitalTime12}`,
      userHour24: hospitalH,
      userMinute: hospitalM,
      timeOfDayPeriod: hospitalPeriod,
      timeOfDayEmoji: hospitalEmoji,
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
      hospitalTime12,
      hospitalDateFormatted,
      userTime12,
      userShortLabel,
      userDateFormatted,
      userDayOffsetDesc,
      isDifferentDay,
      userTimeZone: targetTz || hospitalTz,
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
      hospitalTime12,
      hospitalDateFormatted,
      userTime12: hospitalTime12,
      userShortLabel: normalizeSlotToTime(slot24),
      userDateFormatted: hospitalDateFormatted,
      userDayOffsetDesc: "Same Day",
      isDifferentDay: false,
      userTimeZone: targetTz || hospitalTz,
      isDifferentTimezone: false,
      fullComparison: hospitalTime12,
      userDateWithTime: `${hospitalDateFormatted} · ${hospitalTime12}`,
      userHour24: hospitalH,
      userMinute: hospitalM,
      timeOfDayPeriod: hospitalPeriod,
      timeOfDayEmoji: hospitalEmoji,
    };
  }
}

/**
 * Returns hospital operational session ranges dynamically mapped to the patient's local timezone.
 */
export function getMappedSessionHours(
  dateYMD?: string,
  userTz?: string
): MappedSessionHours {
  const normYMD = normalizeDateAlias(dateYMD || "today");
  const mStart = mapHospitalSlotToUserTime(normYMD, "10:00", userTz);
  const mEnd = mapHospitalSlotToUserTime(normYMD, "13:00", userTz);
  const eStart = mapHospitalSlotToUserTime(normYMD, "17:30", userTz);
  const eEnd = mapHospitalSlotToUserTime(normYMD, "20:00", userTz);

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
      hospitalRange: "10:00 AM – 01:00 PM IST",
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
      hospitalRange: "05:30 PM – 08:00 PM IST",
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
      hospitalRange: "05:30 PM – 08:00 PM IST",
      userRange: eveningUserRange,
      display: walkinDisplay,
      policy: walkinPolicy,
      period: eveningPeriod,
    },
    sunday: {
      hospitalRange: OFFICE_HOURS.SUNDAY.hours,
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
 * Returns formatted date and time in both user local timezone and hospital IST timezone.
 */
export function formatDualDateTime(
  dateOrIso: Date | string,
  userTz?: string
): { userDateTime: string; hospitalDateTime: string; isDifferentTimezone: boolean } {
  const dateObj = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  const hospitalTz = HOSPITAL.TIMEZONE || "Asia/Kolkata";

  const hospitalFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: hospitalTz,
    dateStyle: "full",
    timeStyle: "short",
  });
  const hospitalDateTime = `${hospitalFormatter.format(dateObj)} IST`;

  const tzInfo = getUserTimezone(userTz);
  if (tzInfo.isHospitalTimezone) {
    return {
      userDateTime: hospitalDateTime,
      hospitalDateTime,
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
    hospitalDateTime,
    isDifferentTimezone: true,
  };
}

/**
 * Calculates doctor consultation availability mapped strictly to the patient's local calendar date.
 */
export function getLocalizedSlotsForDate(
  userDateYMD: string,
  userTz?: string
): LocalizedUserSlot[] {
  if (!userDateYMD) return [];

  const hospitalTz = HOSPITAL.TIMEZONE || "Asia/Kolkata";
  let targetTz = userTz;
  if (!targetTz) {
    try {
      targetTz = Intl.DateTimeFormat().resolvedOptions().timeZone || hospitalTz;
    } catch {
      targetTz = hospitalTz;
    }
  }

  const [yStr, mStr, dStr] = userDateYMD.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (!year || !month || !day) return [];

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
  const offsets = [-1, 0, 1];

  for (const offset of offsets) {
    const candDate = new Date(Date.UTC(year, month - 1, day + offset));
    const candY = candDate.getUTCFullYear();
    const candM = String(candDate.getUTCMonth() + 1).padStart(2, "0");
    const candD = String(candDate.getUTCDate()).padStart(2, "0");
    const hospitalDateYMD = `${candY}-${candM}-${candD}`;

    for (const slot24 of ALL_TIME_SLOTS) {
      const [h24, m24] = slot24.split(":");
      const isoTimestamp = `${hospitalDateYMD}T${h24.padStart(2, "0")}:${m24.padStart(2, "0")}:00+05:30`;
      const dateObj = new Date(isoTimestamp);
      const epochMs = dateObj.getTime();

      const ymdParts = ymdFormatter.formatToParts(dateObj);
      const getP = (t: string) => ymdParts.find((p) => p.type === t)?.value || "";
      const slotUserDateYMD = `${getP("year")}-${getP("month")}-${getP("day")}`;

      if (slotUserDateYMD !== userDateYMD) {
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
      const userTime24 = `${String(userHour24).padStart(2, "0")}:${String(userMinute).padStart(2, "0")}`;

      const period = getTimeOfDayPeriod(userHour24, userMinute);
      const periodEmoji = getTimeOfDayEmoji(period);
      const hospitalTime12 = normalizeSlotToTime(slot24) + " IST";

      results.push({
        slotKey,
        userDateYMD,
        userTime12,
        userShortLabel,
        userTime24,
        userHour24,
        userMinute,
        hospitalDateYMD,
        hospitalSlot24: slot24,
        hospitalTime12,
        isoTimestamp,
        epochMs,
        period,
        periodEmoji,
      });
    }
  }

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

