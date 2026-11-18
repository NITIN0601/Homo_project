import { createContext, useContext } from "react";
import type { Page, AdminTab } from "@core/types";

export interface NavigationContextValue {
  activePage: Page;
  adminTab: AdminTab;
  navigateTo: (page: Page) => void;
  setAdminTab: (tab: AdminTab) => void;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within an AppProvider or NavigationProvider");
  }
  return ctx;
}

export default NavigationContext;
