import React from "react";
import type { VoiceStudioBenchmarkReport } from "../../services/voiceStudio";

interface VoiceStudioEvaluationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isHarnessRunning: boolean;
  harnessReport: VoiceStudioBenchmarkReport | null;
}

export const VoiceStudioEvaluationDrawer: React.FC<VoiceStudioEvaluationDrawerProps> = ({
  isOpen,
  onClose,
  isHarnessRunning,
  harnessReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="border-t border-stone-200 bg-stone-900 text-white p-5 space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔬</span>
          <div>
            <h4 className="font-extrabold text-xs">VoiceStudio Performance &amp; Evaluation Harness</h4>
            <p className="text-[10px] text-stone-400">
              Engineered from <code className="text-purple-300">scripts/bench_pipeline.py</code> benchmark specs
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10"
        >
          Close Evals
        </button>
      </div>

      {isHarnessRunning ? (
        <div className="py-4 text-center text-xs text-stone-300">
          Running latency &amp; Word Error Rate benchmark tests across languages…
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
  );
};

export default VoiceStudioEvaluationDrawer;

