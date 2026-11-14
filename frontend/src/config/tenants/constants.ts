import type { HospitalFeatures } from "../../types/tenant";

export interface ColorPreset {
  label: string;
  primary: string;
  accent: string;
}

export const DEFAULT_COLOR_PRESETS: readonly ColorPreset[] = [
  { label: "Teal (Ayur)", primary: "#0d9488", accent: "#14b8a6" },
  { label: "Sapphire (General)", primary: "#1e3a6e", accent: "#3b82f6" },
  { label: "Emerald (Integrative)", primary: "#065f46", accent: "#10b981" },
  { label: "Forest (Vanilla)", primary: "#1b4332", accent: "#40916c" },
  { label: "Ruby (Cardio)", primary: "#9f1239", accent: "#f43f5e" },
  { label: "Amethyst (Wellness)", primary: "#581c87", accent: "#a855f7" },
] as const;

export const DEFAULT_FACILITY_CONFIG = {
  defaultPhone: "+91 98450 00000",
  defaultEmail: "admin@newclinic.com",
  defaultCity: "Bengaluru",
  defaultState: "Karnataka",
  defaultCountry: "India",
  defaultPincode: "560001",
  defaultStreet: "123 Healthcare Blvd",
  defaultPrimaryColor: "#0d9488",
  defaultAccentColor: "#14b8a6",
  defaultDarkColor: "#0f172a",
  defaultCardRadius: "1.25rem",
  defaultButtonRadius: "0.75rem",
  defaultFontSans: '"Inter", sans-serif',
  defaultLogoUrl: "/logo.png",
} as const;

export const DEFAULT_DOCTOR_CONFIG = {
  defaultTitle: "Consulting Physician, MD",
  defaultQualifications: "MD, MBBS",
  defaultExperienceYears: 8,
  defaultPhone: "+91 98450 12345",
  defaultSpecialties: "General Medicine, Holistic Health",
} as const;

export const DEFAULT_NEW_TENANT_FEATURES: HospitalFeatures = {
  enableECommerce: true,
  enableVoiceStudio: true,
  enablePrescriptionScan: true,
  enableOnlinePayments: true,
  enableTelemedicine: true,
  enableCustomerPayments: true,
  enableRawCaseJson: true,
  enableGoogleReviews: false,
  displayDoctorDetails: true,
  enablePatientMedicalRecords: true,
  enableBillingHistory: true,
  enableFollowupFeedback: true,
  enableAgastyaBot: true,
  enablePatientProfileEdit: true,
};

export interface FeatureDefinition {
  key: keyof HospitalFeatures;
  label: string;
  description: string;
  icon: string;
  category: "doctor" | "patient";
}

export const DOCTOR_PORTAL_FEATURES: readonly FeatureDefinition[] = [
  {
    key: "enableVoiceStudio",
    label: "AI VoiceStudio Clinical Scribe",
    description: "Speech-to-text dictation & automated SOAP clinical note generation",
    icon: "🎙️",
    category: "doctor",
  },
  {
    key: "enablePrescriptionScan",
    label: "OCR Prescription Scanning",
    description: "Camera & document OCR for digital prescription ingestion",
    icon: "📄",
    category: "doctor",
  },
  {
    key: "enableTelemedicine",
    label: "Telemedicine & Outpatient Calls",
    description: "Remote video consultations and secure audio appointments",
    icon: "📹",
    category: "doctor",
  },
  {
    key: "enableRawCaseJson",
    label: "Classical Homeopathy Case Record JSON",
    description: "Structured repertorization data and clinical JSON editor",
    icon: "🔬",
    category: "doctor",
  },
  {
    key: "enableECommerce",
    label: "Dispensary & Pharmacy Requisitions",
    description: "Remedy stock control, supplier PO dispatch, and logistics tracking",
    icon: "💊",
    category: "doctor",
  },
] as const;

export const PATIENT_PORTAL_FEATURES: readonly FeatureDefinition[] = [
  {
    key: "displayDoctorDetails",
    label: "Doctor Credentials & Registration",
    description: "Display doctor title, registration number, and bio on patient pages",
    icon: "👨‍⚕️",
    category: "patient",
  },
  {
    key: "enablePatientMedicalRecords",
    label: "Patient Clinical Records Timeline",
    description: "Allows patients to view clinical visit summaries & prescriptions",
    icon: "📋",
    category: "patient",
  },
  {
    key: "enableBillingHistory",
    label: "Itemized Billing & Invoices",
    description: "Allows patients to view consultation fees & itemized invoices",
    icon: "💳",
    category: "patient",
  },
  {
    key: "enableFollowupFeedback",
    label: "Follow-up & Progress Submissions",
    description: "Enables post-consultation patient symptom review submissions",
    icon: "📝",
    category: "patient",
  },
  {
    key: "enableOnlinePayments",
    label: "Online Payment Gateway",
    description: "Allows patient checkout via UPI, Cards, and NetBanking",
    icon: "💰",
    category: "patient",
  },
] as const;

