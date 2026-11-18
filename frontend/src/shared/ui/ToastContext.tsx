import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { sendCrashReport } from "../../core/observability/telemetry";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  toast: {
    success: (message: string, durationMs?: number) => void;
    error: (message: string, durationMs?: number) => void;
    warning: (message: string, durationMs?: number) => void;
    info: (message: string, durationMs?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", durationMs = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      if (durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, durationMs);
      }
    },
    [removeToast]
  );

  const toastMethods = useMemo(
    () => ({
      success: (msg: string, d?: number) => showToast(msg, "success", d),
      error: (msg: string, d?: number) => showToast(msg, "error", d),
      warning: (msg: string, d?: number) => showToast(msg, "warning", d),
      info: (msg: string, d?: number) => showToast(msg, "info", d),
    }),
    [showToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      toast: toastMethods,
    }),
    [showToast, toastMethods]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Viewport Container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-fadeIn ${
              item.type === "success"
                ? "bg-emerald-950/90 text-white border-emerald-500/40"
                : item.type === "error"
                ? "bg-rose-950/90 text-white border-rose-500/40"
                : item.type === "warning"
                ? "bg-amber-950/90 text-white border-amber-500/40"
                : "bg-stone-900/90 text-white border-stone-600/40"
            }`}
            style={{ animation: "fadeInUp 0.25s ease-out both" }}
          >
            <span className="text-base select-none shrink-0 mt-0.5">
              {item.type === "success" && "✓"}
              {item.type === "error" && "⚠️"}
              {item.type === "warning" && "⚡"}
              {item.type === "info" && "ℹ️"}
            </span>
            <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
              {item.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              className="text-white/60 hover:text-white text-xs font-bold px-1 rounded transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue["toast"] & { showToast: ToastContextValue["showToast"] } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (import.meta.env.DEV) {
      console.warn("[ToastContext] useToast called outside ToastProvider tree.");
    }
    return {
      success: (msg: string) => { if (import.meta.env.DEV) console.info("[Toast success]", msg); },
      error: (msg: string) => {
        if (import.meta.env.DEV) console.error("[Toast error]", msg);
        sendCrashReport(new Error(`[Toast error] ${msg}`));
      },
      warning: (msg: string) => { if (import.meta.env.DEV) console.warn("[Toast warning]", msg); },
      info: (msg: string) => { if (import.meta.env.DEV) console.info("[Toast info]", msg); },
      showToast: (msg: string) => { if (import.meta.env.DEV) console.info("[Toast]", msg); },
    };
  }
  return {
    ...ctx.toast,
    showToast: ctx.showToast,
  };
}

export default ToastProvider;

