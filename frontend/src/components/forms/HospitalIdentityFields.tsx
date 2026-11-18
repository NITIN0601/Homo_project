import React from "react";
import { Input } from "../ui";

export interface HospitalIdentityValues {
  name: string;
  shortName: string;
  tagline: string;
  phone: string;
  email: string;
  emergencyPhone?: string;
  street: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
}

interface HospitalIdentityFieldsProps {
  values: HospitalIdentityValues;
  onChange: (field: keyof HospitalIdentityValues, value: string) => void;
  disabled?: boolean;
}

export const HospitalIdentityFields: React.FC<HospitalIdentityFieldsProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Input
          label="Official Hospital Name"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Metro Health Hospital"
          required
          disabled={disabled}
        />
        <Input
          label="Short Display Name"
          value={values.shortName}
          onChange={(e) => onChange("shortName", e.target.value)}
          placeholder="e.g. Metro Hospital"
          required
          disabled={disabled}
        />
        <Input
          label="Tagline / Motto"
          value={values.tagline}
          onChange={(e) => onChange("tagline", e.target.value)}
          placeholder="e.g. Holistic Healing & Clinical Precision"
          disabled={disabled}
        />
        <Input
          label="Official Contact Phone"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+91 98450 12345"
          required
          disabled={disabled}
        />
        <Input
          label="Emergency Contact Phone"
          value={values.emergencyPhone || ""}
          onChange={(e) => onChange("emergencyPhone", e.target.value)}
          placeholder="+91 98450 99999"
          disabled={disabled}
        />
        <Input
          label="Official Support Email"
          type="email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="care@hospital.com"
          required
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Street Address / Suite"
            value={values.street}
            onChange={(e) => onChange("street", e.target.value)}
            placeholder="123 Medical Center Way"
            required
            disabled={disabled}
          />
        </div>
        <Input
          label="City"
          value={values.city}
          onChange={(e) => onChange("city", e.target.value)}
          placeholder="e.g. Bengaluru"
          required
          disabled={disabled}
        />
        <Input
          label="State / Province"
          value={values.state}
          onChange={(e) => onChange("state", e.target.value)}
          placeholder="e.g. Karnataka"
          required
          disabled={disabled}
        />
        <Input
          label="Country"
          value={values.country}
          onChange={(e) => onChange("country", e.target.value)}
          placeholder="e.g. India"
          required
          disabled={disabled}
        />
        <Input
          label="Postal / PIN Code"
          value={values.pincode || ""}
          onChange={(e) => onChange("pincode", e.target.value)}
          placeholder="560001"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
