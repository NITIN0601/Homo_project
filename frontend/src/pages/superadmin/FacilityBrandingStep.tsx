import React from "react";
import type { StepProps } from "./onboardTypes";
import { DEFAULT_COLOR_PRESETS, type ColorPreset } from "../../config/tenants/constants";

interface FacilityBrandingStepProps extends StepProps {
  handleApplyPreset: (preset: ColorPreset) => void;
}

export const FacilityBrandingStep: React.FC<FacilityBrandingStepProps> = ({
  form,
  updateField,
  handleApplyPreset,
}) => {
  return (
    <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/80 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎨</span> 5. Hospital Branding, Media Assets &amp; Theme Colors
        </p>
        <span className="text-[10px] bg-stone-200 text-stone-800 font-bold px-2 py-0.5 rounded-full">
          Patient Portal Appearance
        </span>
      </div>

      {/* Color Palettes */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-stone-600 uppercase">Brand Color Palette</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEFAULT_COLOR_PRESETS.map((p) => {
            const isSelected = form.primaryColor === p.primary;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${isSelected
                  ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                  : "border-stone-200 hover:bg-stone-50"
                  }`}
              >
                <div className="w-5 h-5 rounded-md shadow-xs shrink-0" style={{ background: p.primary }} />
                <span className="text-[11px] font-bold text-stone-800 leading-tight">{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Primary Color (Hex)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Accent Color (Hex)</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => updateField("accentColor", e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={(e) => updateField("accentColor", e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logo & Banner URLs with Live Preview */}
      <div className="pt-2 border-t border-stone-200/70 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Logo URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-stone-600 uppercase">Hospital Logo URL</label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => updateField("logoUrl", "/generic-hospital-logo.svg")}
                  className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  Default
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => updateField("logoUrl", "/agastya-logo.png")}
                  className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  Agastya
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => updateField("logoUrl", "/logo.png")}
                  className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  Cross
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl border border-stone-200 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-xs">
                <img
                  src={form.logoUrl || "/generic-hospital-logo.svg"}
                  alt="Logo Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/generic-hospital-logo.svg";
                  }}
                />
              </div>
              <input
                type="text"
                placeholder="/generic-hospital-logo.svg or https://..."
                value={form.logoUrl}
                onChange={(e) => updateField("logoUrl", e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
              />
            </div>
          </div>

          {/* Banner URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-stone-600 uppercase">Hospital Banner Image URL</label>
              <button
                type="button"
                onClick={() => updateField("bannerUrl", "/assets/banner.jpg")}
                className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Use Default Banner
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-10 rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <img
                  src={form.bannerUrl || "/assets/banner.jpg"}
                  alt="Banner Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/assets/banner.jpg";
                  }}
                />
              </div>
              <input
                type="text"
                placeholder="/assets/banner.jpg or https://..."
                value={form.bannerUrl}
                onChange={(e) => updateField("bannerUrl", e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* About Hospital Text */}
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">
            About Overview (Shown on Patient About Page)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. City Care Medical Center provides compassionate, personalized outpatient care and integrated specialty treatments..."
            value={form.aboutHospitalText}
            onChange={(e) => updateField("aboutHospitalText", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
          />
        </div>
      </div>
    </div>
  );
};
