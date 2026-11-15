import { describe, it, expect } from "vitest";
import {
  getLocalizedSlotsForDate,
  isUserSlotPassed,
  getUserTimezone,
  COMMON_TIMEZONES,
  getClinicTimeInfo,
} from "../utils/timezone";
import {
  isClinicDateConcluded,
  getClinicDateOperatingStatus,
} from "../utils/schedulingEngine";

describe("Internal Doctor Availability & Local Timezone Mapping Engine", () => {
  it("maps clinic IST schedule strictly to Asia/Kolkata local date without dual clock", () => {
    const slots = getLocalizedSlotsForDate("2026-11-15", "Asia/Kolkata");
    // Clinic has 6 morning slots (10:00-12:30) + 5 evening slots (17:30-19:30) = 11 total slots
    expect(slots.length).toBe(11);

    // Morning session
    expect(slots[0].userDateYMD).toBe("2026-11-15");
    expect(slots[0].clinicSlot24).toBe("10:00");
    expect(slots[0].userTime12).toMatch(/10:00\s*AM/i);
    expect(slots[0].period).toBe("Morning");

    // Evening session
    const eveningSlot = slots.find((s) => s.clinicSlot24 === "17:30");
    expect(eveningSlot).toBeDefined();
    expect(eveningSlot?.userTime12).toMatch(/0?5:30\s*PM/i);
    expect(eveningSlot?.period).toBe("Evening");
  });

  it("correctly maps candidate clinic slots to an America/New_York (US Eastern) patient's local date", () => {
    const slots = getLocalizedSlotsForDate("2026-11-14", "America/New_York");
    expect(slots.length).toBeGreaterThan(0);

    // All returned slots MUST belong strictly to the patient's local date (2026-11-14)
    for (const slot of slots) {
      expect(slot.userDateYMD).toBe("2026-11-14");
    }

    // Verify morning slots in EST (coming from India Nov 14 evening OPD)
    const morningSlot = slots.find((s) => s.userTime12.includes("7:00 AM") || s.userTime12.includes("07:00 AM"));
    expect(morningSlot).toBeDefined();
    expect(morningSlot?.clinicDateYMD).toBe("2026-11-14");
    expect(morningSlot?.clinicSlot24).toBe("17:30");
    expect(morningSlot?.period).toBe("Morning");
  });

  it("evaluates isUserSlotPassed accurately in absolute time", () => {
    const pastIso = new Date(Date.now() - 3600000).toISOString();
    const futureIso = new Date(Date.now() + 3600000).toISOString();

    expect(isUserSlotPassed(pastIso)).toBe(true);
    expect(isUserSlotPassed(futureIso)).toBe(false);
  });

  it("resolves COMMON_TIMEZONES and detects valid local timezone", () => {
    const tzInfo = getUserTimezone("America/New_York");
    expect(tzInfo.timeZone).toBe("America/New_York");
    expect(tzInfo.todayYMD).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tzInfo.isClinicTimezone).toBe(false);

    const kolkataInfo = getUserTimezone("Asia/Kolkata");
    expect(kolkataInfo.isClinicTimezone).toBe(true);
    expect(kolkataInfo.label).toBe("IST");
  });

  it("sorts localized slots in strict chronological order within the patient's local day", () => {
    const slots = getLocalizedSlotsForDate("2026-11-14", "America/New_York");
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].epochMs).toBeGreaterThan(slots[i - 1].epochMs);
    }
  });

  it("detects when clinic operating day has concluded in India and preserves cross-timezone upcoming slots", () => {
    // Simulated clinic clock: Nov 15 06:00 AM IST
    const mockClinicTime = {
      todayYMD: "2026-11-15",
      currentHour: 6,
      currentMinute: 0,
      currentTotalMinutes: 360,
      formattedTime: "6:00 AM IST",
      formattedDate: "Sunday, Nov 15, 2026",
      timeZone: "Asia/Kolkata",
      label: "IST",
    };

    // Date Nov 14 in India has concluded!
    expect(isClinicDateConcluded("2026-11-14", mockClinicTime)).toBe(true);

    // In America/New_York, Nov 14 evening maps to Nov 15 10:00 AM IST (11:30 PM EST)
    const status = getClinicDateOperatingStatus("2026-11-14", "America/New_York");
    // At 8:00 PM EST, the 11:30 PM slot tonight is upcoming and bookable!
    const slot1130 = status.slots.find((s) => s.userTime12.includes("11:30 PM"));
    expect(slot1130).toBeDefined();
    expect(slot1130?.clinicDateYMD).toBe("2026-11-15");
    expect(slot1130?.clinicSlot24).toBe("10:00");
    expect(slot1130?.isSundayPriorAppt).toBe(true);

    // For a fully elapsed past date, all slots are unavailable
    const pastStatus = getClinicDateOperatingStatus("2026-11-10", "America/New_York");
    expect(pastStatus.isPastInUserTz).toBe(true);
    expect(pastStatus.allSlotsUnavailable).toBe(true);
    expect(pastStatus.availableSlotsCount).toBe(0);
  });
});

