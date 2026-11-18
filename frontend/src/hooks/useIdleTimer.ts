import { useEffect, useRef, useState, useCallback } from "react";

export interface UseIdleTimerOptions {
  timeoutMs?: number;      // Inactivity threshold (default 15 minutes: HIPAA standard)
  warningMs?: number;      // Warning dialog threshold before timeout (default 60 seconds)
  onIdle: () => void;      // Called when timeoutMs reached
  enabled?: boolean;       // Only activate when authenticated
}

export function useIdleTimer({
  timeoutMs = 15 * 60 * 1000, // 15 mins
  warningMs = 60 * 1000,      // 60 secs
  onIdle,
  enabled = true,
}: UseIdleTimerOptions) {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningMs / 1000));
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isWarning) {
      setIsWarning(false);
      setRemainingSeconds(Math.floor(warningMs / 1000));
    }
  }, [isWarning, warningMs]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setIsWarning(false);
      return;
    }

    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart", "click"];
    const handleActivity = () => {
      // If warning modal is showing, only explicit actions or clicks should reset
      if (!isWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const checkInterval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const warningThreshold = timeoutMs - warningMs;

      if (elapsed >= timeoutMs) {
        setIsWarning(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        onIdle();
      } else if (elapsed >= warningThreshold) {
        setIsWarning(true);
        const secondsLeft = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(secondsLeft);
      } else {
        if (isWarning) {
          setIsWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(checkInterval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [enabled, timeoutMs, warningMs, onIdle, isWarning]);

  return {
    isWarning,
    remainingSeconds,
    resetTimer,
  };
}
