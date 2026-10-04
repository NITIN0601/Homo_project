/**
 * ─── Theme, Colors & Typography SSOT Configuration ───────────────────────────
 * Central design tokens, official brand color codes, shared gradients,
 * and font styles used across Patient and Admin portals.
 */

// ─── Brand & Semantic Colors ──────────────────────────────────────────────────
export const THEME_COLORS = {
  // Official Clinic Brand Palette (from logo)
  BRAND_NAVY:       "#1e3a6e",
  BRAND_NAVY_DARK:  "#152d56",
  BRAND_GREEN:      "#2d6a30",
  BRAND_GREEN_DARK: "#1f4d22",
  BRAND_GREEN_LIGHT:"#4a9e50",

  // WhatsApp Official Brand Colors
  WHATSAPP_GREEN:       "#25D366",
  WHATSAPP_GREEN_HOVER: "#20bd5a",

  // Emerald / Sage Palette (Used for cards, buttons, active states)
  SAGE_950: "#022c22",
  SAGE_900: "#064e3b",
  SAGE_800: "#065f46",
  SAGE_700: "#047857",
  SAGE_600: "#059669",
  SAGE_500: "#10b981",
  SAGE_400: "#34d399",
  SAGE_300: "#6ee7b7",
  SAGE_200: "#a7f3d0",
  SAGE_100: "#d1fae5",
  SAGE_50:  "#ecfdf5",

  // Sage Alpha Transparencies
  SAGE_ALPHA_06: "rgba(6, 78, 59, 0.06)",
  SAGE_ALPHA_08: "rgba(6, 78, 59, 0.08)",
  SAGE_ALPHA_10: "rgba(6, 78, 59, 0.10)",
  SAGE_ALPHA_25: "rgba(6, 78, 59, 0.25)",
  SAGE_ALPHA_35: "rgba(6, 78, 59, 0.35)",

  // Stone Neutral Palette (Warm backgrounds & typography)
  STONE_900: "#1c1917",
  STONE_800: "#292524",
  STONE_700: "#44403c",
  STONE_600: "#57534e",
  STONE_500: "#78716c",
  STONE_400: "#a8a29e",
  STONE_300: "#d6d3d1",
  STONE_200: "#e7e5e4",
  STONE_100: "#f5f5f4",
  STONE_50:  "#fafaf9",

  // Neutral White & Light Gray
  WHITE:    "#ffffff",
  GRAY_50:  "#f9fafb",

  // White Alpha Transparencies
  WHITE_ALPHA_08: "rgba(255, 255, 255, 0.08)",
  WHITE_ALPHA_20: "rgba(255, 255, 255, 0.20)",
  WHITE_ALPHA_35: "rgba(255, 255, 255, 0.35)",
  WHITE_ALPHA_92: "rgba(255, 255, 255, 0.92)",
  WHITE_ALPHA_95: "rgba(255, 255, 255, 0.95)",

  // Black Alpha Transparencies
  BLACK_ALPHA_25: "rgba(0, 0, 0, 0.25)",
  BLACK_ALPHA_35: "rgba(0, 0, 0, 0.35)",
  BLACK_ALPHA_50: "rgba(0, 0, 0, 0.50)",

  // Alert, Status & Calendar Semantic Colors
  ADMIN_GOLD:          "#fcd34d",
  ADMIN_GOLD_ALPHA_25: "rgba(251, 191, 36, 0.25)",
  SUNDAY_BG:           "#f0fdf4",
  SUNDAY_GREEN:        "#047857",
  CALENDAR_SUN_RED:    "#f87171",
  BOOKED_PURPLE:       "#c4b5fd",
  ERROR_ROSE:          "#fff1f2",
  ERROR_ROSE_100:      "#ffe4e6",
  ERROR_ROSE_500:      "#f43f5e",
  ERROR_ROSE_600:      "#e11d48",
  DANGER_RED:          "#b91c1c",
} as const;

// ─── Standard CSS Gradients (SSOT) ───────────────────────────────────────────
export const THEME_GRADIENTS = {
  /** Primary clinic emerald action gradient (used across headers, buttons, accents) */
  PRIMARY: "linear-gradient(135deg, #064e3b 0%, #059669 100%)",

  /** Short shorthand equivalent for inline styles */
  PRIMARY_SHORT: "linear-gradient(135deg, #064e3b, #059669)",

  /** Hero banner deep navy to emerald brand blend */
  HERO: "linear-gradient(135deg, #1e3a6e 0%, #152d56 50%, #2d6a30 100%)",

  /** Deep dark emerald footer gradient */
  FOOTER: "linear-gradient(135deg, #022c22 0%, #064e3b 55%, #065f46 100%)",

  /** Bright CTA button gradient (e.g. Google Maps, primary actions) */
  CTA_EMERALD: "linear-gradient(135deg, #10b981 0%, #059669 100%)",

  /** Three-stop text gradient for high-contrast titles */
  TEXT_GRADIENT: "linear-gradient(135deg, #064e3b 0%, #059669 60%, #34d399 100%)",

  /** Soft danger alert backdrop gradient */
  DANGER_SOFT: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
} as const;

// ─── Standard Component Drop Shadows (SSOT) ──────────────────────────────────
export const THEME_SHADOWS = {
  NAV_DROPSHADOW:        "0 2px 20px rgba(6, 78, 59, 0.08)",
  BOTTOM_NAV:            "0 -4px 24px rgba(6, 78, 59, 0.10)",
  CHATBOT_POPUP:         "0 20px 40px -15px rgba(6, 78, 59, 0.35), 0 0 0 1px rgba(6, 78, 59, 0.08)",
  CTA_EMERALD_GLOW:      "0 4px 20px rgba(16, 185, 129, 0.45)",
  POPOVER:               "0 10px 30px -5px rgba(0, 0, 0, 0.25)",
  COOKIE_MODAL:          "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)",
  SLOT_SELECTED:         "0 4px 12px rgba(6, 78, 59, 0.25)",
} as const;

// ─── Typography & Fonts (SSOT) ────────────────────────────────────────────────
export const THEME_FONTS = {
  FAMILY_SANS: '"Inter", ui-sans-serif, system-ui, sans-serif',
  FAMILY_MONO: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  INPUT_BASE_SIZE: "16px", // Enforced iOS anti-zoom
} as const;
