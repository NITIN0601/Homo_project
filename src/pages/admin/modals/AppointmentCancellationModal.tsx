import React, { useState } from "react";

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

  if (!isOpen || !appointmentId) return null;

  const handleConfirm = () => {
    onConfirmCancel(appointmentId, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full card-shadow border border-stone-100 p-6 space-y-4 text-xs">
        <div className="flex items-center gap-3 text-rose-950">
          <span className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl font-bold">
            ⚠️
          </span>
          <div>
            <h3 className="font-extrabold text-sm text-stone-900">Cancel Patient Appointment</h3>
            <p className="text-stone-500 text-[11px] mt-0.5">Please provide a reason for the record and patient history.</p>
          </div>
        </div>

        <div>
          <label className="font-bold text-stone-700 text-[10px] uppercase">Cancellation Reason:</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-bold text-xs"
          >
            <option value="Patient requested reschedule">Patient requested reschedule</option>
            <option value="Patient unwell / unable to travel">Patient unwell / unable to travel</option>
            <option value="Doctor emergency CME / OOO leave">Doctor emergency CME / OOO leave</option>
            <option value="Patient no-show at scheduled time">Patient no-show at scheduled time</option>
            <option value="Switched to online tele-consultation">Switched to online tele-consultation</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 cursor-pointer"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-xs active:scale-95 cursor-pointer"
          >
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentCancellationModal;
