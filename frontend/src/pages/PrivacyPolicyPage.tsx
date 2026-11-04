import React from "react";
import { useApp } from "../context/AppContext";
import { CLINIC } from "../config";

export const PrivacyPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.35s ease both" }}>
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 card-shadow border border-stone-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-800">Privacy Policy</h1>
            <p className="text-stone-500 text-xs mt-0.5">
              {CLINIC.FULL_NAME} · {CLINIC.ADDRESS.SHORT}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 card-shadow border border-stone-100 space-y-6 text-stone-700 text-xs sm:text-sm leading-relaxed">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-emerald-950 text-xs sm:text-sm space-y-2">
          <p className="font-extrabold flex items-center gap-2 text-emerald-900">
            <span>🔒</span> Patient Privacy &amp; Confidentiality
          </p>
          <p>
            At <strong>{CLINIC.FULL_NAME}</strong>, we respect the privacy and confidentiality of our patients. Personal information, including contact details, appointment information, and health-related information, is collected only for providing consultations, managing appointments, maintaining patient records, and follow-up care.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Confidentiality &amp; Protection of Information
          </h2>
          <p>
            Patient information is kept confidential and reasonable measures are taken to protect it from unauthorised access or disclosure. Information will not be sold or used for unrelated purposes and may be shared only when required by law or for legitimate healthcare purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-stone-900 border-b border-stone-100 pb-2">
            Patient Consent
          </h2>
          <p>
            By using our web application and providing your information, you consent to its collection and use for the purposes stated above.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-stone-100">
          <h3 className="text-sm font-extrabold text-stone-900">Contact the Clinic</h3>
          <p className="text-xs text-stone-600">
            For questions or requests regarding your patient records or appointment details, please reach out to us:
          </p>
          <p className="text-xs text-stone-700 font-semibold">
            📧 Email: <a href={`mailto:${CLINIC.SUPPORT_EMAIL}`} className="text-emerald-700 hover:underline">{CLINIC.SUPPORT_EMAIL}</a> · 📞 Phone / WhatsApp: <a href={`tel:${CLINIC.PHONE_TEL}`} className="text-emerald-700 hover:underline">{CLINIC.PHONE_DISPLAY}</a>
          </p>
          <p className="text-xs text-stone-500">
            📍 {CLINIC.ADDRESS.STREET}, {CLINIC.ADDRESS.CITY} – {CLINIC.ADDRESS.PINCODE}, {CLINIC.ADDRESS.STATE}
          </p>
        </section>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <button
            onClick={() => navigateTo("home")}
            className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => navigateTo("terms")}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Read Terms &amp; Conditions →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
