import React from "react";
import type { Page, AuthUser } from "@core/types";
import { PATIENT_NAV_ITEMS, THEME_COLORS } from "../../core/config";

interface NavPatientLinksProps {
  activePage: Page;
  authUser: AuthUser | null;
  onNavigate: (page: Page) => void;
}

export const NavPatientLinks: React.FC<NavPatientLinksProps> = ({
  activePage,
  authUser,
  onNavigate,
}) => {
  return (
    <>
      {PATIENT_NAV_ITEMS
        .filter((item) => item.id !== "home" && (item.id !== "visit-summary" || !!authUser))
        .map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer whitespace-nowrap"
              style={{
                background: isActive ? THEME_COLORS.SAGE_ALPHA_08 : "transparent",
                color:      isActive ? THEME_COLORS.SAGE_900 : THEME_COLORS.STONE_500,
                fontWeight: isActive ? 700 : 500,
              }}
              aria-label={item.ariaLabel}
            >
              <span className="text-sm">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
    </>
  );
};
