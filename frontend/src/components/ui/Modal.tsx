import React, { useEffect, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full: "max-w-[94vw] h-[calc(100dvh-2rem)] sm:h-[calc(100dvh-3.5rem)]",
};

/**
 * Enterprise Reusable Modal with Center-View & In-Page Scroll Architecture.
 * Designed to completely eliminate scroll freezing / static popups across all screen dimensions.
 * Core Architecture:
 * 1. Safe Viewport Centering: Uses an outer block scroll container with an inner min-h-[100dvh] flex wrapper and `my-auto`.
 *    This ensures modals are vertically centered on large displays, but NEVER clipped or cut off at the top on mobile,
 *    small laptops, or when browser DevTools / inspect panels are open.
 * 2. Dynamic Viewport Clamping: Strictly constrained to `max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)]`
 *    so it never takes over the complete screen and always maintains comfortable top and bottom padding.
 * 3. In-Page Scroll: Sticky header and footer with isolated `flex-1 min-h-0 overflow-y-auto custom-scrollbar`.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  className,
  showCloseButton = true,
}) => {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow || "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={typeof title === "string" ? "reusable-modal-dialog-title" : undefined}
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden animate-fadeIn"
    >
      {/* Semi-transparent backdrop blur */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Viewport-Safe Centering Wrapper:
          Uses min-h-full / min-h-[100dvh] with flex flex-col justify-center items-center.
          Padding pt-16 sm:pt-20 pb-16 sm:pb-8 px-3 sm:px-4 md:px-6 ensures the popup
          renders strictly as a center view panel between the persistent top header (60px) and
          bottom footer/navigation without replacing either.
      */}
      <div className="min-h-full min-h-[100dvh] w-full flex flex-col justify-center items-center pt-16 sm:pt-20 pb-16 sm:pb-8 px-3 sm:px-4 md:px-6 pointer-events-none">
        {/* Modal Dialog Card: Centered panel view, strictly contained between header and footer */}
        <div
          className={cn(
            "relative z-10 w-full bg-white rounded-2xl sm:rounded-3xl card-shadow border border-stone-200/90 shadow-2xl pointer-events-auto",
            "flex flex-col my-auto max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-6.5rem)] overflow-hidden animate-fadeInUp",
            sizeStyles[size],
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Modal Header */}
          {(title || showCloseButton) && (
            <div className="p-3.5 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-3 sm:gap-4 bg-stone-50/90 rounded-t-2xl sm:rounded-t-3xl shrink-0">
              <div className="min-w-0 flex-1">
                {title && (
                  <h3 id="reusable-modal-dialog-title" className="font-extrabold text-sm sm:text-lg text-stone-900 leading-snug break-words">
                    {title}
                  </h3>
                )}
                {subtitle && <p className="text-xs text-stone-500 mt-0.5 leading-normal break-words">{subtitle}</p>}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* In-Page Scrollable Body with custom-scrollbar */}
          <div
            className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 custom-scrollbar overscroll-contain"
          >
            {children}
          </div>

          {/* Optional Sticky Footer */}
          {footer && (
            <div className="p-3.5 sm:p-5 border-t border-stone-100 bg-stone-50/90 rounded-b-2xl sm:rounded-b-3xl shrink-0 flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export const ModalHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-4 sm:p-6 border-b border-stone-100 shrink-0", className)} {...props}>
    {children}
  </div>
);

export const ModalBody: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 custom-scrollbar p-4 sm:p-6", className)} {...props}>
    {children}
  </div>
);

export const ModalFooter: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("p-4 sm:p-5 border-t border-stone-100 flex items-center justify-end gap-3 bg-stone-50/70 shrink-0", className)} {...props}>
    {children}
  </div>
);
