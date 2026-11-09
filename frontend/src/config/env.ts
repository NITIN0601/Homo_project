/**
 * ─── Environment Configuration SSOT ─────────────────────────────────────────
 * All import.meta.env.VITE_* variables are accessed ONLY here.
 * No other file may read import.meta.env directly.
 */
export const ENV = {
  APP_ENV:          import.meta.env.VITE_APP_ENV ?? "development",
  IS_PRODUCTION:    (import.meta.env.VITE_APP_ENV ?? "development") === "production",
  USE_MOCK_DATA:    (import.meta.env.VITE_USE_MOCK_DATA ?? "true").toLowerCase() === "true",
  BACKEND_URL:      (import.meta.env.VITE_BACKEND_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, ""),
  SUPABASE_URL:     import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  GA_ID:            import.meta.env.VITE_GOOGLE_ANALYTICS_ID ?? "",
  SENTRY_DSN:       import.meta.env.VITE_SENTRY_DSN ?? "",
  VOICESTUDIO_URL:  import.meta.env.VITE_VOICESTUDIO_URL ?? "http://127.0.0.1:3900",
} as const;

