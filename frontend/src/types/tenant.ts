/**
 * ─── Multi-Hospital Tenant Configuration Types (SSOT) ─────────────────────────
 * Defines the enterprise multi-tenant configuration schema allowing hospitals
 * to customize branding, typography, doctor profiles, and feature toggles.
 */

export interface HospitalBranding {
  primaryColor: string;
  primaryDarkColor: string;
  accentColor: string;
  neutralBg: string;
  cardRadius: string;
  buttonRadius: string;
  fontSans: string;
  logoUrl?: string;
  bannerUrl?: string;
  aboutDocText?: string;
  aboutClinicText?: string;
}

export interface HospitalDoctor {
  id?: string;
  name: string;
  title: string;
  regNo: string;
  experienceYears: number;
  qualifications: string;
  aboutText?: string;
  specialties?: string[];
  avatarUrl?: string;
}

export interface HospitalContact {
  phone: string;
  phoneDisplay: string;
  email: string;
  emergencyPhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  mapsUrl?: string;
  googlePlaceId?: string;
  googleReviewUrl?: string;
}

export interface HospitalFeatures {
  enableECommerce: boolean;        // Dispensary / medicine cart & courier shipping
  enableVoiceStudio: boolean;      // AI voice consultation transcription
  enablePrescriptionScan: boolean; // OCR prescription upload & auto-fill
  enableOnlinePayments: boolean;   // Razorpay / UPI / NetBanking settlement
  enableTelemedicine: boolean;     // Video / WhatsApp remote consults
  enableCustomerPayments: boolean; // Customer view payment portal toggle (can disable checkout/payment for customer)
  enableRawCaseJson: boolean;      // Customer view raw JSON case record toggle (not required by default; toggleable by admin)
  enableGoogleReviews: boolean;    // Patient feedback & Google Reviews integration toggle

  // ── Customer View Customization & Visibility Filters ───────────
  displayDoctorDetails?: boolean;        // Display doctor details & bio on customer pages (Default: true)
  enablePatientMedicalRecords?: boolean; // My summary: Display patient clinical record timeline (Default: true)
  enableBillingHistory?: boolean;        // My summary: Billing and payment history (Default: true)
  enableFollowupFeedback?: boolean;      // My summary: Followup & feedback (Default: true)
  enableAgastyaBot?: boolean;            // AgastyaBot AI assistant widget for customers (Default: true)
  enablePatientProfileEdit?: boolean;    // Patient details edit option in customer view (Default: true)
}

export interface AdminPasscode {
  id: string;
  code: string;
  label: string;
  createdAt: string;
  createdBy: string;
}

export interface CustomizationAuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminId: string;
  action: "TOGGLE_FEATURE" | "CHANGE_PASSCODE" | "ADD_PASSCODE" | "DELETE_PASSCODE";
  targetKey?: string;
  oldValue?: any;
  newValue?: any;
  details: string;
}

export interface HospitalTenantConfig {
  id: string;                      // Unique internal tenant ID (e.g., "agastya", "citycare")
  slug: string;                    // URL slug
  domain?: string;                 // Primary custom domain (e.g., "agastyahomoeo.com")
  subdomains?: string[];           // List of matching subdomains (e.g., ["agastya"])
  name: string;                    // Official Hospital / Clinic Name
  shortName: string;
  tagline: string;
  doctor: HospitalDoctor;          // Primary / default doctor
  doctors?: HospitalDoctor[];      // Multi-doctor roster for scalable multi-physician clinics
  contact: HospitalContact;
  branding: HospitalBranding;
  features: HospitalFeatures;
}
