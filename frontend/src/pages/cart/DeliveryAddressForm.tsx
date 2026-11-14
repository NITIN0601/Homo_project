import React from "react";
import PhoneInput from "../../components/forms/PhoneInput";
import { combineFullName } from "../../utils/format";
import { sanitizeText, sanitizePincode } from "../../utils/sanitize";

export interface DeliveryAddressData {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  pincode: string;
}

interface DeliveryAddressFormProps {
  data: DeliveryAddressData;
  onChange: (updates: Partial<DeliveryAddressData>) => void;
}

export const DeliveryAddressForm: React.FC<DeliveryAddressFormProps> = ({
  data,
  onChange,
}) => {
  const { firstName, middleName, lastName, fullName, phone, street, city, pincode } = data;

  const handleFirstNameChange = (val: string) => {
    onChange({
      firstName: val,
      fullName: combineFullName(val, middleName, lastName),
    });
  };

  const handleMiddleNameChange = (val: string) => {
    onChange({
      middleName: val,
      fullName: combineFullName(firstName, val, lastName),
    });
  };

  const handleLastNameChange = (val: string) => {
    onChange({
      lastName: val,
      fullName: combineFullName(firstName, middleName, val),
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
        <span>📍</span> Delivery Address
      </h3>

      {/* Patient Name: First Name *, Middle Name (Optional), Last Name * */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase">First Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Rahul"
            value={firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            className={`w-full mt-1 p-2.5 rounded-xl border text-xs outline-none transition-all ${
              firstName && firstName.trim().length < 2
                ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            }`}
          />
          {firstName && firstName.trim().length < 2 && (
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">⚠️ Min 2 characters</p>
          )}
        </div>

        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase">Middle Name</label>
          <input
            type="text"
            placeholder="(Optional)"
            value={middleName}
            onChange={(e) => handleMiddleNameChange(e.target.value)}
            className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs outline-none transition-all"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase">Last Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Sharma"
            value={lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            className={`w-full mt-1 p-2.5 rounded-xl border text-xs outline-none transition-all ${
              lastName && lastName.trim().length < 2
                ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            }`}
          />
          {lastName && lastName.trim().length < 2 && (
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">⚠️ Min 2 characters</p>
          )}
        </div>
      </div>

      {fullName && (
        <p className="text-[11px] text-stone-500 font-medium">
          Delivery Full Name: <strong className="text-emerald-950">{fullName}</strong>
        </p>
      )}

      <div>
        <label className="text-[10px] font-bold text-stone-500 uppercase">Phone Number</label>
        <PhoneInput
          value={phone}
          onChange={(full) => onChange({ phone: full })}
          defaultIso="IND"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-stone-500 uppercase">Street Address</label>
        <input
          type="text"
          required
          maxLength={150}
          value={street}
          onChange={(e) => onChange({ street: sanitizeText(e.target.value, 150) })}
          className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase">City</label>
          <input
            type="text"
            required
            maxLength={60}
            value={city}
            onChange={(e) => onChange({ city: sanitizeText(e.target.value, 60) })}
            className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-500 uppercase">Pincode</label>
          <input
            type="text"
            required
            maxLength={6}
            value={pincode}
            onChange={(e) => onChange({ pincode: sanitizePincode(e.target.value) })}
            className={`w-full mt-1 p-2.5 rounded-xl border text-xs outline-none transition-all ${
              pincode && !/^\d{6}$/.test(pincode)
                ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            }`}
          />
          {pincode && !/^\d{6}$/.test(pincode) && (
            <p className="text-[9px] text-red-500 font-semibold mt-0.5">⚠️ Pincode must be 6 digits</p>
          )}
        </div>
      </div>
    </div>
  );
};

