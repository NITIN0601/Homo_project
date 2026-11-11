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

// ─── Re-exports from modular router and reducer subsystems ───────────────────
export * from "../router/routeParser";
export * from "./appInitialState";
export * from "./appReducer";

import {
  parseRouteFromLocation,
  getUrlForState,
  syncUrlWithState,
  type ParsedRoute,
} from "../router/routeParser";
import { INITIAL_STATE } from "./appInitialState";
import { appReducer } from "./appReducer";

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
      if ((e.key === "ehr_visit_summaries" || e.key === "agastya_visit_summaries") && e.newValue) {
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
    // Minute-level clock tick to refresh clinic time without high-frequency re-render thrashing
    const timer = setInterval(() => {
      setClockTick((c) => c + 1);
    }, 60000);
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

