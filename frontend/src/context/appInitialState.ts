import type {
  Page,
  AdminTab,
  AppState,
  AuthUser,
  BlockedCalendarDate,
  BookedAppointment,
  ConsultationInvoice,
  PatientMedicalFile,
} from "../types";
import {
  DEMO_CREDENTIALS,
  STORAGE_KEYS,
  USE_MOCK_DATA,
} from "../config";
import {
  MOCK_ACCOUNTS,
  MOCK_INVENTORY,
  MOCK_VISIT_SUMMARIES as DEMO_VISIT_SUMMARIES,
  MOCK_INITIAL_ORDERS as DEMO_ORDERS,
  MOCK_INITIAL_APPOINTMENTS as DEFAULT_APPOINTMENTS,
  MOCK_INITIAL_INVOICES as DEFAULT_CONSULTATION_INVOICES,
  MOCK_BLOCKED_DATES as DEFAULT_BLOCKED_DATES,
} from "../data/mocks";
import { getUserTimezone } from "../utils/timezone";
import { parseRouteFromLocation } from "../router/routeParser";

export const getInitialAuthUser = (): AuthUser => {
  if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === "true") {
    return null;
  }

  // In local mock sandbox mode, prioritize explicit URL routes and query overrides
  if (typeof window !== "undefined" && USE_MOCK_DATA && !import.meta.env.PROD) {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    const port = window.location.port;
    const pathname = window.location.pathname.toLowerCase();

    // Explicit super admin override via path or role param
    if (roleParam === "super_admin" || roleParam === "superadmin" || pathname.includes("super-admin")) {
      return MOCK_ACCOUNTS[DEMO_CREDENTIALS.SUPER_ADMIN.email]?.profile ?? null;
    }
    // Explicit developer dev-port (5174) or explicit ?role=admin or /admin path
    if (roleParam === "admin" || port === "5174" || pathname.startsWith("/admin")) {
      return MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email]?.profile ?? null;
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  // Default demo patient assignment for dev ports (5173) or mock sandbox fallback
  if (typeof window !== "undefined" && USE_MOCK_DATA && !import.meta.env.PROD) {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    const port = window.location.port;

    if (roleParam === "patient" || roleParam === "user" || port === "5173") {
      return MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT.email]?.profile ?? null;
    }
  }

  // Default for production hosted single-app: unauthenticated guest
  return null;
};

export const getInitialPage = (user: AuthUser): Page => {
  if (typeof window !== "undefined") {
    const parsed = parseRouteFromLocation();
    if (parsed && parsed.page !== "home") {
      return parsed.page;
    }
    if (window.location.pathname === "/" || window.location.pathname === "/home") {
      if (user?.role === "super_admin") {
        return "super-admin-dashboard";
      }
      if (user?.role === "admin") {
        return "admin-dashboard";
      }
      return "home";
    }

    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page") as Page | null;
    if (pageParam) return pageParam;

    const port = window.location.port;
    if (user?.role === "super_admin" || (USE_MOCK_DATA && !import.meta.env.PROD && params.get("role") === "super_admin")) {
      return "super-admin-dashboard";
    }
    if (user?.role === "admin" || (USE_MOCK_DATA && !import.meta.env.PROD && (port === "5174" || params.get("role") === "admin"))) {
      return "admin-dashboard";
    }
  }
  return "home";
};

export const getInitialAdminTab = (): AdminTab => {
  if (typeof window !== "undefined") {
    const parsed = parseRouteFromLocation();
    if (parsed.adminTab) return parsed.adminTab;
  }
  return "dashboard";
};

export function getInitialBlockedDates(): BlockedCalendarDate[] {
  if (typeof window === "undefined") return USE_MOCK_DATA ? DEFAULT_BLOCKED_DATES : [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED_DATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, BlockedCalendarDate>();
        for (const item of parsed) {
          if (item && item.date) {
            const key = item.id || (item.allDay === false ? `${item.date}_${item.startTime || ""}_${item.endTime || ""}` : item.date);
            uniqueMap.set(key, item);
          }
        }
        return Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }
    }
  } catch {}
  return USE_MOCK_DATA ? DEFAULT_BLOCKED_DATES : [];
}

export function getInitialAppointments(): BookedAppointment[] {
  if (typeof window === "undefined") return USE_MOCK_DATA ? DEFAULT_APPOINTMENTS : [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return USE_MOCK_DATA ? DEFAULT_APPOINTMENTS : [];
}

export function getInitialUserTimezone(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_TIMEZONE);
      if (saved) return saved;
    } catch {}
  }
  return getUserTimezone().timeZone;
}

export function getInitialConsultationInvoices(): ConsultationInvoice[] {
  if (typeof window === "undefined") return USE_MOCK_DATA ? DEFAULT_CONSULTATION_INVOICES : [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSULTATION_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return USE_MOCK_DATA ? DEFAULT_CONSULTATION_INVOICES : [];
}

export function getInitialVisitSummaries(): Record<string, PatientMedicalFile> {
  const fallback = USE_MOCK_DATA ? DEMO_VISIT_SUMMARIES : {};
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem("ehr_visit_summaries") || localStorage.getItem("agastya_visit_summaries");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed };
    }
  } catch {}
  return fallback;
}

const initialAuthUser = getInitialAuthUser();

export const INITIAL_STATE: AppState = {
  authUser:           initialAuthUser,
  activePage:         getInitialPage(initialAuthUser),
  cart:               [],
  isCartOpen:         false,
  isAuthModalOpen:    false,
  orders:             USE_MOCK_DATA ? DEMO_ORDERS : [],
  trackingModalOrder: null,
  ordersModalOpen:    false,
  visitSummaries:     getInitialVisitSummaries(),
  inventory:          USE_MOCK_DATA ? MOCK_INVENTORY : [],
  adminTab:           getInitialAdminTab(),
  blockedDates:       getInitialBlockedDates(),
  appointments:       getInitialAppointments(),
  userTimezone:       getInitialUserTimezone(),
  consultationInvoices: getInitialConsultationInvoices(),
};

