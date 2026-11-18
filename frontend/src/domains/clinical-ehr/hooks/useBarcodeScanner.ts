import { useEffect, useRef } from "react";

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  maxIntervalMs?: number; // Maximum ms between keypresses to qualify as scanner burst (default 50ms)
  minLength?: number;     // Minimum length of scanned barcode (default 4 chars)
  enabled?: boolean;
}

/**
 * ─── USB Hardware Barcode / QR Scanner Listener Hook ────────────────────────
 * Hospital wristband and prescription scanners emulate USB HID keyboards and send
 * characters in ultra-rapid bursts (10-40ms between characters) followed by 'Enter'.
 * This hook captures scanner burst input without dropping keystrokes or interfering
 * with normal human typing.
 */
export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 50,
  minLength = 4,
  enabled = true,
}: UseBarcodeScannerOptions): void {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key indicates end of barcode transmission from hardware scanner
      if (e.key === "Enter") {
        if (bufferRef.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = "";
          onScan(scannedCode);
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // If key is a printable single character
      if (e.key.length === 1) {
        if (elapsed > maxIntervalMs) {
          // Time gap too large for scanner burst; reset buffer with this character
          bufferRef.current = e.key;
        } else {
          // Fast keystroke; append to scanner buffer
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, maxIntervalMs, minLength, onScan]);
}

export default useBarcodeScanner;
