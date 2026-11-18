import React, { type ReactNode } from "react";
import { NavBar } from "./NavBar";
import { BottomNav } from "./BottomNav";
import { PageFooter } from "./PageFooter";
import { DemoHeaderBanner } from "./DemoHeaderBanner";
import { ConnectionStatusBar } from "../../shared/ui/ConnectionStatusBar";
import { CookieConsentBanner } from "../../domains/patient-engagement/components/CookieConsentBanner";

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      <ConnectionStatusBar />
      <DemoHeaderBanner />
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {children}
      </main>

      <PageFooter />
      <BottomNav />
      <CookieConsentBanner />
    </div>
  );
};

export default AppShell;
