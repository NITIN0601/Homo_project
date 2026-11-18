import type { Page, AdminTab } from "@core/types";

export type { Page, AdminTab };

export interface RouteDefinition {
  path: string;
  page: Page;
  adminTab?: AdminTab;
  title: string;
  isProtected?: boolean;
  requiredRole?: "admin" | "super_admin" | "patient";
}
