import type { HospitalTenantConfig } from "@core/types/tenant";

const tenantCache = new Map<string, { config: HospitalTenantConfig; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const tenantConfigCache = {
  get(tenantId: string): HospitalTenantConfig | null {
    const entry = tenantCache.get(tenantId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      tenantCache.delete(tenantId);
      return null;
    }
    return entry.config;
  },

  set(tenantId: string, config: HospitalTenantConfig): void {
    tenantCache.set(tenantId, { config, timestamp: Date.now() });
  },

  clear(tenantId?: string): void {
    if (tenantId) {
      tenantCache.delete(tenantId);
    } else {
      tenantCache.clear();
    }
  },
};
