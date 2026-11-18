import React from "react";
import { LANGUAGE_LABELS } from "../../api/voiceStudio";
import { MODEL_PROVIDERS, type LLMProviderId } from "../../api/modelProviders";

interface VoiceStudioProcessingStepProps {
  selectedLanguage: string;
  activeProviderId: LLMProviderId;
  activeModelId: string;
}

export const VoiceStudioProcessingStep: React.FC<VoiceStudioProcessingStepProps> = ({
  selectedLanguage,
  activeProviderId,
  activeModelId,
}) => {
  return (
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
  );
};

export default VoiceStudioProcessingStep;

