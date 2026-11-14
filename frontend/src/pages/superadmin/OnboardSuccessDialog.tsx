import React from "react";
import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";

export interface OnboardSuccessResult {
  hospital: HospitalTenantConfig;
  doctor: HospitalDoctor;
  inviteUrl: string;
  emailDelivery?: { status?: string };
}

export interface OnboardSuccessDialogProps {
  result: OnboardSuccessResult | null;
  onClose: () => void;
  onPreviewHospital: (hospital: HospitalTenantConfig) => void;
}

export const OnboardSuccessDialog: React.FC<OnboardSuccessDialogProps> = ({
  result,
  onClose,
  onPreviewHospital,
}) => {
  const toast = useToast();

  if (!result) return null;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(result.inviteUrl);
    toast.success("Doctor invite link copied to clipboard!");
  };

  return (
    <Modal
      isOpen={Boolean(result)}
      onClose={onClose}
      size="md"
      title="Hospital Onboarded & Doctor Provisioned!"
      subtitle={`${result.hospital.name} and Dr. ${result.doctor.name} are now live in the network.`}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={() => {
              onPreviewHospital(result.hospital);
              onClose();
            }}
          >
            Preview Hospital →
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mx-auto shadow-inner">
          ✓
        </div>

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <span className="text-stone-500 font-bold">Doctor Login Email:</span>
            <strong className="text-stone-900 font-mono">{result.doctor.email || result.hospital.contact.email}</strong>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <span className="text-stone-500 font-bold">Google 1-Click Login:</span>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
              ✓ Pre-authorized
            </span>
          </div>
          <div>
            <span className="text-stone-500 font-bold block mb-1">Doctor Activation / Invite Link:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={result.inviteUrl}
                className="flex-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-stone-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopyInvite}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
          <p className="text-[11px] text-stone-500">
            ✉️ An official registration email has been dispatched with Google Sign-In and invite activation instructions.
          </p>
        </div>
      </div>
    </Modal>
  );
};

