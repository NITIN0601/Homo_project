import React, { useState, useEffect } from "react";
import type { PatientClinicalMedia } from "../../../types";
import { Modal, Button, Badge } from "../../../components/ui";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.25 | 1.5>(1);
  const [imgError, setImgError] = useState(false);

  // Audio timer simulation
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isPlaying) {
      timer = setInterval(() => {
        setPlaybackSeconds((prev) => {
          if (prev >= 165) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setPlaybackSeconds(0);
      setImgError(false);
    }
  }, [isOpen, media]);

  if (!media) return null;

  const formatSec = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isVoice = media.category === "voice";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isVoice ? "🎙️" : media.category === "lab_report" ? "🔬" : "📷"} ${media.title}`}
      subtitle={`Uploaded on ${media.uploadDate} · File size: ${media.fileSize}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <span className="text-stone-400 font-mono text-[11px]">
            Artifact ID: {media.id} · Encrypted &amp; HIPAA Scoped
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert(`Downloaded clinical artifact #${media.id} (${media.title})`)}
            >
              <span>📥</span> Download Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4 text-xs">
        {/* Media Preview Card */}
        {isVoice ? (
          <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-purple-950 text-white p-6 rounded-3xl space-y-4 border border-stone-800 shadow-xl">
            <div className="flex items-center justify-between">
              <Badge variant="purple" size="sm">
                Clinical Voice Audio Recording
              </Badge>
              <button
                type="button"
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : 1))}
                className="text-[10px] font-mono bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded-lg border border-stone-700 text-purple-300 cursor-pointer font-bold"
              >
                {playbackSpeed}x Speed
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <div className="relative">
                <span
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg transition-transform ${
                    isPlaying ? "bg-purple-600 text-white scale-105 animate-pulse" : "bg-purple-950/60 text-purple-300 border border-purple-800"
                  }`}
                >
                  🎙️
                </span>
              </div>
              <div className="text-center pt-2">
                <p className="font-bold text-sm text-white">{media.title}</p>
                <span className="text-[11px] text-stone-400 font-mono">
                  Physician Case Dictation · Encrypted Clinical Audio
                </span>
              </div>
            </div>

            {/* Interactive Audio Player Bar */}
            <div className="bg-stone-800/80 p-3 rounded-2xl space-y-2 border border-stone-700/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-md ${
                    isPlaying ? "bg-amber-500 text-stone-950 hover:bg-amber-400" : "bg-emerald-500 text-stone-950 hover:bg-emerald-400"
                  }`}
                  title={isPlaying ? "Pause Dictation" : "Play Dictation"}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>

                <div className="flex-1 space-y-1">
                  <div
                    className="w-full bg-stone-700 h-2.5 rounded-full overflow-hidden cursor-pointer relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      setPlaybackSeconds(Math.round(ratio * 165));
                    }}
                  >
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (playbackSeconds / 165) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>{formatSec(playbackSeconds)}</span>
                    <span>02:45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden bg-stone-100 border border-stone-200 max-h-96 flex flex-col items-center justify-center relative p-2">
            {!imgError ? (
              <img
                src={media.fileUrl}
                alt={media.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain max-h-96 rounded-2xl"
              />
            ) : (
              <div className="p-12 text-center space-y-2 text-stone-500">
                <span className="text-4xl block">🔬</span>
                <p className="font-bold text-stone-700 text-sm">{media.title}</p>
                <p className="text-[11px] text-stone-400">
                  Clinical Attachment #{media.id} ({media.category.toUpperCase()})
                </p>
                <span className="inline-block bg-teal-100 text-teal-900 px-3 py-1 rounded-full text-[10px] font-bold">
                  Verified In-Clinic Diagnostic Artifact
                </span>
              </div>
            )}
          </div>
        )}

        {/* Observation Notes Card */}
        {media.notes && (
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs space-y-1.5">
            <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wide block">
              Clinician Modality &amp; Diagnostic Observation:
            </span>
            <p className="text-stone-800 font-medium leading-relaxed">{media.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ClinicalMediaLightboxModal;
