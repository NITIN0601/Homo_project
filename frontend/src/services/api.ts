/**
 * ─── API Client Layer (Python Backend Integration Ready) ─────────────────────
 *
 * CURRENT PHASE (Phase 1): typed, async endpoints backed by local SSOT state.
 * FUTURE PHASE (Phase 2): toggle BACKEND.ENABLED = true in config/app.ts
 * and point BACKEND.BASE_URL to your Python FastAPI server — nothing else changes.
 *
 * FastAPI Schema Equivalents (all documented for backend team):
 *   POST /api/v1/auth/login                           → AuthResponse
 *   POST /api/v1/auth/register                        → UserProfile
 *   GET  /api/v1/remedies/prescribed/{patient_id}     → List[Medicine]
 *   GET  /api/v1/patients/{patient_id}/visits         → PatientMedicalFile
 *   POST /api/v1/prescriptions/upload                 → VisitSummaryRecord
 *   POST /api/v1/orders/create                        → PlacedOrder
 *   GET  /api/v1/logistics/track/{tracking_id}        → LogisticsStatus
 *   GET  /api/v1/inventory                            → List[InventoryItem]
 *   PUT  /api/v1/inventory/{item_id}                  → InventoryItem
 *   POST /api/v1/whatsapp/send-message                → MessageStatus
 *   POST /api/v1/email/send                           → EmailStatus
 */

import type {
  UserProfile,
  Medicine,
  VisitSummaryRecord,
  PatientMedicalFile,
  InventoryItem,
  BookedAppointment,
  ConsultationInvoice,
  BlockedCalendarDate,
} from "../types";
import { BACKEND, CLINIC, WHATSAPP, STORAGE_KEYS, MOCK_TOKENS } from "../config";
import { formatDateShort } from "../utils/format";

const BASE = BACKEND.BASE_URL;
const USE  = BACKEND.ENABLED;

// ─── Unified fetch helper (adds auth header when token exists) ───────────────
async function coreFetch<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

const serverFetch = <T>(path: string, opts?: RequestInit) => coreFetch<T>("", path, opts);
const apiFetch    = <T>(path: string, opts?: RequestInit) => coreFetch<T>(BASE, path, opts);

export const api = {
  // ── Authentication ───────────────────────────────────────────────────────────
  auth: {
    login: async (email: string, pass: string): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return { token: MOCK_TOKENS.DEMO_JWT, profile: {} as UserProfile };
    },

    register: async (userData: { name: string; first_name?: string; middle_name?: string; last_name?: string; email: string; password: string; role?: string; phone?: string }): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(userData),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return { token: MOCK_TOKENS.DEMO_JWT, profile: userData as unknown as UserProfile };
    },

    sendOtp: async (email: string): Promise<{ success: boolean }> => {
      if (USE) return apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) });
      return { success: true };
    },

    invite: async (data: { name: string; email: string; role?: string; hospital_id?: string; phone?: string }): Promise<{ status: string; invite_url: string }> => {
      return apiFetch("/auth/invite", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    acceptInvite: async (token: string, password: string): Promise<{ token: string; profile: UserProfile }> => {
      const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      if (res.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
        localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
      }
      return res;
    },

    google: async (payload: { email: string; name: string; portal_intent?: string }): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/google", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return {
        token: MOCK_TOKENS.DEMO_JWT,
        profile: {
          id: "usr-google-01",
          name: payload.name,
          email: payload.email,
          initials: payload.name.slice(0, 2).toUpperCase(),
          role: payload.email.includes("admin") ? "admin" : "patient",
          phone: "+91 98450 12345",
        },
      };
    },

    verifyOtp: async (email: string, otp: string): Promise<{ valid: boolean }> => {
      if (USE) return apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
      return { valid: otp === "123456" }; // mock: any 6-digit code works in demo
    },
  },

  // ── Remedies & Prescriptions ─────────────────────────────────────────────────
  remedies: {
    getPrescribed: async (patientId: string): Promise<Medicine[]> => {
      if (USE) return apiFetch(`/remedies/prescribed/${patientId}`);
      return [];
    },
  },

  // ── TypeSafe AI Jev Decision Engine ──────────────────────────────────────────
  ai: {
    jevClassify: async (stateText: string, customQuestions?: Record<string, unknown>) => {
      if (USE) {
        return apiFetch<{
          status: string;
          engine: string;
          results: Record<string, { value?: boolean; probability?: number; choice?: string; score?: number; distribution?: Record<string, number> }>;
        }>("/ai/jev-classify", {
          method: "POST",
          body: JSON.stringify({ state: stateText, custom_questions: customQuestions }),
        });
      }
      return {
        status: "success",
        engine: "TypeSafe AI Jev Model (Simulated)",
        results: {
          is_emergency: { value: false, probability: 0.05 },
          consultation_modality: { choice: "in_person", probability: 0.85, distribution: { in_person: 0.85, tele_consult: 0.15 } },
          severity_index: { score: 3.5, confidence: 0.9 },
        },
      };
    },
  },

  // ── Patient Medical Records ───────────────────────────────────────────────────
  patient: {
    getMedicalFile: async (patientId: string): Promise<PatientMedicalFile | null> => {
      if (USE) return apiFetch(`/patients/${patientId}/visits`);
      return null;
    },

    uploadPrescription: async (patientId: string, imageUri: string): Promise<VisitSummaryRecord> => {
      if (USE) {
        const formData = new FormData();
        formData.append("prescription_file", imageUri);
        const res = await fetch(`${BASE}/patients/${patientId}/upload-prescription`, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      }
      // Mock OCR parse response
      return {
        id:        `vis-${Date.now()}`,
        visitDate: formatDateShort(new Date()),
        doctorName:    CLINIC.DOCTOR_TITLE,
        clinicBranch:  CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Uploaded Prescription Auto-Parsed by AI OCR",
        symptomsObserved: ["Patient Uploaded Prescription Photo"],
        prescribedRemedies: [
          { medicineId: "m1", medicineName: "Arnica Montana",  potency: "30C", dosage: "4 globules twice daily", duration: "10 days" },
          { medicineId: "m3", medicineName: "Nux Vomica",      potency: "30C", dosage: "2 drops at bedtime",      duration: "7 days" },
        ],
        clinicalNotes:   "Prescription document uploaded by patient. Parsed remedies automatically added to cart recommendation.",
        lifestyleAdvice: "Avoid caffeine & camphor 30 mins before remedies.",
        followUpDate:    "In 14 Days",
        prescriptionImageUri: imageUri,
      };
    },
  },

  // ── Orders & Logistics ────────────────────────────────────────────────────────
  orders: {
    create: async (orderPayload: Record<string, unknown>) => {
      if (USE) return apiFetch("/orders/create", { method: "POST", body: JSON.stringify(orderPayload) });
      return { success: true, orderId: `ORD-${Date.now()}` };
    },

    trackShipment: async (trackingId: string) => {
      if (USE) return apiFetch(`/logistics/track/${trackingId}`);
      return null; // mock tracking uses state from AppContext
    },
  },

  // ── Inventory (Admin) ─────────────────────────────────────────────────────────
  inventory: {
    getAll: async (): Promise<InventoryItem[]> => {
      if (USE) return apiFetch("/inventory");
      return []; // falls back to AppContext MOCK_INVENTORY in UI
    },

    update: async (item: InventoryItem): Promise<InventoryItem> => {
      if (USE) return apiFetch(`/inventory/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
      return item; // optimistic UI update — state already updated via dispatch
    },

    restock: async (itemId: string, qty: number): Promise<{ success: boolean }> => {
      if (USE) return apiFetch(`/inventory/${itemId}/restock`, { method: "POST", body: JSON.stringify({ qty }) });
      return { success: true };
    },
  },

  // ── WhatsApp Business Cloud API ───────────────────────────────────────────────
  whatsapp: {
    registerAdminBusiness: async (config: {
      doctorName: string;
      whatsappNumber: string;
      businessAccountId: string;
      autoNotifyRegistration: boolean;
      autoNotifyPrescriptions: boolean;
    }) => {
      if (USE) return apiFetch("/whatsapp/register-admin", { method: "POST", body: JSON.stringify(config) });
      return { success: true, message: `WhatsApp Business registered for ${config.doctorName}` };
    },

    sendMessage: async (payload: { phone: string; message: string; type: "registration" | "prescription" | "order" }) => {
      if (USE) return apiFetch("/whatsapp/send-message", { method: "POST", body: JSON.stringify(payload) });
      return { success: true, messageId: `wa_msg_${Date.now()}`, timestamp: new Date().toISOString() };
    },

    /** Opens WhatsApp deeplink — appends patient login details or Guest automatically */
    openChat: (message?: string, user?: { name: string; email?: string } | null, phone?: string) => {
      const number = (phone ?? WHATSAPP.NUMBER_CLEAN).replace(/[^0-9]/g, "");
      const userTag = user
        ? `Patient: ${user.name} (${user.email ?? "No Email"})`
        : `Patient Status: Guest (Not Logged In)`;

      let baseText = message ?? `Hello ${CLINIC.FULL_NAME}! 👋 I need assistance with my homoeopathy consultation.`;
      
      // Append userTag if not already present
      if (!baseText.includes("Patient:")) {
        baseText = `${baseText}\n\n[Sender Info — ${userTag}]`;
      }

      window.open(WHATSAPP.buildUrl(baseText, number), "_blank");
    },
  },

  // ── Email Notifications ───────────────────────────────────────────────────────
  email: {
    sendNotification: async (payload: { email: string; subject: string; body: string }) => {
      if (USE) return apiFetch("/email/send", { method: "POST", body: JSON.stringify(payload) });
      return { success: true, message: "Email queued (mock)" };
    },
  },

  // ── Appointments & Calendar ───────────────────────────────────────────────────
  appointments: {
    getAll: async (): Promise<BookedAppointment[]> => {
      try {
        return await serverFetch<BookedAppointment[]>("/api/appointments");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        return raw ? JSON.parse(raw) : [];
      }
    },
    book: async (payload: {
      user_email: string;
      user_name: string;
      start_time: string;
      end_time: string;
      summary?: string;
      description?: string;
      phone?: string;
      patient_id?: string;
    }) => {
      try {
        return await serverFetch<{
          status: string;
          message: string;
          appointment: BookedAppointment;
          calendar_event?: any;
          email_delivery?: any;
        }>("/api/book-appointment", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("Direct /api/book-appointment failed, falling back to local dispatch", err);
        return null;
      }
    },
    save: async (appointment: BookedAppointment) => {
      try {
        return await serverFetch("/api/appointments", {
          method: "POST",
          body: JSON.stringify(appointment),
        });
      } catch {
        return null;
      }
    },
    updateStatus: async (id: string, status: BookedAppointment["status"]) => {
      try {
        return await serverFetch<BookedAppointment>(`/api/appointments/${id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
      } catch {
        return null;
      }
    },
  },

  // ── Consultation Billing & Invoices ──────────────────────────────────────────
  invoices: {
    getAll: async (): Promise<ConsultationInvoice[]> => {
      try {
        return await serverFetch<ConsultationInvoice[]>("/api/consultation-invoices");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.CONSULTATION_INVOICES);
        return raw ? JSON.parse(raw) : [];
      }
    },
    create: async (invoice: ConsultationInvoice) => {
      try {
        return await serverFetch("/api/consultation-invoices", {
          method: "POST",
          body: JSON.stringify(invoice),
        });
      } catch {
        return null;
      }
    },
    update: async (invoiceId: string, updates: Partial<ConsultationInvoice>) => {
      try {
        return await serverFetch(`/api/consultation-invoices/${invoiceId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });
      } catch {
        return null;
      }
    },
  },

  // ── Visit Summaries ──────────────────────────────────────────────────────────
  visits: {
    getAll: async (): Promise<Record<string, PatientMedicalFile>> => {
      try {
        return await serverFetch<Record<string, PatientMedicalFile>>("/api/visit-summaries");
      } catch {
        return {};
      }
    },
    save: async (patientId: string, visit: VisitSummaryRecord) => {
      try {
        return await serverFetch("/api/visit-summaries", {
          method: "POST",
          body: JSON.stringify({ patientId, visit }),
        });
      } catch {
        return null;
      }
    },
  },

  // ── Blocked Dates / Leave ────────────────────────────────────────────────────
  calendar: {
    getBlockedDates: async (): Promise<BlockedCalendarDate[]> => {
      try {
        return await serverFetch<BlockedCalendarDate[]>("/api/blocked-dates");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED_DATES);
        return raw ? JSON.parse(raw) : [];
      }
    },
    saveBlockedDates: async (dates: BlockedCalendarDate[]) => {
      try {
        return await serverFetch("/api/blocked-dates", {
          method: "POST",
          body: JSON.stringify(dates),
        });
      } catch {
        return null;
      }
    },
  },
  hospitals: {
    getFeatures: async (hospitalId: string) => {
      if (USE) return apiFetch<{ hospital_id: string; features: Record<string, boolean>; updated_at?: string }>(`/hospitals/${hospitalId}/features`);
      return { hospital_id: hospitalId, features: {} };
    },
    updateFeatures: async (hospitalId: string, features: Record<string, boolean>) => {
      if (USE) {
        return apiFetch<{ status: string; hospital_id: string; features: Record<string, boolean> }>(`/hospitals/${hospitalId}/features`, {
          method: "PATCH",
          body: JSON.stringify(features),
        });
      }
      return { status: "updated", hospital_id: hospitalId, features };
    },
  },

  // ── Multi-Tenant Platform & Super Admin Management ────────────────────────────
  platform: {
    createHospital: async (data: Record<string, unknown>) => {
      return apiFetch("/hospitals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    createDoctor: async (data: Record<string, unknown>) => {
      return apiFetch("/doctors", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    toggleDevMode: async (useMockData: boolean) => {
      return apiFetch("/platform/toggle-dev-mode", {
        method: "POST",
        body: JSON.stringify({ use_mock_data: useMockData }),
      });
    },
  },
};
