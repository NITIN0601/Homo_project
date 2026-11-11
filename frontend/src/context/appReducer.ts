import type {
  AppState,
  AppAction,
  Page,
  BlockedCalendarDate,
} from "../types";
import { STORAGE_KEYS } from "../config";
import { MOCK_VISIT_SUMMARIES as DEMO_VISIT_SUMMARIES } from "../data/mocks";
import { syncUrlWithState } from "../router/routeParser";

// ─── Reducer (SSOT) ───────────────────────────────────────────────────────────
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
        localStorage.setItem("ehr_visit_summaries", JSON.stringify(updatedVisits));
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
        localStorage.setItem("ehr_visit_summaries", JSON.stringify(updatedMap));
      } catch {}
      return {
        ...state,
        visitSummaries: updatedMap,
      };
    }

    case "SET_VISIT_SUMMARIES": {
      try {
        localStorage.setItem("ehr_visit_summaries", JSON.stringify(action.payload));
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

