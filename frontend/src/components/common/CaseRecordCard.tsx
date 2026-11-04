import React from "react";
import type { HomeopathicCaseRecord } from "../../types";

interface CaseRecordCardProps {
  record: HomeopathicCaseRecord | any;
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  title?: string;
}

export const CaseRecordCard: React.FC<CaseRecordCardProps> = ({
  record,
  showSaveButton = false,
  onSave,
  isSaving = false,
  title = "Classical Homeopathy Case Record",
}) => {
  if (!record) return null;

  const generals = record.homeopathic_case_analysis?.generals_and_constitution || {};
  const complaints = record.homeopathic_case_analysis?.chief_complaints || [];
  const remedies = record.treatment_plan?.medicines_suggested || [];
  const summary = record.clinical_summary;

  return (
    <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-4 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <h3 className="font-extrabold text-emerald-950 text-sm">{title}</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
          Pydantic v2
        </span>
      </div>

      {/* Constitution & Thermal Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
          <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Thermal State</span>
          <span className="font-extrabold text-stone-800 text-xs">{generals.thermal_state || "Chilly"}</span>
        </div>

        <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
          <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Thirst</span>
          <span className="font-extrabold text-stone-800 text-xs">{generals.thirst || "Thirstless"}</span>
        </div>

        <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
          <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Miasm</span>
          <span className="font-extrabold text-stone-800 text-xs">
            {typeof summary === "object" ? summary?.miasmatic_predominance : "Psoric"}
          </span>
        </div>

        <div className="p-2.5 bg-stone-50 rounded-2xl border border-stone-100">
          <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">Mind / Rubric</span>
          <span className="font-extrabold text-stone-800 text-xs truncate block" title={generals.mental_emotional_state}>
            {generals.mental_emotional_state || "Fastidious"}
          </span>
        </div>
      </div>

      {/* Chief Complaints List */}
      {complaints.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold text-stone-700 block uppercase tracking-wider">
            Chief Complaints &amp; Modalities
          </span>
          <div className="space-y-1.5">
            {complaints.map((c: any, i: number) => (
              <div key={i} className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <p className="font-bold text-emerald-950">
                  {c.location || "General"} — <span className="font-medium text-emerald-800">{c.sensation}</span>
                </p>
                {c.modalities && (
                  <p className="text-[11px] text-stone-600 mt-1">
                    <strong className="text-red-700">Agg:</strong> {c.modalities.aggravation || "None noted"} ·{" "}
                    <strong className="text-emerald-700">Amel:</strong> {c.modalities.amelioration || "None noted"}
                  </p>
                )}
                {c.concomitants && (
                  <p className="text-[10px] text-stone-400 mt-0.5">Concomitant: {c.concomitants}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescribed Remedies */}
      {remedies.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-extrabold text-stone-700 block uppercase tracking-wider">
            Prescribed Simillimum
          </span>
          <div className="space-y-1.5">
            {remedies.map((m: any, i: number) => (
              <div
                key={i}
                className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between"
              >
                <div>
                  <p className="font-black text-stone-900 text-xs">
                    {m.remedy_name} <span className="text-emerald-700 font-bold ml-1">{m.potency}</span>
                  </p>
                  <p className="text-[10px] text-stone-500">
                    {m.dosage_form || "Globules"} · {m.frequency || "Twice daily"}
                  </p>
                  {m.instructions && <p className="text-[10px] text-stone-400 mt-0.5">{m.instructions}</p>}
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {showSaveButton && onSave && (
        <button
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isSaving ? "Persisting to Supabase…" : "💾 Save Record to Local EHR"}
        </button>
      )}
    </div>
  );
};

export default CaseRecordCard;
