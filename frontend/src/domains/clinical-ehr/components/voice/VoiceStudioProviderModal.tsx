import React from "react";
import {
  modelProviderManager,
  MODEL_PROVIDERS,
  type LLMProviderId,
} from "../../api/modelProviders";

interface VoiceStudioProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProviderId: LLMProviderId;
  setActiveProviderId: (id: LLMProviderId) => void;
  activeModelId: string;
  setActiveModelId: (id: string) => void;
  apiKeyInputs: Record<LLMProviderId, string>;
  handleSaveApiKey: (providerId: LLMProviderId, key: string) => void;
  handleTestConnection: (providerId: LLMProviderId) => void;
  testingProviderId: LLMProviderId | null;
  testResult: { ok: boolean; message: string } | null;
  fetchingModelsProvId: LLMProviderId | null;
  handleFetchLiveModels: (providerId: LLMProviderId) => void;
  customModelInputs: Record<string, string>;
  setCustomModelInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleAddCustomModel: (providerId: LLMProviderId) => void;
}

export const VoiceStudioProviderModal: React.FC<VoiceStudioProviderModalProps> = ({
  isOpen,
  onClose,
  activeProviderId,
  setActiveProviderId,
  activeModelId,
  setActiveModelId,
  apiKeyInputs,
  handleSaveApiKey,
  handleTestConnection,
  testingProviderId,
  testResult,
  fetchingModelsProvId,
  handleFetchLiveModels,
  customModelInputs,
  setCustomModelInputs,
  handleAddCustomModel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3.5rem)]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-extrabold text-sm">ModelProviders &amp; API Key Configuration</h3>
              <p className="text-[11px] text-stone-400">Configure free Groq, Gemini, OpenAI, or local Ollama endpoints</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Save &amp; Apply Provider
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceStudioProviderModal;

