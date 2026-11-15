import React from "react";
import { Card, Input } from "../../components/ui";
import PhoneInput from "../../components/forms/PhoneInput";
import type { AppointmentFormValues, AppointmentFormErrors } from "../../types";

interface PatientDetailsCardProps {
  form: AppointmentFormValues;
  errors: AppointmentFormErrors;
  onNameChange: (field: "firstName" | "middleName" | "lastName", val: string) => void;
  onEmailChange: (val: string) => void;
  onEmailBlur: () => void;
  onPhoneChange: (val: string) => void;
}

export const PatientDetailsCard: React.FC<PatientDetailsCardProps> = ({
  form,
  errors,
  onNameChange,
  onEmailChange,
  onEmailBlur,
  onPhoneChange,
}) => {
  return (
    <Card variant="default" className="space-y-4 overflow-visible">
      <h2 className="text-sm font-bold text-stone-700 flex items-center gap-2">
        <span aria-hidden="true">👤</span> Patient Details
      </h2>

      {/* First Name (compulsory), Middle Name (optional), Last Name (compulsory) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          id="firstName"
          label="First Name"
          value={form.firstName || ""}
          onChange={(e) => onNameChange("firstName", e.target.value)}
          placeholder="e.g. John"
          autoComplete="given-name"
          required
          errorMessage={errors.firstName}
        />
        <Input
          id="middleName"
          label="Middle Name"
          value={form.middleName || ""}
          onChange={(e) => onNameChange("middleName", e.target.value)}
          placeholder="(Optional) e.g. Robert"
          autoComplete="additional-name"
          errorMessage={errors.middleName}
        />
        <Input
          id="lastName"
          label="Last Name"
          value={form.lastName || ""}
          onChange={(e) => onNameChange("lastName", e.target.value)}
          placeholder="e.g. Doe"
          autoComplete="family-name"
          required
          errorMessage={errors.lastName}
        />
      </div>

      {form.name && (
        <p className="text-[11px] text-stone-500 font-medium -mt-1">
          Full Name: <strong className="text-emerald-950">{form.name}</strong>
        </p>
      )}

      <Input
        id="email"
        label="Email Address"
        type="email"
        value={form.email}
        onChange={(e) => onEmailChange(e.target.value)}
        onBlur={onEmailBlur}
        placeholder="john@example.com"
        autoComplete="email"
        required
        errorMessage={errors.email}
      />
      <div className="space-y-1">
        <label htmlFor="phone" className="block text-[11px] sm:text-xs font-bold text-stone-700 tracking-wide uppercase select-none">
          Phone Number <span className="text-rose-500 ml-1">*</span>
        </label>
        <PhoneInput
          id="phone"
          value={form.phone}
          onChange={onPhoneChange}
          defaultIso="IND"
        />
        {errors.phone && (
          <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 animate-fadeIn">
            <span>⚠️</span>
            <span>{errors.phone}</span>
          </p>
        )}
      </div>
    </Card>
  );
};
