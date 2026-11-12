import type { Page, AdminTab } from "../types";

// ─── Bidirectional URL Router & Route Mapping (SSOT) ──────────────────────────
export interface ParsedRoute {
  page: Page;
  adminTab?: AdminTab;
}

export const ROUTE_TITLE_MAP: Record<string, string> = {
  "/": "Gentle Healing, Lasting Wellness",
  "/about": "About Us",
  "/appointments": "Book Consultation",
  "/cart": "Prescription & Medicine Cart",
  "/order-medicine": "Order Medicines & Dispensary",
  "/visit-summary": "My Clinical Records & Invoices",
  "/visit-summary/records": "My Medical Records & Clinical History",
  "/visit-summary/payments": "My Consultation Billing & Payment History",
  "/billing": "My Consultation Billing & Invoices",
  "/mobile-worker": "Field Care Worker Portal",
  "/privacy-policy": "Privacy Policy",
  "/terms": "Terms & Conditions",
  "/join": "Patient Portal Activation & Onboarding",
  "/admin/dashboard": "Doctor Practice Console",
  "/admin/appointments": "Consultations & Schedule Queue",
  "/admin/patients": "Patient Medical Records & Case Files",
  "/admin/supplies": "Dispensary Stock & Medical Supplies",
  "/admin/dispatches": "Logistics & PO Dispatches",
  "/admin/calendar": "Doctor Blocked Days & OOO Calendar",
};

export function parseRouteFromLocation(): ParsedRoute {
  if (typeof window === "undefined") return { page: "home" };
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get("page") as Page | null;

  // Direct param fallback if present
  if (pageParam) {
    if (pageParam === "admin-dashboard") {
      const tabParam = params.get("tab") as AdminTab | null;
      return { page: "admin-dashboard", adminTab: tabParam || "dashboard" };
    }
    return { page: pageParam };
  }

  // Super Admin routes
  if (rawPath === "/super-admin" || rawPath === "/super-admin/dashboard" || rawPath === "/platform") {
    return { page: "super-admin-dashboard" };
  }

  // Admin routes
  if (rawPath === "/admin" || rawPath === "/admin/dashboard" || rawPath === "/dashboard") {
    return { page: "admin-dashboard", adminTab: "dashboard" };
  }
  if (rawPath === "/admin/appointments") {
    return { page: "admin-dashboard", adminTab: "appointments" };
  }
  if (rawPath === "/admin/patients" || rawPath === "/admin/patients-records" || rawPath === "/patients") {
    return { page: "admin-dashboard", adminTab: "patients" };
  }
  if (
    rawPath === "/admin/supplies" ||
    rawPath === "/admin/medical-supplies" ||
    rawPath === "/admin/inventory" ||
    rawPath === "/supplies" ||
    rawPath === "/inventory"
  ) {
    return { page: "admin-dashboard", adminTab: "inventory" };
  }
  if (rawPath === "/admin/dispatches" || rawPath === "/dispatches") {
    return { page: "admin-dashboard", adminTab: "dispatches" };
  }
  if (rawPath === "/admin/calendar" || rawPath === "/admin/ooo" || rawPath === "/calendar") {
    return { page: "admin-dashboard", adminTab: "calendar" };
  }
  if (rawPath === "/admin/customization" || rawPath === "/admin/settings" || rawPath === "/customization") {
    return { page: "admin-dashboard", adminTab: "customization" };
  }

  // User / Patient routes
  if (rawPath === "/about") return { page: "about" };
  if (rawPath === "/appointments" || rawPath === "/book-appointment") return { page: "appointments" };
  if (rawPath === "/cart" || rawPath === "/cart-page") return { page: "cart-page" };
  if (rawPath === "/order-medicine" || rawPath === "/medicines" || rawPath === "/pharmacy") return { page: "order-medicine" };
  if (
    rawPath === "/visit-summary" ||
    rawPath === "/summary" ||
    rawPath === "/visit-summary/records" ||
    rawPath === "/visit-summary/medical-records" ||
    rawPath === "/visit-summary/billing" ||
    rawPath === "/visit-summary/payments" ||
    rawPath === "/billing" ||
    rawPath === "/medical-records"
  ) {
    return { page: "visit-summary" };
  }
  if (rawPath === "/mobile-worker" || rawPath === "/worker") return { page: "mobile-worker" };
  if (rawPath === "/privacy-policy" || rawPath === "/privacy") return { page: "privacy-policy" };
  if (rawPath === "/terms") return { page: "terms" };
  if (rawPath === "/join" || rawPath === "/accept-invite") return { page: "join" };
  if (rawPath === "/" || rawPath === "/home") return { page: "home" };

  return { page: "home" };
}

export function getUrlForState(page: Page, adminTab?: AdminTab): string {
  if (page === "admin-dashboard") {
    switch (adminTab) {
      case "appointments": return "/admin/appointments";
      case "patients":     return "/admin/patients";
      case "inventory":    return "/admin/supplies";
      case "dispatches":   return "/admin/dispatches";
      case "calendar":     return "/admin/calendar";
      case "customization": return "/admin/customization";
      case "dashboard":
      default:             return "/admin/dashboard";
    }
  }
  if (page === "super-admin-dashboard") return "/super-admin";
  switch (page) {
    case "about":          return "/about";
    case "appointments":   return "/appointments";
    case "cart-page":      return "/cart";
    case "order-medicine": return "/order-medicine";
    case "visit-summary":  return "/visit-summary";
    case "mobile-worker":  return "/mobile-worker";
    case "privacy-policy": return "/privacy-policy";
    case "terms":          return "/terms";
    case "join":           return "/join";
    case "home":
    default:               return "/";
  }
}

export function syncUrlWithState(page: Page, adminTab?: AdminTab, replace: boolean = false): void {
  if (typeof window === "undefined") return;
  const targetUrl = getUrlForState(page, adminTab);
  const currentPath = window.location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  if (currentPath !== targetUrl) {
    if (replace) {
      window.history.replaceState({ page, adminTab }, "", targetUrl);
    } else {
      window.history.pushState({ page, adminTab }, "", targetUrl);
    }
  }

  const pageSubtitle = ROUTE_TITLE_MAP[targetUrl] || "Clinical Portal";
  const existingClinic = typeof document !== "undefined" && document.title.includes(" — ")
    ? document.title.split(" — ")[0]
    : "Healthcare Portal";
  document.title = `${existingClinic} — ${pageSubtitle}`;
}

