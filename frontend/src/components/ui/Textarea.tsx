import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      className,
      containerClassName,
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const hasError = Boolean(errorMessage);

    return (
      <div className={cn("w-full space-y-1 font-sans", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-[11px] sm:text-xs font-bold text-stone-700 tracking-wide uppercase select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={cn(
            "w-full rounded-xl sm:rounded-2xl border bg-stone-50/70 text-stone-900 transition-all duration-150 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed",
            "text-[16px] sm:text-xs p-3.5 leading-relaxed",
            hasError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30"
              : "border-stone-200/90 focus:border-emerald-600 focus:ring-emerald-100",
            className
          )}
          {...props}
        />

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

Textarea.displayName = "Textarea";
export default Textarea;
