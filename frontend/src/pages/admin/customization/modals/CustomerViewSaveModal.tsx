import React, { useState } from "react";
import type { HospitalTenantConfig, AdminPasscode } from "../../../../types/tenant";
import { Button, Modal } from "../../../../components/ui";

interface CustomerViewSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: HospitalTenantConfig;
  currentAdminName: string;
  passcodes: AdminPasscode[];
  onAuthorizedSave: () => void;
}

export const CustomerViewSaveModal: React.FC<CustomerViewSaveModalProps> = ({
  isOpen,
  onClose,
  formData,
  currentAdminName,
  passcodes,
  onAuthorizedSave,
}) => {
  const [customerViewPasscode, setCustomerViewPasscode] = useState("");
  const [customerViewPasscodeError, setCustomerViewPasscodeError] = useState<string | null>(null);
  const [showCustomerViewPasscodeText, setShowCustomerViewPasscodeText] = useState(false);

  const handleSaveCustomerViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some(
      (p) => p.code.trim().toLowerCase() === customerViewPasscode.trim().toLowerCase()
    );

    if (!matched) {
      setCustomerViewPasscodeError("Invalid security passcode. Authorization denied.");
      return;
    }

    onAuthorizedSave();
    onClose();
    setCustomerViewPasscode("");
    setCustomerViewPasscodeError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Authorize Customer View Permission Changes"
      subtitle={`Admin Passcode required to modify customer-facing access controls for ${formData.name}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="customer-view-save-passcode-form"
            disabled={!customerViewPasscode.trim()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black"
          >
            <span>✓</span> Authorize &amp; Apply Live
          </Button>
        </div>
      }
    >
      <form
        id="customer-view-save-passcode-form"
        onSubmit={handleSaveCustomerViewSubmit}
        className="p-5 sm:p-6 space-y-4 text-xs"
      >
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="font-extrabold text-xs sm:text-sm">
              Confirm Broadcast to Patient Portal ({formData.shortName || formData.name})
            </span>
          </div>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            You are authorizing updated customer access filters. Upon verification, these settings will immediately take effect for all patient logins:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold">
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>👨‍⚕️ Doctor Details:</span>
              <span className={formData.features.displayDoctorDetails !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.displayDoctorDetails !== false ? "Visible" : "Hidden"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>🤖 AI Assistant Bot:</span>
              <span className={formData.features.enableAgastyaBot !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.enableAgastyaBot !== false ? "Active" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>✏️ Profile Edit:</span>
              <span className={formData.features.enablePatientProfileEdit !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.enablePatientProfileEdit !== false ? "Editable" : "Read-Only"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>🩺 Patient Records:</span>
              <span className={formData.features.enablePatientMedicalRecords !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.enablePatientMedicalRecords !== false ? "Visible" : "Hidden"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>💳 Billing History:</span>
              <span className={formData.features.enableBillingHistory !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.enableBillingHistory !== false ? "Visible" : "Hidden"}
              </span>
            </div>
            <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
              <span>📝 Follow-up Tab:</span>
              <span className={formData.features.enableFollowupFeedback !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                {formData.features.enableFollowupFeedback !== false ? "Visible" : "Hidden"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block">
            Enter Admin Security Passcode *
          </label>
          <div className="relative">
            <input
              type={showCustomerViewPasscodeText ? "text" : "password"}
              required
              placeholder="Enter 4-digit passcode"
              value={customerViewPasscode}
              onChange={(e) => {
                setCustomerViewPasscode(e.target.value);
                if (customerViewPasscodeError) setCustomerViewPasscodeError(null);
              }}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowCustomerViewPasscodeText(!showCustomerViewPasscodeText)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-500 hover:text-stone-800 font-bold px-1.5 py-1 cursor-pointer"
            >
              {showCustomerViewPasscodeText ? "Hide" : "Show"}
            </button>
          </div>

          {customerViewPasscodeError && (
            <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5 animate-fadeIn">
              <span>⚠️</span> {customerViewPasscodeError}
            </div>
          )}

          <p className="text-[10px] text-stone-400">
            Logged to security audit trail as Admin: <strong className="text-stone-700">{currentAdminName}</strong>
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerViewSaveModal;

