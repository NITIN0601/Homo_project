import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { STORAGE_KEYS, THEME_SHADOWS } from "../config";

export const CookieConsentBanner: React.FC = () => {
  const { navigateTo } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (!consent) {
      // Delay presentation slightly for smooth UX
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(
      STORAGE_KEYS.COOKIE_CONSENT,
      JSON.stringify({ essential: true, analytics: true, marketing: true, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem(
      STORAGE_KEYS.COOKIE_CONSENT,
      JSON.stringify({ essential: true, analytics: false, marketing: false, timestamp: new Date().toISOString() })
    );
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(
      STORAGE_KEYS.COOKIE_CONSENT,
      JSON.stringify({ essential: true, analytics: analyticsEnabled, marketing: marketingEnabled, timestamp: new Date().toISOString() })
    );
    setShowPreferences(false);
    setIsVisible(false);
  };

  if (!isVisible && !showPreferences) return null;

  return (
    <>
      {/* Cookie Consent Banner — mobile-safe bottom sheet floating above BottomNav */}
      {isVisible && !showPreferences && (
        <div
          className="fixed bottom-[4.25rem] left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md z-[70]
            bg-stone-900/95 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-stone-700/80
            backdrop-blur-md shadow-2xl animate-fadeIn max-h-[75dvh] flex flex-col overflow-hidden"
          style={{
            boxShadow: THEME_SHADOWS.COOKIE_MODAL,
          }}
        >
          {/* Drag handle pill on mobile */}
          <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

          <div className="flex items-start gap-3 overflow-y-auto pr-1">
            <span className="text-2xl flex-shrink-0 select-none">🍪</span>
            <div className="space-y-3 text-xs w-full">
              <h3 className="font-extrabold text-sm leading-tight text-emerald-400">
                Cookie Privacy &amp; Data Consent
              </h3>
              <p className="text-stone-300 leading-relaxed">
                We use essential cookies to secure your session and telemetry cookies to improve clinic
                performance. Read our{" "}
                <button
                  onClick={() => navigateTo("privacy-policy")}
                  className="text-emerald-300 font-bold underline hover:text-white"
                >
                  Privacy Policy
                </button>.
              </p>

              {/* Buttons — full-width stacked on mobile, inline on sm+ */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1 w-full">
                <button
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  ✓ Accept All Cookies
                </button>
                <button
                  onClick={handleAcceptEssential}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="w-full sm:w-auto px-4 py-2 text-stone-400 hover:text-white font-medium underline text-center"
                >
                  Manage Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/75 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-stone-100 overflow-hidden text-xs"
            style={{ maxHeight: "90dvh", display: "flex", flexDirection: "column" }}
          >
            <div className="px-6 py-4 bg-stone-900 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span>🍪</span> Cookie Preferences
              </h3>
              <button onClick={() => setShowPreferences(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div>
                    <p className="font-bold text-stone-800">Essential Health Cookies</p>
                    <p className="text-[11px] text-stone-500">Session authentication, cart state &amp; security</p>
                  </div>
                  <span className="bg-stone-200 text-stone-700 font-extrabold px-2.5 py-1 rounded-lg text-[10px]">
                    ALWAYS ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div>
                    <p className="font-bold text-stone-800">Performance &amp; Telemetry</p>
                    <p className="text-[11px] text-stone-500">Anonymous page speed &amp; load analytics</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div>
                    <p className="font-bold text-stone-800">Marketing &amp; Health Insights</p>
                    <p className="text-[11px] text-stone-500">Personalized remedy tips &amp; wellness newsletters</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={marketingEnabled}
                      onChange={(e) => setMarketingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 bg-stone-100 font-bold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md"
                >
                  Save Preferences →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
