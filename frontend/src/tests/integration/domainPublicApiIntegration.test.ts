import { describe, it, expect } from "vitest";

// Verify that domain public entry points are cleanly importable without deep internal imports
import { formatInvoiceStatus } from "../../domains/billing-finance";
import { formatAppointmentStatus } from "../../domains/scheduling";
import { formatStockStatus } from "../../domains/dispensary-pharmacy";
import { formatVisitDateDisplay } from "../../domains/clinical-ehr";
import { isValidEmail } from "../../domains/iam-auth";
import { mapToTenantSummary } from "../../domains/tenant-governance";

describe("Domain Public API Contract Integrations", () => {
  it("billing-finance: formats invoice status correctly", () => {
    expect(formatInvoiceStatus("paid")).toBe("Paid");
    expect(formatInvoiceStatus("pending")).toBe("Pending");
  });

  it("scheduling: formats appointment status correctly", () => {
    expect(formatAppointmentStatus("Confirmed")).toBe("Confirmed");
    expect(formatAppointmentStatus("Cancelled")).toBe("Cancelled");
  });

  it("dispensary-pharmacy: formats stock status with danger/warning/success", () => {
    expect(formatStockStatus(0).variant).toBe("danger");
    expect(formatStockStatus(5).variant).toBe("warning");
    expect(formatStockStatus(25).variant).toBe("success");
  });

  it("clinical-ehr: formats visit dates accurately", () => {
    const formatted = formatVisitDateDisplay("2026-11-18T10:00:00Z");
    expect(formatted).toContain("2026");
  });

  it("iam-auth: validates email formats safely", () => {
    expect(isValidEmail("doctor@hospital.org")).toBe(true);
    expect(isValidEmail("invalid-email")).toBe(false);
  });

  it("tenant-governance: creates clean tenant summary", () => {
    const summary = mapToTenantSummary({
      id: "hosp-1",
      name: "City Care Clinic",
      slug: "citycare",
      shortName: "CityCare",
      tagline: "Care everywhere",
      doctor: { id: "doc-1", name: "Dr. Alice", title: "MD", regNo: "1", experienceYears: 5, qualifications: "MD", aboutText: "", specialties: [] },
      contact: { phone: "123", phoneDisplay: "123", email: "a@b.com", address: { street: "", city: "", state: "", pincode: "", country: "", full: "", short: "", mapsUrl: "" } },
      branding: { primaryColor: "#10b981", primaryLight: "", primaryDark: "", accentColor: "", logoUrl: "", aboutDocText: "", aboutHospitalText: "" },
      features: { enablePatientPortal: true, enableOnlineBooking: true, enableMedicineOrdering: true, enableVoiceStudio: true, enableCustomPO: true, enableAgastyaBot: true, enableClinicalMedia: true },
    });
    expect(summary.id).toBe("hosp-1");
    expect(summary.primaryColor).toBe("#10b981");
  });
});
