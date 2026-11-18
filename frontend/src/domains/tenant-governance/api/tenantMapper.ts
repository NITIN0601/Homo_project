import type { HospitalTenantConfig } from "../model/tenant";

export function mapToTenantSummary(t: HospitalTenantConfig) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    facilityType: t.facilityType || "hospital",
    doctorName: t.doctor?.name || "Attending Physician",
    primaryColor: t.branding?.primaryColor || "#059669",
    currency: t.currency || "INR",
  };
}
