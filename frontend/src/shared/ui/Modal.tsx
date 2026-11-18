import React, { useEffect, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

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
  full: "max-w-[96vw]",
};

const emptySubscribe = () => () => {};

/**
 * Enterprise Reusable Modal with Viewport-Safe Boundary Clamping & In-Page Scroll.
 * Guarantees that on all displays (mobile, iPad, 13" laptops, 4K monitors), modals
 * are strictly clamped within the viewport, never cut off at top or bottom boundaries.
 * Sticky header and sticky action footer remain pinned; inner body scrolls smoothly.
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
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

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
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 flex items-center justify-center animate-fadeIn"
    >
      {/* Semi-transparent backdrop blur */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card: strictly bounded within viewport height to prevent boundary cutoffs */}
      <div
        className={cn(
          "relative z-10 w-full bg-white rounded-2xl sm:rounded-3xl card-shadow border border-stone-200/90 shadow-2xl",
          "flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)] overflow-hidden animate-fadeInUp",
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

        {/* In-Page Scrollable Body with custom-scrollbar & safe padding */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 p-4 sm:p-6 custom-scrollbar overscroll-contain">
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

// Compound Component Pattern Attachment
export interface ModalComponent extends React.FC<ModalProps> {
  Header: typeof ModalHeader;
  Body: typeof ModalBody;
  Footer: typeof ModalFooter;
}

const CompoundModal = Modal as ModalComponent;
CompoundModal.Header = ModalHeader;
CompoundModal.Body = ModalBody;
CompoundModal.Footer = ModalFooter;

export default CompoundModal;
