import { describe, it, expect, beforeEach } from "vitest";
import { validateClinicalFile } from "../shared/utils/fileValidation";
import { getHospitalTimeInfo } from "../core/timezone/hospitalClock";
import { toISO } from "../domains/scheduling/pages/AppointmentsPage";

describe("Phase 2: Short-Term Fixes & Reliability Verification", () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
  });

  describe("1. Clinical File Validation (Fix 10)", () => {
    it("accepts valid medical images and documents under 25MB", () => {
      const validImage = new File(["dummy content"], "prescription.jpg", { type: "image/jpeg" });
      const validPdf = new File(["dummy pdf"], "lab_report.pdf", { type: "application/pdf" });

      expect(validateClinicalFile(validImage).valid).toBe(true);
      expect(validateClinicalFile(validPdf).valid).toBe(true);
    });

    it("rejects malicious or unsupported MIME types", () => {
      const executable = new File(["echo hack"], "script.exe", { type: "application/x-msdownload" });
      const res = validateClinicalFile(executable);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Invalid file format");
    });

    it("rejects oversized files exceeding 25MB cap", () => {
      const largeBlob = new Uint8Array(26 * 1024 * 1024);
      const largeFile = new File([largeBlob], "huge_scan.png", { type: "image/png" });
      const res = validateClinicalFile(largeFile);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("exceeds maximum clinical size limit of 25MB");
    });
  });

  describe("2. Dynamic Multi-Tenant Hospital Clock (Fix 18)", () => {
    it("returns correct timezone abbreviation and localized time for Dubai tenant (GST)", () => {
      const clock = getHospitalTimeInfo("Asia/Dubai");
      expect(clock.timeZone).toBe("Asia/Dubai");
      expect(clock.label).toBe("GST");
      expect(clock.formattedTime).toContain("GST");
    });

    it("returns correct timezone abbreviation for London tenant (GMT/BST)", () => {
      const clock = getHospitalTimeInfo("Europe/London");
      expect(clock.timeZone).toBe("Europe/London");
      expect(clock.label).toMatch(/GMT|BST/);
      expect(clock.formattedTime).toMatch(/GMT|BST/);
    });

    it("preserves standard IST for India default tenant", () => {
      const clock = getHospitalTimeInfo("Asia/Kolkata");
      expect(clock.timeZone).toBe("Asia/Kolkata");
      expect(clock.label).toBe("IST");
      expect(clock.formattedTime).toContain("IST");
    });
  });

  describe("3. Dynamic Timezone Offset in toISO (Fix 17)", () => {
    it("formats ISO string with dynamic timezone offset instead of hardcoded +05:30", () => {
      const istIso = toISO("2026-11-20", "14:00", "Asia/Kolkata");
      expect(istIso).toBe("2026-11-20T14:00:00+05:30");

      const dubaiIso = toISO("2026-11-20", "14:00", "Asia/Dubai");
      expect(dubaiIso).toBe("2026-11-20T14:00:00+04:00");

      const londonIso = toISO("2026-11-20", "14:00", "Europe/London");
      expect(londonIso).toMatch(/2026-11-20T14:00:00(\+00:00|Z)/);
    });
  });
});
