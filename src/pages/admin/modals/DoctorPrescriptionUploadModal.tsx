import React, { useState, useRef, useEffect } from "react";
import type { UserProfile, VisitSummaryRecord } from "../../../types";
import { CLINIC, DEFAULT_LIFESTYLE_ADVICE, DEFAULT_PRESCRIPTION_REMEDIES } from "../../../config";
import { formatDateShort } from "../../../utils/format";

interface DoctorPrescriptionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientList: UserProfile[];
  initialPatientId?: string;
  initialChiefDiagnosis?: string;
  onSavePrescription: (patientId: string, newVisit: VisitSummaryRecord, fileAttachment?: { name: string; url: string }) => void;
}

export const DoctorPrescriptionUploadModal: React.FC<DoctorPrescriptionUploadModalProps> = ({
  isOpen,
  onClose,
  patientList,
  initialPatientId = "usr-001",
  initialChiefDiagnosis = "",
  onSavePrescription,
}) => {
  const prescriptionFileInputRef = useRef<HTMLInputElement>(null);

  const [targetPatientId, setTargetPatientId] = useState<string>(initialPatientId);
  const [visitDate, setVisitDate] = useState<string>(() => formatDateShort(new Date()));
  const [chiefDiagnosis, setChiefDiagnosis] = useState<string>(initialChiefDiagnosis);
  const [observedSymptoms, setObservedSymptoms] = useState<string>("");
  const [lifestyleAdvice, setLifestyleAdvice] = useState<string>(DEFAULT_LIFESTYLE_ADVICE);
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("In 14 Days");

  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [remedies, setRemedies] = useState<Array<{ name: string; potency: string; dosage: string; duration: string }>>(
    () => [...DEFAULT_PRESCRIPTION_REMEDIES]
  );

  useEffect(() => {
    if (initialPatientId) setTargetPatientId(initialPatientId);
    if (initialChiefDiagnosis) setChiefDiagnosis(initialChiefDiagnosis);
  }, [initialPatientId, initialChiefDiagnosis]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPrescriptionFile(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddRemedyRow = () => {
    setRemedies((prev) => [
      ...prev,
      { name: "Arnica Montana", potency: "30C", dosage: "4 globules twice daily after food", duration: "10 days" },
    ]);
  };

  const handleUpdateRemedyRow = (idx: number, field: string, value: string) => {
    setRemedies((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveRemedyRow = (idx: number) => {
    setRemedies((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newVisit: VisitSummaryRecord = {
      id: `vis-${Date.now()}`,
      visitDate: visitDate || formatDateShort(new Date()),
      doctorName: CLINIC.DOCTOR_TITLE,
      clinicBranch: CLINIC.BRANCHES.OPD,
      chiefDiagnosis: chiefDiagnosis.trim() || "Clinical Consultation",
      symptomsObserved: observedSymptoms.trim()
        ? observedSymptoms.split("\n").map((s) => s.trim()).filter(Boolean)
        : ["Consultation with Dr. Gowri", "Symptomatic evaluation completed"],
      prescribedRemedies: remedies.map((r, i) => ({
        medicineId: `med-rx-${Date.now()}-${i}`,
        medicineName: r.name,
        potency: r.potency,
        dosage: r.dosage,
        duration: r.duration,
      })),
      clinicalNotes: clinicalNotes.trim() || "Prescription generated and verified by treating physician.",
      lifestyleAdvice: lifestyleAdvice.trim(),
      followUpDate: followUpDate.trim() || "In 14 Days",
    };

    const attachment = prescriptionFile
      ? { name: fileName || "Doctor_Prescription.png", url: prescriptionFile }
      : undefined;

    onSavePrescription(targetPatientId, newVisit, attachment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full card-shadow border border-stone-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <span>📄</span> Upload &amp; Issue Doctor Prescription
            </h3>
            <p className="text-emerald-200 text-xs mt-0.5">
              Attach official prescription file or photo, specify remedies, and update patient clinical record
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white text-lg font-mono cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Patient Selection Dropdown & Visit Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Target Patient Profile *
              </label>
              <select
                value={targetPatientId}
                onChange={(e) => setTargetPatientId(e.target.value)}
                required
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {patientList.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Consultation / Visit Date *
              </label>
              <input
                type="text"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Sep 30, 2026"
              />
            </div>
          </div>

          {/* Upload Prescription File / Document */}
          <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-4 bg-emerald-50/50 space-y-2 text-center">
            <input
              ref={prescriptionFileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {prescriptionFile ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full font-bold text-xs">
                  <span>✓</span> Attached: {fileName || "Doctor_Prescription_Scan.png"}
                </div>
                {prescriptionFile.startsWith("data:image") && (
                  <div className="max-h-36 overflow-hidden rounded-xl border border-emerald-200 flex justify-center bg-white p-1">
                    <img src={prescriptionFile} alt="Rx Preview" className="h-32 object-contain" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => prescriptionFileInputRef.current?.click()}
                  className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 block mx-auto cursor-pointer"
                >
                  Replace File / Choose Different Scan
                </button>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-1">📷</div>
                <p className="font-extrabold text-stone-800 text-xs">
                  Upload Signed Prescription (Photo / Scan / PDF)
                </p>
                <p className="text-stone-500 text-[11px] mt-0.5">
                  Drag and drop prescription document or browse local files
                </p>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => prescriptionFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                  >
                    📁 Choose File / Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrescriptionFile(
                        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80"
                      );
                      setFileName("Official_Agastya_Doctor_Prescription.png");
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
                  >
                    Use Sample Rx Scan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chief Diagnosis */}
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Chief Clinical Diagnosis *
            </label>
            <input
              type="text"
              required
              value={chiefDiagnosis}
              onChange={(e) => setChiefDiagnosis(e.target.value)}
              placeholder="e.g. Acute Cervical Spondylosis with Muscle Spasm & Sleep Disturbance"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Symptoms Observed */}
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Observed Symptoms &amp; Totality Modalities (One per line)
            </label>
            <textarea
              rows={2}
              value={observedSymptoms}
              onChange={(e) => setObservedSymptoms(e.target.value)}
              placeholder="Stiffness worse on cold draft and waking up&#10;Relief with warm compresses&#10;Throbbing occipital headache"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Prescribed Remedies Table */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Prescribed Classical Remedies ({remedies.length})
              </label>
              <button
                type="button"
                onClick={handleAddRemedyRow}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Add Another Remedy
              </button>
            </div>

            <div className="space-y-2">
              {remedies.map((remedy, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Medicine (e.g. Arnica Montana)"
                      value={remedy.name}
                      onChange={(e) => handleUpdateRemedyRow(idx, "name", e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Potency (30C)"
                      value={remedy.potency}
                      onChange={(e) => handleUpdateRemedyRow(idx, "potency", e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Dosage (4 globules BD)"
                      value={remedy.dosage}
                      onChange={(e) => handleUpdateRemedyRow(idx, "dosage", e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Duration (14d)"
                      value={remedy.duration}
                      onChange={(e) => handleUpdateRemedyRow(idx, "duration", e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs text-center"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {remedies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRemedyRow(idx)}
                        className="text-stone-400 hover:text-red-500 font-bold text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lifestyle Advice & Clinical Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Diet &amp; Lifestyle Advice
              </label>
              <textarea
                rows={2}
                value={lifestyleAdvice}
                onChange={(e) => setLifestyleAdvice(e.target.value)}
                className="w-full mt-1 p-2 rounded-xl border border-stone-300 bg-white text-xs"
              />
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Doctor's Assessment Notes
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="General constitutional response favorable. Prescribed acute support."
                className="w-full mt-1 p-2 rounded-xl border border-stone-300 bg-white text-xs"
              />
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Follow-up Timeline
            </label>
            <input
              type="text"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              placeholder="e.g. Oct 15, 2026 or In 14 Days"
              className="w-full mt-1 p-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-stone-500">
              🔒 Record will be permanently attached to patient file and visible in their read-only portal.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>✓</span> Save &amp; Issue Doctor Prescription
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorPrescriptionUploadModal;
