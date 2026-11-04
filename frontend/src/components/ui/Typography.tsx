import React, { type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
}

export const Heading: React.FC<HeadingProps> = ({ level = 2, className, children, ...props }) => {
  const styles: Record<number, string> = {
    1: "text-2xl sm:text-3xl font-black tracking-tight text-stone-900",
    2: "text-xl sm:text-2xl font-bold tracking-tight text-stone-900",
    3: "text-lg sm:text-xl font-bold text-stone-900",
    4: "text-base sm:text-lg font-bold text-stone-900",
  };

  const Component = `h${level}` as const;

  return React.createElement(
    Component,
    {
      className: cn("font-sans leading-tight", styles[level], className),
      ...props,
    },
    children
  );
};

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: "body" | "muted" | "lead";
}

export const Text: React.FC<TextProps> = ({ variant = "body", className, children, ...props }) => {
  const styles: Record<string, string> = {
    body: "text-xs sm:text-sm text-stone-700 leading-relaxed",
    muted: "text-xs text-stone-500 leading-normal",
    lead: "text-sm sm:text-base text-stone-800 font-medium leading-relaxed",
  };

  return (
    <p className={cn("font-sans", styles[variant], className)} {...props}>
      {children}
    </p>
  );
};

export const Caption: React.FC<HTMLAttributes<HTMLSpanElement>> = ({ className, children, ...props }) => {
  return (
    <span className={cn("font-sans text-[10px] sm:text-[11px] text-stone-500 leading-tight", className)} {...props}>
      {children}
    </span>
  );
};

export const MicroLabel: React.FC<HTMLAttributes<HTMLSpanElement>> = ({ className, children, ...props }) => {
  return (
    <span
      className={cn(
        "font-sans text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-stone-400 select-none",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

