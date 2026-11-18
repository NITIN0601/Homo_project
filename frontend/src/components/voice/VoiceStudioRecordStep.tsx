import React from "react";
import { VOICE_STUDIO } from "../../config";
import { LANGUAGE_LABELS } from "../../services/voiceStudio";

interface VoiceStudioRecordStepProps {
  isExplicitMode: boolean;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  isRecording: boolean;
  recordingSeconds: number;
  audioBlob: Blob | null;
  formatTimer: (seconds: number) => string;
  startRecording: () => void;
  stopRecording: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFileName: string | null;
  processWithVoiceStudio: () => void;
}

export const VoiceStudioRecordStep: React.FC<VoiceStudioRecordStepProps> = ({
  isExplicitMode,
  selectedLanguage,
  setSelectedLanguage,
  isRecording,
  recordingSeconds,
  audioBlob,
  formatTimer,
  startRecording,
  stopRecording,
  fileInputRef,
  handleFileUpload,
  uploadedFileName,
  processWithVoiceStudio,
}) => {
  return (
    <div className="space-y-6">
      {/* Doctor Language Choice Selector (Auto vs Explicit) */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
              <span>🌐</span> Target Consultation Language:
            </label>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Doctor can explicitly pick language for <strong>highest acoustic precision</strong>, or allow Auto-Detect.
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            isExplicitMode
              ? "text-emerald-800 bg-emerald-100 border border-emerald-300"
              : "text-amber-800 bg-amber-100 border border-amber-300"
          }`}>
            {isExplicitMode ? "⚡ Precision Mode: Explicit Conditioning" : "🔍 Scanning Mode: Auto-Detect Head"}
          </span>
        </div>

        {/* Quick Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {VOICE_STUDIO.SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLanguage(lang.code)}
                className={`p-2 rounded-xl text-center font-bold text-xs transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-purple-900 text-white border-purple-700 shadow-md ring-2 ring-purple-500/30 scale-102"
                    : "bg-white text-stone-700 border-stone-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
              >
                <p className="truncate text-[11px]">{lang.label.split(" ")[1] || lang.label}</p>
                <span className="text-[9px] font-mono opacity-80 uppercase block mt-0.5">
                  {lang.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Precision & Eval explanation banner */}
        <div className="bg-white border border-stone-200 rounded-xl p-3 text-[11px] text-stone-600 flex items-start gap-2">
          <span className="text-base flex-shrink-0">
            {isExplicitMode ? "🎯" : "ℹ️"}
          </span>
          <div>
            {isExplicitMode ? (
              <p>
                <strong className="text-purple-900 font-bold">Optimal Result Guaranteed:</strong> By explicitly selecting{" "}
                <strong className="text-stone-900 underline">{LANGUAGE_LABELS[selectedLanguage]}</strong>, VoiceStudio bypasses the 30-second language identification head and conditions its acoustic beam search directly on {LANGUAGE_LABELS[selectedLanguage]} phonetics. This lowers Word Error Rate (WER) by ~40% and reduces latency (RTF &lt; 0.22).
              </p>
            ) : (
              <p>
                <strong className="text-stone-800 font-bold">Auto-Detect Active:</strong> VoiceStudio will scan the initial 30 seconds of conversation audio to classify the dialect before transcribing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-3xl p-8 text-center space-y-5 shadow-inner">
        <div className="flex justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all shadow-xl ${
              isRecording
                ? "bg-red-500 text-white animate-pulse ring-8 ring-red-500/30"
                : "bg-purple-600 text-white hover:bg-purple-500"
            }`}
          >
            {isRecording ? "🔴" : "🎙️"}
          </div>
        </div>

        <div>
          <p className="text-3xl font-mono font-black tracking-wider text-purple-400">
            {formatTimer(recordingSeconds)}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            {isRecording
              ? `Recording doctor-patient consultation in [${LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}]…`
              : audioBlob
              ? "Audio conversation captured & ready for VoiceStudio"
              : `Click below to begin dictating consultation in ${LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>▶</span> Start Consultation Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 animate-bounce"
            >
              <span>⏹</span> End Recording
            </button>
          )}

          {/* Upload Audio File Alternative */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 font-bold text-xs transition-all cursor-pointer border border-white/10 flex items-center gap-1.5"
          >
            <span>📁</span> Upload Audio File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {uploadedFileName && (
          <p className="text-xs text-purple-300 font-mono">
            ✓ File Loaded: {uploadedFileName}
          </p>
        )}
      </div>

      {/* Action Button to Transcribe */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>Engine:</span>
          <code className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-600 font-mono">localhost:3900</code>
        </div>
        <button
          onClick={processWithVoiceStudio}
          disabled={isRecording}
          className={`px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-md flex items-center gap-2 ${
            isRecording
              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-purple-900 hover:bg-purple-950 text-white active:scale-95 cursor-pointer"
          }`}
        >
          <span>⚡</span> Process Audio via VoiceStudio ({LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}) →
        </button>
      </div>
    </div>
  );
};

export default VoiceStudioRecordStep;

