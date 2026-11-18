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
  defaultPhone: "+1 555-0100",
  defaultEmail: "admin@example.com",
  defaultCity: "Metropolis",
  defaultState: "State",
  defaultCountry: "Country",
  defaultPincode: "10001",
  defaultStreet: "100 Medical Center Way",
  defaultPrimaryColor: "#1b4332",
  defaultAccentColor: "#40916c",
  defaultDarkColor: "#081c15",
  defaultCardRadius: "1.25rem",
  defaultButtonRadius: "0.75rem",
  defaultFontSans: '"Inter", sans-serif',
  defaultLogoUrl: "/generic-hospital-logo.svg",
  defaultBannerUrl: "/assets/banner.jpg",
} as const;

export const DEFAULT_DOCTOR_CONFIG = {
  defaultTitle: "Primary Consulting Physician, MD",
  defaultQualifications: "MD, MBBS",
  defaultExperienceYears: 10,
  defaultPhone: "+1 555-0100",
  defaultSpecialties: "General Medicine, Holistic Health, Preventive Care",
} as const;

export const DEFAULT_NEW_TENANT_FEATURES: HospitalFeatures = {
  enableECommerce: true,
  enableVoiceStudio: true,
  enablePrescriptionScan: true,
  enableOnlinePayments: true,
  enableCustomerPayments: true,
  enableTelemedicine: true,
  enableRawCaseJson: false,
  enableGoogleReviews: true,
  displayDoctorDetails: true,
  enablePatientMedicalRecords: true,
  enableBillingHistory: true,
  enableFollowupFeedback: true,
  enableAgastyaBot: true,
  enablePatientProfileEdit: true,
  allowDoctorCustomBio: true,
  allowDoctorSpecialties: true,
  allowDoctorDirectContact: true,
};

export interface FeatureDefinition {
  key: keyof HospitalFeatures;
  label: string;
  description: string;
  icon: string;
  category: "hospital" | "doctor" | "patient";
}

export const HOSPITAL_FEATURES: readonly FeatureDefinition[] = [
  {
    key: "enableECommerce",
    label: "Dispensary & Pharmacy Requisitions (E-Commerce)",
    description: "Remedy stock control, medicine shopping cart, supplier PO dispatch, and logistics tracking",
    icon: "💊",
    category: "hospital",
  },
  {
    key: "enableTelemedicine",
    label: "Telemedicine & Outpatient Remote Calls",
    description: "Remote video consultations, WhatsApp integration, and secure virtual appointments",
    icon: "📹",
    category: "hospital",
  },
  {
    key: "enableGoogleReviews",
    label: "Google Reviews & Patient Testimonials Showcase",
    description: "Public verified clinic reviews showcase, ratings sync, and Google Maps integration",
    icon: "⭐",
    category: "hospital",
  },
] as const;

export const DOCTOR_PORTAL_FEATURES: readonly FeatureDefinition[] = [
  {
    key: "enableVoiceStudio",
    label: "AI VoiceStudio Clinical Scribe",
    description: "Speech-to-text dictation & automated SOAP clinical note generation for doctors",
    icon: "🎙️",
    category: "doctor",
  },
  {
    key: "enablePrescriptionScan",
    label: "OCR Prescription Scanning",
    description: "Camera & document OCR for digital prescription ingestion into patient files",
    icon: "📄",
    category: "doctor",
  },
  {
    key: "enableRawCaseJson",
    label: "Classical Homeopathy Case Record JSON",
    description: "Structured repertorization data and clinical JSON editor for doctors",
    icon: "🔬",
    category: "doctor",
  },
  {
    key: "allowDoctorCustomBio",
    label: "Doctor Custom Biography Policy",
    description: "Permits doctors to publish customized professional bio and clinical philosophy",
    icon: "📝",
    category: "doctor",
  },
  {
    key: "allowDoctorSpecialties",
    label: "Doctor Clinical Specialties Policy",
    description: "Allows doctors to highlight custom clinical sub-specialties to patients",
    icon: "🩺",
    category: "doctor",
  },
  {
    key: "allowDoctorDirectContact",
    label: "Doctor Direct Phone & WhatsApp Policy",
    description: "Permits doctors to share direct contact with patients rather than facility central desk",
    icon: "📱",
    category: "doctor",
  },
] as const;

export const PATIENT_PORTAL_FEATURES: readonly FeatureDefinition[] = [
  {
    key: "displayDoctorDetails",
    label: "Doctor Credentials & Registration Display",
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
    key: "enableOnlinePayments",
    label: "Online Payment Gateway & Checkout",
    description: "Allows patient checkout and online fee settlement via UPI, Cards, and NetBanking",
    icon: "💰",
    category: "patient",
  },
  {
    key: "enableFollowupFeedback",
    label: "Follow-up & Progress Submissions",
    description: "Enables post-consultation patient symptom review and progress report submissions",
    icon: "📝",
    category: "patient",
  },
  {
    key: "enableAgastyaBot",
    label: "Facility AI Assistant Widget",
    description: "Floating patient assistant widget for remedy FAQs, facility timings, and appointment queries",
    icon: "🤖",
    category: "patient",
  },
  {
    key: "enablePatientProfileEdit",
    label: "Patient Profile & Address Self-Editing",
    description: "Allows patients to update their personal details, phone number, and delivery address",
    icon: "👤",
    category: "patient",
  },
] as const;

export interface GeneratedLegalTemplates {
  aboutHospitalText: string;
  emergencyNotice: string;
  termsConditionsText: string;
  privacyPolicyText: string;
}

export function generateDefaultLegalTemplates(
  facilityName: string,
  facilityType: "hospital" | "clinic" = "hospital",
  city = "our local center",
  phone = "+91 98450 12345",
  email = "care@hospital.org"
): GeneratedLegalTemplates {
  const resolvedName = facilityName.trim() || (facilityType === "clinic" ? "Care Clinic" : "Care Hospital");
  const typeLabelLower = facilityType === "clinic" ? "clinic" : "hospital";

  return {
    aboutHospitalText: `${resolvedName} is dedicated to delivering evidence-based, compassionate outpatient care and personalized wellness treatments in ${city}. Our experienced physicians and medical staff combine clinical precision with holistic care to ensure enduring vitality and individualized healing for every patient.`,
    emergencyNotice: `The ${resolvedName} web portal is designed for scheduled consultations and outpatient care. In life-threatening emergencies, acute chest pain, or severe respiratory distress, please call emergency services immediately or visit your nearest emergency room.`,
    termsConditionsText: `1. APPOINTMENTS & CLINICAL CONSULTATIONS
All clinical consultations with ${resolvedName} are conducted on a scheduled appointment basis. While our clinical staff makes every effort to adhere to appointed slots, urgent patient cases may occasionally require minor schedule adjustments.

2. PATIENT INFORMATION ACCURACY
Patients agree to provide accurate, comprehensive medical history, existing medications, and known allergies. Diagnostic evaluations and treatment recommendations provided by ${resolvedName} are tailored specifically to the symptoms and history reported.

3. OUTCOMES & THERAPEUTIC RESPONSE
Medical treatment responses vary between individuals based on clinical constitution, chronicity, and lifestyle factors. While our clinical team utilizes proven methodologies, no specific therapeutic timeline or result is guaranteed.

4. CANCELLATION & RESCHEDULING
Appointments may be rescheduled or cancelled with reasonable advance notice by either the patient or ${resolvedName}.

5. JURISDICTION & GOVERNANCE
These Terms & Conditions are governed by the applicable healthcare and consumer protection laws of the jurisdiction in which ${resolvedName} operates.`,
    privacyPolicyText: `1. COMMITMENT TO PATIENT DATA PRIVACY
At ${resolvedName}, safeguarding your personal and health information is our highest priority. This Privacy Policy outlines how our ${typeLabelLower} collects, protects, and manages your Protected Health Information (PHI).

2. COLLECTION & CLINICAL PURPOSE
We collect demographic details, contact numbers, clinical notes, and prescription history solely for the purpose of medical consultations, treatment monitoring, and care coordination.

3. ZERO DATA COMMERCIALIZATION
${resolvedName} strictly adheres to DPDP and HIPAA privacy standards. Your personal and health data is NEVER sold, rented, or distributed to third-party marketing companies.

4. RECORD RETENTION & ACCESS RIGHTS
Electronic clinical records are stored securely within isolated tenant databases. You have the right to inspect, request copies, or ask for corrections to your medical file by reaching out to our administration at ${email} or ${phone}.

5. DATA SECURITY & ENCRYPTION
All data transmitted to and from ${resolvedName} is protected using modern industry-standard encryption protocols.`,
  };
}

