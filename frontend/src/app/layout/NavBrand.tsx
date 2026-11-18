import React from "react";
import type { HospitalFacade } from "../../core/tenancy/context/useHospital";

interface NavBrandProps {
  hospital: HospitalFacade;
  onBrandClick: () => void;
}

export const NavBrand: React.FC<NavBrandProps> = ({ hospital, onBrandClick }) => {
  const brand = hospital;
  return (
    <button
      id="brand-logo-btn"
      onClick={onBrandClick}
      className="flex items-center gap-2.5 group select-none flex-shrink-0
        focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl cursor-pointer"
      aria-label={`${brand.name} — Return to home`}
    >
      <img
        src={brand.logoUrl}
        alt={`${brand.name} Logo`}
        className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform duration-300 group-hover:scale-105"
        width={40}
        height={40}
        decoding="async"
      />
      <div className="flex flex-col text-left">
        <span
          className="font-extrabold text-sm sm:text-base tracking-tight leading-none block"
          style={{ color: brand.branding.primaryColor, letterSpacing: "-0.01em" }}
        >
          {brand.shortName}
        </span>
        <span
          className="text-[9px] font-bold tracking-wider uppercase leading-none mt-0.5"
          style={{ color: brand.branding.accentColor }}
        >
          {brand.tagline.split("•")[0] || "Health & Wellness"}
        </span>
      </div>
    </button>
  );
};
