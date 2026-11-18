import { en, type TranslationKey } from "./en";

export * from "./en";

/**
 * Enterprise Lightweight Type-Safe Translation Helper
 * Supports nested dot-notation keys: t("cart.checkout")
 */
export function t(key: TranslationKey, fallback?: string): string {
  const parts = key.split(".");
  let current: Record<string, unknown> | string = en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part] as Record<string, unknown> | string;
    } else {
      return fallback || key;
    }
  }

  return typeof current === "string" ? current : fallback || key;
}

export function useI18n(tenantLocale?: string) {
  return {
    t,
    locale: tenantLocale || "en-IN",
  };
}
