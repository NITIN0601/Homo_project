/**
 * ─── Application, System & Environment Configuration (SSOT) ─────────────────
 * Central configuration for storage keys, dev ports, demo credentials,
 * phase feature flags, backend endpoints, and inventory defaults.
 */
import { CLINIC, DOCTOR } from "./clinic";

// ─── Environment & Mock Data SSOT Toggle ──────────────────────────────────────
/**
 * When VITE_USE_MOCK_DATA="true", application displays mock accounts, visits & inventory.
 * When VITE_USE_MOCK_DATA="false", application connects to the live local FastAPI & Supabase EHR.
 */
export const USE_MOCK_DATA = (import.meta.env.VITE_USE_MOCK_DATA ?? "true").toLowerCase() === "true";

// ─── Development & Production Ports ───────────────────────────────────────────
export const DEV_PORTS = {
  PATIENT: "5173",
  ADMIN:   "5174",
  PATIENT_URL: (hostname = "localhost") => `http://${hostname}:5173`,
  ADMIN_URL:   (hostname = "localhost") => `http://${hostname}:5174`,
} as const;

// ─── App Storage Keys (localStorage / sessionStorage) ────────────────────────
export const STORAGE_KEYS = {
  // Client Authentication & Session
  COOKIE_CONSENT:  "agastya_cookie_consent",
  AUTH_TOKEN:      "agastya_auth_token",
  AUTH_PROFILE:    "agastya_auth_profile",
  EXPLICIT_LOGOUT: "agastya_explicit_logout",

  // Patient Cart & Orders
  CART: "agastya_cart",

  // Calendar & Appointment Management
  BLOCKED_DATES: "agastya_blocked_calendar_dates",
  APPOINTMENTS:  "agastya_booked_appointments",
  USER_TIMEZONE: "agastya_user_timezone",

  // Clinical Invoices & Consultation Fees
  CONSULTATION_INVOICES: "agastya_consultation_invoices",

  // LLM & Model Studio Configuration
  ACTIVE_LLM_PROVIDER:   "agastya_active_llm_provider",
  ACTIVE_LLM_MODELS:     "agastya_active_llm_models",
  CUSTOM_MODELS_PREFIX:  "agastya_custom_models_",
  DYNAMIC_MODELS_PREFIX: "agastya_dynamic_models_",
  LLM_KEY_GEMINI:        "agastya_llm_key_gemini",
  LLM_KEY_GROQ:          "agastya_llm_key_groq",
  LLM_KEY_OPENAI:        "agastya_llm_key_openai",
  LLM_KEY_ANTHROPIC:     "agastya_llm_key_anthropic",
  LLM_ENDPOINT_OLLAMA:   "agastya_llm_endpoint_ollama",
} as const;

// ─── Demo / Mock Credentials (DEV only — never ship to production) ────────────
export const DEMO_CREDENTIALS = {
  ADMIN:    { email: DOCTOR.EMAIL,                  password: "admin123",   name: DOCTOR.NAME },
  PATIENT:  { email: "john@agastyahomoeo.com",      password: "patient123", name: "John Doe", id: "usr-001" },
  PATIENT2: { email: "priya@agastyahomoeo.com",     password: "patient456", name: "Priya Sharma", id: "usr-002" },
  HINT:     "admin@agastyahomoeo.com · john@agastyahomoeo.com",
} as const;

// ─── Phase 1 vs Phase 2 Feature Flags (SSOT) ──────────────────────────────────
export const PHASE_CONFIG = {
  /** Phase 1: Patient medicine ordering is hidden; Phase 2 enables e-commerce */
  ENABLE_MEDICINE_ORDERING: false,
  /** Phase 1: Slide-over cart drawer and cart icon are hidden */
  ENABLE_CART: false,
  /** Phase 1: Credit card and UPI payment details are hidden */
  ENABLE_PAYMENTS: false,
  /** Phase 1: Mobile clinic outreach page is hidden */
  ENABLE_MOBILE_CLINIC: false,
  /** Phase 1: Specific remedy chemical/botanical names are hidden from patients */
  SHOW_RAW_MEDICINE_NAMES: false,
  /** Phase 1: About page link is hidden from Admin navigation */
  ADMIN_SHOW_ABOUT: false,
  /** Phase 1: AI Chatbot / WhatsApp widget is hidden for Admin view */
  ADMIN_ENABLE_CHATBOT: false,
} as const;

// ─── Backend (Python FastAPI) ─────────────────────────────────────────────────
export const BACKEND = {
  /** Enabled automatically unless mock mode explicitly requested without backend override */
  ENABLED:  !USE_MOCK_DATA || import.meta.env.VITE_ENABLE_PYTHON_BACKEND === "true",
  BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
} as const;

// ─── Self-Hosted Supabase (Docker on Admin PC) ───────────────────────────────
export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321",
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy",
} as const;

// ─── VoiceStudio (debpalash/VoiceStudio) Integration ───────────────────────────
export const VOICE_STUDIO = {
  ENABLED: true,
  HTTP_BASE_URL: import.meta.env.VITE_VOICESTUDIO_URL ?? "http://127.0.0.1:3900",
  TRANSCRIPTION_ENDPOINT: "/v1/audio/transcriptions",
  SUPPORTED_LANGUAGES: [
    { code: "auto", label: "🌐 Auto-Detect Language (Default)" },
    { code: "te",   label: "🇮🇳 Telugu (తెలుగు)" },
    { code: "ta",   label: "🇮🇳 Tamil (தமிழ்)" },
    { code: "kn",   label: "🇮🇳 Kannada (ಕನ್ನಡ)" },
    { code: "hi",   label: "🇮🇳 Hindi (हिन्दी)" },
    { code: "en",   label: "🇬🇧 English" },
    { code: "fr",   label: "🇫🇷 French (Français)" },
  ],
} as const;

// ─── Stock / Inventory Defaults ───────────────────────────────────────────────
export const INVENTORY = {
  LOW_STOCK_THRESHOLD: 10,   // units — warn admin below this
  DEFAULT_REORDER_QTY: 50,
  CURRENCY:            "INR",
  CURRENCY_SYMBOL:     "₹",
} as const;

// ─── Default Form Placeholders ────────────────────────────────────────────────
export const PLACEHOLDERS = {
  PHONE:   CLINIC.PHONE_DISPLAY,
  CITY:    `City (e.g. ${CLINIC.ADDRESS.CITY})`,
  PINCODE: `Pincode (e.g. ${CLINIC.ADDRESS.PINCODE})`,
  EMAIL:   DOCTOR.EMAIL,
} as const;
