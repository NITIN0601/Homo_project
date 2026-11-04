import React, { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "purple";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm border border-emerald-800/20 active:bg-emerald-900",
  secondary:
    "bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200/80 active:bg-stone-300",
  outline:
    "bg-transparent hover:bg-stone-100 text-stone-700 border border-stone-300 active:bg-stone-200",
  ghost:
    "bg-transparent hover:bg-stone-100 text-stone-600 hover:text-stone-900 border-transparent",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-rose-700/20 active:bg-rose-800",
  purple:
    "bg-purple-700 hover:bg-purple-800 text-white shadow-sm border border-purple-800/20 active:bg-purple-900",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[36px]",
  md: "px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl min-h-[44px]",
  lg: "px-6 py-3.5 text-sm sm:text-base font-extrabold rounded-2xl min-h-[48px]",
  icon: "w-10 h-10 p-0 flex items-center justify-center rounded-xl min-h-[40px] min-w-[40px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-sans select-none cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;

