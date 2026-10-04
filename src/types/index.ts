// ─── types/index.ts ──────────────────────────────────────────────────────────

// ── Navigation ───────────────────────────────────────────────────────────────
export type Page =
  | "home"
  | "about"
  | "appointments"
  | "cart-page"
  | "order-medicine"
  | "visit-summary"
  | "admin-dashboard"
  | "mobile-worker"
  | "privacy-policy"
  | "terms"
  | "404";

// ── Authentication & RBAC ────────────────────────────────────────────────────
export type UserRole = "patient" | "admin";

export interface SavedCard {
  id: string;
  cardHolder: string;
  cardNumber: string; // e.g. "**** **** **** 4242"
  brand: "Visa" | "Mastercard";
  expiry: string; // "12/28"
  isDefault?: boolean;
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: UserAddress;
  savedCards?: SavedCard[];
  savedUpiId?: string;
  bloodGroup?: string;
  knownAllergies?: string[];
  medicalHistoryTags?: string[];
}

/** Null = no one is logged in (guest state) */
export type AuthUser = UserProfile | null;

// ── Medicine / Cart ───────────────────────────────────────────────────────────
export interface Medicine {
  id: string;
  name: string;
  potency: string;
  formulation: string;
  priceINR: number;
  category: "constitutional" | "acute" | "tissue-salt" | "combination";
  prescribedToPatientIds?: string[];
  doctorNote?: string;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
}

// ── Inventory (Admin Stock Management) ───────────────────────────────────────
export interface InventoryItem {
  id: string;             // same as Medicine.id
  name: string;
  potency: string;
  formulation: string;
  priceINR: number;
  category: Medicine["category"];
  stockQty: number;       // current units in stock
  reorderQty: number;     // reorder trigger level
  supplier: string;
  lastRestocked: string;  // ISO date string
  expiryDate: string;     // ISO date string
  batchNumber: string;
  isActive: boolean;      // whether listed for sale
}

// ── Visit Summary & Medical Timeline History ──────────────────────────────────
export interface PrescribedRemedyItem {
  medicineId: string;
  medicineName: string;
  potency: string;
  dosage: string; // e.g. "4 globules twice daily after meals"
  duration: string; // e.g. "14 days"
}

export interface HomeopathicRemedySuggestion {
  remedy_name: string;
  potency: string;
  dosage_form: string;
  frequency: string;
  instructions: string;
}

export interface HomeopathicCaseRecord {
  metadata: {
    interaction_id: string;
    visiting_date: string;
    visiting_time: string;
    speech_language: {
      original: string;
      processed: "English";
    };
  };
  doctor_details: {
    doctor_id: string;
    name: string;
    clinic_name: string;
  };
  patient_details: {
    name: string;
    age: number | null;
    gender: string;
    place_of_birth: string | null;
    is_existing_patient: boolean;
  };
  patient_medical_history: {
    past_illnesses: Array<{
      condition: string;
      onset_year: number | null;
      status: string;
    }>;
    family_history: Array<{
      relation: string;
      condition: string;
    }>;
    drug_history: {
      allopathic_medications: Array<{
        drug_name: string;
        dosage: string;
        frequency: string;
        purpose: string;
      }>;
      previous_homeopathic_remedies: Array<{
        remedy: string;
        potency: string;
        outcome: string;
      }>;
      drug_allergies: string[];
    };
  };
  homeopathic_case_analysis: {
    chief_complaints: Array<{
      location: string;
      sensation: string;
      modalities: {
        aggravation: string;
        amelioration: string;
      };
      concomitants: string;
    }>;
    generals_and_constitution: {
      thermal_state: "Chilly" | "Hot" | "Ambothermal" | string;
      thirst: string;
      cravings_aversions: {
        cravings: string[];
        aversions: string[];
      };
      sleep_and_dreams: string;
      mental_emotional_state: string;
    };
  };
  clinical_summary: {
    conversation_summary: string;
    miasmatic_predominance: "Psoric" | "Sycotic" | "Syphilitic" | "Tubercular" | "Acute" | string;
  };
  treatment_plan: {
    medicines_suggested: Array<{
      remedy_name: string;
      potency: string;
      dosage_form: string;
      frequency: string;
      instructions: string;
    }>;
    next_visit: {
      recommended_date: string;
      time_frame: string;
    };
  };
  patient_visibility_permissions?: {
    share_remedies: boolean;
    share_modalities: boolean;
    share_lifestyle: boolean;
    share_mental_state: boolean;
    share_miasm: boolean;
    share_conversation_summary: boolean;
  };
}

export interface VisitSummaryRecord {
  id: string;
  visitDate: string;
  doctorName: string;
  clinicBranch: string;
  chiefDiagnosis: string;
  symptomsObserved: string[];
  prescribedRemedies: PrescribedRemedyItem[];
  clinicalNotes: string;
  lifestyleAdvice: string;
  followUpDate: string;
  prescriptionImageUri?: string;
  homeopathicCaseRecord?: HomeopathicCaseRecord;
}


export interface PatientMedicalFile {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  knownAllergies: string[];
  medicalHistory: string[];
  visits: VisitSummaryRecord[];
}

// ── 3rd Party Logistics & Order Tracking ─────────────────────────────────────
export interface LogisticsStep {
  status: string;
  location: string;
  timestamp: string;
  completed: boolean;
  active?: boolean;
}

export interface PlacedOrder {
  id: string;
  date: string;
  items: CartItem[];
  subtotalINR: number;
  shippingINR: number;
  taxINR: number;
  totalINR: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  paymentMethod: "gpay" | "card" | "cod";
  paymentDetails: string;
  courierPartner: "BlueDart Express 🚚" | "Delhivery Courier 📦" | "Shiprocket 🚀";
  trackingId: string; // e.g. "BD-894201-IN"
  estimatedDelivery: string;
  trackingSteps: LogisticsStep[];
}

// ── Appointment ───────────────────────────────────────────────────────────────
export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

export interface AppointmentPayload {
  patientDetails: { name: string; email: string; phone: string };
  startTime: string;
  endTime: string;
  providerCalendarId: string;
  patientCalendarSyncRequested: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  calendarEventId?: string;
}

export interface BookedAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  date: string;
  time: string;
  slot: string;
  type: "In-Person Clinic Visit" | "Online Tele-Consultation";
  chiefReason: string;
  status: "Confirmed" | "In Consultation" | "Completed" | "Pending" | "Cancelled";
  notes?: string;
  cancellationReason?: string;
  createdAt?: string;
}

export interface PatientClinicalMedia {
  id: string;
  patientId: string;
  title: string;
  category: "voice" | "image" | "prescription" | "lab_report";
  fileUrl: string;
  uploadDate: string;
  notes?: string;
  fileSize?: string;
}

export interface PurchaseOrderRequest {
  id: string;
  medicineName: string;
  potency: string;
  quantity: number;
  unit: string;
  vendor: string;
  urgency: "Normal" | "Urgent" | "Critical";
  status: "Draft" | "Placed" | "In Transit" | "Received";
  orderDate: string;
  notes?: string;
}

// ── Form State ───────────────────────────────────────────────────────────────
export interface AppointmentFormValues {
  name: string;
  email: string;
  phone: string;
  selectedDate: string;   // "YYYY-MM-DD"
  selectedSlot: string;   // "HH:MM" 24h
  syncToPatientCal: boolean;
  notes: string;
}

export type AppointmentFormErrors = Partial<Record<keyof AppointmentFormValues, string>>;

// ── Global App State (SSOT) ───────────────────────────────────────────────────
export type AdminTab = "dashboard" | "appointments" | "patients" | "inventory" | "dispatches" | "calendar" | "billing";

export interface BlockedCalendarDate {
  id: string;
  date: string; // "YYYY-MM-DD"
  reason: string;
  type: "ooo" | "holiday" | "leave";
  createdAt: string;
}

export interface AppState {
  authUser: AuthUser;
  activePage: Page;
  cart: CartItem[];
  isCartOpen: boolean;
  isAuthModalOpen: boolean;
  orders: PlacedOrder[];
  trackingModalOrder: PlacedOrder | null;
  ordersModalOpen: boolean;
  visitSummaries: Record<string, PatientMedicalFile>;
  inventory: InventoryItem[];
  adminTab: AdminTab;
  blockedDates: BlockedCalendarDate[];
  appointments: BookedAppointment[];
  userTimezone: string;
  consultationInvoices: ConsultationInvoice[];
}

// ── Consultation Billing & Patient Invoicing ─────────────────────────────────
export type ConsultationInvoiceStatus = "pending" | "processing" | "paid";

export interface ConsultationInvoice {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  visitDate: string;
  amountINR: number;
  consultationType: "In-Person Clinic Visit" | "Online Tele-Consultation" | "Follow-up Review";
  notes?: string;
  status: ConsultationInvoiceStatus;
  issuedAt: string;
  submittedAt?: string;
  paidAt?: string;
  paymentMethod?: "upi" | "card" | "netbanking" | "cash";
  transactionRef?: string;
  patientUpiId?: string;
  selectedBank?: string;
}

// ── Context Actions ───────────────────────────────────────────────────────────
export type AppAction =
  | { type: "SET_PAGE";           payload: Page }
  | { type: "SET_ADMIN_TAB";      payload: AdminTab }
  | { type: "SET_USER_TIMEZONE";  payload: string }
  | { type: "BLOCK_DATE";         payload: BlockedCalendarDate }
  | { type: "BLOCK_DATE_RANGE";   payload: BlockedCalendarDate[] }
  | { type: "UNBLOCK_DATE";       payload: string }
  | { type: "SET_BLOCKED_DATES";  payload: BlockedCalendarDate[] }
  | { type: "BOOK_APPOINTMENT";   payload: BookedAppointment }
  | { type: "CANCEL_APPOINTMENT"; payload: string }
  | { type: "UPDATE_APPOINTMENT_STATUS"; payload: { id: string; status: BookedAppointment["status"] } }
  | { type: "SET_APPOINTMENTS";   payload: BookedAppointment[] }
  | { type: "TOGGLE_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "ADD_TO_CART";        payload: Medicine }
  | { type: "REMOVE_FROM_CART";   payload: string }
  | { type: "UPDATE_QUANTITY";    payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOGIN";              payload: UserProfile }
  | { type: "LOGOUT" }
  | { type: "OPEN_AUTH_MODAL" }
  | { type: "CLOSE_AUTH_MODAL" }
  | { type: "PLACE_ORDER";        payload: PlacedOrder }
  | { type: "OPEN_TRACKING_MODAL"; payload: PlacedOrder }
  | { type: "CLOSE_TRACKING_MODAL" }
  | { type: "TOGGLE_ORDERS_MODAL"; payload?: boolean }
  | { type: "ADD_SAVED_CARD";     payload: SavedCard }
  | { type: "UPDATE_USER_PROFILE"; payload: Partial<UserProfile> }
  | { type: "ADD_VISIT_SUMMARY";  payload: { patientId: string; visit: VisitSummaryRecord } }
  | { type: "UPDATE_INVENTORY";   payload: InventoryItem }
  | { type: "SET_INVENTORY";      payload: InventoryItem[] }
  | { type: "POST_CONSULTATION_INVOICE"; payload: ConsultationInvoice }
  | { type: "POST_INVOICE"; payload: ConsultationInvoice }
  | { type: "SUBMIT_CONSULTATION_PAYMENT"; payload: { invoiceId: string; paymentMethod: ConsultationInvoice["paymentMethod"]; transactionRef: string; submittedAt: string; patientUpiId?: string; selectedBank?: string } }
  | { type: "CONFIRM_CONSULTATION_PAYMENT"; payload: { invoiceId: string; paidAt: string; transactionRef?: string } }
  | { type: "UPDATE_INVOICE_STATUS"; payload: { invoiceId: string; status: ConsultationInvoiceStatus } }
  | { type: "UPDATE_INVOICE_TRANSACTION_REF"; payload: { invoiceId: string; transactionRef: string } }
  | { type: "PAY_CONSULTATION_INVOICE"; payload: { invoiceId: string; paymentMethod: ConsultationInvoice["paymentMethod"]; transactionRef?: string; paidAt?: string } }
  | { type: "SET_CONSULTATION_INVOICES"; payload: ConsultationInvoice[] }
  | { type: "SET_VISIT_SUMMARIES"; payload: Record<string, PatientMedicalFile> };


