import React, { useState } from "react";
import type { BookedAppointment } from "../../../types";
import { getClinicTimeInfo } from "../../../utils/timezone";
import { MORNING_SLOTS, EVENING_SLOTS } from "../../../config";
import { Modal, Input, Select, Textarea, Button } from "../../../components/ui";
import { useApp } from "../../../context/AppContext";

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
  const { isSlotBlocked, isDateBlocked } = useApp();
  const clinicTime = getClinicTimeInfo();
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [date, setDate] = useState(() => clinicTime.todayYMD);
  const [slot, setSlot] = useState("10:30 AM");
  const [type, setType] = useState<"In-Person Clinic Visit" | "Online Tele-Consultation">("In-Person Clinic Visit");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { firstName?: string; lastName?: string } = {};
    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    } else if (firstName.trim().length < 2) {
      errors.firstName = "Min 2 characters required.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    } else if (lastName.trim().length < 2) {
      errors.lastName = "Min 2 characters required.";
    }

    if (Object.keys(errors).length > 0) {
      setNameErrors(errors);
      return;
    }
    setNameErrors({});

    if (!patientPhone.trim()) return;

    const combinedName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");

    const newApt: BookedAppointment = {
      id: `apt-${Date.now().toString(36)}`,
      patientId: `usr-${Math.floor(100 + Math.random() * 900)}`,
      patientName: combinedName,
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
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
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setPatientPhone("");
    setReason("");
    setNotes("");
    setNameErrors({});
  };

  const allSlots = [...MORNING_SLOTS, ...EVENING_SLOTS];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book New Consultation / Appointment"
      subtitle="Schedule walk-in clinic visits or virtual video consultations directly"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="appointment-booking-form"
            variant="primary"
            size="sm"
          >
            <span>✓</span> Confirm &amp; Book Appointment
          </Button>
        </div>
      }
    >
      <form id="appointment-booking-form" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
        {/* Patient Name Section: First Name *, Middle Name (Optional), Last Name * */}
        <div>
          <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
            Patient Name *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <Input
                label="First Name *"
                required
                placeholder="e.g. Rahul"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (nameErrors.firstName) setNameErrors((prev) => ({ ...prev, firstName: undefined }));
                }}
                errorMessage={nameErrors.firstName}
              />
            </div>
            <div>
              <Input
                label="Middle Name"
                placeholder="(Optional)"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Last Name *"
                required
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (nameErrors.lastName) setNameErrors((prev) => ({ ...prev, lastName: undefined }));
                }}
                errorMessage={nameErrors.lastName}
              />
            </div>
          </div>
          {(firstName.trim() || lastName.trim()) && (
            <p className="text-[11px] text-stone-500 font-medium mt-1.5">
              Full Name: <strong className="text-emerald-950">{[firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ")}</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number (WhatsApp) *"
            type="tel"
            required
            placeholder="+91 98450 12345"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
          />

          <Select
            label="Consultation Mode *"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            options={[
              { value: "In-Person Clinic Visit", label: "🌿 In-Person Clinic Visit" },
              { value: "Online Tele-Consultation", label: "💻 Online Tele-Consultation" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Appointment Date *"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Select
            label="Time Slot *"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            options={allSlots.map((s) => {
              const blk = isSlotBlocked(date, s);
              return {
                value: s,
                label: blk ? `${s} ⛔ (Doctor OOO: ${blk.reason})` : s,
              };
            })}
          />
        </div>

        {(() => {
          const slotBlock = isSlotBlocked(date, slot);
          const dayBlock = isDateBlocked(date);
          if (slotBlock || dayBlock) {
            const blk = slotBlock || dayBlock;
            return (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  Notice: Doctor is marked as Out-of-Office on this slot ({blk?.reason}). Booking as Clinic Admin will schedule this appointment.
                </span>
              </div>
            );
          }
          return null;
        })()}

        <Textarea
          label="Chief Complaint / Reason for Visit *"
          rows={2}
          required
          placeholder="e.g. Gastritis symptoms, chronic joint swelling, skin eczema follow-up…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Input
          label="Doctor / Clinic Notes (Optional)"
          placeholder="e.g. Advised to bring previous lab reports & fasting"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
};

export default AppointmentBookingModal;
