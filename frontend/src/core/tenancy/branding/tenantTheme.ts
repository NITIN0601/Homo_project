import type { HospitalBranding } from "@core/types/tenant";

export function generateCssVariables(branding: HospitalBranding): Record<string, string> {
  const b = branding as unknown as Record<string, string | undefined>;
  return {
    "--color-primary": b.primaryColor || "#059669",
    "--color-primary-light": b.primaryLight || "#10b981",
    "--color-primary-dark": b.primaryDark || "#047857",
    "--color-accent": b.accentColor || "#10b981",
    "--hospital-font": b.fontFamily || "system-ui, -apple-system, sans-serif",
  };
}

export function applyThemeVariables(branding: HospitalBranding): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = generateCssVariables(branding);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
