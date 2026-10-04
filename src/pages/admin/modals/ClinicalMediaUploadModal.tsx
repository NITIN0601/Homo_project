import React, { useState } from "react";
import type { UserProfile, PatientClinicalMedia } from "../../../types";
import { formatDateISO } from "../../../utils/format";

interface ClinicalMediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientList: UserProfile[];
  initialPatientId?: string;
  onUploadMedia: (media: PatientClinicalMedia) => void;
}

export const ClinicalMediaUploadModal: React.FC<ClinicalMediaUploadModalProps> = ({
  isOpen,
  onClose,
  patientList,
  initialPatientId = "usr-001",
  onUploadMedia,
}) => {
  const [targetPatientId, setTargetPatientId] = useState(initialPatientId);
  const [category, setCategory] = useState<"voice" | "image" | "prescription" | "lab_report">("image");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const sampleUrl =
      category === "voice"
        ? "#"
        : category === "lab_report"
        ? "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80";

    const newMedia: PatientClinicalMedia = {
      id: `med-${Date.now().toString(36)}`,
      patientId: targetPatientId,
      title: title.trim(),
      category,
      fileUrl: sampleUrl,
      uploadDate: formatDateISO(),
      notes: notes.trim() || undefined,
      fileSize: category === "voice" ? "2.8 MB (02:15)" : "1.8 MB",
    };

    onUploadMedia(newMedia);
    onClose();
    setTitle("");
    setNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-teal-950 to-stone-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <span>📸</span> Attach Clinical Media to Patient File
            </h3>
            <p className="text-teal-200 text-xs mt-0.5">
              Upload tongue observations, skin rash images, audio dictations, or pathology reports
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg font-mono cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Target Patient Profile *
            </label>
            <select
              value={targetPatientId}
              onChange={(e) => setTargetPatientId(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
            >
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Media Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              >
                <option value="image">📷 Clinical Photo (Tongue / Skin / Joints)</option>
                <option value="voice">🎙️ Consultation Voice Recording / Audio</option>
                <option value="lab_report">🔬 Pathology / Lab Investigation Report</option>
                <option value="prescription">📄 Previous Rx Slip</option>
              </select>
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Attachment Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tongue Coating Observation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Simulate File Upload (or drop photo/audio file)
            </label>
            <div className="mt-1 p-4 rounded-2xl border-2 border-dashed border-stone-300 text-center hover:bg-stone-50 cursor-pointer space-y-1">
              <span className="text-2xl">{category === "voice" ? "🎙️" : "📷"}</span>
              <p className="font-bold text-stone-700 text-xs">
                {category === "voice" ? "Click to record / attach voice audio note (.mp3, .wav)" : "Click to select or drop clinical photo (.jpg, .png)"}
              </p>
              <span className="text-[10px] text-stone-400">Up to 25MB clinical high-resolution file</span>
            </div>
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Clinical Observation &amp; Modality Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Red edges on tongue, dry mouth with thirst for small quantities of water…"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>✓</span> Attach to Patient File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClinicalMediaUploadModal;
