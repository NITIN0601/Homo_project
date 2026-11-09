import type { HospitalTenantConfig } from "../../types/tenant";
import { VANILLA_DEFAULT_TENANT } from "./default";
import { AGASTYA_TENANT } from "./agastya";
import { APOLLO_DEMO_TENANT } from "./apollo";

export const HOSPITAL_TENANTS: Record<string, HospitalTenantConfig> = {
  default: VANILLA_DEFAULT_TENANT,
  agastya: AGASTYA_TENANT,
  apollo: APOLLO_DEMO_TENANT,
};

export const DEFAULT_HOSPITAL_TENANT = VANILLA_DEFAULT_TENANT;

export function getHospitalTenantById(tenantId?: string | null): HospitalTenantConfig {
  if (!tenantId) return DEFAULT_HOSPITAL_TENANT;
  return HOSPITAL_TENANTS[tenantId.toLowerCase()] || DEFAULT_HOSPITAL_TENANT;
}
