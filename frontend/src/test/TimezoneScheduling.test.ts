import { describe, it, expect } from "vitest";
import {
  getLocalizedSlotsForDate,
  isUserSlotPassed,
  getUserTimezone,
  inferTimezoneFromLocation,
  getTimezoneOffsetString,
  getTimezoneAbbreviation,
} from "../core/timezone";
import {
  isHospitalDateConcluded,
  getHospitalDateOperatingStatus,
} from "../domains/scheduling/engine/schedulingEngine";

describe("Internal Doctor Availability & Local Timezone Mapping Engine", () => {
  it("maps hospital IST schedule strictly to Asia/Kolkata local date without dual clock", () => {
    const slots = getLocalizedSlotsForDate("2026-11-15", "Asia/Kolkata");
    // Hospital has 6 morning slots (10:00-12:30) + 5 evening slots (17:30-19:30) = 11 total slots
    expect(slots.length).toBe(11);

    // Morning session
    expect(slots[0].userDateYMD).toBe("2026-11-15");
    expect(slots[0].hospitalSlot24).toBe("10:00");
    expect(slots[0].userTime12).toMatch(/10:00\s*AM/i);
    expect(slots[0].period).toBe("Morning");

    // Evening session
    const eveningSlot = slots.find((s) => s.hospitalSlot24 === "17:30");
    expect(eveningSlot).toBeDefined();
    expect(eveningSlot?.hospitalSlot24).toBe("17:30");
    expect(eveningSlot?.userTime12).toMatch(/0?5:30\s*PM/i);
    expect(eveningSlot?.period).toBe("Evening");
  });

  it("correctly maps candidate hospital slots to an America/New_York (US Eastern) patient's local date", () => {
    const slots = getLocalizedSlotsForDate("2026-11-14", "America/New_York");
    expect(slots.length).toBeGreaterThan(0);

    // All returned slots MUST belong strictly to the patient's local date (2026-11-14)
    for (const slot of slots) {
      expect(slot.userDateYMD).toBe("2026-11-14");
    }

    // Verify morning slots in EST (coming from India Nov 14 evening OPD)
    const morningSlot = slots.find((s) => s.userTime12.includes("7:00 AM") || s.userTime12.includes("07:00 AM"));
    expect(morningSlot).toBeDefined();
    expect(morningSlot?.hospitalDateYMD).toBe("2026-11-14");
    expect(morningSlot?.hospitalSlot24).toBe("17:30");
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
    expect(tzInfo.isHospitalTimezone).toBe(false);

    const kolkataInfo = getUserTimezone("Asia/Kolkata");
    expect(kolkataInfo.isHospitalTimezone).toBe(true);
    expect(kolkataInfo.label).toBe("IST");
  });

  it("sorts localized slots in strict chronological order within the patient's local day", () => {
    const slots = getLocalizedSlotsForDate("2026-11-14", "America/New_York");
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].epochMs).toBeGreaterThan(slots[i - 1].epochMs);
    }
  });

  it("detects when hospital operating day has concluded in India and preserves cross-timezone upcoming slots", () => {
    // Simulated hospital clock: Nov 15 06:00 AM IST
    const mockHospitalTime = {
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
    expect(isHospitalDateConcluded("2026-11-14", mockHospitalTime)).toBe(true);

    // In America/New_York, Nov 14 evening maps to Nov 15 10:00 AM IST (11:30 PM EST)
    const status = getHospitalDateOperatingStatus("2026-11-14", "America/New_York");
    // At 8:00 PM EST, the 11:30 PM slot tonight is upcoming and bookable!
    const slot1130 = status.slots.find((s) => s.userTime12.includes("11:30 PM"));
    expect(slot1130).toBeDefined();
    expect(slot1130?.hospitalDateYMD).toBe("2026-11-15");
    expect(slot1130?.hospitalSlot24).toBe("10:00");
    expect(slot1130?.isSundayPriorAppt).toBe(true);

    // For a fully elapsed past date, all slots are unavailable
    const pastStatus = getHospitalDateOperatingStatus("2026-11-10", "America/New_York");
    expect(pastStatus.isPastInUserTz).toBe(true);
    expect(pastStatus.allSlotsUnavailable).toBe(true);
    expect(pastStatus.availableSlotsCount).toBe(0);
  });

  it("handles doctor-specific weekly off days dynamically", () => {
    // 2026-11-17 is a Tuesday
    const doctorWithTuesdayOff = {
      name: "Dr. Rajesh Sharma",
      title: "Consultant Physician",
      regNo: "MCI-1234",
      experienceYears: 10,
      qualifications: "MD, MBBS",
      availability: {
        schedule: {
          offDays: ["Tuesday"],
          appointmentOnlyDays: ["Monday", "Wednesday", "Thursday", "Friday"],
        },
      },
    };

    const status = getHospitalDateOperatingStatus("2026-11-24", "Asia/Kolkata", [], [], undefined, doctorWithTuesdayOff);
    expect(status.allSlotsUnavailable).toBe(true);
    expect(status.unavailabilityReason).toContain("Dr. Rajesh Sharma does not consult on Tuesdays");
    for (const slot of status.slots) {
      expect(slot.isUnavailable).toBe(true);
      expect(slot.unavailableReason).toContain("Dr. Rajesh Sharma does not consult on Tuesdays");
    }
  });

  it("handles doctor-specific scheduled holidays/leave dates", () => {
    const doctorOnHoliday = {
      name: "Dr. Anita Nair",
      title: "Consultant Pulmonologist",
      regNo: "MCI-5678",
      experienceYears: 8,
      qualifications: "MD, DNB",
      availability: {
        schedule: {
          holidays: ["2026-12-25"],
          offDays: ["Sunday"],
        },
      },
    };

    const status = getHospitalDateOperatingStatus("2026-12-25", "Asia/Kolkata", [], [], undefined, doctorOnHoliday);
    expect(status.allSlotsUnavailable).toBe(true);
    expect(status.unavailabilityReason).toContain("Dr. Anita Nair is on scheduled leave / holiday on this date");
    for (const slot of status.slots) {
      expect(slot.isUnavailable).toBe(true);
      expect(slot.unavailableReason).toContain("Dr. Anita Nair is on scheduled leave");
    }
  });

  it("respects custom hospital hours and Sunday policies", () => {
    // 2026-11-22 is a Sunday
    const customHoursClosedSunday = {
      timezone: "Asia/Kolkata",
      morningDisplay: "09:00 AM – 12:00 PM",
      morningStart: "09:00",
      morningEnd: "12:00",
      sundayPolicy: "Closed" as const,
    };

    const statusClosed = getHospitalDateOperatingStatus("2026-11-22", "Asia/Kolkata", [], [], customHoursClosedSunday);
    expect(statusClosed.allSlotsUnavailable).toBe(true);
    expect(statusClosed.unavailabilityReason).toContain("Facility is closed on Sundays");

    const customHoursApptSunday = {
      timezone: "Asia/Kolkata",
      morningDisplay: "09:00 AM – 12:00 PM",
      morningStart: "09:00",
      morningEnd: "12:00",
      sundayPolicy: "Prior Appointment Only" as const,
    };

    const statusAppt = getHospitalDateOperatingStatus("2026-11-22", "Asia/Kolkata", [], [], customHoursApptSunday);
    expect(statusAppt.allSlotsUnavailable).toBe(false);
    expect(statusAppt.slots.length).toBeGreaterThan(0);
    expect(statusAppt.slots[0].isSundayPriorAppt).toBe(true);
  });

  describe("Automatic Location-to-Timezone Resolution", () => {
    it("infers Indian timezone Asia/Kolkata from Indian cities, states, and country", () => {
      const blr = inferTimezoneFromLocation("India", "Karnataka", "Bengaluru");
      expect(blr.timeZone).toBe("Asia/Kolkata");
      expect(blr.label).toBe("IST");
      expect(blr.offset).toBe("UTC+05:30");
      expect(blr.matchedBy).toBe("city");

      const mumbai = inferTimezoneFromLocation("India", "Maharashtra", "Mumbai");
      expect(mumbai.timeZone).toBe("Asia/Kolkata");

      const delhiState = inferTimezoneFromLocation("India", "Delhi", "");
      expect(delhiState.timeZone).toBe("Asia/Kolkata");

      const indiaCountry = inferTimezoneFromLocation("India", "", "");
      expect(indiaCountry.timeZone).toBe("Asia/Kolkata");
    });

    it("infers US regional timezones correctly by city and state", () => {
      // US Eastern
      const nyc = inferTimezoneFromLocation("USA", "New York", "New York");
      expect(nyc.timeZone).toBe("America/New_York");
      expect(nyc.matchedBy).toBe("city");

      // US Pacific
      const sf = inferTimezoneFromLocation("United States", "California", "San Francisco");
      expect(sf.timeZone).toBe("America/Los_Angeles");

      // US Central
      const chicago = inferTimezoneFromLocation("USA", "Illinois", "Chicago");
      expect(chicago.timeZone).toBe("America/Chicago");

      // US Mountain
      const denver = inferTimezoneFromLocation("USA", "Colorado", "Denver");
      expect(denver.timeZone).toBe("America/Denver");

      // US Arizona (no DST)
      const phx = inferTimezoneFromLocation("USA", "Arizona", "Phoenix");
      expect(phx.timeZone).toBe("America/Phoenix");
    });

    it("infers international timezones for UK, UAE, Singapore, Australia, and Canada", () => {
      const london = inferTimezoneFromLocation("United Kingdom", "England", "London");
      expect(london.timeZone).toBe("Europe/London");

      const dubai = inferTimezoneFromLocation("United Arab Emirates", "Dubai", "Dubai");
      expect(dubai.timeZone).toBe("Asia/Dubai");

      const sgp = inferTimezoneFromLocation("Singapore", "", "Singapore");
      expect(sgp.timeZone).toBe("Asia/Singapore");

      const sydney = inferTimezoneFromLocation("Australia", "New South Wales", "Sydney");
      expect(sydney.timeZone).toBe("Australia/Sydney");

      const perth = inferTimezoneFromLocation("Australia", "Western Australia", "Perth");
      expect(perth.timeZone).toBe("Australia/Perth");

      const toronto = inferTimezoneFromLocation("Canada", "Ontario", "Toronto");
      expect(toronto.timeZone).toBe("America/Toronto");
    });

    it("formats timezone offsets and abbreviations accurately", () => {
      const offset = getTimezoneOffsetString("Asia/Kolkata");
      expect(offset).toBe("UTC+05:30");

      const abbr = getTimezoneAbbreviation("Asia/Kolkata");
      expect(abbr).toBe("IST");
    });
  });

  it("handles doctor-specific weekly off days dynamically", () => {
    // 2026-11-17 is a Tuesday
    const doctorWithTuesdayOff = {
      name: "Dr. Rajesh Sharma",
      title: "Consultant Physician",
      regNo: "MCI-1234",
      experienceYears: 10,
      qualifications: "MD, MBBS",
      availability: {
        schedule: {
          offDays: ["Tuesday"],
          appointmentOnlyDays: ["Monday", "Wednesday", "Thursday", "Friday"],
        },
      },
    };

    const status = getHospitalDateOperatingStatus("2026-11-24", "Asia/Kolkata", [], [], undefined, doctorWithTuesdayOff);
    expect(status.allSlotsUnavailable).toBe(true);
    expect(status.unavailabilityReason).toContain("Dr. Rajesh Sharma does not consult on Tuesdays");
    for (const slot of status.slots) {
      expect(slot.isUnavailable).toBe(true);
      expect(slot.unavailableReason).toContain("Dr. Rajesh Sharma does not consult on Tuesdays");
    }
  });

  it("handles doctor-specific scheduled holidays/leave dates", () => {
    const doctorOnHoliday = {
      name: "Dr. Anita Nair",
      title: "Consultant Pulmonologist",
      regNo: "MCI-5678",
      experienceYears: 8,
      qualifications: "MD, DNB",
      availability: {
        schedule: {
          holidays: ["2026-12-25"],
          offDays: ["Sunday"],
        },
      },
    };

    const status = getHospitalDateOperatingStatus("2026-12-25", "Asia/Kolkata", [], [], undefined, doctorOnHoliday);
    expect(status.allSlotsUnavailable).toBe(true);
    expect(status.unavailabilityReason).toContain("Dr. Anita Nair is on scheduled leave / holiday on this date");
    for (const slot of status.slots) {
      expect(slot.isUnavailable).toBe(true);
      expect(slot.unavailableReason).toContain("Dr. Anita Nair is on scheduled leave");
    }
  });

  it("respects custom hospital hours and Sunday policies", () => {
    // 2026-11-22 is a Sunday
    const customHoursClosedSunday = {
      timezone: "Asia/Kolkata",
      morningDisplay: "09:00 AM – 12:00 PM",
      morningStart: "09:00",
      morningEnd: "12:00",
      sundayPolicy: "Closed" as const,
    };

    const statusClosed = getHospitalDateOperatingStatus("2026-11-22", "Asia/Kolkata", [], [], customHoursClosedSunday);
    expect(statusClosed.allSlotsUnavailable).toBe(true);
    expect(statusClosed.unavailabilityReason).toContain("Facility is closed on Sundays");

    const customHoursApptSunday = {
      timezone: "Asia/Kolkata",
      morningDisplay: "09:00 AM – 12:00 PM",
      morningStart: "09:00",
      morningEnd: "12:00",
      sundayPolicy: "Prior Appointment Only" as const,
    };

    const statusAppt = getHospitalDateOperatingStatus("2026-11-22", "Asia/Kolkata", [], [], customHoursApptSunday);
    expect(statusAppt.allSlotsUnavailable).toBe(false);
    expect(statusAppt.slots.length).toBeGreaterThan(0);
    expect(statusAppt.slots[0].isSundayPriorAppt).toBe(true);
  });

  describe("Automatic Location-to-Timezone Resolution", () => {
    it("infers Indian timezone Asia/Kolkata from Indian cities, states, and country", () => {
      const blr = inferTimezoneFromLocation("India", "Karnataka", "Bengaluru");
      expect(blr.timeZone).toBe("Asia/Kolkata");
      expect(blr.label).toBe("IST");
      expect(blr.offset).toBe("UTC+05:30");
      expect(blr.matchedBy).toBe("city");

      const mumbai = inferTimezoneFromLocation("India", "Maharashtra", "Mumbai");
      expect(mumbai.timeZone).toBe("Asia/Kolkata");

      const delhiState = inferTimezoneFromLocation("India", "Delhi", "");
      expect(delhiState.timeZone).toBe("Asia/Kolkata");

      const indiaCountry = inferTimezoneFromLocation("India", "", "");
      expect(indiaCountry.timeZone).toBe("Asia/Kolkata");
    });

    it("infers US regional timezones correctly by city and state", () => {
      // US Eastern
      const nyc = inferTimezoneFromLocation("USA", "New York", "New York");
      expect(nyc.timeZone).toBe("America/New_York");
      expect(nyc.matchedBy).toBe("city");

      // US Pacific
      const sf = inferTimezoneFromLocation("United States", "California", "San Francisco");
      expect(sf.timeZone).toBe("America/Los_Angeles");

      // US Central
      const chicago = inferTimezoneFromLocation("USA", "Illinois", "Chicago");
      expect(chicago.timeZone).toBe("America/Chicago");

      // US Mountain
      const denver = inferTimezoneFromLocation("USA", "Colorado", "Denver");
      expect(denver.timeZone).toBe("America/Denver");

      // US Arizona (no DST)
      const phx = inferTimezoneFromLocation("USA", "Arizona", "Phoenix");
      expect(phx.timeZone).toBe("America/Phoenix");
    });

    it("infers international timezones for UK, UAE, Singapore, Australia, and Canada", () => {
      const london = inferTimezoneFromLocation("United Kingdom", "England", "London");
      expect(london.timeZone).toBe("Europe/London");

      const dubai = inferTimezoneFromLocation("United Arab Emirates", "Dubai", "Dubai");
      expect(dubai.timeZone).toBe("Asia/Dubai");

      const sgp = inferTimezoneFromLocation("Singapore", "", "Singapore");
      expect(sgp.timeZone).toBe("Asia/Singapore");

      const sydney = inferTimezoneFromLocation("Australia", "New South Wales", "Sydney");
      expect(sydney.timeZone).toBe("Australia/Sydney");

      const perth = inferTimezoneFromLocation("Australia", "Western Australia", "Perth");
      expect(perth.timeZone).toBe("Australia/Perth");

      const toronto = inferTimezoneFromLocation("Canada", "Ontario", "Toronto");
      expect(toronto.timeZone).toBe("America/Toronto");
    });

    it("formats timezone offsets and abbreviations accurately", () => {
      const offset = getTimezoneOffsetString("Asia/Kolkata");
      expect(offset).toBe("UTC+05:30");

      const abbr = getTimezoneAbbreviation("Asia/Kolkata");
      expect(abbr).toBe("IST");
    });
  });
});


