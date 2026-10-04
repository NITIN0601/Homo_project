import React from "react";
import type { PatientClinicalMedia } from "../../../types";

interface ClinicalMediaLightboxModalProps {
  isOpen: boolean;
  media: PatientClinicalMedia | null;
  onClose: () => void;
}

export const ClinicalMediaLightboxModal: React.FC<ClinicalMediaLightboxModalProps> = ({
  isOpen,
  media,
  onClose,
}) => {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full card-shadow border border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-base flex items-center gap-2">
              <span>{media.category === "voice" ? "🎙️" : "📷"}</span> {media.title}
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Uploaded on {media.uploadDate} · {media.fileSize}
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

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {media.category === "voice" ? (
            <div className="bg-stone-900 text-white p-6 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <span className="w-16 h-16 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-3xl animate-pulse">
                🎙️
              </span>
              <div className="text-center">
                <p className="font-bold text-sm">Consultation Voice Audio Recording</p>
                <span className="text-xs text-stone-400 font-mono">{media.fileSize} · High-Fidelity Audio</span>
              </div>
              <div className="w-full flex items-center gap-2 bg-stone-800 p-2.5 rounded-xl">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center font-bold cursor-pointer hover:bg-emerald-400"
                >
                  ▶
                </button>
                <div className="flex-1 bg-stone-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 w-1/3 h-full" />
                </div>
                <span className="text-[10px] text-stone-400 font-mono">00:45 / 02:45</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 max-h-80 flex items-center justify-center">
              <img
                src={media.fileUrl}
                alt={media.title}
                className="w-full h-full object-contain max-h-80"
              />
            </div>
          )}

          {media.notes && (
            <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs space-y-1">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wide">
                Clinician Modality &amp; Diagnostic Observation:
              </span>
              <p className="text-stone-800 font-medium">{media.notes}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs cursor-pointer hover:bg-stone-900"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicalMediaLightboxModal;
