import React, { useState, useRef, useEffect } from "react";

interface PrescriptionCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureSuccess: (imageUri: string, fileName: string) => void;
}

export const PrescriptionCaptureModal: React.FC<PrescriptionCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<"choose" | "camera" | "preview">("choose");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("prescription_capture.jpg");
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream on unmount or mode change
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setActiveMode("choose");
      setPreviewImage(null);
      setCameraError(null);
    }
  }, [isOpen]);

  // Handle starting camera stream
  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    stopCamera();
    setCameraError(null);
    setActiveMode("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings or select a file from your device folder."
          : "Could not access device camera. Please select a prescription image from your device folder instead."
      );
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPreviewImage(dataUrl);
      setSelectedFileName(`prescription_camera_${Date.now()}.jpg`);
      stopCamera();
      setActiveMode("preview");
    }
  };

  const handleFolderFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewImage(event.target.result as string);
        setSelectedFileName(file.name);
        setActiveMode("preview");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = () => {
    if (!previewImage) return;
    setIsProcessing(true);
    setTimeout(() => {
      onCaptureSuccess(previewImage, selectedFileName);
      setIsProcessing(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl card-shadow w-full max-w-lg overflow-hidden border border-stone-100 flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📷</span>
            <div>
              <h3 className="font-extrabold text-stone-800 text-sm leading-tight">
                Upload Doctor Prescription
              </h3>
              <p className="text-stone-500 text-[11px]">
                Capture via live camera or pick screenshot from device folder
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 text-stone-600 flex items-center justify-center text-sm transition-colors cursor-pointer"
            aria-label="Close prescription modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-3 sm:space-y-4">
          {/* Mode 1: Choose Camera or Folder */}
          {activeMode === "choose" && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-stone-600">
                Please select how you would like to provide your prescription:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera Access Option */}
                <button
                  onClick={() => startCamera()}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 hover:bg-emerald-100/50 hover:border-emerald-600 transition-all text-center group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform mb-2">
                    📷
                  </div>
                  <span className="font-bold text-stone-800 text-xs">Take Live Photo</span>
                  <span className="text-[10px] text-emerald-700 mt-1">Requires Camera Access</span>
                </button>

                {/* Folder Access Option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-sage-200 bg-stone-50 hover:bg-sage-50 hover:border-sage-500 transition-all text-center group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-sage-700 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform mb-2">
                    📁
                  </div>
                  <span className="font-bold text-stone-800 text-xs">Pick from Device Folder</span>
                  <span className="text-[10px] text-stone-500 mt-1">Screenshots, JPG, PNG, PDF</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFolderFileUpload}
                  className="hidden"
                />
              </div>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-stone-500 text-xs space-y-1">
                <p className="font-bold text-stone-700 flex items-center gap-1.5">
                  <span>💡</span> Tips for fast AI OCR scanning:
                </p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  <li>Ensure doctor's signature and prescription date are visible</li>
                  <li>Hold camera steady with good ambient lighting</li>
                  <li>Clear screenshots of digital prescriptions are accepted</li>
                </ul>
              </div>
            </div>
          )}

          {/* Mode 2: Live Camera Feed */}
          {activeMode === "camera" && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-2xl space-y-3 text-center">
                  <span className="text-3xl block">🚫</span>
                  <p className="font-bold">Camera Access Error</p>
                  <p>{cameraError}</p>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
                    >
                      📁 Browse Files Instead
                    </button>
                    <button
                      onClick={() => setActiveMode("choose")}
                      className="px-4 py-2 bg-stone-200 text-stone-700 text-xs font-bold rounded-xl"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => videoRef.current?.play()}
                  />

                  {/* Viewfinder Overlay Frame */}
                  <div className="absolute inset-4 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-white/70 text-[10px] bg-black/60 px-3 py-1 rounded-full font-mono">
                      Align Doctor Prescription Here
                    </span>
                  </div>

                  {/* Top Control Overlay */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="w-8 h-8 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                      title="Flip Camera"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )}

              {!cameraError && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setActiveMode("choose");
                    }}
                    className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                  >
                    ← Cancel
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>📸</span> Take Photo
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Image Preview & OCR Submission */}
          {activeMode === "preview" && previewImage && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-900 max-h-64 flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Prescription preview"
                  className="max-h-64 object-contain"
                />
                <div className="absolute bottom-2 right-2 bg-black/70 text-emerald-400 font-mono text-[10px] px-2.5 py-1 rounded-full">
                  {selectedFileName}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center gap-2">
                <span>✨</span>
                <div>
                  <p className="font-bold">Prescription Image Ready</p>
                  <p className="text-[11px] text-emerald-800">
                    Click submit to parse symptoms and attach to your medical file.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    setActiveMode("choose");
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                >
                  ← Retake / Change
                </button>

                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-800 to-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:opacity-95 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span> Processing OCR…
                    </>
                  ) : (
                    <>
                      <span>🚀</span> Submit &amp; Parse Prescription
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCaptureModal;
