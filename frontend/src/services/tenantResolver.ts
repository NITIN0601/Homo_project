import type { HospitalTenantConfig } from "../types/tenant";
import { HOSPITAL_TENANTS, DEFAULT_HOSPITAL_TENANT } from "../config/tenants";

export interface TenantResolutionContext {
  hostname?: string;
  queryParamTenant?: string;
  userActiveHospitalId?: string | null;
  userAuthorizedHospitals?: string[];
}

/**
 * Resolves active hospital tenant according to dual-resolution rules:
 * 0. Query Parameter: ?tenant=... or ?hospital=...
 * 1. Option B: Active User Context (if logged in and authorized)
 * 2. Option A: Domain / Subdomain matching from hostname
 * 3. Fallback: Default clinic tenant (Agastya)
 */
export function resolveActiveHospitalTenant(ctx?: TenantResolutionContext): HospitalTenantConfig {
  // ── 0. Query Parameter Override (?tenant=... or ?hospital=...) ───────────────
  const queryTenant =
    ctx?.queryParamTenant ||
    (typeof window !== "undefined" && window.location?.search
      ? new URLSearchParams(window.location.search).get("tenant") ||
        new URLSearchParams(window.location.search).get("hospital")
      : null);
  if (queryTenant && HOSPITAL_TENANTS[queryTenant.toLowerCase()]) {
    return HOSPITAL_TENANTS[queryTenant.toLowerCase()];
  }

  if (!ctx) {
    if (typeof window !== "undefined") {
      ctx = { hostname: window.location.hostname };
    } else {
      return DEFAULT_HOSPITAL_TENANT;
    }
  }

  // ── 1. Option B: Auth / Session Context ─────────────────────────────────────
  if (ctx.userActiveHospitalId) {
    const userTenantId = ctx.userActiveHospitalId.toLowerCase();
    // Verify user authorization if authorized list is present
    if (!ctx.userAuthorizedHospitals || ctx.userAuthorizedHospitals.includes(userTenantId)) {
      if (HOSPITAL_TENANTS[userTenantId]) {
        return HOSPITAL_TENANTS[userTenantId];
      }
    }
  }

  // ── 2. Option A: Domain / Subdomain Resolution ──────────────────────────────
  const hostname = (ctx.hostname || (typeof window !== "undefined" ? window.location.hostname : "")).toLowerCase().split(":")[0];

  for (const tenant of Object.values(HOSPITAL_TENANTS)) {
    // Custom domain direct match
    if (tenant.domain && hostname === tenant.domain.toLowerCase()) {
      return tenant;
    }
    // Subdomain matching
    if (tenant.subdomains) {
      for (const sub of tenant.subdomains) {
        if (hostname.startsWith(`${sub.toLowerCase()}.`) || hostname === sub.toLowerCase()) {
          return tenant;
        }
      }
    }
  }

  // Check fallback keyword in hostname
  if (hostname.includes("apollo")) {
    return HOSPITAL_TENANTS.apollo || DEFAULT_HOSPITAL_TENANT;
  }

  // ── 3. Fallback to default configured clinic tenant ─────────────────────────
  return DEFAULT_HOSPITAL_TENANT;
}

