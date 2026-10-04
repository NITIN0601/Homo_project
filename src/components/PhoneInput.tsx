import React, { useState, useEffect, useRef } from "react";
import { THEME_SHADOWS, ALL_COUNTRY_CODES, type CountryCode } from "../config";

export type { CountryCode };

export interface PhoneInputProps {
  value?: string;
  onChange: (fullNumber: string, dialCode: string, localNumber: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  defaultIso?: string; // Defaults to "IND"
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = "",
  onChange,
  placeholder = "98765 43210",
  required = false,
  disabled = false,
  id,
  className = "",
  defaultIso = "IND",
}) => {
  const defaultCountry = ALL_COUNTRY_CODES.find((c) => c.iso3 === defaultIso) ?? ALL_COUNTRY_CODES[0];

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry);
  const [localNumber, setLocalNumber]         = useState<string>("");
  const [isOpen, setIsOpen]                   = useState<boolean>(false);
  const [searchQuery, setSearchQuery]         = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value if provided
  useEffect(() => {
    if (!value) return;
    const matched = ALL_COUNTRY_CODES.find((c) => value.startsWith(c.dial));
    if (matched) {
      setSelectedCountry(matched);
      const digitsOnly = value.slice(matched.dial.length).replace(/[^0-9]/g, "");
      setLocalNumber(digitsOnly);
    } else {
      const digitsOnly = value.replace(/[^0-9]/g, "");
      setLocalNumber(digitsOnly);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery("");
    const full = localNumber.trim() ? `${country.dial} ${localNumber.trim()}` : "";
    onChange(full, country.dial, localNumber.trim());
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9\s-]/g, "");
    setLocalNumber(raw);
    const cleanDigits = raw.replace(/[^0-9]/g, "");
    const full = cleanDigits ? `${selectedCountry.dial} ${cleanDigits}` : "";
    onChange(full, selectedCountry.dial, cleanDigits);
  };

  // Filter countries by search query
  const filteredCountries = ALL_COUNTRY_CODES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.iso3.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  return (
    <div className={`flex items-center gap-1.5 w-full relative ${className}`} ref={containerRef}>

      {/* Custom Country Selector Button */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all cursor-pointer disabled:opacity-50"
          aria-label="Select Country Code"
          aria-expanded={isOpen}
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-extrabold">{selectedCountry.iso3}</span>
          <span className="text-stone-500 text-[10px] font-semibold">{selectedCountry.dial}</span>
          <span className="text-[9px] text-stone-400 ml-0.5">▼</span>
        </button>

        {/* Searchable & Scrollable Country Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-2xl shadow-2xl border border-stone-200 z-[90] overflow-hidden animate-fadeIn"
            style={{ boxShadow: THEME_SHADOWS.POPOVER }}
          >
            {/* Search Input Bar */}
            <div className="p-2 border-b border-stone-100 bg-stone-50 flex items-center gap-1.5">
              <span className="text-stone-400 text-xs pl-1">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code…"
                autoFocus
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-stone-800 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-stone-400 hover:text-stone-700 text-xs px-1 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Country List Container */}
            <div className="max-h-60 overflow-y-auto divide-y divide-stone-100/60 text-xs">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => {
                  const isSelected = c.iso3 === selectedCountry.iso3;
                  return (
                    <button
                      key={c.code + c.dial}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-emerald-50/80 cursor-pointer ${
                        isSelected ? "bg-emerald-100/60 font-extrabold text-emerald-900" : "text-stone-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <span className="text-base flex-shrink-0">{c.flag}</span>
                        <span className="truncate text-xs font-semibold">{c.name}</span>
                        <span className="text-[10px] text-stone-400 font-bold uppercase">{c.iso3}</span>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-xs flex-shrink-0">{c.dial}</span>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-stone-400 text-xs font-medium">
                  No country found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone Number Input */}
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 select-none">
          {selectedCountry.dial}
        </span>
        <input
          type="tel"
          id={id}
          value={localNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full rounded-xl border border-stone-300 bg-white pl-12 pr-3 py-2.5 text-xs font-medium text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:bg-stone-100"
        />
      </div>
    </div>
  );
};

export default PhoneInput;
