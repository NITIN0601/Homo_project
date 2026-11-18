/**
 * ─── Multi-Tenant Location Currency Utility ──────────────────────────────────
 * Resolves local billing currency and currency symbols based on facility/doctor country.
 * Ensures clinics in the USA bill in USD ($), UK in GBP (£), UAE in AED, India in INR (₹), etc.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar (USD)", locale: "en-US" },
  { code: "GBP", symbol: "£", name: "British Pound (GBP)", locale: "en-GB" },
  { code: "AED", symbol: "AED", name: "UAE Dirham (AED)", locale: "en-AE" },
  { code: "EUR", symbol: "€", name: "Euro (EUR)", locale: "de-DE" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar (SGD)", locale: "en-SG" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar (AUD)", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar (CAD)", locale: "en-CA" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen (JPY)", locale: "ja-JP" },
];

/**
 * Automatically infers billing currency based on facility / doctor country.
 */
export function inferCurrencyFromCountry(country?: string): CurrencyInfo {
  const c = (country || "").trim().toLowerCase();

  if (!c || ["india", "bharat", "in"].includes(c)) {
    return { code: "INR", symbol: "₹", name: "Indian Rupee (INR)", locale: "en-IN" };
  }

  if (["united states", "usa", "us", "u.s.", "u.s.a.", "united states of america"].includes(c)) {
    return { code: "USD", symbol: "$", name: "US Dollar (USD)", locale: "en-US" };
  }

  if (["united kingdom", "uk", "great britain", "gb", "england", "scotland", "wales"].includes(c)) {
    return { code: "GBP", symbol: "£", name: "British Pound (GBP)", locale: "en-GB" };
  }

  if (["united arab emirates", "uae", "ae", "dubai", "abu dhabi", "qatar", "saudi arabia"].includes(c)) {
    return { code: "AED", symbol: "AED", name: "UAE Dirham (AED)", locale: "en-AE" };
  }

  if (["singapore", "sg"].includes(c)) {
    return { code: "SGD", symbol: "S$", name: "Singapore Dollar (SGD)", locale: "en-SG" };
  }

  if (["australia", "au"].includes(c)) {
    return { code: "AUD", symbol: "A$", name: "Australian Dollar (AUD)", locale: "en-AU" };
  }

  if (["canada", "ca"].includes(c)) {
    return { code: "CAD", symbol: "C$", name: "Canadian Dollar (CAD)", locale: "en-CA" };
  }

  if (["germany", "france", "spain", "italy", "netherlands", "ireland", "belgium", "austria", "portugal", "greece", "finland", "europe", "eu", "de", "fr", "es", "it", "nl", "ie", "be", "at", "pt"].includes(c)) {
    return { code: "EUR", symbol: "€", name: "Euro (EUR)", locale: "de-DE" };
  }

  if (["japan", "jp"].includes(c)) {
    return { code: "JPY", symbol: "¥", name: "Japanese Yen (JPY)", locale: "ja-JP" };
  }

  // Default fallback
  return { code: "INR", symbol: "₹", name: "Indian Rupee (INR)", locale: "en-IN" };
}

/**
 * Universal localized currency formatter.
 * Automatically respects the currency code and symbol.
 * Example:
 *   formatCurrency(750, "INR", "₹") -> "₹750"
 *   formatCurrency(120, "USD", "$") -> "$120"
 *   formatCurrency(85, "GBP", "£") -> "£85"
 *   formatCurrency(250, "AED", "AED") -> "AED 250"
 */
export function formatCurrency(
  amount: number,
  currencyCode = "INR",
  currencySymbol = "₹"
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${currencySymbol}0`;
  }

  try {
    const info = SUPPORTED_CURRENCIES.find((sc) => sc.code === currencyCode);
    const locale = info?.locale || (currencyCode === "INR" ? "en-IN" : "en-US");
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });
    return formatter.format(amount);
  } catch {
    return `${currencySymbol}${amount.toLocaleString()}`;
  }
}
