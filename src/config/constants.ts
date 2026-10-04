/**
 * ─── Agastya Homoeopathy Clinic — Central Configuration (SSOT) ─────────────────
 *
 * Modular SSOT Architecture & Propagation Map:
 *   • clinic.ts   → Doctor credentials, clinic branding, addresses, office hours, appointment slots
 *                   Propagates to: ChatbotWidget, ClinicFooter, AboutPage, HomePage, AdminDashboard,
 *                   AdminVoiceStudioModal, voiceStudio, AppointmentsPage, VisitSummaryPage,
 *                   PrivacyPolicyPage, TermsPage
 *   • contact.ts  → Phone numbers, email addresses, WhatsApp configurations, message templates
 *                   Propagates to: ClinicFooter, ChatbotWidget, AboutPage, NavBar, AdminDashboard
 *   • medical.ts  → Clinical specialisations, remedy categories, suppliers, logistics hubs
 *                   Propagates to: HomePage, AboutPage, OrderMedicinePage, CartPage, AdminDashboard
 *   • theme.ts    → Colors (brand, sage, stone, gold, whatsapp), gradients, font stacks
 *                   Propagates to: NavBar, BottomNav, AuthPanel, CalendarPicker, CartPage, CartDrawer,
 *                   TrackingModal, ClinicFooter, AboutPage, AppointmentsPage, AdminDashboard
 *   • app.ts      → Storage keys, ports, dev URLs, demo accounts, feature flags, LLM & backend config
 *                   Propagates to: api.ts, AppContext, AuthPanel, CookieConsentBanner,
 *                   DemoHeaderBanner, modelProviders, voiceStudio
 *
 * When the Python backend is ready:
 *   Set BACKEND.ENABLED = true and point BACKEND.BASE_URL to your FastAPI server in `app.ts`
 *   (or override via VITE_BACKEND_URL / VITE_USE_MOCK_DATA environment variables) —
 *   no code in components or pages needs to change.
 */

/**
 * @deprecated Prefer importing directly from `../config` or `./index`.
 * This re-export barrel is preserved for backward compatibility.
 */
export * from "./index";

