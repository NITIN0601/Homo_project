import React from "react";
import { useApp } from "../context/AppContext";
import { useClinic } from "../hooks/useClinic";

export const PrivacyPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();
  const clinic = useClinic();

  const customPolicy = clinic.legal?.privacyPolicyText;

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ animation: "fadeInUp 0.35s ease both" }}>
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 card-shadow border border-stone-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🛡️</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-800">Privacy Policy</h1>
            <p className="text-stone-500 text-xs mt-0.5">
              {clinic.name} · {clinic.address.short}
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
            At <strong>{clinic.name}</strong>, we respect the privacy and confidentiality of our patients. Personal information, including contact details, appointment information, and clinical records, is collected strictly for providing medical care, managing appointments, maintaining electronic health records, and follow-up clinical support.
          </p>
        </div>

        {customPolicy ? (
          <div className="space-y-4 whitespace-pre-line text-stone-700">
            {customPolicy}
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-base font-extrabold text-stone-900 border-b border-stone-100 pb-2">
                Confidentiality &amp; Protection of Information
              </h2>
              <p>
                Patient information is kept confidential with multi-tenant encryption and reasonable security safeguards. Information is never sold or used for commercial advertising, and may only be accessed by authorized clinical personnel or disclosed when mandated by medical law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-extrabold text-stone-900 border-b border-stone-100 pb-2">
                Patient Consent
              </h2>
              <p>
                By using our digital health portal and providing your information, you consent to its collection and clinical use in accordance with applicable healthcare data protection standards.
              </p>
            </section>
          </>
        )}

        <section className="space-y-2 pt-2 border-t border-stone-100">
          <h3 className="text-sm font-extrabold text-stone-900">Contact the Clinic</h3>
          <p className="text-xs text-stone-600">
            For questions or requests regarding your patient records or appointment details, please reach out to us:
          </p>
          <p className="text-xs text-stone-700 font-semibold">
            📧 Email: <a href={`mailto:${clinic.email}`} className="text-emerald-700 hover:underline">{clinic.email}</a> · 📞 Phone / WhatsApp: <a href={`tel:${clinic.phoneTel}`} className="text-emerald-700 hover:underline">{clinic.phone}</a>
          </p>
          <p className="text-xs text-stone-500">
            📍 {clinic.address.full}
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
