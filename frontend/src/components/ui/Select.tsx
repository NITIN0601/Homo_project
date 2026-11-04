import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options?: SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      options,
      children,
      className,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const hasError = Boolean(errorMessage);

    return (
      <div className={cn("w-full space-y-1 font-sans", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[11px] sm:text-xs font-bold text-stone-700 tracking-wide uppercase select-none"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={cn(
              "w-full appearance-none rounded-xl sm:rounded-2xl border bg-stone-50/70 text-stone-900 transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed cursor-pointer",
              "text-[16px] sm:text-xs px-3.5 py-2.5 pr-10 min-h-[44px]",
              hasError
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/30"
                : "border-stone-200/90 focus:border-emerald-600 focus:ring-emerald-100",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 pointer-events-none text-stone-400 flex items-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

Select.displayName = "Select";
export default Select;
