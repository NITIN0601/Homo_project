import React from "react";

export interface ProviderOption {
  id: string;
  name: string;
  defaultModel: string;
  icon: string;
  badge: string;
  requiresKey: boolean;
}

export const AVAILABLE_PROVIDERS: ProviderOption[] = [
  { id: "gemini",    name: "Google Gemini",       defaultModel: "gemini-2.5-flash",          icon: "⚡", badge: "Fast & Free Tier",   requiresKey: true },
  { id: "groq",      name: "Groq Llama 3.3",      defaultModel: "llama-3.3-70b-versatile",   icon: "🚀", badge: "Sub-Second Ultra Fast", requiresKey: true },
  { id: "openai",    name: "OpenAI GPT-4o",       defaultModel: "gpt-4o",                    icon: "🧠", badge: "High Accuracy",       requiresKey: true },
  { id: "anthropic", name: "Anthropic Claude",    defaultModel: "claude-3-5-sonnet-20241022", icon: "🎭", badge: "Clinical Reasoning",  requiresKey: true },
  { id: "ollama",    name: "Ollama (On-Prem)",    defaultModel: "llama3.3",                  icon: "🦙", badge: "100% Offline / Local", requiresKey: false },
];

interface ProviderSelectorProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onSelectProvider,
  selectedModel,
  onSelectModel,
}) => {
  const current = AVAILABLE_PROVIDERS.find((p) => p.id === selectedProvider) || AVAILABLE_PROVIDERS[0];

  return (
    <div className="space-y-2 text-xs font-sans">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-stone-600">Select Clinical LLM Provider</label>
        <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          {current.badge}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {AVAILABLE_PROVIDERS.map((p) => {
          const isSelected = selectedProvider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectProvider(p.id);
                if (onSelectModel) onSelectModel(p.defaultModel);
              }}
              className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                isSelected
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-sm"
                  : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span className="text-base">{p.icon}</span>
              <div className="overflow-hidden">
                <p className="font-extrabold truncate text-[11px]">{p.name}</p>
                <p className={`text-[9px] truncate ${isSelected ? "text-emerald-200" : "text-stone-400"}`}>
                  {p.defaultModel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {onSelectModel && (
        <div className="pt-1">
          <label className="text-[10px] font-bold text-stone-500 block mb-1">Model Target ID</label>
          <input
            type="text"
            value={selectedModel || current.defaultModel}
            onChange={(e) => onSelectModel(e.target.value)}
            className="w-full text-xs p-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            placeholder={current.defaultModel}
          />
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;
