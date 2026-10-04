import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { BACKEND, USE_MOCK_DATA, CLINIC } from "../config";
import { formatDateISO } from "../utils/format";
import {
  processSecureImageUpload,
  getCooldownStatus,
  computeImageCryptoHash,
} from "../services/imageUploadPipeline";
import CaseRecordCard from "../components/common/CaseRecordCard";
import ProviderSelector from "../components/common/ProviderSelector";

export const MobileWorkerPage: React.FC = () => {
  const { navigateTo } = useApp();

  const [activeTab, setActiveTab] = useState<"camera" | "ai-scribe" | "records">("camera");

  // ─── Camera / Anti-Spam Upload State ──────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadToast, setUploadToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 30-Second Debounce Cooldown Timer
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const status = getCooldownStatus();
      setCooldownRemaining(status.remainingSeconds);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle Image Selection / Camera Snapshot
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadToast(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Compute rapid SHA-256 hash immediately for transparency
    setIsHashing(true);
    try {
      const hash = await computeImageCryptoHash(file);
      setComputedHash(hash);
    } catch {
      setComputedHash(null);
    } finally {
      setIsHashing(false);
    }
  };

  // Submit Upload through the Anti-Spam Pipeline
  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadToast(null);

    try {
      const result = await processSecureImageUpload(
        selectedFile,
        selectedFile.name,
        "android_mobile_worker"
      );
      setUploadToast({
        type: "success",
        msg: `Prescription verified & recorded! (Hash: ${result.fileHash.slice(0, 12)}...)`,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setComputedHash(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setUploadToast({
        type: "error",
        msg: err.message || "Upload rejected.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Multi-LLM Parsing State ──────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [symptomText, setSymptomText] = useState<string>(
    "Patient reports chronic gastric heaviness, sour acid reflux after eating. Thermal state is chilly (wants warm blankets). Thirstless. Craves spicy food. Prescribing Nux Vomica 30C, 4 globules twice daily."
  );
  const [patientNameInput, setPatientNameInput] = useState<string>("Sita Ramamurthy");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedAnalysis, setParsedAnalysis] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleParseWithLLM = async () => {
    if (!symptomText.trim()) return;
    setIsParsing(true);
    setAiError(null);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch(`${BACKEND.BASE_URL}/ai/parse-homeopathy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: symptomText,
          patient_name: patientNameInput,
          provider: selectedProvider,
          model: selectedModel,
          language: "en",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `AI parsing failed (${res.status})`);
      }

      const data = await res.json();
      setParsedAnalysis(data.homeopathic_analysis);
    } catch (err: any) {
      setAiError(err.message || `Failed to parse symptoms with ${selectedProvider}.`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToLocalEhr = async () => {
    if (!parsedAnalysis) return;
    setIsParsing(true);
    try {
      const res = await fetch(`${BACKEND.BASE_URL}/patient-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientNameInput,
          homeopathic_analysis: parsedAnalysis,
          visiting_date: formatDateISO(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save to local Supabase database.");
      const data = await res.json();
      setSaveSuccessMsg(`Encounter successfully persisted to local Supabase! (Record ID: ${data.record_id?.slice(0, 8)}...)`);
    } catch (err: any) {
      setAiError(err.message || "Failed to persist record.");
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Mobile Patient Records View (RLS Restricted) State ────────────────────
  const [mobileRecords, setMobileRecords] = useState<any[]>([]);
  const [isRefreshingRecords, setIsRefreshingRecords] = useState<boolean>(false);
  const [hasFetchedRecords, setHasFetchedRecords] = useState<boolean>(false);

  const fetchMobileRecords = async () => {
    setIsRefreshingRecords(true);
    try {
      const res = await fetch(`${BACKEND.BASE_URL}/patient-records?view=mobile`);
      if (res.ok) {
        const data = await res.json();
        setMobileRecords(data.records || []);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsRefreshingRecords(false);
      setHasFetchedRecords(true);
    }
  };

  useEffect(() => {
    if (activeTab === "records" && !hasFetchedRecords) {
      let active = true;
      fetch(`${BACKEND.BASE_URL}/patient-records?view=mobile`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (active) {
            setMobileRecords(data?.records || []);
            setHasFetchedRecords(true);
          }
        })
        .catch(() => {
          if (active) setHasFetchedRecords(true);
        });
      return () => {
        active = false;
      };
    }
  }, [activeTab, hasFetchedRecords]);

  const isLoadingRecords = (activeTab === "records" && !hasFetchedRecords) || isRefreshingRecords;

  return (
    <div className="max-w-md mx-auto min-h-[85vh] bg-stone-50 pb-16 font-sans">
      {/* ─── Android / Mobile App Top Bar ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-emerald-900 text-white px-4 py-3.5 shadow-md flex items-center justify-between rounded-b-2xl">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📱</span>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide uppercase">Agastya Mobile Clinic</h1>
            <p className="text-[11px] text-emerald-200 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Local Wi-Fi · {CLINIC.BRANCHES.TELE}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {USE_MOCK_DATA ? (
            <span className="bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🧪 MOCK
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              🟢 LIVE EHR
            </span>
          )}

          <button
            onClick={() => navigateTo("admin-dashboard")}
            className="text-[11px] bg-white/10 hover:bg-white/20 text-white font-semibold px-2.5 py-1 rounded-lg transition-all"
            title="Switch to Desktop Admin View"
          >
            🖥️ Desktop
          </button>
        </div>
      </div>

      {/* ─── Mobile View Tabs ──────────────────────────────────────────────── */}
      <div className="flex bg-white mx-3 mt-3 p-1 rounded-xl border border-stone-200 shadow-sm text-xs font-bold text-stone-600">
        <button
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "camera" ? "bg-emerald-800 text-white shadow-sm" : "hover:text-stone-900"
          }`}
        >
          <span>📸</span> Camera / Upload
        </button>
        <button
          onClick={() => setActiveTab("ai-scribe")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "ai-scribe" ? "bg-emerald-800 text-white shadow-sm" : "hover:text-stone-900"
          }`}
        >
          <span>✨</span> Gemini Scribe
        </button>
        <button
          onClick={() => setActiveTab("records")}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "records" ? "bg-emerald-800 text-white shadow-sm" : "hover:text-stone-900"
          }`}
        >
          <span>📋</span> Records
        </button>
      </div>

      {/* ─── TAB 1: Camera Snapshot & Anti-Spam Deduplication ──────────────── */}
      {activeTab === "camera" && (
        <div className="p-3 space-y-4">
          {/* Status / Cooldown Banner */}
          {cooldownRemaining > 0 ? (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-3 text-amber-900 text-xs font-semibold">
              <span className="text-xl animate-spin">⏳</span>
              <div>
                <p className="font-bold">Anti-Spam Cooldown Active</p>
                <p className="text-[11px] text-amber-700">
                  Please wait <strong>{cooldownRemaining}s</strong> before uploading another photo to protect Admin PC storage.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
              <span>🛡️</span>
              <span><strong>Anti-Spam Active:</strong> Deduplication prevents identical camera snapshots.</span>
            </div>
          )}

          {/* Toast Notification */}
          {uploadToast && (
            <div
              className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                uploadToast.type === "success"
                  ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                  : "bg-red-100 border-red-300 text-red-900"
              }`}
            >
              <span>{uploadToast.type === "success" ? "✓" : "⚠️"}</span>
              <span>{uploadToast.msg}</span>
            </div>
          )}

          {/* Camera Snapshot Area */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm text-center space-y-4">
            <h2 className="text-sm font-extrabold text-stone-800 flex items-center justify-center gap-1.5">
              <span>📷</span> Prescription Snapshot Capture
            </h2>
            <p className="text-xs text-stone-500">
              Snap photo or select prescription file. The system will cryptographically sign and verify it locally.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={cooldownRemaining > 0 || isUploading}
              className="hidden"
              id="mobile-camera-input"
            />

            {!previewUrl ? (
              <label
                htmlFor="mobile-camera-input"
                className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  cooldownRemaining > 0
                    ? "border-stone-200 bg-stone-100 cursor-not-allowed opacity-60"
                    : "border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 active:scale-98"
                }`}
              >
                <span className="text-4xl mb-2">📸</span>
                <span className="text-xs font-bold text-emerald-900">
                  {cooldownRemaining > 0 ? `Cooldown (${cooldownRemaining}s)` : "Tap to Snap Photo or Choose File"}
                </span>
                <span className="text-[10px] text-stone-400 mt-1">JPEG, PNG, WebP supported</span>
              </label>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-stone-200 max-h-64 flex items-center justify-center bg-black">
                  <img src={previewUrl} alt="Snapshot Preview" className="max-h-64 w-auto object-contain" />
                </div>

                {isHashing ? (
                  <p className="text-xs text-stone-500 font-semibold animate-pulse">
                    Computing SHA-256 cryptographic signature…
                  </p>
                ) : computedHash ? (
                  <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 text-left">
                    <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">SHA-256 Hash Signature</p>
                    <p className="text-xs text-stone-800 font-mono break-all">{computedHash}</p>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setComputedHash(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
                  >
                    Retake
                  </button>

                  <button
                    onClick={handleUploadSubmit}
                    disabled={isUploading || cooldownRemaining > 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isUploading ? "Verifying…" : "Verify & Upload"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: Free Gemini 2.5 Flash Parsing Loop ──────────────────────── */}
      {activeTab === "ai-scribe" && (
        <div className="p-3 space-y-4">
          <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <span>✨</span> Gemini 2.5 Flash AI Scribe
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                JSON Mode
              </span>
            </div>

            {/* Reusable Provider Selector */}
            <ProviderSelector
              selectedProvider={selectedProvider}
              onSelectProvider={setSelectedProvider}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">Patient Name</label>
              <input
                type="text"
                value={patientNameInput}
                onChange={(e) => setPatientNameInput(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">Clinical Dictation / Symptoms</label>
              <textarea
                rows={4}
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder="Dictate or type patient symptoms, modalities, cravings, thermal state..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                ⚠️ {aiError}
              </div>
            )}

            {saveSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                ✓ {saveSuccessMsg}
              </div>
            )}

            <button
              onClick={handleParseWithLLM}
              disabled={isParsing || !symptomText.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isParsing ? `Structuring with ${selectedProvider}…` : `✨ Parse into Homeopathic Case JSON (${selectedProvider})`}
            </button>
          </div>

          {/* Reusable Modular Case Record Card */}
          {parsedAnalysis && (
            <CaseRecordCard
              record={parsedAnalysis}
              showSaveButton={true}
              onSave={handleSaveToLocalEhr}
              isSaving={isParsing}
              title={`Parsed Case Record (${selectedProvider})`}
            />
          )}
        </div>
      )}

      {/* ─── TAB 3: Restricted Mobile Records (mobile_patient_view) ─────────── */}
      {activeTab === "records" && (
        <div className="p-3 space-y-3">
          <div className="bg-white p-3 rounded-2xl border border-stone-200 text-xs flex items-center justify-between">
            <div>
              <p className="font-extrabold text-stone-800">Mobile Encounters View</p>
              <p className="text-[11px] text-stone-400">
                🔒 RLS Active: Text-only view. Raw audio & image file paths are dropped.
              </p>
            </div>
            <button
              onClick={fetchMobileRecords}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs"
            >
              ↻ Refresh
            </button>
          </div>

          {isLoadingRecords ? (
            <div className="py-8 text-center text-xs text-stone-400 animate-pulse">
              Loading local patient records…
            </div>
          ) : mobileRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-xs text-stone-400 border border-stone-100">
              No consultation records found in local database.
            </div>
          ) : (
            mobileRecords.map((r, i) => (
              <div key={r.id || i} className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-sm">{r.patient_name}</h3>
                    <p className="text-[11px] text-stone-400">Date: {r.visiting_date || r.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>

                {r.clinical_summary && (
                  <p className="text-stone-600 bg-stone-50 p-2 rounded-xl text-[11px]">
                    {typeof r.clinical_summary === "string"
                      ? r.clinical_summary
                      : r.clinical_summary.conversation_summary || JSON.stringify(r.clinical_summary)}
                  </p>
                )}

                {r.medicines_suggested && Array.isArray(r.medicines_suggested) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.medicines_suggested.map((m: any, idx: number) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {m.remedy_name} {m.potency}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MobileWorkerPage;
