import React, { type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  variant?: "pills" | "segmented";
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = "pills",
  className,
  ...props
}) => {
  return (
    <div
      role="tablist"
      className={cn(
        "p-1.5 rounded-2xl border flex flex-wrap sm:flex-nowrap items-center gap-1.5 font-sans card-shadow",
        variant === "pills"
          ? "bg-stone-100/90 border-stone-200"
          : "bg-stone-50 border-stone-200",
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer",
              isActive
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
            )}
          >
            {tab.icon && <span className="text-base shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;

