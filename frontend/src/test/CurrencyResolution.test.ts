import { describe, it, expect } from "vitest";
import { inferCurrencyFromCountry, formatCurrency, SUPPORTED_CURRENCIES } from "../utils/currency";
import { formatINR } from "../utils/format";
import * as timezone from "../utils/timezone";

describe("Location-Based Currency Resolution & Modular Timezone", () => {
  describe("inferCurrencyFromCountry", () => {
    it("resolves India to INR (₹)", () => {
      const curr = inferCurrencyFromCountry("India");
      expect(curr.code).toBe("INR");
      expect(curr.symbol).toBe("₹");
      expect(curr.name).toBe("Indian Rupee (INR)");
    });

    it("resolves United States, USA, US to USD ($)", () => {
      expect(inferCurrencyFromCountry("United States").code).toBe("USD");
      expect(inferCurrencyFromCountry("USA").code).toBe("USD");
      expect(inferCurrencyFromCountry("U.S.A.").code).toBe("USD");
      expect(inferCurrencyFromCountry("US").symbol).toBe("$");
    });

    it("resolves United Kingdom, UK, Great Britain to GBP (£)", () => {
      expect(inferCurrencyFromCountry("United Kingdom").code).toBe("GBP");
      expect(inferCurrencyFromCountry("UK").symbol).toBe("£");
      expect(inferCurrencyFromCountry("England").code).toBe("GBP");
    });

    it("resolves United Arab Emirates and Dubai to AED", () => {
      expect(inferCurrencyFromCountry("United Arab Emirates").code).toBe("AED");
      expect(inferCurrencyFromCountry("UAE").code).toBe("AED");
      expect(inferCurrencyFromCountry("Dubai").symbol).toBe("AED");
    });

    it("resolves Eurozone countries to EUR (€)", () => {
      expect(inferCurrencyFromCountry("Germany").code).toBe("EUR");
      expect(inferCurrencyFromCountry("France").symbol).toBe("€");
      expect(inferCurrencyFromCountry("Netherlands").code).toBe("EUR");
      expect(inferCurrencyFromCountry("Ireland").symbol).toBe("€");
    });

    it("resolves Canada, Australia, Singapore correctly", () => {
      expect(inferCurrencyFromCountry("Canada").code).toBe("CAD");
      expect(inferCurrencyFromCountry("Australia").code).toBe("AUD");
      expect(inferCurrencyFromCountry("Singapore").code).toBe("SGD");
    });

    it("falls back to default INR when country is unknown or empty", () => {
      expect(inferCurrencyFromCountry("").code).toBe("INR");
      expect(inferCurrencyFromCountry(undefined).code).toBe("INR");
      expect(inferCurrencyFromCountry("Unknown Land").code).toBe("INR");
    });
  });

  describe("formatCurrency", () => {
    it("formats amounts in USD with dollar symbol", () => {
      const formatted = formatCurrency(150, "USD", "$");
      expect(formatted).toBe("$150");
    });

    it("formats amounts in GBP with pound symbol", () => {
      const formatted = formatCurrency(2500, "GBP", "£");
      expect(formatted).toBe("£2,500");
    });

    it("formats amounts in AED", () => {
      const formatted = formatCurrency(500, "AED", "AED");
      expect(formatted.replace(/\u00a0/g, " ")).toBe("AED 500");
    });

    it("formats INR with Indian rupee symbol", () => {
      const formatted = formatCurrency(1500, "INR", "₹");
      expect(formatted).toBe("₹1,500");
    });

    it("formatINR backward-compatible helper works as expected", () => {
      expect(formatINR(750)).toBe("₹750");
      expect(formatINR(12500)).toBe("₹12,500");
    });
  });

  describe("Modular Timezone Facade Re-export Integrity", () => {
    it("exports all critical timezone functions and constants", () => {
      expect(typeof timezone.getUserTimezone).toBe("function");
      expect(typeof timezone.inferTimezoneFromLocation).toBe("function");
      expect(typeof timezone.getHospitalTimeInfo).toBe("function");
      expect(typeof timezone.normalizeSlotToTime).toBe("function");
      expect(typeof timezone.normalizeTimeToSlot).toBe("function");
      expect(typeof timezone.isSlotPassed).toBe("function");
      expect(typeof timezone.mapHospitalSlotToUserTime).toBe("function");
      expect(typeof timezone.getMappedSessionHours).toBe("function");
      expect(typeof timezone.formatDualDateTime).toBe("function");
      expect(timezone.COMMON_TIMEZONES).toBeDefined();
      expect(timezone.COMMON_TIMEZONES.length).toBeGreaterThan(0);
      expect(timezone.CANONICAL_TIMEZONE_ABBREVIATIONS).toBeDefined();
      expect(timezone.CANONICAL_TIMEZONE_ABBREVIATIONS["Asia/Kolkata"]).toBe("IST");
    });

    it("infers timezone correctly from countries", () => {
      expect(timezone.inferTimezoneFromLocation("India").timeZone).toBe("Asia/Kolkata");
      expect(timezone.inferTimezoneFromLocation("USA", "New York", "New York").timeZone).toBe("America/New_York");
      expect(timezone.inferTimezoneFromLocation("UK", undefined, "London").timeZone).toBe("Europe/London");
      expect(timezone.inferTimezoneFromLocation("UAE", undefined, "Dubai").timeZone).toBe("Asia/Dubai");
    });
  });
});
