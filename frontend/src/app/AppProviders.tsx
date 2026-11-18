import React, { type ReactNode } from "react";
import { RootErrorBoundary } from "./error/RootErrorBoundary";
import { ThemeProvider } from "../core/tenancy/branding/ThemeProvider";
import { ToastProvider } from "../shared/ui/ToastContext";
import { AppProvider } from "./store/AppContext";

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <RootErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AppProvider>
      </ThemeProvider>
    </RootErrorBoundary>
  );
};

export default AppProviders;
