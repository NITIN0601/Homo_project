/**
 * ─── Class Merging & Variance Utility (SSOT) ─────────────────────────────────
 * Lightweight, zero-dependency utility that combines conditional class evaluation
 * (clsx pattern) with intelligent Tailwind utility collision deduplication.
 */

export type ClassValue =
  | string
  | number
  | boolean
  | bigint
  | undefined
  | null
  | { [key: string]: boolean | null | undefined }
  | ClassValue[];

/**
 * Normalizes mixed class inputs into a flat list of class names.
 */
function toClassList(...inputs: ClassValue[]): string[] {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      const parts = input.trim().split(/\s+/);
      for (const p of parts) {
        if (p) classes.push(p);
      }
    } else if (Array.isArray(input)) {
      classes.push(...toClassList(...input));
    } else if (typeof input === "object") {
      for (const key in input) {
        if (input[key]) {
          const parts = key.trim().split(/\s+/);
          for (const p of parts) {
            if (p) classes.push(p);
          }
        }
      }
    }
  }
  return classes;
}

/**
 * Intelligent Tailwind utility deduplicator:
 * When a custom `className` specifies an overriding utility (e.g. `bg-purple-800` overriding `bg-emerald-700`),
 * this ensures the later override takes precedence.
 */
function dedupeTailwindClasses(classes: string[]): string[] {
  const result: string[] = [];
  const propertyIndexMap = new Map<string, number>();

  // Prefixes that should conflict and overwrite earlier tokens
  const conflictPrefixes = [
    // Backgrounds & Gradients
    /^bg-/,
    /^from-/,
    /^via-/,
    /^to-/,
    // Text colors & fonts
    /^text-(?!xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|center|left|right|justify|micro|caption|label)/,
    /^font-(?!bold|semibold|extrabold|black|medium|normal|light|mono|sans)/,
    // Spacing (padding, margin)
    /^p-/, /^px-/, /^py-/, /^pt-/, /^pb-/, /^pl-/, /^pr-/,
    /^m-/, /^mx-/, /^my-/, /^mt-/, /^mb-/, /^ml-/, /^mr-/,
    // Borders & Radii
    /^border-(?!2|4|8|t|b|l|r|x|y)/,
    /^rounded(-[a-z0-9]+)?$/,
    // Sizing
    /^w-/, /^h-/, /^min-w-/, /^min-h-/, /^max-w-/, /^max-h-/,
    // Elevation
    /^shadow(-[a-z0-9]+)?$/,
  ];

  for (const cls of classes) {
    let matchedPrefix: string | null = null;
    for (const rx of conflictPrefixes) {
      if (rx.test(cls)) {
        matchedPrefix = rx.source;
        break;
      }
    }

    if (matchedPrefix) {
      if (propertyIndexMap.has(matchedPrefix)) {
        const prevIdx = propertyIndexMap.get(matchedPrefix)!;
        result[prevIdx] = ""; // Mark previous occurrence for removal
      }
      propertyIndexMap.set(matchedPrefix, result.length);
      result.push(cls);
    } else {
      result.push(cls);
    }
  }

  return result.filter(Boolean);
}

/**
 * Combines conditional class names and deduplicates conflicting Tailwind utilities.
 *
 * @example
 * cn("px-4 py-2 bg-emerald-600", isPrimary && "text-white", className)
 */
export function cn(...inputs: ClassValue[]): string {
  const rawList = toClassList(...inputs);
  return dedupeTailwindClasses(rawList).join(" ");
}

export default cn;
