import React from "react";
import { useApp } from "../context/AppContext";
import { useHospital } from "../hooks/useHospital";

export const TermsPage: React.FC = () => {
  const { navigateTo } = useApp();
  const hospital = useHospital();

  const customTerms = hospital.legal?.termsConditionsText;
  const emergencyNotice =
    hospital.legal?.emergencyNotice ||
    "The web application is not intended for medical emergencies. Please seek immediate medical attention or call emergency services in case of an acute or life-threatening situation.";

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.35s ease both" }}>
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 card-shadow border border-stone-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚖️</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-800">Terms &amp; Conditions</h1>
            <p className="text-stone-500 text-xs mt-0.5">
              {hospital.name} · {hospital.address.short}
            </p>
          </div>
        </div>
      </div>

      {/* Terms Body */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 card-shadow border border-stone-100 space-y-6 text-stone-700 text-xs sm:text-sm leading-relaxed">

        {/* Medical Emergency Disclaimer Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs space-y-1">
          <p className="font-extrabold text-sm flex items-center gap-1.5">
            <span>⚠️</span> Medical Emergency Notice
          </p>
          <p>{emergencyNotice}</p>
        </div>

        {customTerms ? (
          <div className="space-y-4 whitespace-pre-line text-stone-700">
            {customTerms}
          </div>
        ) : (
          <section className="space-y-3">
            <p className="font-semibold text-stone-800 text-sm">
              By using the {hospital.name} web application, you agree to the following:
            </p>

            <ul className="space-y-3 pl-1">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Appointment requests are subject to availability and confirmation by {hospital.shortName}.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Patients are requested to provide accurate and relevant personal and health information.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Appointments may be cancelled or rescheduled by either the patient or {hospital.facilityLabelLower} with reasonable notice.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Information provided on the platform is for general clinical coordination and does not replace a personal consultation with your assigned physician.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Treatment outcomes may vary from person to person, and no specific medical outcome is guaranteed.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>Patient information will be handled in accordance with {hospital.shortName}&apos;s Privacy Policy and applicable healthcare regulations.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                <span>{hospital.name} reserves the right to update its services, clinical timings, and platform terms when required.</span>
              </li>
            </ul>

            <div className="pt-3 border-t border-stone-100">
              <p className="font-bold text-stone-800">
                By using this web portal, you acknowledge and agree to these Terms &amp; Conditions.
              </p>
            </div>
          </section>
        )}

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <button
            onClick={() => navigateTo("privacy-policy")}
            className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
          >
            ← Privacy Policy
          </button>
          <button
            onClick={() => navigateTo("appointments")}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Book Consultation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
