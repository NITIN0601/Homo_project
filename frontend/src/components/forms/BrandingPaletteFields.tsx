import React from "react";
import { Input, Textarea } from "../ui";

export interface BrandingPaletteValues {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  bannerUrl?: string;
  aboutHospitalText?: string;
  aboutClinicText?: string;
}

interface BrandingPaletteFieldsProps {
  values: BrandingPaletteValues;
  onChange: (field: keyof BrandingPaletteValues, value: string) => void;
  disabled?: boolean;
}

const BRAND_COLOR_PRESETS = [
  { name: "Forest Emerald", primary: "#1b4332", accent: "#40916c" },
  { name: "Ocean Teal", primary: "#0d9488", accent: "#14b8a6" },
  { name: "Royal Indigo", primary: "#4338ca", accent: "#6366f1" },
  { name: "Clinical Blue", primary: "#0284c7", accent: "#38bdf8" },
  { name: "Warm Amber", primary: "#b45309", accent: "#f59e0b" },
  { name: "Deep Rose", primary: "#be123c", accent: "#fb7185" },
];

export const BrandingPaletteFields: React.FC<BrandingPaletteFieldsProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Quick Theme Presets */}
      <div>
        <label className="text-xs font-bold text-stone-700 block mb-2">
          Color Presets (1-Click Palette)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {BRAND_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange("primaryColor", preset.primary);
                onChange("accentColor", preset.accent);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-medium cursor-pointer shadow-2xs transition-all disabled:opacity-50"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block"
                style={{ backgroundColor: preset.primary }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hex Pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            Primary Brand Color
          </label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={values.primaryColor || "#0d9488"}
              onChange={(e) => onChange("primaryColor", e.target.value)}
              disabled={disabled}
              className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5 bg-white"
            />
            <Input
              value={values.primaryColor || "#0d9488"}
              onChange={(e) => onChange("primaryColor", e.target.value)}
              placeholder="#0d9488"
              disabled={disabled}
              className="font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-stone-700 block mb-1">
            Accent Brand Color
          </label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              value={values.accentColor || "#14b8a6"}
              onChange={(e) => onChange("accentColor", e.target.value)}
              disabled={disabled}
              className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5 bg-white"
            />
            <Input
              value={values.accentColor || "#14b8a6"}
              onChange={(e) => onChange("accentColor", e.target.value)}
              placeholder="#14b8a6"
              disabled={disabled}
              className="font-mono"
            />
          </div>
        </div>
      </div>

      {/* Media URLs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Hospital Logo URL"
          value={values.logoUrl || ""}
          onChange={(e) => onChange("logoUrl", e.target.value)}
          placeholder="/generic-hospital-logo.svg or https://..."
          disabled={disabled}
        />
        <Input
          label="Hero Banner Image URL"
          value={values.bannerUrl || ""}
          onChange={(e) => onChange("bannerUrl", e.target.value)}
          placeholder="/assets/banner.jpg or https://..."
          disabled={disabled}
        />
      </div>

      {/* About Hospital Text */}
      <Textarea
        label="About Facility &amp; Mission Statement"
        value={values.aboutHospitalText || values.aboutClinicText || ""}
        onChange={(e) => onChange("aboutHospitalText", e.target.value)}
        rows={3}
        placeholder="Brief narrative introducing your facility philosophy, history, and community care commitments..."
        disabled={disabled}
      />
    </div>
  );
};
