export interface TenantIdentity {
  tenantId: string;
  slug: string;
  domain?: string;
  source: "subdomain" | "header" | "query" | "storage" | "default";
}
