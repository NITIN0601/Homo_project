import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeAlphanumeric,
  sanitizeCurrency,
  sanitizeEmail,
  sanitizePhone,
  sanitizePincode,
  sanitizeArrayOfStrings,
} from "../core/security/sanitize";

describe("Enterprise Input Sanitization Utilities", () => {
  describe("sanitizeText", () => {
    it("strips HTML angle brackets and prevents basic XSS", () => {
      const input = "<script>alert('xss')</script>Hello World";
      expect(sanitizeText(input)).toBe("scriptalert('xss')/scriptHello World");
    });

    it("strips invisible control characters and trims whitespace", () => {
      const input = "  \u0000Dr. Jane Doe\u001F  ";
      expect(sanitizeText(input)).toBe("Dr. Jane Doe");
    });

    it("clamps string length to max allowed length", () => {
      const longInput = "a".repeat(300);
      expect(sanitizeText(longInput, 100).length).toBe(100);
    });

    it("returns empty string for non-string values", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
      expect(sanitizeText(123)).toBe("");
    });
  });

  describe("sanitizeAlphanumeric", () => {
    it("retains alphanumeric characters and hyphens/underscores by default", () => {
      const input = "  UPI-UTR_987654#@!$%  ";
      expect(sanitizeAlphanumeric(input)).toBe("UPI-UTR_987654");
    });

    it("strips hyphens and underscores when allowSeparators is false", () => {
      const input = "INV-101_v2";
      expect(sanitizeAlphanumeric(input, false)).toBe("INV101v2");
    });
  });

  describe("sanitizeCurrency", () => {
    it("parses valid numbers and rounds to 2 decimal places", () => {
      expect(sanitizeCurrency("1250.556")).toBe(1250.56);
      expect(sanitizeCurrency(800)).toBe(800);
    });

    it("strips currency symbols and spaces", () => {
      expect(sanitizeCurrency("₹ 2,500.00")).toBe(2500);
    });

    it("clamps negative numbers to 0", () => {
      expect(sanitizeCurrency("-500")).toBe(0);
      expect(sanitizeCurrency(-100)).toBe(0);
    });

    it("clamps numbers exceeding maximum threshold", () => {
      expect(sanitizeCurrency(20_000_000, 10_000_000)).toBe(10_000_000);
    });
  });

  describe("sanitizeEmail", () => {
    it("normalizes email to lowercase and strips internal whitespace", () => {
      expect(sanitizeEmail("  User.Name@Example.COM  ")).toBe("user.name@example.com");
      expect(sanitizeEmail("john . doe @ clinic.org")).toBe("john.doe@clinic.org");
    });
  });

  describe("sanitizePhone", () => {
    it("preserves + and digits while removing invalid symbols", () => {
      expect(sanitizePhone("+91 98450-12345 (ext 12)")).toBe("+91 98450-12345 ( 12)");
      expect(sanitizePhone("9845012345#*&^")).toBe("9845012345");
    });
  });

  describe("sanitizePincode", () => {
    it("restricts to exactly 6 digits", () => {
      expect(sanitizePincode("560 034 extra")).toBe("560034");
      expect(sanitizePincode(500033)).toBe("500033");
      expect(sanitizePincode("123456789")).toBe("123456");
    });
  });

  describe("sanitizeArrayOfStrings", () => {
    it("splits comma-separated strings, strips HTML, trims, and deduplicates", () => {
      const input = "Dust Mites, Penicillin, <script>, Penicillin, Pollen ";
      expect(sanitizeArrayOfStrings(input)).toEqual([
        "Dust Mites",
        "Penicillin",
        "script",
        "Pollen",
      ]);
    });

    it("handles native array input", () => {
      const input = ["Arnica 30C", " Nux Vomica 200C ", "Arnica 30C"];
      expect(sanitizeArrayOfStrings(input)).toEqual(["Arnica 30C", "Nux Vomica 200C"]);
    });
  });
});

