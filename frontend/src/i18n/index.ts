import { en, type TranslationKey } from "./en";

export * from "./en";

/**
 * Enterprise Lightweight Type-Safe Translation Helper
 * Supports nested dot-notation keys: t("cart.checkout")
 */
export function t(key: TranslationKey, fallback?: string): string {
  const parts = key.split(".");
  let current: any = en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return fallback || key;
    }
  }

  return typeof current === "string" ? current : fallback || key;
}

export function useI18n() {
  return {
    t,
    locale: "en-IN",
  };
}

