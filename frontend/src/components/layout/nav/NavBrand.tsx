import React from "react";
import type { ClinicConfig } from "../../../config";

interface NavBrandProps {
  clinic: ClinicConfig;
  onBrandClick: () => void;
}

export const NavBrand: React.FC<NavBrandProps> = ({ clinic, onBrandClick }) => {
  return (
    <button
      id="brand-logo-btn"
      onClick={onBrandClick}
      className="flex items-center gap-2.5 group select-none flex-shrink-0
        focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl cursor-pointer"
      aria-label={`${clinic.name} — Return to home`}
    >
      <img
        src={clinic.logoUrl}
        alt={`${clinic.name} Logo`}
        className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform duration-300 group-hover:scale-105"
        width={40}
        height={40}
      />
      <div className="flex flex-col text-left">
        <span
          className="font-extrabold text-sm sm:text-base tracking-tight leading-none block"
          style={{ color: clinic.branding.primaryColor, letterSpacing: "-0.01em" }}
        >
          {clinic.shortName}
        </span>
        <span
          className="text-[9px] font-bold tracking-wider uppercase leading-none mt-0.5"
          style={{ color: clinic.branding.accentColor }}
        >
          {clinic.tagline.split("•")[0] || "Health & Wellness"}
        </span>
      </div>
    </button>
  );
};
