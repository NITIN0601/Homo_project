import { describe, it, expect } from "vitest";
import { generateDefaultLegalTemplates } from "../core/config/tenants/constants";
import type { HospitalTenantConfig } from "../domains/tenant-governance/model/tenant";
import { DEFAULT_HOSPITAL_TENANT } from "../core/config/tenants";

describe("Dynamic Legal Policies & Facility Terminology Synchronization", () => {
  it("generates facility-specific legal templates with hospital terminology by default", () => {
    const templates = generateDefaultLegalTemplates(
      "St. Jude Medical Center",
      "hospital",
      "Boston",
      "+1 617-555-0199",
      "care@stjude.org"
    );

    expect(templates.aboutHospitalText).toContain("St. Jude Medical Center");
    expect(templates.aboutHospitalText).toContain("Boston");
    expect(templates.emergencyNotice).toContain("St. Jude Medical Center");
    expect(templates.emergencyNotice).toContain("emergency room");
    expect(templates.termsConditionsText).toContain("St. Jude Medical Center");
    expect(templates.termsConditionsText).toContain("APPOINTMENTS & CLINICAL CONSULTATIONS");
    expect(templates.privacyPolicyText).toContain("St. Jude Medical Center");
    expect(templates.privacyPolicyText).toContain("how our hospital collects");
    expect(templates.privacyPolicyText).toContain("care@stjude.org");
    expect(templates.privacyPolicyText).toContain("+1 617-555-0199");
  });

  it("generates facility-specific legal templates with clinic terminology when facilityType is clinic", () => {
    const templates = generateDefaultLegalTemplates(
      "Lotus Integrative Health Clinic",
      "clinic",
      "San Francisco",
      "+1 415-555-0144",
      "contact@lotusclinic.com"
    );

    expect(templates.aboutHospitalText).toContain("Lotus Integrative Health Clinic");
    expect(templates.aboutHospitalText).toContain("San Francisco");
    expect(templates.privacyPolicyText).toContain("how our clinic collects");
    expect(templates.privacyPolicyText).toContain("Lotus Integrative Health Clinic");
  });

  it("ensures HospitalTenantConfig correctly carries facilityType and legal policies", () => {
    const customTenant: HospitalTenantConfig = {
      ...DEFAULT_HOSPITAL_TENANT,
      id: "greenwood-clinic",
      slug: "greenwood-clinic",
      name: "Greenwood Wellness Clinic",
      facilityType: "clinic",
      legal: {
        termsConditionsText: "Custom Greenwood Terms & Conditions",
        privacyPolicyText: "Custom Greenwood Privacy Policy",
        emergencyNotice: "Custom Greenwood Emergency Notice",
        lastUpdated: "2026-11-17T00:00:00Z",
      },
    };

    expect(customTenant.facilityType).toBe("clinic");
    expect(customTenant.legal?.termsConditionsText).toBe("Custom Greenwood Terms & Conditions");
    expect(customTenant.legal?.privacyPolicyText).toBe("Custom Greenwood Privacy Policy");
    expect(customTenant.legal?.emergencyNotice).toBe("Custom Greenwood Emergency Notice");
  });
});
