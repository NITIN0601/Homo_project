import { describe, it, expect } from "vitest";
import { resolveActiveHospitalTenant } from "../services/tenantResolver";
import { HOSPITAL_TENANTS, DEFAULT_HOSPITAL_TENANT, getHospitalTenantById } from "../config/tenants";

describe("Phase 2: Multi-Hospital Tenant Resolution & Isolation", () => {
  describe("Option A: Domain / Subdomain Resolution", () => {
    it("resolves agastya tenant when hostname contains agastya", () => {
      const tenant = resolveActiveHospitalTenant({ hostname: "agastya.homoeoclinic.com" });
      expect(tenant.id).toBe("agastya");
      expect(tenant.name).toContain("Agastya");
      expect(tenant.features.enableECommerce).toBe(true);
    });

    it("resolves apollo tenant when hostname contains apollo domain", () => {
      const tenant = resolveActiveHospitalTenant({ hostname: "apollo.telecare.in" });
      expect(tenant.id).toBe("apollo");
      expect(tenant.name).toContain("Apollo");
      expect(tenant.features.enableECommerce).toBe(false); // Telemedicine only
    });

    it("falls back to default agastya tenant for localhost or unknown domain", () => {
      const tenant = resolveActiveHospitalTenant({ hostname: "localhost" });
      expect(tenant.id).toBe(DEFAULT_HOSPITAL_TENANT.id);

      const unknown = resolveActiveHospitalTenant({ hostname: "random-health.org" });
      expect(unknown.id).toBe(DEFAULT_HOSPITAL_TENANT.id);
    });
  });

  describe("Option B: Auth / JWT Token Context Resolution", () => {
    it("resolves active hospital when user is authorized for that hospital", () => {
      const tenant = resolveActiveHospitalTenant({
        hostname: "anydomain.com",
        userActiveHospitalId: "apollo",
        userAuthorizedHospitals: ["agastya", "apollo"],
      });
      expect(tenant.id).toBe("apollo");
    });

    it("ignores requested hospital if user is NOT authorized for it", () => {
      const tenant = resolveActiveHospitalTenant({
        hostname: "anydomain.com",
        userActiveHospitalId: "apollo",
        userAuthorizedHospitals: ["agastya"], // Only authorized for agastya
      });
      // Falls back to domain / default
      expect(tenant.id).toBe("agastya");
    });
  });

  describe("Tenant Schema & Branding SSOT", () => {
    it("ensures every hospital has required branding and doctor schema", () => {
      for (const [id, tenant] of Object.entries(HOSPITAL_TENANTS)) {
        expect(tenant.id).toBe(id);
        expect(tenant.branding.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(tenant.doctor.name).toBeDefined();
        expect(tenant.contact.phone).toBeDefined();
        expect(tenant.contact.address.city).toBeDefined();
        expect(typeof tenant.features.enableVoiceStudio).toBe("boolean");
      }
    });

    it("retrieves tenant by ID with safe fallback", () => {
      expect(getHospitalTenantById("apollo").id).toBe("apollo");
      expect(getHospitalTenantById("non-existent-id").id).toBe("agastya");
      expect(getHospitalTenantById(null).id).toBe("agastya");
    });
  });
});

