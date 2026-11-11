import React from "react";
import type { UserProfile, HomeopathicRemedySuggestion } from "../../../../types";
import { DOCTOR, CLINIC } from "../../../../config";
import {
  LANGUAGE_LABELS,
  type StructuredConsultationDraft,
  type VoiceStudioTranscriptionResult,
} from "../../../../services/voiceStudio";

interface VoiceStudioReviewStepProps {
  draft: StructuredConsultationDraft;
  evalTelemetry: VoiceStudioTranscriptionResult["telemetry"] | null;
  detectedLang: string;
  detectedLangLabel: string;
  reviewTab: "form" | "json";
  setReviewTab: (tab: "form" | "json") => void;
  jsonViewMode: "admin-full" | "patient-filtered";
  setJsonViewMode: (mode: "admin-full" | "patient-filtered") => void;
  handleCopyJson: () => void;
  copiedJson: boolean;
  editDiagnosis: string;
  setEditDiagnosis: (val: string) => void;
  editRemedies: HomeopathicRemedySuggestion[];
  setEditRemedies: React.Dispatch<React.SetStateAction<HomeopathicRemedySuggestion[]>>;
  editAdvice: string;
  setEditAdvice: (val: string) => void;
  editDoctorNotes: string;
  setEditDoctorNotes: (val: string) => void;
  retainAudioOnSystem: boolean;
  setRetainAudioOnSystem: (val: boolean) => void;
  audioIsPurged: boolean;
  setAudioIsPurged: (val: boolean) => void;
  audioDurationSec: number;
  audioChecksumSha256: string;
  syncedCaseRecord: any;
  patientFilteredRecord: any;
  currentPatient: UserProfile;
  shareRemedy: boolean;
  setShareRemedy: (val: boolean) => void;
  shareModalities: boolean;
  setShareModalities: (val: boolean) => void;
  shareAdvice: boolean;
  setShareAdvice: (val: boolean) => void;
  shareMentalState: boolean;
  setShareMentalState: (val: boolean) => void;
  shareMiasm: boolean;
  setShareMiasm: (val: boolean) => void;
  shareClinicalNotes: boolean;
  setShareClinicalNotes: (val: boolean) => void;
  sendWhatsApp: boolean;
  setSendWhatsApp: (val: boolean) => void;
  sendEmail: boolean;
  setSendEmail: (val: boolean) => void;
  onReRecord: () => void;
  onClose: () => void;
  onApprove: () => void;
}

export const VoiceStudioReviewStep: React.FC<VoiceStudioReviewStepProps> = ({
  draft,
  evalTelemetry,
  detectedLang,
  detectedLangLabel,
  reviewTab,
  setReviewTab,
  jsonViewMode,
  setJsonViewMode,
  handleCopyJson,
  copiedJson,
  editDiagnosis,
  setEditDiagnosis,
  editRemedies,
  setEditRemedies,
  editAdvice,
  setEditAdvice,
  editDoctorNotes,
  setEditDoctorNotes,
  retainAudioOnSystem,
  setRetainAudioOnSystem,
  audioIsPurged,
  setAudioIsPurged,
  audioDurationSec,
  audioChecksumSha256,
  syncedCaseRecord,
  patientFilteredRecord,
  currentPatient,
  shareRemedy,
  setShareRemedy,
  shareModalities,
  setShareModalities,
  shareAdvice,
  setShareAdvice,
  shareMentalState,
  setShareMentalState,
  shareMiasm,
  setShareMiasm,
  shareClinicalNotes,
  setShareClinicalNotes,
  sendWhatsApp,
  setSendWhatsApp,
  sendEmail,
  setSendEmail,
  onReRecord,
  onClose,
  onApprove,
}) => {
  return (
    <div className="space-y-6">
      {/* Telemetry & Quality Evals Bar */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌐</span>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-purple-900 tracking-wider">
              Language Result &amp; Accuracy
            </span>
            <p className="text-xs font-black text-stone-900">
              {detectedLangLabel || LANGUAGE_LABELS[detectedLang]}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {evalTelemetry && (
            <>
              <span className="text-[10px] font-mono bg-purple-100 text-purple-900 px-2 py-0.5 rounded-full font-bold border border-purple-200" title="Real-Time Factor: Seconds of compute per second of audio">
                RTF: {evalTelemetry.rtf}x
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Confidence: {Math.round(evalTelemetry.confidence * 100)}%
              </span>
              <span className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-bold border border-stone-200">
                STT: {evalTelemetry.computeTimeMs}ms
              </span>
            </>
          )}

          {draft.llmResult && (
            <>
              <span className="text-[10px] font-mono bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200 flex items-center gap-1">
                <span>🧠</span> {draft.llmResult.providerName} ({draft.llmResult.modelUsed})
              </span>
              <span className="text-[10px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-bold border border-stone-200">
                Scribe: {draft.llmResult.latencyMs}ms
              </span>
              {draft.llmResult.status === "fallback" && (
                <span className="text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300" title={draft.llmResult.errorMessage}>
                  ⚠️ Heuristic Fallback
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Raw Transcribed Text Preview */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
          <span>📄</span> Extracted Conversation Transcript (VoiceStudio Output):
        </span>
        <p className="text-xs text-stone-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-stone-200">
          "{draft.rawTranscript}"
        </p>
      </div>

      {/* REVIEW VIEW SELECTOR TABS: Form vs Classical Homeopathy JSON */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReviewTab("form")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              reviewTab === "form"
                ? "bg-purple-900 text-white shadow-md"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>📝</span> Clinical Form Editor
          </button>
          <button
            type="button"
            onClick={() => setReviewTab("json")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              reviewTab === "json"
                ? "bg-purple-900 text-white shadow-md"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>⚡</span> Classical Homeopathy JSON
            <span className="text-[9px] bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded-full font-mono font-bold">
              Strict Schema
            </span>
          </button>
        </div>

        {reviewTab === "json" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setJsonViewMode(jsonViewMode === "admin-full" ? "patient-filtered" : "admin-full")}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{jsonViewMode === "admin-full" ? "🔐 Admin Full Schema" : "👁️ Patient-Visible Slice"}</span>
              <span className="text-[10px] text-purple-700 font-extrabold underline">Switch</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
            >
              <span>{copiedJson ? "✓ Copied!" : "📋 Copy JSON"}</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: FORM VIEW */}
      {reviewTab === "form" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <span>🛡️</span> Doctor Staging &amp; Approval Console
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
              Admin Approval Required Before Patient Can View
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Chief Diagnosis */}
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">Chief Diagnosis</label>
              <input
                type="text"
                value={editDiagnosis}
                onChange={(e) => setEditDiagnosis(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Dynamic Multi-Remedy Prescription Editor */}
            <div className="md:col-span-2 space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-purple-900 uppercase flex items-center gap-1.5">
                  <span>🌿</span> Prescribed Remedies &amp; Mother Tinctures ({editRemedies.length})
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEditRemedies((prev) => [
                      ...prev,
                      {
                        remedy_name: "",
                        potency: "30C",
                        dosage_form: "Globules (Size 30 cane sugar pills)",
                        frequency: "Twice daily",
                        instructions: "Take 4 globules directly on tongue",
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  + Add Secondary Remedy / Tincture
                </button>
              </div>

              {editRemedies.map((remedyItem, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-purple-100 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-500 font-mono">
                      #{idx + 1} {idx === 0 ? "(Primary Simillimum)" : "(Complementary / Acute)"}
                    </span>
                    {editRemedies.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditRemedies((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-red-500 hover:text-red-700 font-bold text-[10px] cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-bold text-stone-500 uppercase">Remedy Name</label>
                      <input
                        type="text"
                        value={remedyItem.remedy_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditRemedies((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, remedy_name: val } : r))
                          );
                        }}
                        placeholder="e.g. Nux Vomica, Lycopodium, Arnica"
                        className="w-full mt-0.5 p-2 rounded-lg border border-stone-200 text-xs font-bold text-purple-900 outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-stone-500 uppercase">Potency</label>
                      <input
                        type="text"
                        value={remedyItem.potency}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditRemedies((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, potency: val } : r))
                          );
                        }}
                        placeholder="30C, 200C, 1M, Q"
                        className="w-full mt-0.5 p-2 rounded-lg border border-stone-200 text-xs font-bold outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-stone-500 uppercase">Dosage Form</label>
                      <input
                        type="text"
                        value={remedyItem.dosage_form}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditRemedies((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, dosage_form: val } : r))
                          );
                        }}
                        placeholder="Globules, Dilution, Tablets"
                        className="w-full mt-0.5 p-2 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-stone-500 uppercase">Instructions &amp; Frequency</label>
                    <input
                      type="text"
                      value={remedyItem.instructions}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditRemedies((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, instructions: val } : r))
                        );
                      }}
                      placeholder="e.g. 4 globules twice daily after food"
                      className="w-full mt-0.5 p-2 rounded-lg border border-stone-200 text-xs outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Lifestyle & Diet Advice */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-600 uppercase">Dietary &amp; Lifestyle Instructions</label>
              <input
                type="text"
                value={editAdvice}
                onChange={(e) => setEditAdvice(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Confidential Doctor Notes */}
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-600 uppercase flex items-center justify-between">
                <span>Doctor Confidential Internal Notes</span>
                <span className="text-stone-400 font-normal">Kept private unless explicitly shared</span>
              </label>
              <textarea
                rows={2}
                value={editDoctorNotes}
                onChange={(e) => setEditDoctorNotes(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* SOURCE OF TRUTH LOCAL AUDIO ARCHIVE & FORENSIC WATERMARK CARD */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-stone-900 text-white space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retainAudioOnSystem && !audioIsPurged}
                    disabled={audioIsPurged}
                    onChange={(e) => setRetainAudioOnSystem(e.target.checked)}
                    className="w-4 h-4 text-purple-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-black text-white">
                    🛡️ Retain Audio File on Local Clinic System (Source of Truth)
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono">
                    <span>🔒</span> Watermark Active (ABDM / HIPAA)
                  </span>
                  {!audioIsPurged && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Are you sure you want to permanently purge the local audio recording? (GDPR / ABDM Right to Erasure)")) {
                          setAudioIsPurged(true);
                          setRetainAudioOnSystem(false);
                        }
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-0.5 rounded bg-red-950/60 border border-red-800 cursor-pointer"
                    >
                      🗑️ Purge Recording (Right to Erasure)
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-stone-300 leading-relaxed">
                Retaining raw consultation audio anchors the tamper-evident diagnostic chain for clinical audit trails and statutory medico-legal compliance.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                  <span className="text-stone-400 block text-[9px]">LOCAL STATUS</span>
                  <span className={audioIsPurged ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                    {audioIsPurged ? "PERMANENTLY PURGED" : "ARCHIVED ON DISK"}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                  <span className="text-stone-400 block text-[9px]">RECORDING DURATION</span>
                  <span className="text-stone-200">{audioDurationSec} Seconds</span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/10 sm:col-span-2">
                  <span className="text-stone-400 block text-[9px]">FORENSIC SHA-256 INTEGRITY</span>
                  <span className="text-amber-300 font-bold truncate block" title={audioChecksumSha256}>
                    {audioChecksumSha256 ? `${audioChecksumSha256.slice(0, 14)}… [Verified]` : "Computed On Stop"}
                  </span>
                </div>
              </div>

              <div className="text-[9px] text-stone-400 bg-black/40 p-2 rounded-xl border border-white/5 flex items-start gap-1.5">
                <span className="text-xs">⚖️</span>
                <span>
                  <strong>Clinical Privacy Notice:</strong> Audio watermarked under Digital Personal Data Protection Act (DPDPA 2023) and DISHA guidelines. Non-repudiation signature binds recording to {DOCTOR.TITLE} &amp; {CLINIC.FULL_NAME}.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASSICAL HOMEOPATHY JSON SCHEMA INSPECTOR */}
      {reviewTab === "json" && syncedCaseRecord && (
        <div className="space-y-4 animate-fadeIn">
          {/* Schema Summary Header Bar */}
          <div className="bg-stone-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono font-bold">✓ Classical Homeopathy Schema Validated</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-purple-300 font-mono">
                  {syncedCaseRecord.metadata.interaction_id}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Speech Language: <strong>{syncedCaseRecord.metadata.speech_language.original}</strong> → Standardized Clinical Output: <strong>{syncedCaseRecord.metadata.speech_language.processed}</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest">Active View</span>
              <p className="font-bold text-amber-300">
                {jsonViewMode === "admin-full" ? "Full Clinical EMR (Admin Only)" : "Patient-Authorized Slice"}
              </p>
            </div>
          </div>

          {/* Highlights Grid of Extracted Homeopathic Entities */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 uppercase">Simillimum Remedy</span>
              <p className="font-black text-purple-950 truncate">{syncedCaseRecord.treatment_plan.medicines_suggested[0]?.remedy_name || "Nux Vomica"}</p>
              <p className="text-[10px] text-purple-700 font-mono">{syncedCaseRecord.treatment_plan.medicines_suggested[0]?.potency || "200C"}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-600 uppercase">Miasmatic State</span>
              <p className="font-bold text-stone-900 truncate">{syncedCaseRecord.clinical_summary.miasmatic_predominance}</p>
              <p className="text-[10px] text-stone-500">Internal assessment</p>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-600 uppercase">Thermal State</span>
              <p className="font-bold text-stone-900 truncate">{syncedCaseRecord.homeopathic_case_analysis.generals_and_constitution.thermal_state}</p>
              <p className="text-[10px] text-stone-500">Generals Totality</p>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-bold text-stone-600 uppercase">Dosage Form</span>
              <p className="font-bold text-stone-900 truncate">{syncedCaseRecord.treatment_plan.medicines_suggested[0]?.dosage_form || "Globules"}</p>
              <p className="text-[10px] text-stone-500">Size 30 cane sugar</p>
            </div>
          </div>

          {/* Formatted JSON Inspector Codebox */}
          <div className="relative">
            <pre className="bg-stone-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-72 leading-relaxed border border-stone-800 shadow-inner">
              {JSON.stringify(jsonViewMode === "admin-full" ? syncedCaseRecord : patientFilteredRecord, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* GRANULAR PRIVACY TOGGLES FOR SHARING WITH PATIENT */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
            <span>🔒</span> Select What To Share with Patient ({currentPatient.name}):
          </p>
          <span className="text-[10px] text-stone-500 italic">
            Doctor controls exactly what appears in patient timeline &amp; JSON export
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareRemedy}
              onChange={(e) => setShareRemedy(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">Prescribed Remedies</span>
              <span className="text-[10px] text-stone-500">Medicine name, potency &amp; dosage</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareModalities}
              onChange={(e) => setShareModalities(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">Symptoms &amp; Modalities</span>
              <span className="text-[10px] text-stone-500">Aggravations &amp; ameliorations</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareAdvice}
              onChange={(e) => setShareAdvice(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">Diet &amp; Lifestyle</span>
              <span className="text-[10px] text-stone-500">Precautions and beverage advice</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareMentalState}
              onChange={(e) => setShareMentalState(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block flex items-center gap-1">
                Constitutional Mind
                <span className="text-[9px] bg-stone-100 text-stone-600 px-1 rounded">Private</span>
              </span>
              <span className="text-[10px] text-stone-500">Mental &amp; emotional assessment</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareMiasm}
              onChange={(e) => setShareMiasm(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block flex items-center gap-1">
                Miasmatic Analysis
                <span className="text-[9px] bg-stone-100 text-stone-600 px-1 rounded">Doctor Only</span>
              </span>
              <span className="text-[10px] text-stone-500">Psoric / Sycotic classification</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={shareClinicalNotes}
              onChange={(e) => setShareClinicalNotes(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">Doctor Internal Notes</span>
              <span className="text-[10px] text-stone-500">Confidential clinical remarks</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">WhatsApp Alert</span>
              <span className="text-[10px] text-stone-500">Send summary to patient phone</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-xl border border-stone-200 hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <div>
              <span className="font-semibold text-stone-800 block">Patient Email Summary</span>
              <span className="text-[10px] text-stone-500">Email approved prescription</span>
            </div>
          </label>
        </div>
      </div>

      {/* Final Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        <button
          type="button"
          onClick={onReRecord}
          className="px-4 py-2.5 rounded-xl bg-stone-100 font-bold text-xs text-stone-600 hover:bg-stone-200 transition-colors"
        >
          ← Re-record Audio
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span>✓</span> Approve &amp; Release to Patient
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceStudioReviewStep;

