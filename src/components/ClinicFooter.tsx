import React from "react";
import { MapPinIcon, PhoneIcon } from "./Icons";
import { useApp } from "../context/AppContext";
import { CLINIC, THEME_GRADIENTS, THEME_COLORS, THEME_SHADOWS } from "../config";

const CURRENT_YEAR = new Date().getFullYear();

const ClinicFooter: React.FC = () => {
  const { navigateTo, sessionHours } = useApp();

  return (
    <footer
      className="rounded-2xl overflow-hidden"
      style={{
        background: THEME_GRADIENTS.FOOTER,
      }}
      aria-label="Clinic location and contact footer"
    >
      {/* Top content */}
      <div className="px-6 pt-7 pb-5">
        {/* Brand row */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src={CLINIC.LOGO_PATH}
            alt={CLINIC.LOGO_ALT}
            className="h-12 w-12 object-contain brightness-0 invert"
            width={48}
            height={48}
          />
          <div>
            <p className="text-white font-extrabold text-base leading-none tracking-tight">
              {CLINIC.NAME}
            </p>
            <p className="text-emerald-300 text-xs mt-0.5 font-semibold tracking-wider">
              {CLINIC.TAGLINE}
            </p>
          </div>
        </div>

        {/* Clinic details */}
        <div className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-3">
            <span className="text-sage-400 mt-0.5 flex-shrink-0">
              <MapPinIcon />
            </span>
            <address className="not-italic">
              <p className="text-white font-semibold text-sm">
                {CLINIC.FULL_NAME}
              </p>
              <p className="text-sage-300 text-xs leading-relaxed mt-1">
                {CLINIC.ADDRESS.STREET},<br />
                {CLINIC.ADDRESS.CITY} — {CLINIC.ADDRESS.PINCODE}<br />
                {CLINIC.ADDRESS.STATE}, {CLINIC.ADDRESS.COUNTRY}
              </p>
            </address>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10" role="separator" />

          {/* Phone */}
          <div className="flex items-center gap-3">
            <span className="text-sage-400 flex-shrink-0">
              <PhoneIcon />
            </span>
            <div>
              <p className="text-[11px] text-sage-400 uppercase tracking-widest font-semibold mb-0.5">
                Customer Care
              </p>
              <a
                href={`tel:${CLINIC.PHONE_TEL}`}
                id="clinic-phone-link"
                className="text-white font-bold text-sm hover:text-sage-300 transition-colors"
                aria-label={`Call ${CLINIC.FULL_NAME} customer care: ${CLINIC.PHONE_DISPLAY}`}
              >
                {CLINIC.PHONE_DISPLAY}
              </a>
              <p className="text-sage-400 text-xs mt-0.5 leading-relaxed">
                <span className="text-emerald-300 font-semibold">{sessionHours.summary}</span>
              </p>
              <p className="text-sage-300 text-xs mt-1">
                ✉️ <a href={`mailto:${CLINIC.SUPPORT_EMAIL}`} className="hover:underline text-white font-medium">{CLINIC.SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>

          {/* Hours / quick info pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {CLINIC.TRUST_BADGES.map((tag) => (
              <span
                key={tag.label}
                className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs text-sage-200 font-medium"
              >
                <span role="img" aria-hidden="true">{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* CTA — Open in Google Maps */}
        <a
          href={CLINIC.ADDRESS.MAPS_URL}
          id="google-maps-link"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2.5 w-full rounded-xl font-bold text-sm py-3.5 touch-target transition-all duration-200 active:scale-95"
          style={{
            background: THEME_GRADIENTS.CTA_EMERALD,
            color: THEME_COLORS.WHITE,
            boxShadow: THEME_SHADOWS.CTA_EMERALD_GLOW,
          }}
          aria-label={`Open ${CLINIC.FULL_NAME} clinic location in Google Maps`}
        >
          <MapPinIcon />
          Open in Google Maps 📌
        </a>
      </div>

      {/* Bottom strip */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: THEME_COLORS.WHITE_ALPHA_08 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sage-400 text-xs">
            © {CURRENT_YEAR} {CLINIC.FULL_NAME} Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo("privacy-policy")}
              className="text-sage-400 text-xs hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigateTo("terms")}
              className="text-sage-400 text-xs hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-400 text-xs hover:text-white transition-colors"
            >
              Sitemap
            </a>
          </div>
        </div>
        <p className="text-sage-400 text-[10px] mt-2 leading-relaxed">
          Homeopathic remedies are not intended to diagnose, treat, cure, or prevent any disease.
          Always consult a qualified registered homeopathic physician.
        </p>
      </div>
    </footer>
  );
};

export default ClinicFooter;
