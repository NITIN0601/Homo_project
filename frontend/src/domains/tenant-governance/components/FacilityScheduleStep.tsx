import React from "react";
import type { StepProps } from "../model/onboardTypes";

interface FacilityScheduleStepProps extends StepProps {
  activeTimezoneDetails: { timeZone: string; label: string; offset: string };
}

export const FacilityScheduleStep: React.FC<FacilityScheduleStepProps> = ({
  form,
  updateField,
  activeTimezoneDetails,
}) => {
  return (
    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
          <span>🕒</span> 2. Facility Consultation Hours &amp; Operating Schedule
        </p>
        <span className="text-[10px] bg-amber-200/90 text-amber-950 font-bold px-2.5 py-0.5 rounded-full">
          In {activeTimezoneDetails.label} ({activeTimezoneDetails.timeZone})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">
            Morning Session (Prior Appointment Only)
          </label>
          <input
            type="text"
            placeholder="10:00 AM – 01:30 PM"
            value={form.morningHours}
            onChange={(e) => updateField("morningHours", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">
            Evening Session (Walk-in OPD)
          </label>
          <input
            type="text"
            placeholder="05:00 PM – 08:30 PM"
            value={form.eveningHours}
            onChange={(e) => updateField("eveningHours", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Operating Days</label>
          <input
            type="text"
            placeholder="e.g. Monday – Saturday"
            value={form.availableDays}
            onChange={(e) => updateField("availableDays", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Sunday Consultation Policy</label>
          <select
            value={form.sundayPolicy}
            onChange={(e) => updateField("sundayPolicy", e.target.value as any)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none cursor-pointer"
          >
            <option value="Prior Appointment Only">Prior Appointment Only (Online Booking Confirmed)</option>
            <option value="Walk-in OPD">Walk-in OPD Open</option>
            <option value="Closed">Closed on Sunday</option>
          </select>
        </div>
      </div>
    </div>
  );
};
