import type { HospitalTenantConfig } from "@core/types/tenant";
import { VANILLA_DEFAULT_TENANT } from "./tenantDefaults";
import { validateTenantConfig } from "./tenantSchema";
import { tenantConfigCache } from "./tenantConfigCache";
import { apiFetch, USE } from "../../api/client/httpClient";

export async function fetchRemoteTenantConfig(tenantId: string): Promise<HospitalTenantConfig> {
  const cached = tenantConfigCache.get(tenantId);
  if (cached) return cached;

  if (USE) {
    try {
      const response = await apiFetch<HospitalTenantConfig>(`/api/v1/tenants/${encodeURIComponent(tenantId)}/config`);
      const validation = validateTenantConfig(response);
      if (validation.isValid) {
        tenantConfigCache.set(tenantId, response);
        return response;
      }
      if (import.meta.env.DEV) {
        console.warn(`[TenantConfigService] Remote config for '${tenantId}' failed validation:`, validation.errors);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[TenantConfigService] Failed to load remote tenant config for '${tenantId}':`, err);
      }
    }
  }

  // Safe fallback to default configuration
  return VANILLA_DEFAULT_TENANT;
}

export async function updateRemoteTenantCustomization(hospitalId: string, payload: Record<string, unknown>) {
  if (USE) {
    try {
      return await apiFetch<{ status: string; message: string; hospital: Record<string, unknown> }>(
        `/hospitals/${encodeURIComponent(hospitalId)}/customization`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
    } catch {
      // safe fallback
    }
  }
}
