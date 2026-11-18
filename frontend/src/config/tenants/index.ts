import type { HospitalTenantConfig } from "../../types/tenant";
import { VANILLA_DEFAULT_TENANT } from "./default";
import { AGASTYA_TENANT } from "./agastya";
import { APOLLO_DEMO_TENANT } from "./apollo";

export * from "./constants";

const STORAGE_CUSTOM_REGISTRY_KEY = "hospital_tenants_custom_registry_v1";

const BUILT_IN_TENANTS: Record<string, HospitalTenantConfig> = {
  default: VANILLA_DEFAULT_TENANT,
  agastya: AGASTYA_TENANT,
  apollo: APOLLO_DEMO_TENANT,
};

function loadCustomTenantsFromStorage(): Record<string, HospitalTenantConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // fallback
  }
  return {};
}

function saveCustomTenantsToStorage(tenants: Record<string, HospitalTenantConfig>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CUSTOM_REGISTRY_KEY, JSON.stringify(tenants));
  } catch {
    // ignore
  }
}

// In-memory combined registry
const customTenants = loadCustomTenantsFromStorage();

export const HOSPITAL_TENANTS: Record<string, HospitalTenantConfig> = {
  ...BUILT_IN_TENANTS,
  ...customTenants,
};

export const DEFAULT_HOSPITAL_TENANT = VANILLA_DEFAULT_TENANT;

/**
 * Retrieve a hospital tenant by id (case-insensitive)
 */
export function getHospitalTenantById(tenantId?: string | null): HospitalTenantConfig {
  if (!tenantId) return DEFAULT_HOSPITAL_TENANT;
  return HOSPITAL_TENANTS[tenantId.toLowerCase()] || DEFAULT_HOSPITAL_TENANT;
}

/**
 * Get all registered tenants as an array (SSOT)
 */
export function getAllHospitalTenants(): HospitalTenantConfig[] {
  return Object.values(HOSPITAL_TENANTS);
}

/**
 * Register a newly onboarded hospital tenant into the persistent SSOT registry.
 * Dispatches sync events so ThemeProvider and other dashboards update immediately.
 */
export function registerHospitalTenant(tenant: HospitalTenantConfig): void {
  const key = tenant.id.toLowerCase();
  HOSPITAL_TENANTS[key] = tenant;

  const currentCustom = loadCustomTenantsFromStorage();
  currentCustom[key] = tenant;
  saveCustomTenantsToStorage(currentCustom);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tenant_registry_updated", { detail: { tenantId: tenant.id } }));
    window.dispatchEvent(new Event("tenant_features_changed"));
  }
}

/**
 * Update an existing hospital tenant configuration in the registry.
 */
export function updateHospitalTenantInRegistry(tenant: HospitalTenantConfig): void {
  registerHospitalTenant(tenant);
}

/**
 * Deactivates or removes a hospital tenant from the registry.
 */
export function deleteHospitalTenantFromRegistry(tenantId: string): void {
  const key = tenantId.toLowerCase();
  if (HOSPITAL_TENANTS[key]) {
    HOSPITAL_TENANTS[key] = {
      ...HOSPITAL_TENANTS[key],
      isActive: false,
    };
  }

  const currentCustom = loadCustomTenantsFromStorage();
  if (currentCustom[key]) {
    delete currentCustom[key];
    saveCustomTenantsToStorage(currentCustom);
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`hospital_tenant_custom_v1_${key}`);
    } catch {}
    window.dispatchEvent(new CustomEvent("tenant_registry_updated", { detail: { tenantId } }));
    window.dispatchEvent(new Event("tenant_features_changed"));
  }
}
