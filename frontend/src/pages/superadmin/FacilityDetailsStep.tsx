import React from "react";
import type { StepProps } from "./onboardTypes";
import { COMMON_TIMEZONES } from "../../utils/timezone";

interface FacilityDetailsStepProps extends StepProps {
  handleLocationChange: (field: "country" | "state" | "city", value: string) => void;
  handleTimezoneChange: (tz: string) => void;
  handleResetTimezoneToAuto: () => void;
  detectedTz: { timeZone: string; matchedLocation: string };
  detectedCurrency: { code: string; symbol: string; name: string };
  activeTimezoneDetails: { timeZone: string; label: string; offset: string };
  slugError: string | null;
  isEditing?: boolean;
}

export const FacilityDetailsStep: React.FC<FacilityDetailsStepProps> = ({
  form,
  updateField,
  handleLocationChange,
  handleTimezoneChange,
  handleResetTimezoneToAuto,
  detectedTz,
  detectedCurrency,
  activeTimezoneDetails,
  slugError,
  isEditing = false,
}) => {
  return (
    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
        <p className="text-[11px] font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>🏥</span> 1. Hospital Facility Core Details
        </p>
        <span className="text-[10px] bg-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded-full">
          Identity &amp; Address
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Hospital Full Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. City Care Integrative Medical Center"
            value={form.hospitalName}
            onChange={(e) => updateField("hospitalName", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-stone-600 uppercase">Hospital URL Slug *</label>
            {slugError && <span className="text-[10px] text-rose-600 font-bold">{slugError}</span>}
          </div>
          <input
            type="text"
            required
            disabled={isEditing}
            placeholder="e.g. city-care"
            value={form.hospitalSlug}
            onChange={(e) => updateField("hospitalSlug", e.target.value)}
            className={`w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono ${
              isEditing ? "opacity-60 cursor-not-allowed bg-stone-100 text-stone-500" : "bg-stone-50 focus:bg-white"
            }`}
          />
        </div>
      </div>

      {/* Facility Classification & Dynamic Terminology */}
      <div className="p-3 bg-white rounded-xl border border-stone-200/90 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <span>🏷️</span> Facility Classification &amp; System Terminology *
          </label>
          <span className="text-[10px] text-stone-400 font-medium">
            Syncs terminology across all patient &amp; doctor portals
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => updateField("facilityType", "hospital")}
            className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
              form.facilityType === "hospital"
                ? "bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950"
                : "bg-stone-50/60 border-stone-200 hover:bg-stone-100 text-stone-700"
            }`}
          >
            <span className="text-xl">🏥</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black">Hospital</span>
                <span className="text-[9px] bg-indigo-200/80 text-indigo-800 font-bold px-1.5 py-0.5 rounded">Default</span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight mt-0.5">
                Hospital facility, medical center, and multi-department health complex.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateField("facilityType", "clinic")}
            className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
              form.facilityType === "clinic"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950"
                : "bg-stone-50/60 border-stone-200 hover:bg-stone-100 text-stone-700"
            }`}
          >
            <span className="text-xl">🌿</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black">Clinic</span>
                <span className="text-[9px] bg-emerald-200/80 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Specialist</span>
              </div>
              <p className="text-[10px] text-stone-500 leading-tight mt-0.5">
                Specialty clinic, outpatient dispensary, private practice, and holistic healing center.
              </p>
            </div>
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-stone-600 uppercase">Hospital Tagline</label>
        <input
          type="text"
          placeholder="e.g. Advanced Integrative Care & Lasting Wellness"
          value={form.tagline}
          onChange={(e) => updateField("tagline", e.target.value)}
          className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Country *</label>
          <input
            type="text"
            list="country-suggestions"
            required
            value={form.country}
            onChange={(e) => handleLocationChange("country", e.target.value)}
            placeholder="e.g. India"
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
          <datalist id="country-suggestions">
            <option value="India" />
            <option value="United States" />
            <option value="United Kingdom" />
            <option value="United Arab Emirates" />
            <option value="Singapore" />
            <option value="Australia" />
            <option value="Canada" />
            <option value="Germany" />
            <option value="France" />
          </datalist>
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">State / Province *</label>
          <input
            type="text"
            required
            value={form.state}
            onChange={(e) => handleLocationChange("state", e.target.value)}
            placeholder="e.g. Karnataka"
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">City *</label>
          <input
            type="text"
            required
            value={form.city}
            onChange={(e) => handleLocationChange("city", e.target.value)}
            placeholder="e.g. Bengaluru"
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Postal / Pincode</label>
          <input
            type="text"
            value={form.pincode}
            onChange={(e) => updateField("pincode", e.target.value)}
            placeholder="e.g. 560003"
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Street Address</label>
          <input
            type="text"
            placeholder="e.g. 123 Healthcare Blvd, Medical Wing"
            value={form.street}
            onChange={(e) => updateField("street", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Contact Phone *</label>
          <input
            type="text"
            required
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Facility Admin Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Operational Timezone Auto-Calculation Card */}
      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs">🌐</span>
            <span className="text-[11px] font-black text-blue-950 uppercase tracking-wide">
              Facility Timezone
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-200/80 text-blue-900">
              {activeTimezoneDetails.label} ({activeTimezoneDetails.offset})
            </span>
            {form.timezoneManualOverride ? (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                Manual Selection
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                Auto-Detected from {detectedTz.matchedLocation}
              </span>
            )}
          </div>
          <p className="text-[11px] text-blue-800">
            Operating and doctor hours entered below are scheduled under{" "}
            <span className="font-semibold text-blue-950">{activeTimezoneDetails.timeZone}</span> ({activeTimezoneDetails.label}).
            Patients globally will see slots converted accurately to their local times.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
          <select
            value={form.timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="border border-blue-300 rounded-lg px-2.5 py-1 text-xs bg-white text-blue-950 font-medium shadow-xs outline-none"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.timeZone} value={tz.timeZone}>
                {tz.label}
              </option>
            ))}
          </select>
          {form.timezoneManualOverride && (
            <button
              type="button"
              onClick={handleResetTimezoneToAuto}
              title="Reset to auto-detected timezone based on location"
              className="px-2 py-1 text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Location Currency Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <div>
            <span className="font-bold text-emerald-950">Local Billing Currency:</span>{" "}
            <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
              {detectedCurrency.name} ({detectedCurrency.symbol})
            </span>
          </div>
        </div>
        <p className="text-[11px] text-emerald-800">
          Inferred automatically from <strong>{form.country || "facility origin"}</strong>. All consultation fees and medicine prices use this currency.
        </p>
      </div>
    </div>
  );
};
