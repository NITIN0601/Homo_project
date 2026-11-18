import React, { useState } from "react";
import type { AdminPasscode } from "../../types/tenant";
import { Button, Modal } from "../../components/ui";

interface ChangePasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcodes: AdminPasscode[];
  onPasscodeChanged: (updatedPasscodes: AdminPasscode[]) => void;
}

export const ChangePasscodeModal: React.FC<ChangePasscodeModalProps> = ({
  isOpen,
  onClose,
  passcodes,
  onPasscodeChanged,
}) => {
  const [changeOldPasscode, setChangeOldPasscode] = useState("");
  const [changeNewPasscode, setChangeNewPasscode] = useState("");
  const [changeConfirmPasscode, setChangeConfirmPasscode] = useState("");
  const [changePasscodeError, setChangePasscodeError] = useState<string | null>(null);

  const handleChangePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some((p) => p.code.trim() === changeOldPasscode.trim());
    if (!matched) {
      setChangePasscodeError("Current passcode is incorrect.");
      return;
    }
    if (changeNewPasscode.trim().length < 4) {
      setChangePasscodeError("New passcode must be at least 4 digits/characters.");
      return;
    }
    if (changeNewPasscode !== changeConfirmPasscode) {
      setChangePasscodeError("New passcode and confirmation do not match.");
      return;
    }

    const updatedPasscodes = passcodes.map((p, idx) => {
      if (idx === 0 || p.code === changeOldPasscode.trim()) {
        return { ...p, code: changeNewPasscode.trim() };
      }
      return p;
    });

    onPasscodeChanged(updatedPasscodes);
    onClose();
    setChangeOldPasscode("");
    setChangeNewPasscode("");
    setChangeConfirmPasscode("");
    setChangePasscodeError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Master Admin Security Passcode"
      subtitle="Update the primary security passcode used to authorize configuration changes"
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
            form="change-passcode-form"
            disabled={!changeOldPasscode || !changeNewPasscode || !changeConfirmPasscode}
          >
            Save New Passcode
          </Button>
        </div>
      }
    >
      <form
        id="change-passcode-form"
        onSubmit={handleChangePasscodeSubmit}
        className="p-4 sm:p-5 space-y-3 text-xs"
      >
        {changePasscodeError && (
          <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5">
            <span>⚠️</span> {changePasscodeError}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              Current Passcode *
            </label>
            <input
              type="password"
              required
              placeholder="Enter current passcode"
              value={changeOldPasscode}
              onChange={(e) => setChangeOldPasscode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              New Passcode (min 4 characters) *
            </label>
            <input
              type="password"
              required
              placeholder="Enter new secure passcode"
              value={changeNewPasscode}
              onChange={(e) => setChangeNewPasscode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
              Confirm New Passcode *
            </label>
            <input
              type="password"
              required
              placeholder="Re-type new passcode"
              value={changeConfirmPasscode}
              onChange={(e) => setChangeConfirmPasscode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasscodeModal;

