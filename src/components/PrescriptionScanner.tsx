import React, { useState, useCallback, useRef } from "react";
import { UploadIcon, SpinnerIcon, CheckCircleIcon } from "./Icons";
import PrescriptionCaptureModal from "./PrescriptionCaptureModal";

// ─── Types ────────────────────────────────────────────────────
type ScanState = "idle" | "dragging" | "analyzing" | "done";

// ─── Mock OCR result ──────────────────────────────────────────
const MOCK_RESULT = {
  patient: "John Doe, 38M",
  chiefComplaint: "Chronic digestive disturbances, flatulence, bloating, and right-sided hepatic pain aggravated 4–8 PM.",
  symptoms: [
    "Craving sweets, warm food",
    "Worse from cold, better warm drinks",
    "Anxiety about health, cowardly appearance but irritable at home",
    "Right-sided complaints",
  ],
  suggestedRemedy: "Lycopodium Clavatum",
  potency: "200C",
  dosage: "4 pills, once daily on empty stomach",
  followUp: "Reassess in 4 weeks",
  confidence: 94,
};

// ─── Component ────────────────────────────────────────────────
const PrescriptionScanner: React.FC = () => {
  const [state, setState] = useState<ScanState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startAnalysis = useCallback((name: string) => {
    setFileName(name);
    setState("analyzing");
    setTimeout(() => setState("done"), 3200);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) startAnalysis(file.name);
    },
    [startAnalysis]
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) startAnalysis(file.name);
    },
    [startAnalysis]
  );

  const reset = () => {
    setState("idle");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <article
      className="bg-white rounded-2xl card-shadow overflow-hidden"
      aria-label="AI Prescription Scanner"
    >
      <PrescriptionCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCaptureSuccess={(_uri, name) => startAnalysis(name)}
      />

      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="Microscope">🔬</span>
          <div>
            <h2 className="text-stone-800 font-bold text-base leading-tight">
              AI Prescription Scanner
            </h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Upload prescription screenshot or take photo for instant AI analysis
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>📷</span> Camera / Folder Access
        </button>
      </div>

      <div className="p-5">
        {/* ── Drop Zone ── */}
        {state === "idle" && (
          <div className="space-y-3">
            <label
              htmlFor="prescription-upload"
              id="drop-zone"
              className={`flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed
                cursor-pointer transition-all duration-200 select-none
                border-sage-200 hover:border-sage-500 hover:bg-sage-50
                active:scale-[0.98]`}
              style={{ minHeight: "140px", padding: "1.5rem 1rem" }}
              onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
              onDragLeave={() => setState("idle")}
              onDrop={handleDrop}
              aria-label="Drag and drop or click to upload prescription image"
            >
              <span className="text-sage-500">
                <UploadIcon />
              </span>
              <div className="text-center">
                <p className="text-stone-600 font-semibold text-sm">
                  Drag &amp; drop case sheet here
                </p>
                <p className="text-stone-500 text-xs mt-0.5">or click to browse — JPG, PNG, PDF</p>
              </div>
              <input
                ref={fileInputRef}
                id="prescription-upload"
                type="file"
                accept="image/*,.pdf"
                className="sr-only"
                onChange={handleFile}
                aria-describedby="drop-zone"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>📷</span> Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>📁</span> Browse Folder
              </button>
            </div>
          </div>
        )}

        {/* ── Dragging overlay ── */}
        {state === "dragging" && (
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-sage-500 bg-sage-50"
            style={{ minHeight: "164px" }}
          >
            <span className="text-4xl mb-2" role="img" aria-label="File">📄</span>
            <p className="text-sage-700 font-semibold text-sm">Release to upload</p>
          </div>
        )}

        {/* ── Analyzing skeleton ── */}
        {state === "analyzing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-sage-50 rounded-xl px-4 py-3">
              <span className="text-sage-600">
                <SpinnerIcon />
              </span>
              <div>
                <p className="text-sage-800 font-semibold text-sm">Analyzing symptoms with AI…</p>
                <p className="text-stone-500 text-xs mt-0.5 truncate max-w-[220px]">
                  {fileName}
                </p>
              </div>
            </div>
            {/* Skeletons */}
            {[80, 60, 90, 50].map((w, i) => (
              <div
                key={i}
                className="skeleton rounded-lg"
                style={{ height: "14px", width: `${w}%`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
            <div className="skeleton rounded-lg" style={{ height: "42px", width: "100%" }} />
          </div>
        )}

        {/* ── Done / Result ── */}
        {state === "done" && (
          <div
            className="space-y-4"
            style={{ animation: "fadeInUp 0.4s ease both" }}
          >
            {/* Success banner */}
            <div className="flex items-center gap-3 bg-sage-50 rounded-xl px-4 py-3 border border-sage-200">
              <span className="text-sage-600">
                <CheckCircleIcon />
              </span>
              <div className="flex-1">
                <p className="text-sage-800 font-semibold text-sm">Analysis Complete</p>
                <p className="text-stone-500 text-xs mt-0.5">
                  AI Confidence:{" "}
                  <span className="text-sage-600 font-bold">{MOCK_RESULT.confidence}%</span>
                </p>
              </div>
              <button
                onClick={reset}
                id="scanner-reset-btn"
                className="text-stone-500 text-xs font-medium hover:text-stone-600 transition-colors touch-target"
                aria-label="Reset scanner"
              >
                Reset
              </button>
            </div>

            {/* Chief complaint */}
            <div className="bg-stone-50 rounded-xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold mb-1">
                Chief Complaint
              </p>
              <p className="text-stone-700 text-sm leading-relaxed">
                {MOCK_RESULT.chiefComplaint}
              </p>
            </div>

            {/* Symptoms */}
            <div>
              <p className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold mb-2">
                Extracted Symptoms
              </p>
              <ul className="space-y-1.5">
                {MOCK_RESULT.symptoms.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-2 text-stone-600 text-sm"
                  >
                    <span className="mt-0.5 text-sage-500 flex-shrink-0">✦</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Remedy box */}
            <div className="bg-gradient-to-br from-sage-900 to-sage-700 rounded-xl px-4 py-4">
              <p className="text-sage-300 text-[11px] uppercase tracking-widest font-semibold mb-2">
                Suggested Remedy
              </p>
              <p className="text-white font-bold text-lg leading-tight">
                {MOCK_RESULT.suggestedRemedy}{" "}
                <span className="text-sage-300 font-semibold text-base">
                  {MOCK_RESULT.potency}
                </span>
              </p>
              <p className="text-sage-200 text-xs mt-1">{MOCK_RESULT.dosage}</p>
              <div className="mt-3 pt-3 border-t border-white/15">
                <p className="text-sage-300 text-xs">
                  Follow-up: <span className="text-white font-medium">{MOCK_RESULT.followUp}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default PrescriptionScanner;
