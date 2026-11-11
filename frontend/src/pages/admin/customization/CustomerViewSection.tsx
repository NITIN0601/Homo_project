import React from "react";
import type { HospitalTenantConfig } from "../../../types/tenant";
import { Button, Card, Badge } from "../../../components/ui";

interface CustomerViewSectionProps {
  formData: HospitalTenantConfig;
  hasCustomerViewChanges: boolean;
  toggleCustomerViewFeature: (key: keyof HospitalTenantConfig["features"]) => void;
  onOpenCustomerViewSaveModal: () => void;
}

export const CustomerViewSection: React.FC<CustomerViewSectionProps> = ({
  formData,
  hasCustomerViewChanges,
  toggleCustomerViewFeature,
  onOpenCustomerViewSaveModal,
}) => {
  return (
    <Card variant="default" className="space-y-5 border-emerald-900/20 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            <h3 className="text-stone-900 font-extrabold text-base">
              Customer View Customization &amp; Access Filters
            </h3>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
              <span>🔒</span> Passcode Protected
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">
            Configure patient-facing visibility. Toggling any feature requires admin passcode verification to prevent accidental changes, and all actions are recorded in the security audit log.
          </p>
        </div>
        <Badge variant="purple" size="sm">
          Real-time Customer Sync
        </Badge>
      </div>

      {/* Primary Customer View Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        {/* Toggle: Display Doctor Details */}
        <div
          onClick={() => toggleCustomerViewFeature("displayDoctorDetails")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.displayDoctorDetails !== false
              ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">👨‍⚕️</span>
              <span className="font-bold text-sm text-stone-900">Display Doc Details</span>
              {formData.features.displayDoctorDetails !== false ? (
                <Badge variant="success" size="micro">Active (Visible)</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Controls doctor title, registration number, and clinical profile visibility on customer pages.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.displayDoctorDetails !== false}
            onChange={() => toggleCustomerViewFeature("displayDoctorDetails")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: AI Assistant Bot */}
        <div
          onClick={() => toggleCustomerViewFeature("enableAgastyaBot")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableAgastyaBot !== false
              ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="font-bold text-sm text-stone-900">{formData.shortName || "Clinic"}Bot AI Assistant</span>
              {formData.features.enableAgastyaBot !== false ? (
                <Badge variant="success" size="micro">Active (Visible)</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Floating patient assistant widget for instant remedy FAQs, clinic timings, and appointment queries.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableAgastyaBot !== false}
            onChange={() => toggleCustomerViewFeature("enableAgastyaBot")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Patient Details Edit Option */}
        <div
          onClick={() => toggleCustomerViewFeature("enablePatientProfileEdit")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enablePatientProfileEdit !== false
              ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <span className="font-bold text-sm text-stone-900">Patient Details Edit Option</span>
              {formData.features.enablePatientProfileEdit !== false ? (
                <Badge variant="success" size="micro">Active (Editable)</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled (Read-Only)</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Controls whether patients see the "Edit Details" button on their clinical summary card.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enablePatientProfileEdit !== false}
            onChange={() => toggleCustomerViewFeature("enablePatientProfileEdit")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Sub-Section: My Summary Options */}
      <div className="pt-2">
        <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-800">
                My Summary Options (Customer Portal Tabs)
              </h4>
            </div>
            <span className="text-[11px] text-stone-400 font-semibold">
              Controls individual tabs in /visit-summary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Display Patient Record */}
            <div
              onClick={() => toggleCustomerViewFeature("enablePatientMedicalRecords")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                formData.features.enablePatientMedicalRecords !== false
                  ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                  : "bg-stone-100/70 border-stone-300 opacity-75"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🩺</span>
                  <strong className="text-xs text-stone-900">Display Patient Record</strong>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Prescription timeline, remedies, dosages &amp; doctor consultation notes.
                </p>
                <div className="pt-1">
                  {formData.features.enablePatientMedicalRecords !== false ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Tab Visible
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                      Tab Hidden
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enablePatientMedicalRecords !== false}
                onChange={() => toggleCustomerViewFeature("enablePatientMedicalRecords")}
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
              />
            </div>

            {/* 2. Billing & Payment History */}
            <div
              onClick={() => toggleCustomerViewFeature("enableBillingHistory")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                formData.features.enableBillingHistory !== false
                  ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                  : "bg-stone-100/70 border-stone-300 opacity-75"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">💳</span>
                  <strong className="text-xs text-stone-900">Billing &amp; Payment History</strong>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Consultation fees, UPI settlement portal, and tax invoices.
                </p>
                <div className="pt-1">
                  {formData.features.enableBillingHistory !== false ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Tab Visible
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                      Tab Hidden
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableBillingHistory !== false}
                onChange={() => toggleCustomerViewFeature("enableBillingHistory")}
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
              />
            </div>

            {/* 3. Followup & Feedback */}
            <div
              onClick={() => toggleCustomerViewFeature("enableFollowupFeedback")}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                formData.features.enableFollowupFeedback !== false
                  ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                  : "bg-stone-100/70 border-stone-300 opacity-75"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">📝</span>
                  <strong className="text-xs text-stone-900">Follow-up &amp; Feedback</strong>
                </div>
                <p className="text-[11px] text-stone-500 leading-tight">
                  Patient progress questionnaire, symptom diary, and review sync.
                </p>
                <div className="pt-1">
                  {formData.features.enableFollowupFeedback !== false ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Tab Visible
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                      Tab Hidden
                    </span>
                  )}
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableFollowupFeedback !== false}
                onChange={() => toggleCustomerViewFeature("enableFollowupFeedback")}
                className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Group 1 Dedicated Action Bar: Save & Apply Customer View Settings with Passcode */}
      <div className="pt-4 border-t border-emerald-900/10 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/50">
        <div className="space-y-0.5">
          <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
            <span>🔒</span> Customer View Security Authorization
          </span>
          <p className="text-[11px] text-stone-500">
            Enter admin passcode once to authorize and immediately broadcast these Customer View filters to all patient accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasCustomerViewChanges && (
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg animate-pulse">
              ● Unsaved Filter Changes
            </span>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenCustomerViewSaveModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-xs cursor-pointer"
          >
            <span>🔒</span> Save &amp; Apply Customer View Settings
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CustomerViewSection;

