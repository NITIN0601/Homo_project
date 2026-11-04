import React, { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      className,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const hasError = Boolean(errorMessage);

    return (
      <div className={cn("w-full space-y-1 font-sans", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] sm:text-xs font-bold text-stone-700 tracking-wide uppercase select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-stone-400 pointer-events-none flex items-center justify-center shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              // Enforces min 16px on mobile to prevent iOS Safari auto-zoom, then crisp 12px/14px on desktop
              "w-full rounded-xl sm:rounded-2xl border bg-stone-50/70 text-stone-900 transition-all duration-150 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed",
              "text-[16px] sm:text-xs px-3.5 py-2.5 min-h-[44px]",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              hasError
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30"
                : "border-stone-200/90 focus:border-emerald-600 focus:ring-emerald-100",
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-stone-400 pointer-events-none flex items-center justify-center shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {hasError ? (
          <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 animate-fadeIn">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-stone-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;

