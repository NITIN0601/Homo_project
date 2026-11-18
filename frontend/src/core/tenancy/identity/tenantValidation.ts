const SAFE_TENANT_ID_REGEX = /^[a-z0-9][a-z0-9_-]{1,63}$/;

export function isValidTenantSlug(slug: string): boolean {
  if (!slug || typeof slug !== "string") return false;
  return SAFE_TENANT_ID_REGEX.test(slug.toLowerCase());
}
