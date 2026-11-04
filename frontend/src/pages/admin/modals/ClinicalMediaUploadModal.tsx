import React, { useState, useEffect, useRef } from "react";
import type { UserProfile, PatientClinicalMedia } from "../../../types";
import { formatDateISO } from "../../../utils/format";
import { Modal, Input, Select, Textarea, Button, Badge } from "../../../components/ui";

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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Audio Recording Simulation State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep target patient synchronized when modal opens for a specific patient
  useEffect(() => {
    if (isOpen) {
      setTargetPatientId(initialPatientId);
      setSelectedFileName(null);
      setPreviewUrl(null);
      setIsRecording(false);
      setRecordSeconds(0);
    }
  }, [initialPatientId, isOpen]);

  // Audio recording timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRecording) {
      timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    setCategory("voice");
    if (!title) setTitle("Doctor Case Taking Audio Dictation");
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setSelectedFileName(`voice_dictation_${formatDateISO()}.wav`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalUrl = previewUrl;
    if (!finalUrl) {
      finalUrl =
        category === "voice"
          ? "#voice_recorded"
          : category === "lab_report"
          ? "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80";
    }

    const newMedia: PatientClinicalMedia = {
      id: `med-${Date.now().toString(36)}`,
      patientId: targetPatientId,
      title: title.trim(),
      category,
      fileUrl: finalUrl,
      uploadDate: formatDateISO(),
      notes: notes.trim() || undefined,
      fileSize:
        category === "voice"
          ? `${(1.2 + (recordSeconds || 15) * 0.05).toFixed(1)} MB (${String(Math.floor((recordSeconds || 75) / 60)).padStart(2, "0")}:${String((recordSeconds || 75) % 60).padStart(2, "0")})`
          : "1.8 MB",
    };

    onUploadMedia(newMedia);
    onClose();
    setTitle("");
    setNotes("");
    setSelectedFileName(null);
    setPreviewUrl(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach Clinical Media to Patient File"
      subtitle="Upload tongue observations, skin rash images, audio dictations, or pathology reports"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="clinical-media-upload-form"
            variant="primary"
            size="sm"
            className="bg-teal-700 hover:bg-teal-800 text-white font-black"
          >
            <span>✓</span> Attach to Patient File
          </Button>
        </div>
      }
    >
      <form id="clinical-media-upload-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
        <Select
          label="Target Patient Profile *"
          value={targetPatientId}
          onChange={(e) => setTargetPatientId(e.target.value)}
          options={patientList.map((p) => ({
            value: p.id,
            label: `#${p.id} — ${p.name}`,
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Media Category *"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as any);
              setIsRecording(false);
            }}
            options={[
              { value: "image", label: "📷 Clinical Photo (Tongue / Skin / Joints)" },
              { value: "voice", label: "🎙️ Consultation Voice Recording / Audio" },
              { value: "lab_report", label: "🔬 Pathology / Lab Investigation Report" },
              { value: "prescription", label: "📄 Previous Rx Slip" },
            ]}
          />

          <Input
            label="Attachment Title *"
            required
            placeholder="e.g. Tongue Coating Observation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Dynamic File Upload / Audio Recording Card */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              {category === "voice" ? "Record or Upload Audio Note" : "Select or Drop File"}
            </label>
            {category === "voice" && (
              <Badge variant={isRecording ? "danger" : "purple"} size="micro">
                {isRecording ? `🔴 Recording 00:${String(recordSeconds).padStart(2, "0")}` : "Voice Ready"}
              </Badge>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={category === "voice" ? "audio/*" : "image/*,.pdf"}
            className="hidden"
          />

          {category === "voice" ? (
            <div className="bg-stone-900 text-white rounded-2xl p-4 text-center space-y-3 border border-stone-800">
              <div className="flex items-center justify-center gap-3">
                <span className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isRecording ? "bg-rose-600 animate-pulse text-white" : "bg-purple-600/30 text-purple-300"}`}>
                  🎙️
                </span>
                <div className="text-left">
                  <p className="font-bold text-sm">
                    {isRecording ? "Recording Consultation Dictation…" : selectedFileName || "Clinical Dictation"}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {isRecording
                      ? `Duration: 00:${String(recordSeconds).padStart(2, "0")} · Speak clearly into microphone`
                      : "Record physician audio notes directly or attach an existing .wav / .mp3"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                {isRecording ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleStopRecording}
                    className="font-bold bg-rose-600 hover:bg-rose-700"
                  >
                    ⏹ Stop &amp; Save Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleStartRecording}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      🔴 Start Voice Dictation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-stone-300 border-stone-700 hover:bg-stone-800"
                    >
                      📁 Browse Audio File
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl border-2 border-dashed border-stone-300 text-center hover:bg-stone-50 cursor-pointer space-y-1 transition-colors bg-stone-50/40"
            >
              <span className="text-3xl block">{category === "lab_report" ? "🔬" : "📷"}</span>
              <p className="font-bold text-stone-800 text-xs">
                {selectedFileName ? `Selected: ${selectedFileName}` : "Click to select or drop photo / investigation PDF"}
              </p>
              <span className="text-[10px] text-stone-400 block">
                Supports JPG, PNG, WEBP, PDF (Up to 25MB clinical high-resolution file)
              </span>
              {previewUrl && (
                <div className="mt-2 w-24 h-24 mx-auto rounded-xl overflow-hidden border border-stone-200">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>

        <Textarea
          label="Clinical Observation & Modality Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Red edges on tongue, dry mouth with thirst for small quantities of water…"
        />
      </form>
    </Modal>
  );
};

export default ClinicalMediaUploadModal;
