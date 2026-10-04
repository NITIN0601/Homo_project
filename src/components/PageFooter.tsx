import React from "react";
import { useApp } from "../context/AppContext";
import { CLINIC } from "../config";

/**
 * PageFooter — Clean footer strip structured with working hours on separate lines,
 * dedicated Contact & Email lines, and legal navigation.
 */
const CURRENT_YEAR = new Date().getFullYear();

const PageFooter: React.FC = () => {
  const { navigateTo, sessionHours } = useApp();

  return (
    <footer
      className="mt-10 border-t border-stone-200 bg-white/70 backdrop-blur-sm"
      aria-label="Page footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Row 1: Brand & Copyright (Left), Legal Navigation Links (Right on desktop, 2nd line on mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Brand + copyright */}
          <div className="flex items-center gap-2.5">
            <img
              src={CLINIC.LOGO_PATH}
              alt={CLINIC.LOGO_ALT}
              className="h-7 w-7 object-contain opacity-85"
              width={28}
              height={28}
            />
            <div>
              <p className="text-xs font-extrabold text-stone-800 leading-none">
                {CLINIC.FULL_NAME}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">
                © {CURRENT_YEAR} {CLINIC.FULL_NAME}. All rights reserved.
              </p>
            </div>
          </div>

          {/* Legal links: About Us | Privacy Policy | Terms of Service */}
          <nav
            className="flex items-center gap-4 text-xs font-medium text-stone-500"
            aria-label="Footer legal navigation"
          >
            <button
              onClick={() => navigateTo("about")}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              About Us
            </button>
            <button
              onClick={() => navigateTo("privacy-policy")}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigateTo("terms")}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </nav>
        </div>

        {/* Row 2: Consultation, Working Hours, Sunday, Contact & Email (Left) | Medical Disclaimer (Right on desktop, Bottom on mobile) */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 pt-1 border-t border-stone-100">
          {/* Consultation, Timings, Contact & Email */}
          <div className="space-y-1 text-xs text-stone-600 leading-relaxed">
            <p className="text-stone-700">
              Consultation by <span className="font-semibold text-stone-800">{CLINIC.DOCTOR_TITLE}</span>
            </p>
            <p className="text-stone-600">
              {sessionHours.monSatSummary}
            </p>
            <p className="text-stone-600">
              {sessionHours.sundaySummary}
            </p>
            <div className="pt-0.5 space-y-0.5 text-stone-700">
              <p>
                <span className="font-medium">Location:</span>{" "}
                <a
                  href={CLINIC.ADDRESS.MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 hover:text-emerald-800 hover:underline inline-flex items-baseline gap-1"
                  title="Open clinic location in Google Maps"
                >
                  <span>
                    No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru, Karnataka – 560003
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-70 flex-shrink-0 self-center">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </p>
              <p>
                <span className="font-medium">Contact:</span>{" "}
                <a href={`tel:${CLINIC.PHONE_TEL}`} className="text-stone-700 hover:text-emerald-800 hover:underline">
                  {CLINIC.PHONE_DISPLAY}
                </a>
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a href={`mailto:${CLINIC.SUPPORT_EMAIL}`} className="text-stone-700 hover:text-emerald-800 hover:underline">
                  {CLINIC.SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>

          {/* Medical Disclaimer: Right side on desktop, stacked below on mobile */}
          <div className="md:max-w-xs text-left md:text-right pt-2 md:pt-0">
            <p className="text-[11px] text-stone-400 italic leading-relaxed">
              Homoeopathic remedies are not a substitute for emergency medical care. Always consult a qualified practitioner.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PageFooter;
