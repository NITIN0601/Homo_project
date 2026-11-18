import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { UserProfile, HomeopathicRemedySuggestion } from "@core/types";
import { useApp } from "@app/store";
import { useToast } from "@shared/ui";
import { MOCK_ACCOUNTS } from "../../../../mocks";
import { VOICE_STUDIO, WHATSAPP, USE_MOCK_DATA } from "../../../../core/config";
import {
  transcribeAudioFile,
  parseConsultationTextWithLLM,
  buildApprovedVisitRecord,
  getPatientVisibleCaseRecord,
  runVoiceStudioEvaluationHarness,
  type StructuredConsultationDraft,
  type VoiceStudioTranscriptionResult,
  type VoiceStudioBenchmarkReport,
} from "../../api/voiceStudio";
import {
  modelProviderManager,
  type LLMProviderId,
} from "../../api/modelProviders";

import VoiceStudioRecordStep from "./VoiceStudioRecordStep";
import VoiceStudioProcessingStep from "./VoiceStudioProcessingStep";
import VoiceStudioReviewStep from "./VoiceStudioReviewStep";
import VoiceStudioEvaluationDrawer from "./VoiceStudioEvaluationDrawer";
import VoiceStudioProviderModal from "./VoiceStudioProviderModal";

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
  const { state, addVisitSummary } = useApp();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const registeredPatients = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (USE_MOCK_DATA) {
      Object.values(MOCK_ACCOUNTS)
        .map((a) => a.profile)
        .filter((p) => p.role === "patient")
        .forEach((p) => map.set(p.id, p));
    }
    Object.entries(state.visitSummaries).forEach(([pid, file]) => {
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: file.patientName,
          initials: file.patientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          email: `${pid}@example.com`,
          role: "patient",
          phone: "+91 98123 45678",
        });
      }
    });
    if (patient && !map.has(patient.id)) {
      map.set(patient.id, patient);
    }
    return Array.from(map.values());
  }, [state.visitSummaries, patient]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>(patient?.id || "usr-001");

  useEffect(() => {
    if (patient?.id) {
      setSelectedPatientId(patient.id);
    }
  }, [patient?.id]);

  const currentPatient = useMemo(() => {
    return registeredPatients.find((p) => p.id === selectedPatientId) || patient;
  }, [registeredPatients, selectedPatientId, patient]);

  const [step, setStep] = useState<StudioStep>("record");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(VOICE_STUDIO.DEFAULT_LANGUAGE);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [retainAudioOnSystem, setRetainAudioOnSystem] = useState<boolean>(true);
  const [audioChecksumSha256, setAudioChecksumSha256] = useState<string>("");
  const [audioDurationSec, setAudioDurationSec] = useState<number>(0);
  const [audioIsPurged, setAudioIsPurged] = useState<boolean>(false);

  const [draft, setDraft] = useState<StructuredConsultationDraft | null>(null);
  const [detectedLang, setDetectedLang] = useState<string>(VOICE_STUDIO.DEFAULT_LANGUAGE);
  const [detectedLangLabel, setDetectedLangLabel] = useState<string>("");
  const [evalTelemetry, setEvalTelemetry] = useState<VoiceStudioTranscriptionResult["telemetry"] | null>(null);

  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editRemedies, setEditRemedies] = useState<HomeopathicRemedySuggestion[]>([]);
  const [editAdvice, setEditAdvice] = useState("");
  const [editDoctorNotes, setEditDoctorNotes] = useState("");

  const [shareRemedy, setShareRemedy] = useState(true);
  const [shareModalities, setShareModalities] = useState(true);
  const [shareAdvice, setShareAdvice] = useState(true);
  const [shareMentalState, setShareMentalState] = useState(false);
  const [shareMiasm, setShareMiasm] = useState(false);
  const [shareClinicalNotes, setShareClinicalNotes] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const [reviewTab, setReviewTab] = useState<"form" | "json">("form");
  const [jsonViewMode, setJsonViewMode] = useState<"admin-full" | "patient-filtered">("admin-full");
  const [copiedJson, setCopiedJson] = useState(false);

  const [harnessReport, setHarnessReport] = useState<VoiceStudioBenchmarkReport | null>(null);
  const [isHarnessRunning, setIsHarnessRunning] = useState(false);
  const [showHarnessDrawer, setShowHarnessDrawer] = useState(false);

  const [showProviderModal, setShowProviderModal] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<LLMProviderId>(
    () => modelProviderManager.getActiveProviderId()
  );
  const [activeModelId, setActiveModelId] = useState<string>(
    () => modelProviderManager.getActiveModelId(modelProviderManager.getActiveProviderId())
  );
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<LLMProviderId, string>>(() => {
    const map = {} as Record<LLMProviderId, string>;
    (["groq", "gemini", "openai", "ollama", "builtin"] as LLMProviderId[]).forEach((p) => {
      map[p] = modelProviderManager.getApiKey(p);
    });
    return map;
  });
  const [testingProviderId, setTestingProviderId] = useState<LLMProviderId | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [fetchingModelsProvId, setFetchingModelsProvId] = useState<LLMProviderId | null>(null);
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});

  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExplicitMode = selectedLanguage !== "auto";

  const handleSaveApiKey = (providerId: LLMProviderId, key: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [providerId]: key }));
    modelProviderManager.setApiKey(providerId, key);
  };

  const handleTestConnection = async (providerId: LLMProviderId) => {
    setTestingProviderId(providerId);
    setTestResult(null);
    try {
      const res = await modelProviderManager.testProviderConnection(providerId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || "Connection failed" });
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleFetchLiveModels = async (providerId: LLMProviderId) => {
    setFetchingModelsProvId(providerId);
    try {
      const models = await modelProviderManager.fetchLiveModelsForProvider(providerId);
      toast.success(`✓ Discovered ${models.length} live models from ${providerId.toUpperCase()} API!`);
    } catch (err: any) {
      toast.error(`Could not fetch live models: ${err?.message || "Check API Key"}`);
    } finally {
      setFetchingModelsProvId(null);
    }
  };

  const handleAddCustomModel = (providerId: LLMProviderId) => {
    const val = (customModelInputs[providerId] || "").trim();
    if (!val) return;
    modelProviderManager.addCustomModelToProvider(providerId, val);
    setActiveModelId(val);
    setCustomModelInputs((prev) => ({ ...prev, [providerId]: "" }));
    toast.success(`✓ Registered and selected model: ${val}`);
  };

  const computeSha256 = async (blob: Blob): Promise<string> => {
    try {
      const buffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return `local-sha256-${Date.now().toString(16)}`;
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    setAudioBlob(null);
    setUploadedFileName(null);
    setAudioIsPurged(false);
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    const mockBlob = new Blob([new Uint8Array([0, 1, 2, 3, 4, 5])], { type: "audio/webm" });
    setAudioBlob(mockBlob);
    setAudioDurationSec(recordingSeconds);
    const checksum = await computeSha256(mockBlob);
    setAudioChecksumSha256(checksum);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setAudioBlob(file);
      const durationEst = Math.max(15, Math.min(600, Math.round(file.size / 16000)));
      setAudioDurationSec(durationEst);
      setAudioIsPurged(false);
      const checksum = await computeSha256(file);
      setAudioChecksumSha256(checksum);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const processWithVoiceStudio = async () => {
    setStep("processing");
    try {
      const transcriptionResult = await transcribeAudioFile(
        audioBlob || new Blob(),
        selectedLanguage
      );

      const structuredDraft = await parseConsultationTextWithLLM(
        transcriptionResult.text,
        transcriptionResult.language,
        currentPatient
      );

      setDraft(structuredDraft);
      setDetectedLang(transcriptionResult.language);
      setDetectedLangLabel(transcriptionResult.detectedLanguageLabel);
      setEvalTelemetry(transcriptionResult.telemetry || null);

      setEditDiagnosis(structuredDraft.chiefDiagnosis);
      const initialRemedies: HomeopathicRemedySuggestion[] =
        structuredDraft.caseRecord?.treatment_plan?.medicines_suggested &&
          structuredDraft.caseRecord.treatment_plan.medicines_suggested.length > 0
          ? structuredDraft.caseRecord.treatment_plan.medicines_suggested
          : [
            {
              remedy_name: structuredDraft.suggestedRemedyName || "Nux Vomica",
              potency: structuredDraft.suggestedPotency || "200C",
              dosage_form: "Globules (Size 30 cane sugar)",
              frequency: "4 globules twice daily",
              instructions: structuredDraft.dosageInstruction || "Take 4 globules directly on tongue",
            },
          ];

      setEditRemedies(initialRemedies);
      setEditAdvice(structuredDraft.lifestyleAdvice);
      setEditDoctorNotes(structuredDraft.clinicalNotesDoctorOnly);

      setStep("review");
    } catch {
      toast.error("VoiceStudio processing failed. Re-dictating consultation.");
      setStep("record");
    }
  };

  const syncedCaseRecord = useMemo(() => {
    if (!draft?.caseRecord) return null;
    const base = draft.caseRecord;
    return {
      ...base,
      clinical_summary: {
        ...base.clinical_summary,
        diagnosis_provisional: editDiagnosis,
        physician_clinical_notes: editDoctorNotes,
      },
      treatment_plan: {
        ...base.treatment_plan,
        diet_and_lifestyle_regimen: editAdvice,
        medicines_suggested: editRemedies,
      },
      patient_visibility_permissions: {
        share_remedies: shareRemedy,
        share_modalities: shareModalities,
        share_lifestyle: shareAdvice,
        share_mental_state: shareMentalState,
        share_miasm: shareMiasm,
        share_conversation_summary: shareClinicalNotes,
      },
      forensic_audio_provenance: {
        retained_on_local_hospital_system: retainAudioOnSystem && !audioIsPurged,
        sha256_checksum: audioChecksumSha256 || undefined,
        audio_duration_seconds: audioDurationSec,
        is_permanently_purged: audioIsPurged,
        watermark_standard: "ABDM-M3-HEALTHCARE-AUDIT",
        recorded_at: base.metadata?.visiting_date || new Date().toISOString().split("T")[0],
      },
    };
  }, [
    draft,
    editDiagnosis,
    editDoctorNotes,
    editAdvice,
    editRemedies,
    shareRemedy,
    shareModalities,
    shareAdvice,
    shareMentalState,
    shareMiasm,
    shareClinicalNotes,
    retainAudioOnSystem,
    audioIsPurged,
    audioChecksumSha256,
    audioDurationSec,
  ]);

  const patientFilteredRecord = useMemo(() => {
    if (!syncedCaseRecord) return null;
    return getPatientVisibleCaseRecord(syncedCaseRecord);
  }, [syncedCaseRecord]);

  const handleCopyJson = () => {
    if (!syncedCaseRecord) return;
    const toCopy = jsonViewMode === "admin-full" ? syncedCaseRecord : patientFilteredRecord;
    navigator.clipboard.writeText(JSON.stringify(toCopy, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDoctorApprove = () => {
    if (!draft) return;

    const finalApprovedDraft: StructuredConsultationDraft = {
      ...draft,
      chiefDiagnosis: editDiagnosis,
      suggestedRemedyName: editRemedies[0]?.remedy_name || draft.suggestedRemedyName,
      suggestedPotency: editRemedies[0]?.potency || draft.suggestedPotency,
      dosageInstruction: editRemedies[0]?.instructions || draft.dosageInstruction,
      lifestyleAdvice: editAdvice,
      clinicalNotesDoctorOnly: editDoctorNotes,
      caseRecord: syncedCaseRecord || draft.caseRecord,
    };

    const finalRecord = buildApprovedVisitRecord(finalApprovedDraft, {
      shareRemedyWithPatient: shareRemedy,
      shareModalitiesWithPatient: shareModalities,
      shareAdviceWithPatient: shareAdvice,
      shareMentalStateWithPatient: shareMentalState,
      shareMiasmWithPatient: shareMiasm,
      shareClinicalNotesWithPatient: shareClinicalNotes,
      customDoctorNote: editDoctorNotes,
    });

    addVisitSummary(currentPatient.id, finalRecord);

    if (sendWhatsApp) {
      const waUrl = WHATSAPP.buildUrl(
        WHATSAPP.TEMPLATES.CONSULTATION_SUMMARY(currentPatient.name, editDiagnosis, editAdvice),
        currentPatient.phone || WHATSAPP.NUMBER_CLEAN
      );
      window.open(waUrl, "_blank");
    }

    setStep("approved");
    setTimeout(() => {
      onClose();
      setStep("record");
      setDraft(null);
      setAudioBlob(null);
    }, 2200);
  };

  const handleRunEvaluationHarness = async () => {
    setShowHarnessDrawer(true);
    setIsHarnessRunning(true);
    try {
      const rep = await runVoiceStudioEvaluationHarness();
      setHarnessReport(rep);
    } catch {
      toast.error("Evaluation harness test error.");
    } finally {
      setIsHarnessRunning(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)]">
        {/* Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-lg sm:text-xl shadow-inner">
              🎙️
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-tight">VoiceStudio AI Clinical Scribe</h2>
                <span className="text-[9px] sm:text-[10px] font-mono bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2 py-0.5 rounded-full font-bold">
                  v3.4 Multilingual Scribe
                </span>
              </div>
              <p className="text-stone-400 text-[10px] sm:text-[11px] truncate max-w-xs sm:max-w-md">
                Doctor dictation into Classical Homeopathy schema with privacy guards
              </p>
            </div>
          </div>

          {/* Patient Target Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-800 px-2.5 py-1.5 rounded-xl border border-stone-700 text-xs">
              <span className="text-stone-400 text-[10px] font-bold">Patient:</span>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer max-w-[140px] truncate"
              >
                {registeredPatients.map((p) => (
                  <option key={p.id} value={p.id} className="bg-stone-900 text-white">
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white text-base px-2 py-1 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Subheader: Provider Indicator & Engine Tools */}
        <div className="px-4 py-2 sm:px-6 bg-stone-950 text-white border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-stone-400">LLM Engine:</span>
            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-lg font-mono font-bold flex items-center gap-1">
              <span>🧠</span> {modelProviderManager.getProvider(activeProviderId)?.name} ({activeModelId})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunEvaluationHarness}
              className="text-[10px] text-purple-300 hover:text-purple-100 font-bold px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-800 hover:bg-purple-900/60 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>🔬</span> Evals Harness
            </button>
            <button
              onClick={() => setShowProviderModal(true)}
              className="text-[10px] text-stone-300 hover:text-white font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>⚙️</span> Keys &amp; Settings
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto overflow-x-hidden space-y-6 flex-1 min-h-0 custom-scrollbar overscroll-contain text-stone-800">
          {step === "record" && (
            <VoiceStudioRecordStep
              isExplicitMode={isExplicitMode}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              isRecording={isRecording}
              recordingSeconds={recordingSeconds}
              audioBlob={audioBlob}
              formatTimer={formatTimer}
              startRecording={startRecording}
              stopRecording={stopRecording}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              uploadedFileName={uploadedFileName}
              processWithVoiceStudio={processWithVoiceStudio}
            />
          )}

          {step === "processing" && (
            <VoiceStudioProcessingStep
              selectedLanguage={selectedLanguage}
              activeProviderId={activeProviderId}
              activeModelId={activeModelId}
            />
          )}

          {step === "review" && draft && (
            <VoiceStudioReviewStep
              draft={draft}
              evalTelemetry={evalTelemetry}
              detectedLang={detectedLang}
              detectedLangLabel={detectedLangLabel}
              reviewTab={reviewTab}
              setReviewTab={setReviewTab}
              jsonViewMode={jsonViewMode}
              setJsonViewMode={setJsonViewMode}
              handleCopyJson={handleCopyJson}
              copiedJson={copiedJson}
              editDiagnosis={editDiagnosis}
              setEditDiagnosis={setEditDiagnosis}
              editRemedies={editRemedies}
              setEditRemedies={setEditRemedies}
              editAdvice={editAdvice}
              setEditAdvice={setEditAdvice}
              editDoctorNotes={editDoctorNotes}
              setEditDoctorNotes={setEditDoctorNotes}
              retainAudioOnSystem={retainAudioOnSystem}
              setRetainAudioOnSystem={setRetainAudioOnSystem}
              audioIsPurged={audioIsPurged}
              setAudioIsPurged={setAudioIsPurged}
              audioDurationSec={audioDurationSec}
              audioChecksumSha256={audioChecksumSha256}
              syncedCaseRecord={syncedCaseRecord}
              patientFilteredRecord={patientFilteredRecord}
              currentPatient={currentPatient}
              shareRemedy={shareRemedy}
              setShareRemedy={setShareRemedy}
              shareModalities={shareModalities}
              setShareModalities={setShareModalities}
              shareAdvice={shareAdvice}
              setShareAdvice={setShareAdvice}
              shareMentalState={shareMentalState}
              setShareMentalState={setShareMentalState}
              shareMiasm={shareMiasm}
              setShareMiasm={setShareMiasm}
              shareClinicalNotes={shareClinicalNotes}
              setShareClinicalNotes={setShareClinicalNotes}
              sendWhatsApp={sendWhatsApp}
              setSendWhatsApp={setSendWhatsApp}
              sendEmail={sendEmail}
              setSendEmail={setSendEmail}
              onReRecord={() => setStep("record")}
              onClose={onClose}
              onApprove={handleDoctorApprove}
            />
          )}

          {step === "approved" && (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 text-3xl flex items-center justify-center mx-auto">
                ✓
              </div>
              <h3 className="font-extrabold text-base text-stone-800">
                Consultation Approved &amp; Released!
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Prescription has been added to {currentPatient.name}'s medical timeline and dispatched according to your privacy selections.
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Drawer */}
        <VoiceStudioEvaluationDrawer
          isOpen={showHarnessDrawer}
          onClose={() => setShowHarnessDrawer(false)}
          isHarnessRunning={isHarnessRunning}
          harnessReport={harnessReport}
        />

        {/* Provider Keys & Config Modal */}
        <VoiceStudioProviderModal
          isOpen={showProviderModal}
          onClose={() => setShowProviderModal(false)}
          activeProviderId={activeProviderId}
          setActiveProviderId={setActiveProviderId}
          activeModelId={activeModelId}
          setActiveModelId={setActiveModelId}
          apiKeyInputs={apiKeyInputs}
          handleSaveApiKey={handleSaveApiKey}
          handleTestConnection={handleTestConnection}
          testingProviderId={testingProviderId}
          testResult={testResult}
          fetchingModelsProvId={fetchingModelsProvId}
          handleFetchLiveModels={handleFetchLiveModels}
          customModelInputs={customModelInputs}
          setCustomModelInputs={setCustomModelInputs}
          handleAddCustomModel={handleAddCustomModel}
        />
      </div>
    </div>
  );

  if (mounted && typeof document !== "undefined" && document.body) {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

export default AdminVoiceStudioModal;
