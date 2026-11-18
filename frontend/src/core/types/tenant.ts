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
  aboutHospitalText?: string;
}

export interface DoctorSharingPreferences {
  shareBio?: boolean;
  shareSpecialties?: boolean;
  shareQualifications?: boolean;
  shareDirectPhone?: boolean;
  shareDirectEmail?: boolean;
}

export interface DoctorWeeklySchedule {
  /** Days strictly requiring prior appointment (e.g. ["Sunday", "Wednesday"] or ["All Days"]) */
  appointmentOnlyDays?: string[];
  /** Days with open walk-in OPD (e.g. ["Monday", "Tuesday", "Thursday", "Friday", "Saturday"] or [] for pure tele-health) */
  walkinDays?: string[];
  /** Days doctor is off / weekly holiday (e.g. ["Sunday"] or ["Tuesday"]) */
  offDays?: string[];
  /** Specific holidays or leave dates in "YYYY-MM-DD" format */
  holidays?: string[];
}

export interface DoctorAvailability {
  timezone?: string;
  days?: string;
  morningHours?: string;
  eveningHours?: string;
  consultationFee?: number;
  schedule?: DoctorWeeklySchedule;
  telemedicineOnly?: boolean;
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
  phone?: string;
  email?: string;
  consultationFee?: number;
  availability?: DoctorAvailability;
  sharingPreferences?: DoctorSharingPreferences;
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
  allowDoctorCustomBio?: boolean;        // Super admin allows doctor custom bio to appear on patient pages
  allowDoctorSpecialties?: boolean;      // Super admin allows doctor specialties to display to patients
  allowDoctorDirectContact?: boolean;    // Super admin allows doctor direct phone/email to display to patients
}

export interface HospitalLegal {
  termsConditionsText?: string;
  privacyPolicyText?: string;
  emergencyNotice?: string;
  lastUpdated?: string;
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
  action: "TOGGLE_FEATURE" | "CHANGE_PASSCODE" | "ADD_PASSCODE" | "DELETE_PASSCODE" | "UPDATE_PROFILE";
  targetKey?: string;
  oldValue?: any;
  newValue?: any;
  details: string;
}

export interface HospitalHoursConfig {
  timezone?: string;
  morningDisplay?: string;
  morningStart?: string;
  morningEnd?: string;
  eveningDisplay?: string;
  eveningStart?: string;
  eveningEnd?: string;
  availableDays?: string;
  sundayPolicy?: "Prior Appointment Only" | "Walk-in OPD" | "Closed";
  consultationSlotMinutes?: number;
  walkinAllowed?: boolean;
  walkinDaysSummary?: string;
  appointmentDaysSummary?: string;
  emergencyNotice?: string;
}

export interface HospitalDeploymentConfig {
  backendUrl?: string;             // Deployed production backend REST API URL (initially empty draft)
  frontendUrl?: string;            // Deployed production client URL (initially empty draft)
  deploymentStatus?: "draft" | "staged" | "production";
  deploymentVersion?: string;      // Current release version e.g. "v1.2.0"
  lastDeployedAt?: string;
  supportedBrowsers?: string[];    // Target supported browsers e.g. ["Chrome >= 110", "Safari >= 16", "Firefox >= 115", "Edge >= 110"]
  supportedDevices?: string[];     // Target supported devices e.g. ["Desktop", "Tablet", "Mobile"]
}

export interface HospitalLLMConfig {
  provider?: "gemini" | "openai" | "anthropic" | "groq";
  modelId?: string;
  apiKey?: string;
  endpointUrl?: string;
}

export interface HospitalPaymentGatewayConfig {
  provider?: "upi" | "razorpay" | "stripe";
  merchantId?: string;
  apiKey?: string;
  accountEmail?: string;
  upiId?: string;
}

export interface HospitalGoogleIntegrationConfig {
  clientId?: string;
  calendarId?: string;
  serviceAccountEmail?: string;
}

export interface HospitalWhatsAppConfig {
  enabled?: boolean;
  businessAccountId?: string;
  phoneNumberId?: string;
  apiToken?: string;
  displayNumber?: string;
  customGreeting?: string;
  chatUrl?: string;
}

export interface HospitalInstagramConfig {
  enabled?: boolean;
  handle?: string;
  profileUrl?: string;
  accountId?: string;
  accessToken?: string;
  autoReplyEnabled?: boolean;
  directBookingEnabled?: boolean;
}

export interface HospitalSocialMediaConfig {
  whatsapp?: HospitalWhatsAppConfig;
  instagram?: HospitalInstagramConfig;
  facebook?: { enabled?: boolean; pageUrl?: string; pageId?: string };
  youtube?: { enabled?: boolean; channelUrl?: string; channelName?: string };
  linkedin?: { enabled?: boolean; companyUrl?: string; companyName?: string };
}

export interface HospitalTenantConfig {
  id: string;                      // Unique internal tenant ID (e.g., "agastya", "citycare")
  slug: string;                    // URL slug
  isActive?: boolean;              // Active status of tenant
  domain?: string;                 // Primary custom domain (e.g., "agastyahomoeo.com")
  subdomains?: string[];           // List of matching subdomains (e.g., ["agastya"])
  name: string;                    // Official Hospital / Clinic Name
  facilityType?: "hospital" | "clinic"; // Facility classification & dynamic terminology (default: "hospital")
  shortName: string;
  tagline: string;
  doctor: HospitalDoctor;          // Primary / default attending physician
  doctors?: HospitalDoctor[];      // Multi-doctor roster for scalable multi-physician clinics
  specialties?: string[];          // Hospital-level clinical specialties & treated care areas
  hours?: HospitalHoursConfig;     // Operating hours, session windows & Sunday consultation policy
  currency?: string;               // Local billing currency: "INR" | "USD" | "GBP" | "AED" | "EUR" | "CAD" | "AUD" | "SGD"
  currencySymbol?: string;         // Local currency display symbol: "₹" | "$" | "£" | "AED" | "€" | "C$" | "A$" | "S$"
  locale?: string;                 // Local hospital locale e.g. "en-IN", "en-US"
  contact: HospitalContact;
  branding: HospitalBranding;
  features: HospitalFeatures;
  legal?: HospitalLegal;
  deployment?: HospitalDeploymentConfig;
  llmConfig?: HospitalLLMConfig;
  paymentGateway?: HospitalPaymentGatewayConfig;
  googleIntegration?: HospitalGoogleIntegrationConfig;
  socialMedia?: HospitalSocialMediaConfig;
}
