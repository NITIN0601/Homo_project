import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  AppState,
  AppAction,
  Medicine,
  Page,
  UserProfile,
  AuthUser,
  PlacedOrder,
  SavedCard,
  PatientMedicalFile,
  VisitSummaryRecord,
  InventoryItem,
  AdminTab,
  BlockedCalendarDate,
  BookedAppointment,
  ConsultationInvoice,
  ConsultationInvoiceStatus,
} from "../types";
import {
  DEMO_CREDENTIALS,
  STORAGE_KEYS,
  USE_MOCK_DATA,
} from "../config";
import {
  MEDICINE_CATALOGUE,
  MOCK_ACCOUNTS,
  MOCK_INVENTORY,
  MOCK_VISIT_SUMMARIES as DEMO_VISIT_SUMMARIES,
  MOCK_INITIAL_ORDERS as DEMO_ORDERS,
  MOCK_INITIAL_APPOINTMENTS as DEFAULT_APPOINTMENTS,
  MOCK_INITIAL_INVOICES as DEFAULT_CONSULTATION_INVOICES,
  MOCK_BLOCKED_DATES as DEFAULT_BLOCKED_DATES,
} from "../data/mocks";
import { api } from "../services/api";

export {
  MEDICINE_CATALOGUE,
  MOCK_ACCOUNTS,
  MOCK_INVENTORY,
  DEFAULT_APPOINTMENTS,
  DEFAULT_CONSULTATION_INVOICES,
};
import {
  normalizeTimeToSlot,
  normalizeDateAlias,
  getUserTimezone,
  getClinicTimeInfo,
  getMappedSessionHours,
  type UserTimezoneInfo,
  type ClinicTimeInfo,
  type MappedSessionHours,
} from "../utils/timezone";
import { formatDateISO } from "../utils/format";

// ─── Bidirectional URL Router & Route Mapping (SSOT) ──────────────────────────
export interface ParsedRoute {
  page: Page;
  adminTab?: AdminTab;
}

export const ROUTE_TITLE_MAP: Record<string, string> = {
  "/": "Agastya Homoeopathy Clinic — Gentle Healing, Lasting Wellness",
  "/about": "About Us — Agastya Homoeopathy Clinic",
  "/appointments": "Book Consultation — Agastya Homoeopathy Clinic",
  "/cart": "Prescription & Medicine Cart — Agastya Homoeopathy Clinic",
  "/order-medicine": "Order Medicines & Dispensary — Agastya Homoeopathy Clinic",
  "/visit-summary": "My Clinical Records & Invoices — Agastya Homoeopathy Clinic",
  "/visit-summary/records": "My Medical Records & Clinical History — Agastya Homoeopathy Clinic",
  "/visit-summary/payments": "My Consultation Billing & Payment History — Agastya Homoeopathy Clinic",
  "/billing": "My Consultation Billing & Invoices — Agastya Homoeopathy Clinic",
  "/mobile-worker": "Field Care Worker Portal — Agastya Homoeopathy Clinic",
  "/privacy-policy": "Privacy Policy — Agastya Homoeopathy Clinic",
  "/terms": "Terms & Conditions — Agastya Homoeopathy Clinic",
  "/admin/dashboard": "Doctor Practice Console — Agastya Homoeopathy Clinic",
  "/admin/appointments": "Consultations & Schedule Queue — Agastya Homoeopathy Clinic",
  "/admin/patients": "Patient Medical Records & Case Files — Agastya Homoeopathy Clinic",
  "/admin/supplies": "Dispensary Stock & Medical Supplies — Agastya Homoeopathy Clinic",
  "/admin/dispatches": "Logistics & PO Dispatches — Agastya Homoeopathy Clinic",
  "/admin/calendar": "Doctor Blocked Days & OOO Calendar — Agastya Homoeopathy Clinic",
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
  switch (page) {
    case "about":          return "/about";
    case "appointments":   return "/appointments";
    case "cart-page":      return "/cart";
    case "order-medicine": return "/order-medicine";
    case "visit-summary":  return "/visit-summary";
    case "mobile-worker":  return "/mobile-worker";
    case "privacy-policy": return "/privacy-policy";
    case "terms":          return "/terms";
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

  const title = ROUTE_TITLE_MAP[targetUrl] || "Agastya Homoeopathy Clinic";
  document.title = title;
}

// ─── Initial state — rehydrates from storage or auto-configures role by port/param ──
const getInitialAuthUser = (): AuthUser => {
  try {
    if (typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === "true") {
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    const port = window.location.port;

    // Explicit developer dev-port (5174) or explicit ?role=admin
    if (roleParam === "admin" || port === "5174") {
      return MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email]?.profile ?? null;
    }
    // Explicit demo patient param or patient port (5173)
    if (roleParam === "patient" || roleParam === "user" || port === "5173") {
      return MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT.email]?.profile ?? null;
    }
  }

  // Default for production hosted single-app: unauthenticated guest
  return null;
};

const getInitialPage = (user: AuthUser): Page => {
  if (typeof window !== "undefined") {
    const parsed = parseRouteFromLocation();
    if (parsed && parsed.page !== "home") {
      // If user is trying to reach admin-dashboard but is not logged in as admin,
      // allow ProtectedRoute to display the secure administrator login gate
      return parsed.page;
    }
    if (window.location.pathname === "/" || window.location.pathname === "/home") {
      // If user is already authenticated as Doctor Admin, open dashboard directly
      if (user?.role === "admin") {
        return "admin-dashboard";
      }
      return "home";
    }

    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page") as Page | null;
    if (pageParam) return pageParam;

    const port = window.location.port;
    if (port === "5174" || params.get("role") === "admin" || user?.role === "admin") {
      return "admin-dashboard";
    }
  }
  return "home";
};

const getInitialAdminTab = (): AdminTab => {
  if (typeof window !== "undefined") {
    const parsed = parseRouteFromLocation();
    if (parsed.adminTab) return parsed.adminTab;
  }
  return "dashboard";
};

function getInitialBlockedDates(): BlockedCalendarDate[] {
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

function getInitialAppointments(): BookedAppointment[] {
  if (typeof window === "undefined") return USE_MOCK_DATA ? DEFAULT_APPOINTMENTS : [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return USE_MOCK_DATA ? DEFAULT_APPOINTMENTS : [];
}

function getInitialUserTimezone(): string {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_TIMEZONE);
      if (saved) return saved;
    } catch {}
  }
  return getUserTimezone().timeZone;
}

const initialAuthUser = getInitialAuthUser();

function getInitialConsultationInvoices(): ConsultationInvoice[] {
  if (typeof window === "undefined") return USE_MOCK_DATA ? DEFAULT_CONSULTATION_INVOICES : [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSULTATION_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return USE_MOCK_DATA ? DEFAULT_CONSULTATION_INVOICES : [];
}

function getInitialVisitSummaries(): Record<string, PatientMedicalFile> {
  const fallback = USE_MOCK_DATA ? DEMO_VISIT_SUMMARIES : {};
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem("agastya_visit_summaries");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed };
    }
  } catch {}
  return fallback;
}

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

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case "SET_USER_TIMEZONE": {
      try {
        localStorage.setItem(STORAGE_KEYS.USER_TIMEZONE, action.payload);
      } catch {}
      return { ...state, userTimezone: action.payload };
    }

    case "SET_PAGE":
      return { ...state, activePage: action.payload, isCartOpen: false, isAuthModalOpen: false };

    case "SET_ADMIN_TAB":
      return { ...state, activePage: "admin-dashboard", adminTab: action.payload, isCartOpen: false, isAuthModalOpen: false };

    case "BLOCK_DATE": {
      const isAllDay = action.payload.allDay !== false;
      const existingFiltered = isAllDay
        ? state.blockedDates.filter((b) => b.date !== action.payload.date)
        : state.blockedDates.filter((b) => b.id !== action.payload.id && !(b.date === action.payload.date && b.allDay !== false && !b.startTime));
      const updated = [...existingFiltered, action.payload]
        .sort((a, b) => a.date.localeCompare(b.date));
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "BLOCK_DATE_RANGE": {
      const newItems = action.payload;
      const newIds = new Set(newItems.map((n) => n.id));
      const hasAllDay = newItems.some((n) => n.allDay !== false);
      const newDates = new Set(newItems.map((n) => n.date));

      const existingFiltered = state.blockedDates.filter((b) => {
        if (newIds.has(b.id)) return false;
        if (hasAllDay && newDates.has(b.date)) return false;
        return true;
      });
      const updated = [...existingFiltered, ...newItems].sort((a, b) => a.date.localeCompare(b.date));
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "UNBLOCK_DATE": {
      const payload = action.payload;
      const targetId = typeof payload === "object" ? payload?.id : (typeof payload === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(payload) ? payload : undefined);
      const targetDate = typeof payload === "object" ? payload?.date : (typeof payload === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload) ? payload : undefined);

      const updated = state.blockedDates.filter((b) => {
        // Direct ID match
        if (targetId && b.id === targetId) return false;
        // Direct Date match
        if (targetDate && b.date === targetDate) {
          if (targetId && b.id && b.id !== targetId) return true;
          return false;
        }
        // Direct string match on ID or Date
        if (typeof payload === "string" && (b.id === payload || b.date === payload)) return false;
        return true;
      });
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "UPDATE_BLOCKED_DATE": {
      const { id, date, updates } = action.payload;
      const updated = state.blockedDates.map((b) => {
        const matchesId = id && b.id === id;
        const matchesDate = !id && date && b.date === date;
        if (matchesId || matchesDate) {
          return { ...b, ...updates };
        }
        return b;
      });
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "SET_BLOCKED_DATES": {
      const uniqueMap = new Map<string, BlockedCalendarDate>();
      if (Array.isArray(action.payload)) {
        for (const item of action.payload) {
          if (item && item.date) {
            const key = item.id || (item.allDay === false ? `${item.date}_${item.startTime || ""}_${item.endTime || ""}` : item.date);
            uniqueMap.set(key, item);
          }
        }
      }
      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(uniqueList)); } catch {}
      return { ...state, blockedDates: uniqueList };
    }

    case "BOOK_APPOINTMENT": {
      const updated = [action.payload, ...state.appointments.filter((a) => a.id !== action.payload.id)];
      try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated)); } catch {}
      return { ...state, appointments: updated };
    }

    case "CANCEL_APPOINTMENT": {
      const updated = state.appointments.map((a) =>
        a.id === action.payload ? { ...a, status: "Cancelled" as const } : a
      );
      try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated)); } catch {}
      return { ...state, appointments: updated };
    }

    case "UPDATE_APPOINTMENT_STATUS": {
      const updated = state.appointments.map((a) =>
        a.id === action.payload.id ? { ...a, status: action.payload.status } : a
      );
      try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated)); } catch {}
      return { ...state, appointments: updated };
    }

    case "SET_APPOINTMENTS": {
      try { localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(action.payload)); } catch {}
      return { ...state, appointments: action.payload };
    }

    case "TOGGLE_CART":
      return { ...state, isCartOpen: !state.isCartOpen };

    case "OPEN_CART":
      return { ...state, isCartOpen: true };

    case "CLOSE_CART":
      return { ...state, isCartOpen: false };

    case "ADD_TO_CART": {
      const idx = state.cart.findIndex((c) => c.medicine.id === action.payload.id);
      if (idx !== -1) {
        return {
          ...state,
          cart: state.cart.map((c, i) =>
            i === idx ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return { ...state, cart: [...state.cart, { medicine: action.payload, quantity: 1 }] };
    }

    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((c) => c.medicine.id !== action.payload) };

    case "UPDATE_QUANTITY":
      if (action.payload.quantity <= 0) {
        return { ...state, cart: state.cart.filter((c) => c.medicine.id !== action.payload.id) };
      }
      return {
        ...state,
        cart: state.cart.map((c) =>
          c.medicine.id === action.payload.id ? { ...c, quantity: action.payload.quantity } : c
        ),
      };

    case "CLEAR_CART":
      return { ...state, cart: [] };

    case "LOGIN": {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(action.payload));
        sessionStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT);
      } catch {
        // ignore
      }
      const targetPage: Page = action.payload.role === "admin"
        ? "admin-dashboard"
        : (state.activePage === "admin-dashboard" ? "home" : state.activePage);

      if (typeof window !== "undefined") {
        syncUrlWithState(targetPage, state.adminTab);
      }

      return {
        ...state,
        authUser:        action.payload,
        activePage:      targetPage,
        isAuthModalOpen: false,
      };
    }

    case "LOGOUT": {
      try {
        localStorage.removeItem(STORAGE_KEYS.AUTH_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        sessionStorage.setItem(STORAGE_KEYS.EXPLICIT_LOGOUT, "true");
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") {
        syncUrlWithState("home", "dashboard");
      }
      return {
        ...state,
        authUser:    null,
        activePage:  "home",
        cart:        [],
        isCartOpen:  false,
      };
    }

    case "OPEN_AUTH_MODAL":
      return { ...state, isAuthModalOpen: true, isCartOpen: false };

    case "CLOSE_AUTH_MODAL":
      return { ...state, isAuthModalOpen: false };

    case "PLACE_ORDER":
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        cart: [],
      };

    case "OPEN_TRACKING_MODAL":
      return { ...state, trackingModalOrder: action.payload };

    case "CLOSE_TRACKING_MODAL":
      return { ...state, trackingModalOrder: null };

    case "TOGGLE_ORDERS_MODAL":
      return { ...state, ordersModalOpen: action.payload ?? !state.ordersModalOpen };

    case "ADD_SAVED_CARD": {
      if (!state.authUser) return state;
      const updatedCards = [...(state.authUser.savedCards || []), action.payload];
      return {
        ...state,
        authUser: {
          ...state.authUser,
          savedCards: updatedCards,
        },
      };
    }

    case "UPDATE_USER_PROFILE": {
      if (!state.authUser) return state;
      return {
        ...state,
        authUser: {
          ...state.authUser,
          ...action.payload,
        },
      };
    }

    case "ADD_VISIT_SUMMARY": {
      const { patientId, visit } = action.payload;
      const existingFile = state.visitSummaries[patientId] || {
        patientId,
        patientName: state.authUser?.name || "Patient",
        age: 30,
        gender: "Self",
        bloodGroup: "O+",
        knownAllergies: ["None Listed"],
        medicalHistory: ["General Wellness"],
        visits: [],
      };
      const updatedVisits = {
        ...state.visitSummaries,
        [patientId]: {
          ...existingFile,
          visits: [visit, ...existingFile.visits],
        },
      };
      try {
        localStorage.setItem("agastya_visit_summaries", JSON.stringify(updatedVisits));
      } catch {}
      return {
        ...state,
        visitSummaries: updatedVisits,
      };
    }

    case "UPDATE_PATIENT_MEDICAL_FILE": {
      const { patientId, updates } = action.payload;
      const existing = state.visitSummaries[patientId] || {
        patientId,
        patientName: state.authUser?.name || "Patient",
        age: 30,
        gender: "Self",
        bloodGroup: "O+",
        knownAllergies: [],
        medicalHistory: [],
        visits: [],
      };
      const updatedFile = { ...existing, ...updates };
      const updatedMap = { ...state.visitSummaries, [patientId]: updatedFile };
      try {
        localStorage.setItem("agastya_visit_summaries", JSON.stringify(updatedMap));
      } catch {}
      return {
        ...state,
        visitSummaries: updatedMap,
      };
    }

    case "SET_VISIT_SUMMARIES": {
      try {
        localStorage.setItem("agastya_visit_summaries", JSON.stringify(action.payload));
      } catch {}
      return {
        ...state,
        visitSummaries: { ...DEMO_VISIT_SUMMARIES, ...action.payload },
      };
    }

    case "UPDATE_INVENTORY": {
      const updated = state.inventory.map((item) =>
        item.id === action.payload.id ? action.payload : item
      );
      return { ...state, inventory: updated };
    }

    case "SET_INVENTORY":
      return { ...state, inventory: action.payload };

    case "POST_CONSULTATION_INVOICE":
    case "POST_INVOICE": {
      const updated = [action.payload, ...state.consultationInvoices.filter(i => i.id !== action.payload.id)];
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "SUBMIT_CONSULTATION_PAYMENT": {
      const { invoiceId, paymentMethod, transactionRef, submittedAt, patientUpiId, selectedBank } = action.payload;
      const updated = state.consultationInvoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "processing" as const,
              paymentMethod,
              transactionRef,
              submittedAt,
              patientUpiId,
              selectedBank,
            }
          : inv
      );
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "CONFIRM_CONSULTATION_PAYMENT": {
      const { invoiceId, paidAt, transactionRef } = action.payload;
      const updated = state.consultationInvoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "paid" as const,
              paidAt,
              ...(transactionRef ? { transactionRef } : {}),
            }
          : inv
      );
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "UPDATE_INVOICE_TRANSACTION_REF": {
      const { invoiceId, transactionRef } = action.payload;
      const updated = state.consultationInvoices.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, transactionRef }
          : inv
      );
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "PAY_CONSULTATION_INVOICE": {
      const { invoiceId, paymentMethod, transactionRef, paidAt } = action.payload;
      const updated = state.consultationInvoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: "paid" as const,
              paymentMethod,
              transactionRef,
              paidAt,
            }
          : inv
      );
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "UPDATE_INVOICE_STATUS": {
      const { invoiceId, status } = action.payload;
      const updated = state.consultationInvoices.map((inv) =>
        inv.id === invoiceId ? { ...inv, status } : inv
      );
      try { localStorage.setItem(STORAGE_KEYS.CONSULTATION_INVOICES, JSON.stringify(updated)); } catch {}
      return { ...state, consultationInvoices: updated };
    }

    case "SET_CONSULTATION_INVOICES": {
      return { ...state, consultationInvoices: action.payload };
    }

    default:
      return state;
  }
}

// ─── Context value shape ──────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  cartTotalItems:     number;
  cartSubtotalINR:    number;
  navigateTo:         (page: Page) => void;
  openCart:           () => void;
  closeCart:          () => void;
  toggleCart:         () => void;
  addToCart:          (medicine: Medicine) => void;
  removeFromCart:     (medicineId: string) => void;
  updateQty:          (medicineId: string, quantity: number) => void;
  clearCart:          () => void;
  login:              (profile: UserProfile) => void;
  logout:             () => void;
  openAuthModal:      () => void;
  closeAuthModal:     () => void;
  placeOrder:         (order: PlacedOrder) => void;
  openTrackingModal:  (order: PlacedOrder) => void;
  closeTrackingModal: () => void;
  toggleOrdersModal:  (open?: boolean) => void;
  addSavedCard:       (card: SavedCard) => void;
  addVisitSummary:    (patientId: string, visit: VisitSummaryRecord) => void;
  updatePatientMedicalFile: (patientId: string, updates: Partial<PatientMedicalFile>) => void;
  updateInventory:    (item: InventoryItem) => void;
  setAdminTab:        (tab: AdminTab) => void;
  blockDate:          (
    date: string,
    reason: string,
    type?: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => void;
  blockDateRange:     (
    startDate: string,
    endDate: string,
    reason: string,
    type?: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => void;
  unblockDate:        (idOrDate?: string, date?: string) => void;
  updateBlockedDate:  (target: { id?: string; date?: string }, updates: Partial<BlockedCalendarDate>) => void;
  isDateBlocked:      (date: string) => BlockedCalendarDate | undefined;
  isSlotBlocked:      (date: string, slot24: string) => BlockedCalendarDate | undefined;
  getBlockedEntriesForDate: (date: string) => BlockedCalendarDate[];
  bookAppointment:    (apt: BookedAppointment) => void;
  cancelAppointment:  (id: string) => void;
  updateAppointmentStatus: (id: string, status: BookedAppointment["status"]) => void;
  getBookedSlotsForDate: (dateYMD: string) => string[];
  isSlotBooked:       (dateYMD: string, slot24: string) => boolean;
  userTimezone:       string;
  setUserTimezone:    (tz: string) => void;
  userTzInfo:         UserTimezoneInfo;
  clinicTimeInfo:     ClinicTimeInfo;
  sessionHours:       MappedSessionHours;
  postConsultationInvoice: (invoice: ConsultationInvoice) => void;
  submitConsultationPayment: (
    invoiceId: string,
    paymentMethod: ConsultationInvoice["paymentMethod"],
    transactionRef: string,
    submittedAt: string,
    patientUpiId?: string,
    selectedBank?: string
  ) => void;
  confirmConsultationPayment: (invoiceId: string, paidAt: string, transactionRef?: string) => void;
  updateInvoiceTransactionRef: (invoiceId: string, transactionRef: string) => void;
  payConsultationInvoice: (invoiceId: string, paymentMethod: ConsultationInvoice["paymentMethod"], transactionRef: string, paidAt: string) => void;
  updateInvoiceStatus: (invoiceId: string, status: ConsultationInvoiceStatus) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  const cartTotalItems  = useMemo(() => state.cart.reduce((s, c) => s + c.quantity, 0), [state.cart]);
  const cartSubtotalINR = useMemo(() => state.cart.reduce((s, c) => s + c.medicine.priceINR * c.quantity, 0), [state.cart]);

  const navigateTo = useCallback((page: Page) => {
    dispatch({ type: "SET_PAGE", payload: page });
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);
  const setAdminTab        = useCallback((tab: AdminTab)      => dispatch({ type: "SET_ADMIN_TAB",    payload: tab }), []);
  const openCart           = useCallback(()                   => dispatch({ type: "OPEN_CART"                         }), []);
  const closeCart          = useCallback(()                   => dispatch({ type: "CLOSE_CART"                        }), []);
  const toggleCart         = useCallback(()                   => dispatch({ type: "TOGGLE_CART"                       }), []);
  const addToCart          = useCallback((m: Medicine)        => dispatch({ type: "ADD_TO_CART",       payload: m      }), []);
  const removeFromCart     = useCallback((id: string)         => dispatch({ type: "REMOVE_FROM_CART",  payload: id     }), []);
  const updateQty          = useCallback((id: string, q: number) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity: q } }), []);
  const clearCart          = useCallback(()                   => dispatch({ type: "CLEAR_CART"                        }), []);
  const login              = useCallback((p: UserProfile)     => dispatch({ type: "LOGIN",             payload: p      }), []);
  const logout             = useCallback(()                   => dispatch({ type: "LOGOUT"                            }), []);
  const openAuthModal      = useCallback(()                   => dispatch({ type: "OPEN_AUTH_MODAL"                   }), []);
  const closeAuthModal     = useCallback(()                   => dispatch({ type: "CLOSE_AUTH_MODAL"                  }), []);
  const placeOrder         = useCallback((o: PlacedOrder)     => dispatch({ type: "PLACE_ORDER",       payload: o      }), []);
  const openTrackingModal  = useCallback((o: PlacedOrder)     => dispatch({ type: "OPEN_TRACKING_MODAL", payload: o     }), []);
  const closeTrackingModal = useCallback(()                   => dispatch({ type: "CLOSE_TRACKING_MODAL"              }), []);
  const toggleOrdersModal  = useCallback((open?: boolean)     => dispatch({ type: "TOGGLE_ORDERS_MODAL", payload: open   }), []);
  const addSavedCard       = useCallback((card: SavedCard)    => dispatch({ type: "ADD_SAVED_CARD",     payload: card  }), []);
  const addVisitSummary = useCallback((patientId: string, visit: VisitSummaryRecord) => {
    dispatch({ type: "ADD_VISIT_SUMMARY", payload: { patientId, visit } });
    fetch("/api/visit-summaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, visit }),
    }).catch(() => {});
  }, []);
  const updatePatientMedicalFile = useCallback((patientId: string, updates: Partial<PatientMedicalFile>) => {
    dispatch({ type: "UPDATE_PATIENT_MEDICAL_FILE", payload: { patientId, updates } });
    if (updates.patientName && stateRef.current.authUser?.id === patientId) {
      dispatch({ type: "UPDATE_USER_PROFILE", payload: { name: updates.patientName } });
    }
  }, []);
  const updateInventory    = useCallback((item: InventoryItem) => dispatch({ type: "UPDATE_INVENTORY", payload: item }), []);

  const blockDate = useCallback((
    date: string,
    reason: string,
    type: "ooo" | "holiday" | "leave" = "ooo",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => {
    const isAllDay = timeConfig?.allDay !== false;
    const item: BlockedCalendarDate = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      reason,
      type,
      createdAt: formatDateISO(),
      allDay: isAllDay,
      startTime: !isAllDay ? timeConfig?.startTime : undefined,
      endTime: !isAllDay ? timeConfig?.endTime : undefined,
      slots: !isAllDay ? timeConfig?.slots : undefined,
    };
    dispatch({ type: "BLOCK_DATE", payload: item });

    // Sync to file-backed cross-port API
    const updated = isAllDay
      ? [...state.blockedDates.filter((b) => b.date !== date), item]
      : [...state.blockedDates.filter((b) => b.id !== item.id && !(b.date === date && b.allDay !== false && !b.startTime)), item];
    updated.sort((a, b) => a.date.localeCompare(b.date));
    fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, [state.blockedDates]);

  const blockDateRange = useCallback((
    startDate: string,
    endDate: string,
    reason: string,
    type: "ooo" | "holiday" | "leave" = "ooo",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => {
    if (!startDate) return;
    const [sY, sM, sD] = startDate.split("-").map(Number);
    const endStr = endDate && endDate >= startDate ? endDate : startDate;
    const [eY, eM, eD] = endStr.split("-").map(Number);

    const cur = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);

    const datesToBlock: string[] = [];
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      datesToBlock.push(`${y}-${m}-${d}`);
      cur.setDate(cur.getDate() + 1);
    }

    const isAllDay = timeConfig?.allDay !== false;
    const newItems: BlockedCalendarDate[] = datesToBlock.map((date, idx) => ({
      id: `blk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      reason,
      type,
      createdAt: formatDateISO(),
      allDay: isAllDay,
      startTime: !isAllDay ? timeConfig?.startTime : undefined,
      endTime: !isAllDay ? timeConfig?.endTime : undefined,
      slots: !isAllDay ? timeConfig?.slots : undefined,
    }));

    dispatch({ type: "BLOCK_DATE_RANGE", payload: newItems });

    const dateSet = new Set(datesToBlock);
    const existingFiltered = isAllDay
      ? state.blockedDates.filter((b) => !dateSet.has(b.date))
      : state.blockedDates.filter((b) => !(dateSet.has(b.date) && b.allDay !== false));

    const updated = [...existingFiltered, ...newItems].sort((a, b) => a.date.localeCompare(b.date));

    fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, [state.blockedDates]);

  const unblockDate = useCallback((idOrDate?: string, date?: string) => {
    if (!idOrDate && !date) return;
    const isIdDateString = typeof idOrDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(idOrDate);
    const targetId = isIdDateString ? undefined : idOrDate;
    const targetDate = date || (isIdDateString ? idOrDate : undefined);

    dispatch({
      type: "UNBLOCK_DATE",
      payload: { id: targetId, date: targetDate },
    });

    // Compute updated list immediately from latest stateRef
    const updated = stateRef.current.blockedDates.filter((b) => {
      // 1. Direct ID match
      if (targetId && b.id === targetId) return false;
      // 2. Direct date match (if only date provided, or if b has no id)
      if (targetDate && b.date === targetDate) {
        if (targetId && b.id && b.id !== targetId) return true;
        return false;
      }
      if (idOrDate && (b.id === idOrDate || b.date === idOrDate)) return false;
      return true;
    });

    try {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated));
    } catch {}

    // Sync to file-backed API
    api.calendar.saveBlockedDates(updated).catch(() => {});
  }, []);

  const updateBlockedDate = useCallback((
    target: { id?: string; date?: string },
    updates: Partial<BlockedCalendarDate>
  ) => {
    dispatch({ type: "UPDATE_BLOCKED_DATE", payload: { ...target, updates } });

    const updated = stateRef.current.blockedDates.map((b) => {
      const matchesId = target.id && b.id === target.id;
      const matchesDate = !target.id && target.date && b.date === target.date;
      if (matchesId || matchesDate) {
        return { ...b, ...updates };
      }
      return b;
    });

    try {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated));
    } catch {}

    api.calendar.saveBlockedDates(updated).catch(() => {});
  }, []);

  const isDateBlocked = useCallback((date: string): BlockedCalendarDate | undefined => {
    return state.blockedDates.find((b) => b.date === date && b.allDay !== false);
  }, [state.blockedDates]);

  const getBlockedEntriesForDate = useCallback((date: string): BlockedCalendarDate[] => {
    return state.blockedDates.filter((b) => b.date === date);
  }, [state.blockedDates]);

  const isSlotBlocked = useCallback((date: string, slot24: string): BlockedCalendarDate | undefined => {
    if (!date || !slot24) return undefined;
    const entries = state.blockedDates.filter((b) => b.date === date);
    for (const entry of entries) {
      if (entry.allDay !== false) return entry;
      if (entry.slots && entry.slots.includes(slot24)) return entry;
      if (entry.startTime && entry.endTime) {
        if (slot24 >= entry.startTime && slot24 <= entry.endTime) {
          return entry;
        }
      }
    }
    return undefined;
  }, [state.blockedDates]);

  const bookAppointment = useCallback((apt: BookedAppointment) => {
    dispatch({ type: "BOOK_APPOINTMENT", payload: apt });
    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apt),
    }).catch(() => {});
  }, []);

  const cancelAppointment = useCallback((id: string) => {
    dispatch({ type: "CANCEL_APPOINTMENT", payload: id });
    fetch(`/api/appointments/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelled" }),
    }).catch(() => {});
  }, []);

  const updateAppointmentStatus = useCallback((id: string, status: BookedAppointment["status"]) => {
    dispatch({ type: "UPDATE_APPOINTMENT_STATUS", payload: { id, status } });
    fetch(`/api/appointments/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }, []);

  const getBookedSlotsForDate = useCallback((dateYMD: string): string[] => {
    if (!dateYMD) return [];
    const normalizedTarget = normalizeDateAlias(dateYMD);

    return state.appointments
      .filter((a) => {
        if (a.status === "Cancelled") return false;
        const aptDateNormalized = normalizeDateAlias(a.date);
        return aptDateNormalized === normalizedTarget;
      })
      .map((a) => a.slot || normalizeTimeToSlot(a.time));
  }, [state.appointments]);

  const isSlotBooked = useCallback((dateYMD: string, slot24: string): boolean => {
    const booked = getBookedSlotsForDate(dateYMD);
    return booked.includes(slot24);
  }, [getBookedSlotsForDate]);

  const postConsultationInvoice = useCallback((invoice: ConsultationInvoice) => {
    dispatch({ type: "POST_CONSULTATION_INVOICE", payload: invoice });
    fetch("/api/consultation-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    }).catch(() => {});
  }, []);

  const submitConsultationPayment = useCallback((
    invoiceId: string,
    paymentMethod: ConsultationInvoice["paymentMethod"],
    transactionRef: string,
    submittedAt: string,
    patientUpiId?: string,
    selectedBank?: string
  ) => {
    dispatch({
      type: "SUBMIT_CONSULTATION_PAYMENT",
      payload: { invoiceId, paymentMethod, transactionRef, submittedAt, patientUpiId, selectedBank },
    });
    fetch(`/api/consultation-invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing", paymentMethod, transactionRef, submittedAt, patientUpiId, selectedBank }),
    }).catch(() => {});
  }, []);

  const confirmConsultationPayment = useCallback((invoiceId: string, paidAt: string, transactionRef?: string) => {
    dispatch({
      type: "CONFIRM_CONSULTATION_PAYMENT",
      payload: { invoiceId, paidAt, transactionRef },
    });
    fetch(`/api/consultation-invoices/${invoiceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paidAt, ...(transactionRef ? { transactionRef } : {}) }),
    }).catch(() => {});
  }, []);

  const updateInvoiceTransactionRef = useCallback((invoiceId: string, transactionRef: string) => {
    dispatch({
      type: "UPDATE_INVOICE_TRANSACTION_REF",
      payload: { invoiceId, transactionRef },
    });
  }, []);

  const payConsultationInvoice = useCallback((
    invoiceId: string,
    paymentMethod: ConsultationInvoice["paymentMethod"],
    transactionRef: string,
    paidAt: string
  ) => {
    dispatch({
      type: "PAY_CONSULTATION_INVOICE",
      payload: { invoiceId, paymentMethod, transactionRef, paidAt },
    });
  }, []);

  const updateInvoiceStatus = useCallback((invoiceId: string, status: ConsultationInvoiceStatus) => {
    dispatch({ type: "UPDATE_INVOICE_STATUS", payload: { invoiceId, status } });
  }, []);

  // Synchronize cross-tab and cross-port state (real-time sync between Admin 5174 and Patient 5173)
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // 1. Same-port cross-tab sync via StorageEvent
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.BLOCKED_DATES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          dispatch({ type: "SET_BLOCKED_DATES", payload: parsed });
        } catch {}
      }
      if (e.key === STORAGE_KEYS.APPOINTMENTS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            dispatch({ type: "SET_APPOINTMENTS", payload: parsed });
          }
        } catch {}
      }
      if (e.key === STORAGE_KEYS.CONSULTATION_INVOICES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            dispatch({ type: "SET_CONSULTATION_INVOICES", payload: parsed });
          }
        } catch {}
      }
      if (e.key === "agastya_visit_summaries" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          dispatch({ type: "SET_VISIT_SUMMARIES", payload: parsed });
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    // 2. Cross-port polling (fetches from shared dev server API every 15s)
    let isSubscribed = true;
    const syncFromServer = async () => {
      try {
        const resDates = await fetch("/api/blocked-dates");
        if (resDates.ok && isSubscribed) {
          const data = await resDates.json();
          if (Array.isArray(data)) {
            const currentDates = stateRef.current.blockedDates.map((b) => `${b.id || ""}_${b.date}_${b.reason}_${b.type}_${b.startTime || ""}_${b.endTime || ""}`).sort().join("|");
            const serverDates = data.map((b: any) => `${b.id || ""}_${b.date}_${b.reason}_${b.type || "ooo"}_${b.startTime || ""}_${b.endTime || ""}`).sort().join("|");
            if (currentDates !== serverDates) {
              dispatch({ type: "SET_BLOCKED_DATES", payload: data });
            }
          }
        }
      } catch {}

      try {
        const resApts = await fetch("/api/appointments");
        if (resApts.ok && isSubscribed) {
          const data = await resApts.json();
          if (Array.isArray(data)) {
            const currentApts = stateRef.current.appointments.map((a) => `${a.id}_${a.status}_${a.date}_${a.time}`).sort().join("|");
            const serverApts = data.map((a: any) => `${a.id}_${a.status}_${a.date}_${a.time}`).sort().join("|");
            if (currentApts !== serverApts) {
              dispatch({ type: "SET_APPOINTMENTS", payload: data });
            }
          }
        }
      } catch {}

      try {
        const resInvoices = await fetch("/api/consultation-invoices");
        if (resInvoices.ok && isSubscribed) {
          const data = await resInvoices.json();
          if (Array.isArray(data)) {
            const currentStr = JSON.stringify(stateRef.current.consultationInvoices);
            const serverStr = JSON.stringify(data);
            if (currentStr !== serverStr) {
              dispatch({ type: "SET_CONSULTATION_INVOICES", payload: data });
            }
          }
        }
      } catch {}

      try {
        const resVisits = await fetch("/api/visit-summaries");
        if (resVisits.ok && isSubscribed) {
          const data = await resVisits.json();
          if (data && typeof data === "object") {
            const currentStr = JSON.stringify(stateRef.current.visitSummaries);
            const serverStr = JSON.stringify(data);
            if (currentStr !== serverStr) {
              dispatch({ type: "SET_VISIT_SUMMARIES", payload: data });
            }
          }
        }
      } catch {}
    };

    // Initial fetch
    syncFromServer();
    // Intelligent adaptive sync: 15s background interval + instant sync on tab focus
    const interval = setInterval(syncFromServer, 15000);
    const onFocus = () => syncFromServer();
    window.addEventListener("focus", onFocus);

    return () => {
      isSubscribed = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, []);

  // ── Synchronize Browser URL (<tab_name>) with activePage and adminTab ─────────
  useEffect(() => {
    syncUrlWithState(state.activePage, state.adminTab, false);
  }, [state.activePage, state.adminTab]);

  // ── Initial Canonical URL & Browser Back/Forward (popstate) Support ───────────
  useEffect(() => {
    // Initial sync on mount to ensure clean canonical URL and title
    syncUrlWithState(state.activePage, state.adminTab, true);

    const handlePopState = () => {
      const route = parseRouteFromLocation();
      if (route) {
        if (route.page === "admin-dashboard" && route.adminTab) {
          dispatch({ type: "SET_ADMIN_TAB", payload: route.adminTab });
        } else {
          dispatch({ type: "SET_PAGE", payload: route.page });
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [clockTick, setClockTick] = React.useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((c) => c + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const clinicTimeInfo = useMemo(() => {
    void clockTick;
    return getClinicTimeInfo();
  }, [clockTick]);

  const userTzInfo = useMemo(() => {
    void clockTick;
    return getUserTimezone(state.userTimezone);
  }, [state.userTimezone, clockTick]);

  const setUserTimezone = useCallback((tz: string) => {
    dispatch({ type: "SET_USER_TIMEZONE", payload: tz });
  }, []);

  const sessionHours = useMemo(
    () => getMappedSessionHours(undefined, state.userTimezone),
    [state.userTimezone]
  );

  const value = useMemo<AppContextValue>(() => ({
    state, dispatch,
    cartTotalItems, cartSubtotalINR,
    navigateTo, openCart, closeCart, toggleCart,
    addToCart, removeFromCart, updateQty, clearCart,
    login, logout, openAuthModal, closeAuthModal,
    placeOrder, openTrackingModal, closeTrackingModal, toggleOrdersModal, addSavedCard, addVisitSummary, updatePatientMedicalFile,
    updateInventory, setAdminTab,
    blockDate, blockDateRange, unblockDate, updateBlockedDate, isDateBlocked, isSlotBlocked, getBlockedEntriesForDate,
    bookAppointment, cancelAppointment, updateAppointmentStatus,
    getBookedSlotsForDate, isSlotBooked,
    userTimezone: state.userTimezone,
    setUserTimezone,
    userTzInfo,
    clinicTimeInfo,
    sessionHours,
    postConsultationInvoice,
    submitConsultationPayment,
    confirmConsultationPayment,
    updateInvoiceTransactionRef,
    payConsultationInvoice,
    updateInvoiceStatus,
  }), [
    state, cartTotalItems, cartSubtotalINR,
    navigateTo, openCart, closeCart, toggleCart,
    addToCart, removeFromCart, updateQty, clearCart,
    login, logout, openAuthModal, closeAuthModal,
    placeOrder, openTrackingModal, closeTrackingModal, toggleOrdersModal, addSavedCard, addVisitSummary, updatePatientMedicalFile,
    updateInventory, setAdminTab,
    blockDate, blockDateRange, unblockDate, updateBlockedDate, isDateBlocked, isSlotBlocked, getBlockedEntriesForDate,
    bookAppointment, cancelAppointment, updateAppointmentStatus,
    getBookedSlotsForDate, isSlotBooked,
    setUserTimezone, userTzInfo, clinicTimeInfo, sessionHours,
    postConsultationInvoice, submitConsultationPayment, confirmConsultationPayment, updateInvoiceTransactionRef, payConsultationInvoice, updateInvoiceStatus,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

// ─── RBAC guard ───────────────────────────────────────────────────────────────
export function useRequireRole(required: "admin" | "patient"): void {
  const { state } = useApp();
  const role = state.authUser?.role;
  if (role !== required) {
    throw new RbacAccessError(
      `Access denied: role '${role ?? "guest"}' cannot access a '${required}' resource.`
    );
  }
}

export class RbacAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RbacAccessError";
  }
}

export type { AuthUser };

