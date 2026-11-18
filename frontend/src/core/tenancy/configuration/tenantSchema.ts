import type { HospitalTenantConfig } from "@core/types/tenant";

export function validateTenantConfig(config: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!config || typeof config !== "object") {
    return { isValid: false, errors: ["Tenant configuration must be an object"] };
  }

  const c = config as Record<string, unknown>;
  if (typeof c.id !== "string" || !c.id) errors.push("Missing valid tenant 'id'");
  if (typeof c.name !== "string" || !c.name) errors.push("Missing valid hospital 'name'");
  if (typeof c.shortName !== "string" || !c.shortName) errors.push("Missing valid hospital 'shortName'");

  if (!c.branding || typeof c.branding !== "object") {
    errors.push("Missing valid 'branding' configuration");
  } else {
    const b = c.branding as Record<string, unknown>;
    if (typeof b.primaryColor !== "string") errors.push("Missing branding 'primaryColor'");
  }

  if (!c.contact || typeof c.contact !== "object") {
    errors.push("Missing valid 'contact' information");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function isSafeTenantConfig(config: unknown): config is HospitalTenantConfig {
  return validateTenantConfig(config).isValid;
}
