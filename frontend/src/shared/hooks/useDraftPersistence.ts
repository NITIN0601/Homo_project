import { useState, useEffect, useCallback } from "react";

/**
 * ─── Clinical Form Draft Persistence Hook (HIPAA Continuity) ────────────────
 * Auto-persists in-progress clinical form state to sessionStorage so intermittent
 * network drops or accidental navigations never destroy clinical notes or prescriptions.
 */
export function useDraftPersistence<T>(key: string, initialData: T): [T, (data: T | ((prev: T) => T)) => void, () => void] {
  const storageKey = `clinical_draft_${key}`;

  const [data, setData] = useState<T>(() => {
    if (typeof sessionStorage !== "undefined") {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {}
    }
    return initialData;
  });

  // Auto-save on change
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
    }
  }, [storageKey, data]);

  const clearDraft = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
    }
    setData(initialData);
  }, [storageKey, initialData]);

  return [data, setData, clearDraft];
}

export default useDraftPersistence;
