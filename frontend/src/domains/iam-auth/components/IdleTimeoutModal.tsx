import React from "react";
import { Modal, Button } from "../../../shared/ui";

export interface IdleTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStaySignedIn: () => void;
  onLogoutNow: () => void;
}

export const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onStaySignedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStaySignedIn}
      title="Session Inactivity Warning"
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <svg className="w-5 h-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">HIPAA Session Timeout Compliance</p>
            <p className="mt-0.5">
              Due to inactivity on this clinical workstation, your session will automatically lock out in{" "}
              <span className="font-bold text-amber-900 underline">{remainingSeconds}s</span> to safeguard Patient Health Information (PHI).
            </p>
          </div>
        </div>

        <p className="text-stone-600 text-sm">
          Do you want to extend your current session and remain signed in?
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <Button variant="ghost" onClick={onLogoutNow}>
            Sign Out Now
          </Button>
          <Button variant="primary" onClick={onStaySignedIn}>
            Stay Signed In
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default IdleTimeoutModal;
