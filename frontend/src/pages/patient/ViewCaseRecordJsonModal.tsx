import React, { useState } from "react";
import type { VisitSummaryRecord } from "../../types";
import { getPatientVisibleCaseRecord } from "../../services/voiceStudio";
import { Button, Modal } from "../../components/ui";

interface ViewCaseRecordJsonModalProps {
  visit: VisitSummaryRecord | null;
  onClose: () => void;
}

export const ViewCaseRecordJsonModal: React.FC<ViewCaseRecordJsonModalProps> = ({
  visit,
  onClose,
}) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const handleCopyPatientJson = (record: any) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const caseRecord = visit?.homeopathicCaseRecord;

  return (
    <Modal
      isOpen={Boolean(visit && caseRecord)}
      onClose={onClose}
      title="Certified Classical Homeopathy Record (JSON)"
      subtitle={caseRecord ? `Interaction: ${caseRecord.metadata.interaction_id}` : undefined}
      size="lg"
      footer={
        caseRecord ? (
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <span className="text-[11px] text-stone-500 font-mono">
              Language: {caseRecord.metadata.speech_language.original} → English
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="purple"
                size="sm"
                onClick={() => handleCopyPatientJson(getPatientVisibleCaseRecord(caseRecord))}
              >
                {copiedJson ? "✓ Copied to Clipboard!" : "📋 Copy Patient JSON"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {visit && caseRecord && (
        <div className="space-y-4 text-xs">
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-purple-900 space-y-1">
            <p className="font-bold">🛡️ Doctor Certified & Privacy Filtered Record</p>
            <p className="text-[11px] text-purple-800">
              This structured JSON reflects your consultation mapped strictly to the Classical Homeopathy schema.
              Internal miasmatic classifications and physician psychiatric assessments have been sanitized for your privacy.
            </p>
          </div>

          <div className="relative">
            <pre className="bg-stone-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-96 leading-relaxed border border-stone-800 shadow-inner">
              {JSON.stringify(getPatientVisibleCaseRecord(caseRecord), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ViewCaseRecordJsonModal;

