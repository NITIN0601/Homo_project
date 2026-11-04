import React, { type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "purple" | "neutral";
export type BadgeSize = "micro" | "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  success: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  warning: {
    container: "bg-amber-50 text-amber-900 border-amber-200/80",
    dot: "bg-amber-500",
  },
  danger: {
    container: "bg-rose-50 text-rose-800 border-rose-200/80",
    dot: "bg-rose-500",
  },
  info: {
    container: "bg-sky-50 text-sky-800 border-sky-200/80",
    dot: "bg-sky-500",
  },
  purple: {
    container: "bg-purple-50 text-purple-800 border-purple-200/80",
    dot: "bg-purple-500",
  },
  neutral: {
    container: "bg-stone-100 text-stone-700 border-stone-200/80",
    dot: "bg-stone-400",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  micro: "text-[9px] px-1.5 py-0.2 rounded-full font-bold",
  sm: "text-[10px] px-2 py-0.5 rounded-full font-bold",
  md: "text-xs px-2.5 py-1 rounded-full font-semibold",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "sm",
  dot = false,
  pulse = false,
  icon,
  className,
  children,
  ...props
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border leading-none font-sans select-none shrink-0 tracking-wide",
        styles.container,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            styles.dot,
            pulse && "animate-pulse"
          )}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

Badge.displayName = "Badge";
export default Badge;

