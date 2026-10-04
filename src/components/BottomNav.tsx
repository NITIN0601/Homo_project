import React from "react";
import { useApp } from "../context/AppContext";
import {
  THEME_COLORS,
  THEME_SHADOWS,
  PATIENT_NAV_ITEMS,
  ADMIN_NAV_ITEMS,
} from "../config";

const BottomNav: React.FC = () => {
  const { state, navigateTo } = useApp();
  const { activePage, authUser } = state;
  const isAdmin = authUser?.role === "admin";
  const navItems = isAdmin
    ? ADMIN_NAV_ITEMS
    : PATIENT_NAV_ITEMS.filter((item) => item.id !== "visit-summary" || !!authUser);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Mobile bottom navigation"
      role="navigation"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: THEME_COLORS.WHITE_ALPHA_92,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: `1px solid ${THEME_COLORS.SAGE_ALPHA_10}`,
        boxShadow: THEME_SHADOWS.BOTTOM_NAV,
      }}
    >
      <ul className="flex items-center justify-around px-2 py-2" role="list">
        {navItems.map(({ id, shortLabel, emoji, ariaLabel }) => {
          const isActive = activePage === id;
          return (
            <li key={id} role="listitem" className="flex-1">
              <button
                id={`bottom-nav-${id}`}
                onClick={() => navigateTo(id)}
                className="touch-target w-full flex-col gap-1 rounded-xl transition-all duration-200 active:scale-95"
                style={{
                  color:      isActive ? THEME_COLORS.SAGE_900 : THEME_COLORS.STONE_400,
                  background: isActive ? THEME_COLORS.SAGE_ALPHA_08 : "transparent",
                }}
                aria-label={ariaLabel}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  aria-hidden="true"
                  className="text-lg transition-transform duration-200"
                  style={{ display: "block", transform: isActive ? "translateY(-1px)" : "none" }}
                >
                  {emoji}
                </span>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{ color: isActive ? THEME_COLORS.SAGE_900 : THEME_COLORS.STONE_400 }}
                >
                  {shortLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
