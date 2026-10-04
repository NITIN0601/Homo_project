import React, { useState } from "react";
import type { BookedAppointment } from "../../../types";
import { getClinicTimeInfo } from "../../../utils/timezone";
import { MORNING_SLOTS, EVENING_SLOTS } from "../../../config";

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAppointment: (appointment: BookedAppointment) => void;
}

export const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onBookAppointment,
}) => {
  const clinicTime = getClinicTimeInfo();
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [date, setDate] = useState(() => clinicTime.todayYMD);
  const [slot, setSlot] = useState("10:30 AM");
  const [type, setType] = useState<"In-Person Clinic Visit" | "Online Tele-Consultation">("In-Person Clinic Visit");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) return;

    const newApt: BookedAppointment = {
      id: `apt-${Date.now().toString(36)}`,
      patientId: `usr-${Math.floor(100 + Math.random() * 900)}`,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      date,
      slot,
      time: slot,
      type,
      chiefReason: reason.trim() || "Routine Clinic Consultation",
      status: "Confirmed",
      notes: notes.trim() || undefined,
    };

    onBookAppointment(newApt);
    onClose();
    // Reset form
    setPatientName("");
    setPatientPhone("");
    setReason("");
    setNotes("");
  };

  const allSlots = [...MORNING_SLOTS, ...EVENING_SLOTS];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950 to-teal-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <span>➕</span> Book New Consultation / Appointment
            </h3>
            <p className="text-emerald-200 text-xs mt-0.5">
              Schedule walk-in clinic visits or virtual video consultations directly
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg font-mono cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma or Priya Patel"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Phone Number (WhatsApp) *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98450 12345"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Consultation Mode *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="In-Person Clinic Visit">🌿 In-Person Clinic Visit</option>
                <option value="Online Tele-Consultation">💻 Online Tele-Consultation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Appointment Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Time Slot *
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {allSlots.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Chief Complaint / Reason for Visit *
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Gastritis symptoms, chronic joint swelling, skin eczema follow-up…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Doctor / Clinic Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Advised to bring previous lab reports & fasting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>✓</span> Confirm &amp; Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentBookingModal;
