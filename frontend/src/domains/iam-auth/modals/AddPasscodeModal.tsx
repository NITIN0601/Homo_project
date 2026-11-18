import React, { useState } from "react";
import type { AdminPasscode } from "@core/types/tenant";
import { Button, Modal } from "../../../shared/ui";

interface AddPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcodes: AdminPasscode[];
  currentAdminName: string;
  onPasscodeAdded: (newPasscodeObj: AdminPasscode) => void;
}

export const AddPasscodeModal: React.FC<AddPasscodeModalProps> = ({
  isOpen,
  onClose,
  passcodes,
  currentAdminName,
  onPasscodeAdded,
}) => {
  const [addAuthPasscode, setAddAuthPasscode] = useState("");
  const [addNewPasscode, setAddNewPasscode] = useState("");
  const [addPasscodeLabel, setAddPasscodeLabel] = useState("");
  const [addPasscodeError, setAddPasscodeError] = useState<string | null>(null);

  const handleAddPasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some((p) => p.code.trim() === addAuthPasscode.trim());
    if (!matched) {
      setAddPasscodeError("Authorization passcode is incorrect.");
      return;
    }
    if (addNewPasscode.trim().length < 4) {
      setAddPasscodeError("New passcode must be at least 4 digits/characters.");
      return;
    }
    if (!addPasscodeLabel.trim()) {
      setAddPasscodeError("Please provide a label or admin role for this passcode.");
      return;
    }

    const newPasscodeObj: AdminPasscode = {
      id: `pc-${Date.now()}`,
      code: addNewPasscode.trim(),
      label: addPasscodeLabel.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentAdminName,
    };

    onPasscodeAdded(newPasscodeObj);
    onClose();
    setAddAuthPasscode("");
    setAddNewPasscode("");
    setAddPasscodeLabel("");
    setAddPasscodeError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Admin Security Passcode"
      subtitle="Provision a designated passcode for secondary hospital administrators"
      size="sm"
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
            form="add-passcode-form"
            disabled={!addAuthPasscode || !addNewPasscode || !addPasscodeLabel}
          >
            Provision Passcode
          </Button>
        </div>
      }
    >
      <form
        id="add-passcode-form"
        onSubmit={handleAddPasscodeSubmit}
        className="p-4 sm:p-5 space-y-3 text-xs"
      >
        {addPasscodeError && (
          <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5">
            <span>⚠️</span> {addPasscodeError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              Master Authorization Passcode *
            </label>
            <input
              type="password"
              required
              placeholder="Enter active master passcode"
              value={addAuthPasscode}
              onChange={(e) => setAddAuthPasscode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              Passcode Label / Owner Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hospital Reception Desk, Dr. Assistant"
              value={addPasscodeLabel}
              onChange={(e) => setAddPasscodeLabel(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              New Passcode *
            </label>
            <input
              type="password"
              required
              placeholder="Enter new 4-digit code"
              value={addNewPasscode}
              onChange={(e) => setAddNewPasscode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AddPasscodeModal;

