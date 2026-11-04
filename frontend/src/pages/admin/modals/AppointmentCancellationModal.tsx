import React, { useState } from "react";
import { Modal, Select, Button } from "../../../components/ui";

interface AppointmentCancellationModalProps {
  isOpen: boolean;
  appointmentId: string | null;
  onClose: () => void;
  onConfirmCancel: (appointmentId: string, reason: string) => void;
}

export const AppointmentCancellationModal: React.FC<AppointmentCancellationModalProps> = ({
  isOpen,
  appointmentId,
  onClose,
  onConfirmCancel,
}) => {
  const [reason, setReason] = useState("Patient requested reschedule");

  if (!appointmentId) return null;

  const handleConfirm = () => {
    onConfirmCancel(appointmentId, reason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Patient Appointment"
      subtitle="Please provide a reason for the record and patient history."
      size="sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirm}
          >
            Confirm Cancellation
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4 text-xs">
        <Select
          label="Cancellation Reason:"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={[
            { value: "Patient requested reschedule", label: "Patient requested reschedule" },
            { value: "Patient unwell / unable to travel", label: "Patient unwell / unable to travel" },
            { value: "Doctor emergency CME / OOO leave", label: "Doctor emergency CME / OOO leave" },
            { value: "Patient no-show at scheduled time", label: "Patient no-show at scheduled time" },
            { value: "Switched to online tele-consultation", label: "Switched to online tele-consultation" },
          ]}
        />
      </div>
    </Modal>
  );
};

export default AppointmentCancellationModal;
