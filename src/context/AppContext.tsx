import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
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
  CLINIC,
  DOCTOR,
  DEMO_CREDENTIALS,
  LOGISTICS_HUBS,
  STORAGE_KEYS,
} from "../config";
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

// ─── Medicine catalogue (with doctor patient assignments & prescription notes) ──
export const MEDICINE_CATALOGUE: Medicine[] = [
  {
    id: "m1",
    name: "Arnica Montana",
    potency: "30C",
    formulation: "Globules 4g",
    priceINR: 160,
    category: "acute",
    prescribedToPatientIds: ["usr-001", "usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Muscle Soreness & Trauma · Take 4 globules BD after meals`,
  },
  {
    id: "m2",
    name: "Lycopodium Clavatum",
    potency: "200C",
    formulation: "Globules 4g",
    priceINR: 210,
    category: "constitutional",
    prescribedToPatientIds: ["usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Chronic Bloating & Anxiety · Take 2 drops in water before bedtime`,
  },
  {
    id: "m3",
    name: "Nux Vomica",
    potency: "30C",
    formulation: "Drops 30ml",
    priceINR: 140,
    category: "acute",
    prescribedToPatientIds: ["usr-001"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Dyspepsia & Acidity · Take 4 drops post dinner`,
  },
  {
    id: "m4",
    name: "Sulphur",
    potency: "200C",
    formulation: "Globules 4g",
    priceINR: 195,
    category: "constitutional",
    prescribedToPatientIds: ["usr-001", "usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Constitutional Skin Rash · Single weekly dose on Sunday morning`,
  },
  {
    id: "m5",
    name: "Belladonna",
    potency: "6C",
    formulation: "Globules 4g",
    priceINR: 120,
    category: "acute",
    prescribedToPatientIds: ["usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Acute Throbbing Headache · Take 4 globules hourly during acute attack`,
  },
  {
    id: "m6",
    name: "Natrum Muriaticum",
    potency: "200C",
    formulation: "Globules 4g",
    priceINR: 220,
    category: "constitutional",
    prescribedToPatientIds: ["usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Sun Headache & Allergic Rhinitis · Take 4 globules daily`,
  },
  {
    id: "m7",
    name: "Calcarea Fluorica",
    potency: "6X",
    formulation: "Tissue Salt",
    priceINR: 185,
    category: "tissue-salt",
    prescribedToPatientIds: ["usr-001"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Joint Flexibility · Take 4 tablets thrice daily`,
  },
  {
    id: "m8",
    name: "Ferrum Phosphoricum",
    potency: "6X",
    formulation: "Tissue Salt",
    priceINR: 175,
    category: "tissue-salt",
    prescribedToPatientIds: ["usr-001", "usr-002"],
    doctorNote: `Prescribed by ${CLINIC.DOCTOR_NAME} for Immunity Support & First Stage Inflammation · Take 4 tablets BD`,
  },
];

// ─── Mock credential store with user-specific payment profiles ────────────────
export const MOCK_ACCOUNTS: Record<string, { password: string; profile: UserProfile }> = {
  [DEMO_CREDENTIALS.ADMIN.email]: {
    password: DEMO_CREDENTIALS.ADMIN.password,
    profile: {
      id:       "usr-admin-001",
      name:     CLINIC.DOCTOR_NAME,
      initials: "BK",
      email:    CLINIC.DOCTOR_EMAIL,
      role:     "admin",
      phone:    CLINIC.PHONE_DISPLAY,
      address: {
        street:  CLINIC.ADDRESS.STREET,
        city:    CLINIC.ADDRESS.CITY,
        state:   CLINIC.ADDRESS.STATE,
        pincode: CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: CLINIC.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  "admin@agastyahomoeo.com": {
    password: "admin123",
    profile: {
      id:       "usr-admin-001",
      name:     CLINIC.DOCTOR_NAME,
      initials: "BK",
      email:    CLINIC.DOCTOR_EMAIL,
      role:     "admin",
      phone:    CLINIC.PHONE_DISPLAY,
      address: {
        street:  CLINIC.ADDRESS.STREET,
        city:    CLINIC.ADDRESS.CITY,
        state:   CLINIC.ADDRESS.STATE,
        pincode: CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: DOCTOR.UPI_ID,
      savedCards: [
        {
          id: "card-admin-1",
          cardHolder: CLINIC.DOCTOR_NAME,
          cardNumber: "**** **** **** 9911",
          brand: "Visa",
          expiry: "09/29",
          isDefault: true,
        },
      ],
    },
  },
  "john@agastyahomoeo.com": {
    password: "patient123",
    profile: {
      id:       "usr-001",
      name:     "John Doe",
      initials: "JD",
      email:    "john@agastyahomoeo.com",
      role:     "patient",
      phone:    "+91 98123 45678",
      address: {
        street: "42 Park Avenue, Koramangala 4th Block",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034",
      },
      savedUpiId: "john.doe@okicici",
      savedCards: [
        {
          id: "card-jd-1",
          cardHolder: "John Doe",
          cardNumber: "**** **** **** 4242",
          brand: "Visa",
          expiry: "12/28",
          isDefault: true,
        },
        {
          id: "card-jd-2",
          cardHolder: "John Doe",
          cardNumber: "**** **** **** 8899",
          brand: "Mastercard",
          expiry: "05/27",
        },
      ],
    },
  },
  "priya@agastyahomoeo.com": {
    password: "priya2026",
    profile: {
      id:       "usr-002",
      name:     "Priya Sharma",
      initials: "PS",
      email:    "priya@agastyahomoeo.com",
      role:     "patient",
      phone:    "+91 99887 76655",
      address: {
        street: "12 Greenway Heights, Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
      },
      savedUpiId: "priya.sharma@okaxis",
      savedCards: [
        {
          id: "card-ps-1",
          cardHolder: "Priya Sharma",
          cardNumber: "**** **** **** 5544",
          brand: "Mastercard",
          expiry: "10/29",
          isDefault: true,
        },
      ],
    },
  },
};

// ─── Mock Inventory — seeded from MEDICINE_CATALOGUE (admin manages stock) ───
export const MOCK_INVENTORY: InventoryItem[] = MEDICINE_CATALOGUE.map((m, i) => ({
  id:            m.id,
  name:          m.name,
  potency:       m.potency,
  formulation:   m.formulation,
  priceINR:      m.priceINR,
  category:      m.category,
  stockQty:      [45, 12, 88, 5, 30, 67, 9, 22][i] ?? 50,  // varied demo stock levels
  reorderQty:    10,
  supplier:      ["SBL Pvt Ltd", "Boiron India", "Reckeweg India", "SBL Pvt Ltd",
                  "Schwabe India", "SBL Pvt Ltd", "Reckeweg India", "Schwabe India"][i] ?? "SBL Pvt Ltd",
  lastRestocked: "2026-09-20",
  expiryDate:    "2028-03-01",
  batchNumber:   `BTH-${m.id.toUpperCase()}-2026`,
  isActive:      true,
}));


// Demo default visit summary records for patient history timeline
const DEMO_VISIT_SUMMARIES: Record<string, PatientMedicalFile> = {
  "usr-001": {
    patientId: "usr-001",
    patientName: "John Doe",
    age: 34,
    gender: "Male",
    bloodGroup: "O+",
    knownAllergies: ["Dust Mites", "Penicillin"],
    medicalHistory: ["Chronic Dyspepsia since 2024", "Trauma Soreness (Post-Sports)", "Constitutional Rash"],
    visits: [
      {
        id: "vis-101",
        visitDate: "Sep 15, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Acute Dyspepsia with Post-Exercise Muscle Fatigue",
        symptomsObserved: ["Bloating post meals", "Hamstring strain", "Acidity after coffee"],
        prescribedRemedies: [
          { medicineId: "m1", medicineName: "Arnica Montana", potency: "30C", dosage: "4 globules twice daily after meals", duration: "10 days" },
          { medicineId: "m3", medicineName: "Nux Vomica", potency: "30C", dosage: "4 drops post dinner", duration: "7 days" },
        ],
        clinicalNotes: "Patient reports improvement in indigestion. Prescribed Arnica 30C for muscular soreness post marathon training. Nux Vomica 30C added for hyperacidity.",
        lifestyleAdvice: "Avoid caffeine after 6 PM. Drink warm water post meals.",
        followUpDate: "Oct 15, 2026",
        homeopathicCaseRecord: {
          metadata: {
            interaction_id: "INT-VS-20260915-01",
            visiting_date: "2026-09-15",
            visiting_time: "10:30",
            speech_language: {
              original: "English",
              processed: "English",
            },
          },
          doctor_details: {
            doctor_id: "DOC-BK-001",
            name: CLINIC.DOCTOR_TITLE,
            clinic_name: CLINIC.FULL_NAME,
          },
          patient_details: {
            name: "John Doe",
            age: 34,
            gender: "Male",
            place_of_birth: null,
            is_existing_patient: true,
          },
          patient_medical_history: {
            past_illnesses: [
              { condition: "Chronic Dyspepsia", onset_year: 2024, status: "Sub-acute recurrent" },
            ],
            family_history: [
              { relation: "Father", condition: "Gastric ulcer disease" },
            ],
            drug_history: {
              allopathic_medications: [
                { drug_name: "Omeprazole", dosage: "20mg", frequency: "OD", purpose: "Acid reflux" },
              ],
              previous_homeopathic_remedies: [
                { remedy: "Nux Vomica", potency: "30C", outcome: "Partial relief of morning nausea" },
              ],
              drug_allergies: ["Penicillin"],
            },
          },
          homeopathic_case_analysis: {
            chief_complaints: [
              {
                location: "Epigastrium and bilateral hamstring muscles",
                sensation: "Burning fullness with sore, bruised sensation post physical training",
                modalities: {
                  aggravation: "Mental overwork, coffee consumption, motion and touch on hamstring",
                  amelioration: "Warm compresses, resting in darkened room, passing flatus",
                },
                concomitants: "Sour eructations, morning irritability, craving for stimulants",
              },
            ],
            generals_and_constitution: {
              thermal_state: "Chilly",
              thirst: "Moderate thirst for warm water",
              cravings_aversions: {
                cravings: ["Warm coffee", "Spicy food", "Fats"],
                aversions: ["Cold milk", "Uncooked raw vegetables"],
              },
              sleep_and_dreams: "Wakes at 3:00 AM with work preoccupation",
              mental_emotional_state: "High-drive executive, irritable when interrupted, fastidious",
            },
          },
          clinical_summary: {
            conversation_summary: "Patient presented with acute post-marathon muscular fatigue combined with recurrent acid dyspepsia aggravated by caffeine indiscretion.",
            miasmatic_predominance: "Psoro-Sycotic",
          },
          treatment_plan: {
            medicines_suggested: [
              {
                remedy_name: "Arnica Montana",
                potency: "30C",
                dosage_form: "Globules (Size 30 cane sugar pills)",
                frequency: "Twice daily",
                instructions: "4 globules twice daily after meals for 10 days.",
              },
              {
                remedy_name: "Nux Vomica",
                potency: "30C",
                dosage_form: "Liquid dilution in purified water",
                frequency: "Once at night",
                instructions: "4 drops in half teaspoon of water post dinner for 7 days.",
              },
            ],
            next_visit: {
              recommended_date: "2026-10-15",
              time_frame: "In 4 Weeks",
            },
          },
          patient_visibility_permissions: {
            share_remedies: true,
            share_modalities: true,
            share_lifestyle: true,
            share_mental_state: false,
            share_miasm: false,
            share_conversation_summary: false,
          },
        },
      },
      {
        id: "vis-100",
        visitDate: "Aug 02, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.MALLESHWARAM,
        chiefDiagnosis: "Initial Constitutional Evaluation & Allergic Sensitivity",
        symptomsObserved: ["Morning sneezing fits", "Skin itching on sun exposure"],
        prescribedRemedies: [
          { medicineId: "m4", medicineName: "Sulphur", potency: "200C", dosage: "Single dose on Sunday morning", duration: "4 weeks" },
          { medicineId: "m7", medicineName: "Calcarea Fluorica", potency: "6X", dosage: "4 tablets thrice daily", duration: "30 days" },
        ],
        clinicalNotes: "Detailed case taking performed. Hot patient profile with constitutional Sulphur affinity. Prescribed Calcarea Fluor 6X for joint support.",
        lifestyleAdvice: "Sunscreen application when outdoors. Hydration 3L daily.",
        followUpDate: "Sep 15, 2026",
      },
    ],
  },
  "usr-002": {
    patientId: "usr-002",
    patientName: "Priya Sharma",
    age: 29,
    gender: "Female",
    bloodGroup: "B+",
    knownAllergies: ["Pollen", "Dairy"],
    medicalHistory: ["Anxiety-induced Insomnia", "Sinusitis"],
    visits: [
      {
        id: "vis-201",
        visitDate: "Sep 20, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Anxiety-linked Abdominal Discomfort & Sun Headache",
        symptomsObserved: ["Flatulence late afternoon", "Throbbing frontal headache"],
        prescribedRemedies: [
          { medicineId: "m2", medicineName: "Lycopodium Clavatum", potency: "200C", dosage: "2 drops in water before bedtime", duration: "14 days" },
          { medicineId: "m6", medicineName: "Natrum Muriaticum", potency: "200C", dosage: "4 globules daily", duration: "14 days" },
        ],
        clinicalNotes: "Patient responds well to Lycopodium constitutional treatment. Added Natrum Mur 200C for sun-triggered headaches.",
        lifestyleAdvice: "Practice 10 mins Pranayama morning & evening.",
        followUpDate: "Oct 20, 2026",
      },
    ],
  },
};

// Demo default orders for rich initial view
const DEMO_ORDERS: PlacedOrder[] = [
  {
    id: "ORD-98241",
    date: "2026-09-27 14:30",
    items: [
      { medicine: MEDICINE_CATALOGUE[0], quantity: 2 },
      { medicine: MEDICINE_CATALOGUE[2], quantity: 1 },
    ],
    subtotalINR: 460,
    shippingINR: 0,
    taxINR: 23,
    totalINR: 483,
    customerName: "John Doe",
    customerEmail: "john@agastyahomoeo.com",
    shippingAddress: "42 Park Avenue, Koramangala 4th Block, Bengaluru - 560034",
    paymentMethod: "gpay",
    paymentDetails: "Google Pay (john.doe@okicici)",
    courierPartner: "BlueDart Express 🚚",
    trackingId: "BD-77820194-IN",
    estimatedDelivery: "Sep 30, 2026",
    trackingSteps: [
      { status: "Order Placed & Verified", location: LOGISTICS_HUBS.CLINIC_HUB, timestamp: "Sep 27, 14:30", completed: true },
      { status: "Packed & Handed to BlueDart", location: "BlueDart Logistics Hub, Bengaluru", timestamp: "Sep 27, 18:45", completed: true },
      { status: "In Transit across State Hub", location: "BlueDart Sort Center, Bengaluru", timestamp: "Sep 28, 09:15", completed: true, active: true },
      { status: "Out for Delivery", location: "Koramangala Delivery Station", timestamp: "Expected Sep 30", completed: false },
      { status: "Package Delivered", location: "Patient Address", timestamp: "Pending", completed: false },
    ],
  },
];

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

const DEFAULT_BLOCKED_DATES: BlockedCalendarDate[] = [
  {
    id: "blk-1",
    date: "2026-10-05",
    reason: "Doctor OOO — Annual Classical Homoeopathy Research Symposium",
    type: "ooo",
    createdAt: "2026-09-30",
  },
  {
    id: "blk-2",
    date: "2026-10-06",
    reason: "Doctor OOO — Clinical Seminar & Research Review",
    type: "ooo",
    createdAt: "2026-09-30",
  },
  {
    id: "blk-3",
    date: "2026-10-12",
    reason: "Clinic Closed — Dussehra Festive Holiday",
    type: "holiday",
    createdAt: "2026-09-30",
  },
];

function getInitialBlockedDates(): BlockedCalendarDate[] {
  if (typeof window === "undefined") return DEFAULT_BLOCKED_DATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED_DATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, BlockedCalendarDate>();
        for (const item of parsed) {
          if (item && item.date) uniqueMap.set(item.date, item);
        }
        return Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }
    }
  } catch {}
  return DEFAULT_BLOCKED_DATES;
}

export const DEFAULT_APPOINTMENTS: BookedAppointment[] = [
  {
    id: "apt-101",
    patientId: "usr-001",
    patientName: "John Doe",
    patientPhone: "+91 98201 12345",
    patientEmail: "john@agastyahomoeo.com",
    date: "Today",
    time: "10:00 AM",
    slot: "10:00",
    type: "Online Tele-Consultation",
    chiefReason: "Acute Dyspepsia & Post-Marathon Muscle Soreness",
    status: "In Consultation",
  },
  {
    id: "apt-102",
    patientId: "usr-002",
    patientName: "Priya Sharma",
    patientPhone: "+91 98202 23456",
    patientEmail: "priya@agastyahomoeo.com",
    date: "Today",
    time: "11:30 AM",
    slot: "11:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Recurrent Migraine & Sleep Disturbance",
    status: "Confirmed",
  },
  {
    id: "apt-103",
    patientId: "usr-003",
    patientName: "Rajesh Varma",
    patientPhone: "+91 98203 34567",
    patientEmail: "rajesh@agastyahomoeo.com",
    date: "Today",
    time: "02:30 PM",
    slot: "14:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Allergic Rhinitis & Seasonal Sneezing Modalities",
    status: "Confirmed",
  },
  {
    id: "apt-104",
    patientId: "usr-004",
    patientName: "Sunita Rao",
    patientPhone: "+91 98204 45678",
    patientEmail: "sunita@agastyahomoeo.com",
    date: "Today",
    time: "04:15 PM",
    slot: "16:15",
    type: "Online Tele-Consultation",
    chiefReason: "Cervical Spondylosis Stiffness with Weather Aggravation",
    status: "Pending",
  },
  {
    id: "apt-105",
    patientId: "usr-005",
    patientName: "Amit Patel",
    patientPhone: "+91 98205 56789",
    patientEmail: "amit@agastyahomoeo.com",
    date: "Tomorrow",
    time: "10:30 AM",
    slot: "10:30",
    type: "In-Person Clinic Visit",
    chiefReason: "Eczematous Rash & Skin Itching at Night",
    status: "Confirmed",
  },
];

function getInitialAppointments(): BookedAppointment[] {
  if (typeof window === "undefined") return DEFAULT_APPOINTMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_APPOINTMENTS;
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

export const DEFAULT_CONSULTATION_INVOICES: ConsultationInvoice[] = [
  {
    id: "INV-2026-101",
    patientId: "usr-001",
    patientName: "John Doe",
    doctorName: DOCTOR.TITLE,
    visitDate: "2026-10-02",
    amountINR: 750,
    consultationType: "In-Person Clinic Visit",
    notes: "Chronic constitutional assessment & acute dyspepsia remedy prescription",
    status: "pending",
    issuedAt: "2026-10-02 10:30 AM",
  },
  {
    id: "INV-2026-102",
    patientId: "usr-002",
    patientName: "Priya Sharma",
    doctorName: DOCTOR.TITLE,
    visitDate: "2026-09-28",
    amountINR: 750,
    consultationType: "Online Tele-Consultation",
    notes: "Migraine follow-up review & totality potency adjustment",
    status: "paid",
    issuedAt: "2026-09-28 11:45 AM",
    paidAt: "2026-09-28 12:10 PM",
    paymentMethod: "upi",
    transactionRef: "UPI-984210982-IN",
  },
];

function getInitialConsultationInvoices(): ConsultationInvoice[] {
  if (typeof window === "undefined") return DEFAULT_CONSULTATION_INVOICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSULTATION_INVOICES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CONSULTATION_INVOICES;
}

function getInitialVisitSummaries(): Record<string, PatientMedicalFile> {
  if (typeof window === "undefined") return DEMO_VISIT_SUMMARIES;
  try {
    const raw = localStorage.getItem("agastya_visit_summaries");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEMO_VISIT_SUMMARIES, ...parsed };
    }
  } catch {}
  return DEMO_VISIT_SUMMARIES;
}

export const INITIAL_STATE: AppState = {
  authUser:           initialAuthUser,
  activePage:         getInitialPage(initialAuthUser),
  cart:               [],
  isCartOpen:         false,
  isAuthModalOpen:    false,
  orders:             DEMO_ORDERS,
  trackingModalOrder: null,
  ordersModalOpen:    false,
  visitSummaries:     getInitialVisitSummaries(),
  inventory:          MOCK_INVENTORY,
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
      const updated = [...state.blockedDates.filter((b) => b.date !== action.payload.date), action.payload]
        .sort((a, b) => a.date.localeCompare(b.date));
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "BLOCK_DATE_RANGE": {
      const newDatesMap = new Map<string, BlockedCalendarDate>();
      for (const item of action.payload) {
        newDatesMap.set(item.date, item);
      }
      const existingFiltered = state.blockedDates.filter((b) => !newDatesMap.has(b.date));
      const updated = [...existingFiltered, ...action.payload].sort((a, b) => a.date.localeCompare(b.date));
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "UNBLOCK_DATE": {
      const updated = state.blockedDates.filter((b) => b.date !== action.payload);
      try { localStorage.setItem(STORAGE_KEYS.BLOCKED_DATES, JSON.stringify(updated)); } catch {}
      return { ...state, blockedDates: updated };
    }

    case "SET_BLOCKED_DATES": {
      const uniqueMap = new Map<string, BlockedCalendarDate>();
      if (Array.isArray(action.payload)) {
        for (const item of action.payload) {
          if (item && item.date) {
            uniqueMap.set(item.date, item);
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
  updateInventory:    (item: InventoryItem) => void;
  setAdminTab:        (tab: AdminTab) => void;
  blockDate:          (date: string, reason: string, type?: "ooo" | "holiday" | "leave") => void;
  blockDateRange:     (startDate: string, endDate: string, reason: string, type?: "ooo" | "holiday" | "leave") => void;
  unblockDate:        (date: string) => void;
  isDateBlocked:      (date: string) => BlockedCalendarDate | undefined;
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
  const updateInventory    = useCallback((item: InventoryItem) => dispatch({ type: "UPDATE_INVENTORY", payload: item }), []);

  const blockDate = useCallback((date: string, reason: string, type: "ooo" | "holiday" | "leave" = "ooo") => {
    const item: BlockedCalendarDate = {
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      reason,
      type,
      createdAt: formatDateISO(),
    };
    dispatch({ type: "BLOCK_DATE", payload: item });

    // Sync to file-backed cross-port API
    const updated = [...state.blockedDates.filter((b) => b.date !== date), item]
      .sort((a, b) => a.date.localeCompare(b.date));
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
    type: "ooo" | "holiday" | "leave" = "ooo"
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

    const newItems: BlockedCalendarDate[] = datesToBlock.map((date, idx) => ({
      id: `blk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      reason,
      type,
      createdAt: formatDateISO(),
    }));

    dispatch({ type: "BLOCK_DATE_RANGE", payload: newItems });

    const dateSet = new Set(datesToBlock);
    const updated = [
      ...state.blockedDates.filter((b) => !dateSet.has(b.date)),
      ...newItems,
    ].sort((a, b) => a.date.localeCompare(b.date));

    fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, [state.blockedDates]);

  const unblockDate = useCallback((date: string) => {
    dispatch({ type: "UNBLOCK_DATE", payload: date });

    // Sync to file-backed cross-port API
    const updated = state.blockedDates.filter((b) => b.date !== date);
    fetch("/api/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, [state.blockedDates]);

  const isDateBlocked = useCallback((date: string) => {
    return state.blockedDates.find((b) => b.date === date);
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

    // 2. Cross-port polling (fetches from shared dev server API every 1s)
    let isSubscribed = true;
    const syncFromServer = async () => {
      try {
        const resDates = await fetch("/api/blocked-dates");
        if (resDates.ok && isSubscribed) {
          const data = await resDates.json();
          if (Array.isArray(data)) {
            const currentStr = JSON.stringify(state.blockedDates);
            const serverStr = JSON.stringify(data);
            if (currentStr !== serverStr) {
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
            const currentStr = JSON.stringify(state.appointments);
            const serverStr = JSON.stringify(data);
            if (currentStr !== serverStr) {
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
            const currentStr = JSON.stringify(state.consultationInvoices);
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
            const currentStr = JSON.stringify(state.visitSummaries);
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
    const interval = setInterval(syncFromServer, 1000);
    const onFocus = () => syncFromServer();
    window.addEventListener("focus", onFocus);

    return () => {
      isSubscribed = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [state.blockedDates, state.appointments, state.consultationInvoices, state.visitSummaries]);

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
    placeOrder, openTrackingModal, closeTrackingModal, toggleOrdersModal, addSavedCard, addVisitSummary,
    updateInventory, setAdminTab,
    blockDate, blockDateRange, unblockDate, isDateBlocked,
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
    placeOrder, openTrackingModal, closeTrackingModal, toggleOrdersModal, addSavedCard, addVisitSummary,
    updateInventory, setAdminTab,
    blockDate, blockDateRange, unblockDate, isDateBlocked,
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

