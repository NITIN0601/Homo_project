/**
 * ─── Medical, Clinical & Logistics SSOT Configuration ────────────────────────
 * Single Source of Truth for clinical specialisations, care areas, remedy categories,
 * pharmaceutical suppliers, and inventory logistics tracking hubs.
 */

// ─── Clinical Specialisations & Areas of Care (SSOT) ─────────────────────────
export const CLINICAL_SPECIALISATIONS = [
  {
    category: "Respiratory",
    icon: "🫁",
    conditions: "Allergic rhinitis, sinusitis, recurrent cold and cough, tonsillitis, emphysema, bronchitis and asthma",
  },
  {
    category: "Digestive",
    icon: "🫧",
    conditions: "Acidity, GERD, constipation, diarrhoea, IBS - ulcerative colitis & crohn's disease, IBD, piles, fistula, fissure and Anal abscess",
  },
  {
    category: "Skin",
    icon: "✨",
    conditions: "Acne, eczema, psoriasis, urticaria, fungal infection, lichen planus, pemphigus and warts",
  },
  {
    category: "Women's Health",
    icon: "🌸",
    conditions: "PCOS, menstrual irregularities, painful periods, PMS, leucorrhoea, menopausal concerns and Infertility",
  },
  {
    category: "Musculoskeletal",
    icon: "🦴",
    conditions: "Back pain, neck pain, joint pain, arthritis, muscle and ligament complaints",
  },
  {
    category: "Neurological",
    icon: "🧠",
    conditions: "Migraine, recurrent headaches, tension headaches and Trembling",
  },
  {
    category: "Hair & Scalp",
    icon: "💆",
    conditions: "Hair fall, dandruff, premature greying, scalp conditions, alopecia",
  },
  {
    category: "Urinary",
    icon: "💧",
    conditions: "Recurrent UTI, urinary complaints, kidney stones, bladder-related concerns and BPH",
  },
  {
    category: "ENT",
    icon: "👂",
    conditions: "Recurrent ear infections, allergic throat complaints, sore throat and voice-related complaints",
  },
  {
    category: "Paediatric Concerns",
    icon: "👶",
    conditions: "Recurrent colds and coughs, allergies, digestive complaints and common childhood health concerns",
  },
  {
    category: "Lifestyle & General Health",
    icon: "🌿",
    conditions: "Stress-related complaints, sleep concerns, recurrent infections and general wellness",
  },
  {
    category: "Mental & Emotional Well-being",
    icon: "🕊️",
    conditions: "Stress, anxiety-related concerns, sleep difficulties, mood-related concerns, and emotional well-being",
  },
] as const;

// ─── Key Clinical Care Area Pills (Concise Hero Chips) ────────────────────────
export const CARE_AREA_PILLS = [
  "Respiratory & Allergies",
  "Skin & Hair Fall",
  "Digestive & IBS",
  "Women's Health & PCOS",
  "Migraine & Headaches",
  "Musculoskeletal & Joints",
  "Paediatric Care",
  "Stress & Sleep",
] as const;

// ─── Remedy Categories & Badge Tokens (SSOT) ──────────────────────────────────
export const REMEDY_CATEGORIES = {
  constitutional: {
    label: "Constitutional",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  acute: {
    label: "Acute Care",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  "tissue-salt": {
    label: "Tissue Salt",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  combination: {
    label: "Combination",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
} as const;

export type RemedyCategoryKey = keyof typeof REMEDY_CATEGORIES;

// ─── Pharmacy Suppliers & Manufacturers ──────────────────────────────────────
export const PHARMACY_SUPPLIERS = {
  DEFAULT: "SBL Pvt Ltd",
  LIST: [
    "SBL Pvt Ltd",
    "Dr. Reckeweg India",
    "Schwabe India",
    "Boiron Laboratories",
    "Bakson Drugs & Pharmaceuticals",
    "Hahnemann Laboratories",
  ] as const,
} as const;

// ─── Standard Logistics Checkpoints & Hubs (SSOT) ─────────────────────────────
export const LOGISTICS_HUBS = {
  CLINIC_HUB:           "Agastya Clinic Hub, Malleshwaram",
  SUB_STATION:          "Malleshwaram Delivery Sub-Station",
  CLINIC_INVENTORY:     "Agastya Clinic, Malleshwaram",
  MEMBER_STATION:       "Malleshwaram Station",
  BLUEDART_BENGALURU:   "BlueDart Logistics Hub, Bengaluru",
  SORT_YESHWANTHPUR:    "Sort Facility, Yeshwanthpur",
  DELHIVERY_PEENYA:     "Delhivery Hub, Peenya",
  DELHIVERY_SORT:       "Delhivery Sort Center, Bengaluru",
  CENTRAL_PHARMACY_HUB: "Central Pharmacy Hub, Bengaluru",
  LOGISTICS_BENGALURU:  "Logistics Hub, Bengaluru",
} as const;

// ─── Courier Partners & Logistics Configuration ──────────────────────────────
export const LOGISTICS = {
  DEFAULT_PARTNER: "BlueDart Express 🚚" as const,
  PARTNERS: [
    "BlueDart Express 🚚",
    "Delhivery Courier 📦",
    "Shiprocket 🚀",
  ] as const,
  API_KEY: import.meta.env.VITE_BLUEDART_LOGISTICS_KEY ?? "mock_sandbox_logistics_token",
} as const;

// ─── Clinic PO Dispatch Status Badge Configuration (SSOT) ───────────────────
export const DISPATCH_STATUS_CONFIG = {
  dispatched: {
    label: "PO Dispatched & Acknowledged",
    badgeClass: "bg-amber-100 text-amber-900 border border-amber-300",
    icon: "🟡",
    isPulse: false,
  },
  in_transit: {
    label: "In Transit across Hub",
    badgeClass: "bg-sky-100 text-sky-900 border border-sky-300",
    icon: "🚚",
    isPulse: true,
    pulseColor: "bg-sky-500",
  },
  out_for_delivery: {
    label: "Out for Clinic Delivery",
    badgeClass: "bg-purple-100 text-purple-900 border border-purple-300",
    icon: "🛵",
    isPulse: true,
    pulseColor: "bg-purple-600",
  },
  delivered: {
    label: "Delivered & Stock Added",
    badgeClass: "bg-emerald-100 text-emerald-900 border border-emerald-300",
    icon: "✓",
    isPulse: false,
  },
} as const;

export type DispatchStatusKey = keyof typeof DISPATCH_STATUS_CONFIG;

// ─── Default Clinical Consultation & Task Templates (SSOT) ───────────────────
export const DEFAULT_LIFESTYLE_ADVICE =
  "Avoid raw coffee and strong mints 30 mins before & after remedy.";

export const DEFAULT_PRESCRIPTION_REMEDIES = [
  { name: "Arnica Montana", potency: "30C", dosage: "4 globules twice daily after meals", duration: "14 days" },
] as const;

export const DEFAULT_DOCTOR_TODOS = [
  { id: "todo-1", task: "Morning clinical inventory walk-through & stock check", category: "Inventory" as const, priority: "Normal" as const, completed: true },
  { id: "todo-2", task: "Upload classical prescription for Priya Sharma (#usr-002)", category: "Prescription" as const, priority: "High" as const, completed: false, patientId: "usr-002" },
  { id: "todo-3", task: "Review blood report & totality for Rajesh Varma (#usr-003)", category: "Follow-up" as const, priority: "High" as const, completed: false, patientId: "usr-003" },
  { id: "todo-4", task: "Batch order Arnica Montana 30C & Nux Vomica 30C (+50 units each)", category: "Inventory" as const, priority: "High" as const, completed: false },
  { id: "todo-5", task: "Verify BlueDart dispatch tracking BD-88492019-IN for clinic delivery", category: "Inventory" as const, priority: "Routine" as const, completed: false },
] as const;

