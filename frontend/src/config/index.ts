/**
 * ─── Central Configuration Barrel (SSOT) ────────────────────────────────────
 * Modular grouping of all application constants, tokens, and configuration.
 *
 * Submodules:
 *   • ./clinic   → Clinic identity, primary doctor credentials, office hours & appointment schedules
 *   • ./contact  → Phone numbers, emails, WhatsApp templates & external links
 *   • ./medical  → Clinical specialisations, care areas, remedy categories, suppliers & logistics
 *   • ./theme    → Brand colors, gradients, font tokens & styles
 *   • ./app      → Storage keys, ports, mock credentials, feature flags, backend & inventory
 */

export * from "./clinic";
export * from "./contact";
export * from "./medical";
export * from "./theme";
export * from "./app";
export * from "./navigation";
export * from "./commerce";
export * from "./countries";
export * from "./banks";
