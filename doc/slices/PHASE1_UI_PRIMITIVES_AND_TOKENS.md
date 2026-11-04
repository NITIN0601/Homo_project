# Phase 1: Reusable Base UI Primitives & Design Token SSOT

## Overview
Phase 1 establishes the bedrock of the entire enterprise design system. We construct a reusable, accessible UI component library under `src/components/ui/` built upon standard **shadcn/ui & Radix UI patterns** (React 19 + TypeScript + Tailwind CSS v4).

---

## 1. Zero-Dependency Class Variance & Merging Utility (`src/utils/cn.ts`)

To avoid external runtime dependency issues and ensure offline compilation within any sandbox or production container, we implement a lightweight, typed `cn` and `cva` utility:

```typescript
// src/utils/cn.ts
export type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else if (typeof input === "object") {
      for (const key in input) {
        if (input[key]) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}
```

---

## 2. Reusable Primitives Specifications

### 1. `Button` (`src/components/ui/Button.tsx`)
- **Base Guarantees**:
  - Touch target compliance (minimum `min-h-[44px]` on mobile or compact `min-h-[36px]` on desktop).
  - Built-in focus visible ring (`focus-visible:ring-2 focus-visible:ring-offset-2`).
  - Native loading spinner integration (`isLoading` flag).
  - Smooth hover and active state transitions (`transition-all active:scale-[0.98]`).
- **Variants**:
  - `primary`: Clinic brand primary gradient / solid fill.
  - `secondary`: Stone neutral surface with dark text.
  - `outline`: Border with transparent background.
  - `ghost`: Transparent with hover background.
  - `danger`: Red / rose semantic warning.
  - `purple`: Follow-up and feedback theme.
- **Sizes**: `sm` (px-3 py-1.5 text-xs), `md` (px-4 py-2.5 text-xs font-bold), `lg` (px-6 py-3.5 text-sm font-extrabold), `icon` (w-10 h-10).

---

### 2. `Badge` (`src/components/ui/Badge.tsx`)
- **Base Guarantees**:
  - Pill formatting (`rounded-full inline-flex items-center gap-1.5 font-bold`).
  - Standardized micro-typography (`text-[10px]` or `text-caption`).
  - Optional pulse dot indicator for real-time status.
- **Variants**:
  - `success`: Emerald (`bg-emerald-100 text-emerald-800 border-emerald-200`).
  - `warning`: Amber (`bg-amber-100 text-amber-900 border-amber-200`).
  - `danger`: Rose (`bg-rose-100 text-rose-800 border-rose-200`).
  - `info` / `sky`: Sky (`bg-sky-100 text-sky-800 border-sky-200`).
  - `purple`: Purple (`bg-purple-100 text-purple-800 border-purple-200`).
  - `neutral`: Stone (`bg-stone-100 text-stone-700 border-stone-200`).

---

### 3. `Card` (`src/components/ui/Card.tsx`)
- **Subcomponents**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Base Guarantees**:
  - Uniform corner radius (`rounded-[var(--radius-card,1.25rem)]`).
  - Elevation shadow (`card-shadow`).
  - Border token (`border border-stone-200/80`).
- **Variants**:
  - `default`: Clean white background.
  - `dark`: Gradient brand background (Stone-900 $\to$ Emerald-950) with white text.
  - `muted`: Stone-50 soft surface.
  - `interactive`: Hover translateY lift with enhanced drop-shadow.

---

### 4. `Input` & `Textarea` (`src/components/ui/Input.tsx`, `Textarea.tsx`)
- **Base Guarantees**:
  - **iOS Anti-Zoom Guard**: Enforced `text-[16px] sm:text-xs` so Mobile Safari does not auto-zoom the viewport on focus.
  - Consistent focus ring (`focus:ring-2 focus:ring-[var(--brand-primary)]`).
  - Integrated Label, Helper Text, and Error Message props.
  - Left icon and right icon slots (e.g. search magnifying glass, currency symbol ₹).

---

### 5. `Modal` / `Dialog` (`src/components/ui/Modal.tsx`)
- **Base Guarantees**:
  - Backdrop blur overlay with fade-in animation.
  - Keyboard listener: `ESC` key dismisses modal.
  - Focus trap and `aria-modal="true"`.
  - Body scroll lock during modal presentation.
  - Responsive sizing: `sm`, `md`, `lg`, `xl`, `full`.

---

### 6. `Tabs` (`src/components/ui/Tabs.tsx`)
- **Base Guarantees**:
  - Standardized pill or segmented style (`role="tablist"`).
  - Clean active tab transition.
  - Badge slot for unread counts / status totals.

---

### 7. `Typography` (`src/components/ui/Typography.tsx`)
- **Base Guarantees**:
  - Single Source of Truth for text scale.
  - Components: `Heading` (H1–H4), `Text`, `Caption`, `MicroLabel`.
  - Replaces 550+ scattered instances of `text-[10px]`, `text-[11px]`, `text-[9px]`.

---

## 3. Verification & Acceptance Criteria
1. Every component exports clean TypeScript interfaces.
2. 100% polymorphic support: accepts standard HTML props (`onClick`, `disabled`, `type`, `aria-*`) and custom `className` override via `cn(...)`.
3. Vitest unit tests verify rendering, variant classes, disabled states, and event dispatch.
4. TypeScript check passes with zero errors: `tsc -b`.

