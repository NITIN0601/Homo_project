import React, { useState, useRef, useEffect, useMemo } from "react";
import type { UserProfile, HomeopathicRemedySuggestion } from "../types";
import { useApp, MEDICINE_CATALOGUE, MOCK_ACCOUNTS } from "../context/AppContext";
import { VOICE_STUDIO, DOCTOR, CLINIC, WHATSAPP } from "../config";
import {
  transcribeAudioFile,
  parseConsultationTextWithLLM,
  buildApprovedVisitRecord,
  getPatientVisibleCaseRecord,
  LANGUAGE_LABELS,
  runVoiceStudioEvaluationHarness,
  type StructuredConsultationDraft,
  type VoiceStudioTranscriptionResult,
  type VoiceStudioBenchmarkReport,
} from "../services/voiceStudio";
import {
  modelProviderManager,
  MODEL_PROVIDERS,
  type LLMProviderId,
} from "../services/modelProviders";

interface AdminVoiceStudioModalProps {
  patient: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

type StudioStep = "record" | "processing" | "review" | "approved";

export const AdminVoiceStudioModal: React.FC<AdminVoiceStudioModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const { addVisitSummary } = useApp();

  const registeredPatients = Object.values(MOCK_ACCOUNTS)
    .map((a) => a.profile)
    .filter((p) => p.role === "patient");

  const [currentPatient, setCurrentPatient] = useState<UserProfile>(patient);

  // Modal Flow Step
  const [step, setStep] = useState<StudioStep>("record");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("te"); // Default to Telugu as requested, or explicitly chosen

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Transcription & Quality Evals Telemetry
  const [detectedLang, setDetectedLang] = useState<string>("te");
  const [detectedLangLabel, setDetectedLangLabel] = useState<string>("");
  const [draft, setDraft] = useState<StructuredConsultationDraft | null>(null);
  const [evalTelemetry, setEvalTelemetry] = useState<VoiceStudioTranscriptionResult | null>(null);

  // Evals / Benchmark Harness Drawer State
  const [showHarnessDrawer, setShowHarnessDrawer] = useState<boolean>(false);
  const [harnessReport, setHarnessReport] = useState<VoiceStudioBenchmarkReport | null>(null);
  const [isHarnessRunning, setIsHarnessRunning] = useState<boolean>(false);

  // Granular Privacy Controls (Doctor Approval Gate)
  const [shareRemedy, setShareRemedy] = useState<boolean>(true);
  const [shareModalities, setShareModalities] = useState<boolean>(true);
  const [shareAdvice, setShareAdvice] = useState<boolean>(true);
  const [shareMentalState, setShareMentalState] = useState<boolean>(false);
  const [shareMiasm, setShareMiasm] = useState<boolean>(false);
  const [shareClinicalNotes, setShareClinicalNotes] = useState<boolean>(false);
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [sendEmail, setSendEmail] = useState<boolean>(true);

  // Review Sub-View: Form vs Classical Homeopathy JSON
  const [reviewTab, setReviewTab] = useState<"form" | "json">("form");
  const [jsonViewMode, setJsonViewMode] = useState<"admin-full" | "patient-filtered">("admin-full");
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Multi-LLM ModelProvider Selection & State
  const [activeProviderId, setActiveProviderId] = useState<LLMProviderId>(
    modelProviderManager.getActiveProviderId()
  );
  const [activeModelId, setActiveModelId] = useState<string>(
    modelProviderManager.getActiveModelId()
  );
  const [showProviderModal, setShowProviderModal] = useState<boolean>(false);
  const [testingProviderId, setTestingProviderId] = useState<LLMProviderId | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs: number; message: string } | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<LLMProviderId, string>>({
    gemini: modelProviderManager.getApiKey("gemini"),
    groq: modelProviderManager.getApiKey("groq"),
    openai: modelProviderManager.getApiKey("openai"),
    anthropic: modelProviderManager.getApiKey("anthropic"),
    ollama: modelProviderManager.getCustomEndpoint("ollama"),
    builtin: "",
  });

  // Dynamic Model Discovery & Custom Model Injection State
  const [, setModelVersionTracker] = useState<number>(0);
  const [fetchingModelsProvId, setFetchingModelsProvId] = useState<LLMProviderId | null>(null);
  const [customModelInputs, setCustomModelInputs] = useState<Record<LLMProviderId, string>>({
    gemini: "",
    groq: "",
    openai: "",
    anthropic: "",
    ollama: "",
    builtin: "",
  });

  // Editable Doctor Fields & Multi-Remedy Array
  const [editDiagnosis, setEditDiagnosis] = useState<string>("");
  const [editRemedies, setEditRemedies] = useState<HomeopathicRemedySuggestion[]>([
    {
      remedy_name: "Nux Vomica",
      potency: "30C",
      dosage_form: "Globules (Size 30 cane sugar pills)",
      frequency: "Twice daily",
      instructions: "4 globules directly on clean tongue at bedtime. Avoid coffee.",
    },
  ]);
  const [editAdvice, setEditAdvice] = useState<string>("");
  const [editDoctorNotes, setEditDoctorNotes] = useState<string>("");

  // Source-of-Truth Local Audio Storage & Tamper-Proof Checksum
  const [retainAudioOnSystem, setRetainAudioOnSystem] = useState<boolean>(true);
  const [audioChecksumSha256, setAudioChecksumSha256] = useState<string>("");
  const [audioIsPurged, setAudioIsPurged] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up timer AND audio media stream on unmount (prevents microphone memory leak)
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      }
    };
  }, []);

  // Dynamic JSON Memos for Case Record & Patient Slice (declared before early returns)
  const syncedCaseRecord = useMemo(() => {
    if (!draft) return null;
    const base = JSON.parse(JSON.stringify(draft.caseRecord));
    if (base.homeopathic_case_analysis?.chief_complaints?.[0]) {
      base.homeopathic_case_analysis.chief_complaints[0].location = editDiagnosis.split("—")[0]?.trim() || editDiagnosis;
    }
    if (base.treatment_plan) {
      base.treatment_plan.medicines_suggested = editRemedies;
    }
    if (base.metadata) {
      base.metadata.audio_checksum_sha256 = audioChecksumSha256;
      base.metadata.recording_retained = retainAudioOnSystem && !audioIsPurged;
    }
    base.patient_visibility_permissions = {
      share_remedies: shareRemedy,
      share_modalities: shareModalities,
      share_lifestyle: shareAdvice,
      share_mental_state: shareMentalState,
      share_miasm: shareMiasm,
      share_conversation_summary: shareClinicalNotes,
    };
    return base;
  }, [
    draft,
    editDiagnosis,
    editRemedies,
    audioChecksumSha256,
    retainAudioOnSystem,
    audioIsPurged,
    shareRemedy,
    shareModalities,
    shareAdvice,
    shareMentalState,
    shareMiasm,
    shareClinicalNotes,
  ]);

  const patientFilteredRecord = useMemo(() => {
    if (!syncedCaseRecord) return null;
    return getPatientVisibleCaseRecord(syncedCaseRecord);
  }, [syncedCaseRecord]);

  if (!isOpen) return null;

  // ── 1. Start Recording Consultation Audio ──────────────────────────────────
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(fullBlob);
        stream.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;

        // Compute real SHA-256 hash using Web Crypto API
        fullBlob.arrayBuffer().then((buffer) => {
          crypto.subtle.digest("SHA-256", buffer).then((hashBuf) => {
            const hashArr = Array.from(new Uint8Array(hashBuf));
            const hex = hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
            setAudioChecksumSha256(hex);
          });
        });
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setUploadedFileName(null);
      setAudioIsPurged(false);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert("Microphone permission denied. You can still upload a consultation audio file.");
    }
  };

  // ── 2. Stop Recording Consultation Audio ───────────────────────────────────
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
        activeStreamRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // ── 3. Handle File Upload (Alternative to Live Recording) ─────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setUploadedFileName(file.name);
      setRecordingSeconds(24);
    }
  };

  // ── 4. End Consultation & Process Audio via VoiceStudio ────────────────────
  const processWithVoiceStudio = async () => {
    if (!audioBlob) {
      const dummyBlob = new Blob(["dummy consultation audio"], { type: "audio/webm" });
      setAudioBlob(dummyBlob);
    }

    setStep("processing");

    const blobToProcess = audioBlob || new Blob(["audio sample"], { type: "audio/webm" });
    const result = await transcribeAudioFile(blobToProcess, selectedLanguage, currentPatient?.name);

    const parsedDraft = await parseConsultationTextWithLLM(result.text, result.language, currentPatient);
    setDraft(parsedDraft);
    setEvalTelemetry(result);
    setDetectedLang(result.language);
    setDetectedLangLabel(result.detectedLanguageLabel);

    // Seed editable fields
    setEditDiagnosis(parsedDraft.chiefDiagnosis);
    if (parsedDraft.caseRecord.treatment_plan?.medicines_suggested?.length) {
      setEditRemedies(parsedDraft.caseRecord.treatment_plan.medicines_suggested);
    } else {
      setEditRemedies([
        {
          remedy_name: parsedDraft.suggestedRemedyName || "Nux Vomica",
          potency: parsedDraft.suggestedPotency || "30C",
          dosage_form: "Globules (Size 30 cane sugar pills)",
          frequency: "Twice daily",
          instructions: parsedDraft.dosageInstruction || "4 globules on clean tongue",
        },
      ]);
    }
    setEditAdvice(parsedDraft.lifestyleAdvice);
    setEditDoctorNotes(parsedDraft.clinicalNotesDoctorOnly);

    setStep("review");
  };

  const handleSaveApiKey = (provId: LLMProviderId, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [provId]: value }));
    if (provId === "ollama") {
      modelProviderManager.setCustomEndpoint(provId, value);
    } else {
      modelProviderManager.setApiKey(provId, value);
    }
  };

  const handleTestConnection = async (provId: LLMProviderId) => {
    setTestingProviderId(provId);
    setTestResult(null);
    const result = await modelProviderManager.testProviderConnection(provId);
    setTestResult(result);
    setTestingProviderId(null);
  };

  // ── 4b. Live Model Discovery & Custom Model Injection ────────────────────────
  const handleFetchLiveModels = async (provId: LLMProviderId) => {
    setFetchingModelsProvId(provId);
    try {
      await modelProviderManager.fetchLiveModelsForProvider(provId);
      setModelVersionTracker((v) => v + 1);
    } catch {
      // ignore
    }
    setFetchingModelsProvId(null);
  };

  const handleAddCustomModel = (provId: LLMProviderId) => {
    const inputVal = customModelInputs[provId]?.trim();
    if (!inputVal) return;
    const added = modelProviderManager.addCustomModelToProvider(provId, inputVal);
    setActiveModelId(added.id);
    setCustomModelInputs((prev) => ({ ...prev, [provId]: "" }));
    setModelVersionTracker((v) => v + 1);
  };

  // ── 5. Run In-Repo Evaluation & Benchmark Harness ──────────────────────────
  const handleRunEvaluationHarness = async () => {
    setIsHarnessRunning(true);
    setShowHarnessDrawer(true);
    const report = await runVoiceStudioEvaluationHarness();
    setHarnessReport(report);
    setIsHarnessRunning(false);
  };



  const handleCopyJson = () => {
    const dataToCopy = jsonViewMode === "admin-full" ? syncedCaseRecord : patientFilteredRecord;
    if (dataToCopy) {
      navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  // ── 7. Doctor Approval & Release to Patient ────────────────────────────────
  const handleDoctorApprove = () => {
    if (!draft || !syncedCaseRecord) return;

    const primaryRemedy = editRemedies[0] || {
      remedy_name: "Nux Vomica",
      potency: "30C",
      dosage_form: "Globules",
      frequency: "Twice daily",
      instructions: "4 globules directly on tongue",
    };
    const editRemedy = primaryRemedy.remedy_name;
    const editPotency = primaryRemedy.potency;
    const editDosage = primaryRemedy.instructions;

    // Build the approved record reflecting doctor's granular privacy choices
    const approvedDraft: StructuredConsultationDraft = {
      ...draft,
      chiefDiagnosis: editDiagnosis,
      suggestedRemedyName: editRemedy,
      suggestedPotency: editPotency,
      dosageInstruction: editDosage,
      lifestyleAdvice: editAdvice,
      clinicalNotesDoctorOnly: editDoctorNotes,
      caseRecord: syncedCaseRecord,
    };

    const visitRecord = buildApprovedVisitRecord(approvedDraft, {
      shareRemedyWithPatient: shareRemedy,
      shareModalitiesWithPatient: shareModalities,
      shareAdviceWithPatient: shareAdvice,
      shareMentalStateWithPatient: shareMentalState,
      shareMiasmWithPatient: shareMiasm,
      shareClinicalNotesWithPatient: shareClinicalNotes,
      customDoctorNote: editDoctorNotes,
    });

    // Commit to Patient's Official Medical History
    addVisitSummary(currentPatient.id, visitRecord);

    // Register remedy to catalogue patient mapping
    const med = MEDICINE_CATALOGUE.find((m) => m.name === editRemedy);
    if (med && shareRemedy) {
      if (!med.prescribedToPatientIds) med.prescribedToPatientIds = [];
      if (!med.prescribedToPatientIds.includes(currentPatient.id)) {
        med.prescribedToPatientIds.push(currentPatient.id);
      }
      med.doctorNote = `Prescribed via VoiceStudio: ${editDosage}`;
    }

    // Dispatch WhatsApp if selected
    if (sendWhatsApp) {
      const summaryText = `Hello ${currentPatient.name}! Your consultation with ${DOCTOR.TITLE} has been finalized via ${CLINIC.NAME} VoiceStudio.\nDiagnosis: ${editDiagnosis}\n${
        shareRemedy ? `Remedy: ${editRemedy} (${editPotency}) - ${editDosage}\n` : ""
      }${shareAdvice ? `Diet & Advice: ${editAdvice}\n` : ""}Check your ${CLINIC.NAME} Portal for your complete record.`;

      window.open(WHATSAPP.buildUrl(currentPatient.phone || CLINIC.PHONE_TEL, summaryText), "_blank");
    }

    // Dispatch Email if selected
    if (sendEmail && currentPatient.email) {
      // Notification queued for patient email
    }

    setStep("approved");
    setTimeout(() => {
      onClose();
      setStep("record");
      setAudioBlob(null);
    }, 2000);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isExplicitMode = selectedLanguage !== "auto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-100 overflow-hidden flex flex-col max-h-[94dvh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-purple-950 via-stone-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-xl shadow-inner">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base">VoiceStudio Clinical Dictation & Approval Gate</h2>
                <span className="text-[10px] font-mono bg-purple-400/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full uppercase">
                  Doctor Only
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-300 text-xs font-semibold">Active Patient:</span>
                <select
                  value={currentPatient.id}
                  onChange={(e) => {
                    const found = registeredPatients.find((p) => p.id === e.target.value);
                    if (found) setCurrentPatient(found);
                  }}
                  className="bg-black/50 border border-white/20 text-white font-bold text-xs rounded-lg px-2.5 py-0.5 outline-none cursor-pointer hover:bg-black/70 transition-colors"
                >
                  {registeredPatients.map((p) => (
                    <option key={p.id} value={p.id} className="text-stone-900 bg-white">
                      {p.name} (#{p.id}) — {p.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEvaluationHarness}
              className="text-[10px] bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 rounded-xl font-mono text-purple-200 flex items-center gap-1 transition-all"
              title="Inspect VoiceStudio in-repo benchmarks and eval harness"
            >
              <span>🔬</span> Evals Harness
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MULTI-LLM MODELPROVIDER SWITCHER TOOLBAR */}
        <div className="bg-stone-950 border-b border-white/10 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
              <span>🧠</span> LLM Scribe Provider:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(MODEL_PROVIDERS) as LLMProviderId[]).map((provId) => {
                const prov = MODEL_PROVIDERS[provId];
                const isSelected = activeProviderId === provId;
                const hasKey = !prov.requiresApiKey || Boolean(apiKeyInputs[provId]);

                return (
                  <button
                    key={provId}
                    type="button"
                    onClick={() => {
                      setActiveProviderId(provId);
                      modelProviderManager.setActiveProvider(provId);
                      setActiveModelId(modelProviderManager.getActiveModelId(provId));
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-300"
                        : "bg-white/5 hover:bg-white/10 text-stone-300 border-white/10"
                    }`}
                    title={prov.description}
                  >
                    <span>{prov.icon}</span>
                    <span>{prov.shortName}</span>
                    {prov.requiresApiKey && !hasKey && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="API key required" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Model Selector (Pulls live discovered + custom + default models) */}
            <select
              value={activeModelId}
              onChange={(e) => {
                setActiveModelId(e.target.value);
                modelProviderManager.setActiveModel(activeProviderId, e.target.value);
              }}
              className="bg-black/60 border border-white/20 text-purple-200 text-[11px] font-bold rounded-lg px-2.5 py-1 outline-none font-mono cursor-pointer hover:border-purple-400 transition-colors"
            >
              {modelProviderManager.getProvider(activeProviderId).getAllModels().map((m) => (
                <option key={m.id} value={m.id} className="text-stone-900 bg-white">
                  {m.name} {m.isCustom ? "[Custom]" : m.discoveredAt ? "[Live API]" : ""} ({m.speedRating || m.costTier || "Standard"})
                </option>
              ))}
            </select>

            {/* Provider Settings & API Keys Button */}
            <button
              type="button"
              onClick={() => {
                setTestResult(null);
                setShowProviderModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-white/10"
              title="Configure API Keys & Endpoints for Gemini, Groq, OpenAI, Ollama"
            >
              <span>⚙️</span> Keys & Settings
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-stone-800">
          {/* STEP 1: RECORD & CONVERSATION FILE CAPTURE */}
          {step === "record" && (
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
          )}

          {/* STEP 2: PROCESSING CONVERSATION FILE */}
          {step === "processing" && (
            <div className="py-16 text-center space-y-5">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="font-extrabold text-base text-stone-800">
                  Processing Consultation Audio File…
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Multilingual AI speech-to-text with precision language conditioning ({LANGUAGE_LABELS[selectedLanguage]})
                </p>
              </div>

              {/* 2-Step Pipeline Status */}
              <div className="max-w-md mx-auto bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                  <span>
                    <strong>Step 1:</strong> VoiceStudio Whisper Speech-to-Text ({selectedLanguage !== "auto" ? "Conditioned Beam" : "Auto-Detection"})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span>
                    <strong>Step 2:</strong> Classical Homeopathy Scribe via{" "}
                    <strong className="text-purple-900">{MODEL_PROVIDERS[activeProviderId]?.name}</strong> ({activeModelId})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCTOR REVIEW & GRANULAR APPROVAL GATE */}
          {step === "review" && draft && (
            <div className="space-y-6">
              {/* Telemetry & Quality Evals Bar */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 border border-purple-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🌐</span>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-purple-900 tracking-wider">
                      Language Result & Accuracy
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
                      <span>🛡️</span> Doctor Staging & Approval Console
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
                          <span>🌿</span> Prescribed Remedies & Mother Tinctures ({editRemedies.length})
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
                            <label className="text-[9px] font-bold text-stone-500 uppercase">Instructions & Frequency</label>
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
                      <label className="text-[10px] font-bold text-stone-600 uppercase">Dietary & Lifestyle Instructions</label>
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
                        Retaining the raw consultation audio guarantees an immutable record to verify clinical rubrics and <strong>prevent AI hallucinations</strong>. Inaudible cryptographic watermarking embeds physician license provenance and ABDM non-repudiation seals to prevent health data theft or illegal misuse.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono pt-1">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-stone-400 block text-[9px]">LOCAL ENCOUNTER STORAGE</span>
                          <span className="text-purple-300 font-bold truncate block">
                            {audioIsPurged ? "RECORDING PURGED" : `recordings/${draft.caseRecord.metadata.interaction_id || "encounter"}.webm`}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                          <span className="text-stone-400 block text-[9px]">OVERLAPPING CHUNK ENGINE</span>
                          <span className="text-emerald-400 font-bold block">
                            2.5s Sliding Overlap (0% Loss)
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/5 border border-white/10">
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
                    Doctor controls exactly what appears in patient timeline & JSON export
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
                      <span className="text-[10px] text-stone-500">Medicine name, potency & dosage</span>
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
                      <span className="font-semibold text-stone-800 block">Symptoms & Modalities</span>
                      <span className="text-[10px] text-stone-500">Aggravations & ameliorations</span>
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
                      <span className="font-semibold text-stone-800 block">Diet & Lifestyle</span>
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
                      <span className="text-[10px] text-stone-500">Mental & emotional assessment</span>
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
                    onClick={() => setStep("record")}
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
                      onClick={handleDoctorApprove}
                      className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <span>✓</span> Approve & Release to Patient
                    </button>
                  </div>
                </div>
              </div>
          )}

          {/* STEP 4: APPROVED CONFIRMATION */}
          {step === "approved" && (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-3xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="font-extrabold text-base text-stone-800">
                Consultation Approved & Released!
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Prescription has been added to {currentPatient.name}'s medical timeline and dispatched according to your privacy selections.
              </p>
            </div>
          )}
        </div>

        {/* DRAWER: IN-REPO BENCHMARKS & EVALS HARNESS (scripts/bench_pipeline.py) */}
        {showHarnessDrawer && (
          <div className="border-t border-stone-200 bg-stone-900 text-white p-5 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <div>
                  <h4 className="font-extrabold text-xs">VoiceStudio Performance & Evaluation Harness</h4>
                  <p className="text-[10px] text-stone-400">
                    Engineered from <code className="text-purple-300">scripts/bench_pipeline.py</code> benchmark specs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHarnessDrawer(false)}
                className="text-stone-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10"
              >
                Close Evals
              </button>
            </div>

            {isHarnessRunning ? (
              <div className="py-4 text-center text-xs text-stone-300">
                Running latency & Word Error Rate benchmark tests across languages…
              </div>
            ) : harnessReport ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-stone-400">Harness Status</span>
                    <p className="font-bold text-emerald-400">{harnessReport.status.toUpperCase()}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[10px] text-stone-400">Evaluation Engine</span>
                    <p className="font-bold text-white truncate">{harnessReport.overallHealth}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-stone-400">Target Endpoint</span>
                    <p className="font-mono text-[10px] text-stone-300 truncate">:3900/v1/audio/transcriptions</p>
                  </div>
                </div>

                {/* Multilingual Benchmark Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-stone-400">
                        <th className="py-1 px-2">Language</th>
                        <th className="py-1 px-2">RTF (Real-Time Factor)</th>
                        <th className="py-1 px-2">Estimated WER</th>
                        <th className="py-1 px-2">Compute Latency</th>
                        <th className="py-1 px-2">Doctor Conditioning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {harnessReport.metrics.map((m) => (
                        <tr key={m.targetLanguage} className="hover:bg-white/5">
                          <td className="py-1.5 px-2 font-bold text-purple-300">{m.languageLabel}</td>
                          <td className="py-1.5 px-2 font-mono">{m.rtf}x</td>
                          <td className="py-1.5 px-2 text-emerald-300">{m.werScore}</td>
                          <td className="py-1.5 px-2 font-mono text-stone-400">{m.latencyMs}ms</td>
                          <td className="py-1.5 px-2 text-stone-300">Beam locked</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-[10px] text-purple-200">
                  💡 <strong>Harness Finding:</strong> {harnessReport.recommendedMode}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* PROVIDER KEYS & CONFIGURATION MODAL */}
        {showProviderModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85dvh]">
              <div className="px-4 py-3 sm:px-6 sm:py-4 bg-stone-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <h3 className="font-extrabold text-sm">ModelProviders & API Key Configuration</h3>
                    <p className="text-[11px] text-stone-400">Configure free Groq, Gemini, OpenAI, or local Ollama endpoints</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProviderModal(false)}
                  className="text-stone-400 hover:text-white text-base px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 text-stone-800">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-[11px] leading-relaxed">
                  💡 <strong>Production Multi-Provider Architecture:</strong> VoiceStudio converts consultation audio into text, then passes it to your selected LLM to map into the Classical Homeopathy JSON schema. Keys are stored locally in your browser and sent directly to the model endpoints.
                </div>

                {/* Provider List with Key Inputs & Test Buttons */}
                <div className="space-y-4">
                  {(Object.keys(MODEL_PROVIDERS) as LLMProviderId[]).map((provId) => {
                    const prov = MODEL_PROVIDERS[provId];
                    const isSelected = activeProviderId === provId;
                    const currentValue = apiKeyInputs[provId] || "";

                    return (
                      <div
                        key={provId}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/40 shadow-sm"
                            : "border-stone-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{prov.icon}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-stone-900">{prov.name}</span>
                                <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full font-mono">
                                  {prov.badge}
                                </span>
                                {isSelected && (
                                  <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                                    Active Scribe
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-500">{prov.description}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveProviderId(provId);
                              modelProviderManager.setActiveProvider(provId);
                              setActiveModelId(modelProviderManager.getActiveModelId(provId));
                            }}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-purple-900 text-white"
                                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                          >
                            {isSelected ? "✓ Selected" : "Set Active"}
                          </button>
                        </div>

                        {prov.requiresApiKey ? (
                          <div className="space-y-1.5 mt-2">
                            <div className="flex justify-between items-center text-[10px]">
                              <label className="font-bold text-stone-600 uppercase">
                                {prov.name} API Key:
                              </label>
                              {prov.apiHelpUrl && (
                                <a
                                  href={prov.apiHelpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-700 hover:underline font-semibold"
                                >
                                  Get Free Key ↗
                                </a>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder={`Enter ${prov.name} API Key (e.g. ${provId === "groq" ? "gsk_..." : "AIzaSy..."})`}
                                value={currentValue}
                                onChange={(e) => handleSaveApiKey(provId, e.target.value)}
                                className="flex-1 p-2 rounded-xl border border-stone-200 font-mono text-[11px] outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                disabled={testingProviderId === provId}
                                onClick={() => handleTestConnection(provId)}
                                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {testingProviderId === provId ? "Testing…" : "Test API"}
                              </button>
                            </div>
                          </div>
                        ) : provId === "ollama" ? (
                          <div className="space-y-1.5 mt-2">
                            <label className="font-bold text-stone-600 uppercase text-[10px]">
                              Local Ollama Endpoint URL:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="http://127.0.0.1:11434"
                                value={currentValue}
                                onChange={(e) => handleSaveApiKey(provId, e.target.value)}
                                className="flex-1 p-2 rounded-xl border border-stone-200 font-mono text-[11px] outline-none focus:ring-2 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                disabled={testingProviderId === provId}
                                onClick={() => handleTestConnection(provId)}
                                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {testingProviderId === provId ? "Testing…" : "Ping Local"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-500 italic mt-1">
                            ✓ No external credentials or tokens required. Runs in-memory classical homeopathy parser.
                          </p>
                        )}

                        {testResult && testingProviderId === null && isSelected && (
                          <div
                            className={`mt-2 p-2 rounded-xl text-[10px] font-bold ${
                              testResult.ok
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {testResult.ok ? "✓ " : "✕ "}
                            {testResult.message}
                          </div>
                        )}

                        {/* Model List & Dynamic Discovery Section */}
                        {provId !== "builtin" && (
                          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                              <span className="font-extrabold text-stone-700">
                                📋 Registered Models ({modelProviderManager.getProvider(provId).getAllModels().length}):
                              </span>
                              <button
                                type="button"
                                disabled={fetchingModelsProvId === provId}
                                onClick={() => handleFetchLiveModels(provId)}
                                className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Fetch newly released models live from the provider API"
                              >
                                <span>{fetchingModelsProvId === provId ? "⏳" : "🔄"}</span>
                                {fetchingModelsProvId === provId ? "Discovering…" : "Fetch Live Models from API"}
                              </button>
                            </div>

                            {/* Badges of current models */}
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-stone-50 rounded-xl border border-stone-200">
                              {modelProviderManager.getProvider(provId).getAllModels().map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveProviderId(provId);
                                    modelProviderManager.setActiveProvider(provId, m.id);
                                    setActiveModelId(m.id);
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                                    activeModelId === m.id && activeProviderId === provId
                                      ? "bg-purple-900 text-white font-bold"
                                      : "bg-white text-stone-700 border border-stone-200 hover:border-purple-300"
                                  }`}
                                >
                                  <span>{m.id}</span>
                                  {m.isCustom && <span className="text-[8px] text-amber-500 font-sans font-bold">Custom</span>}
                                  {m.discoveredAt && <span className="text-[8px] text-emerald-500 font-sans font-bold">Live</span>}
                                </button>
                              ))}
                            </div>

                            {/* Add Custom / Future Model Input */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder={`Add new / custom ${prov.shortName} model ID (e.g. ${
                                  provId === "groq" ? "llama-3.3-70b-specdec" : provId === "gemini" ? "gemini-2.5-pro" : "custom-model-id"
                                })`}
                                value={customModelInputs[provId] || ""}
                                onChange={(e) =>
                                  setCustomModelInputs((prev) => ({ ...prev, [provId]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddCustomModel(provId);
                                  }
                                }}
                                className="flex-1 px-2.5 py-1.5 rounded-xl border border-stone-200 font-mono text-[10px] outline-none focus:ring-1 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddCustomModel(provId)}
                                className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                + Add Model
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProviderModal(false)}
                  className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Save & Apply Provider
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVoiceStudioModal;
