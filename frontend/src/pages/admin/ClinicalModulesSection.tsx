import React from "react";
import type { HospitalTenantConfig } from "../../types/tenant";
import { Button, Card, Badge } from "../../components/ui";

interface ClinicalModulesSectionProps {
  formData: HospitalTenantConfig;
  toggleCustomerViewFeature: (key: keyof HospitalTenantConfig["features"]) => void;
  onSavePlatformModules: () => void;
}

export const ClinicalModulesSection: React.FC<ClinicalModulesSectionProps> = ({
  formData,
  toggleCustomerViewFeature,
  onSavePlatformModules,
}) => {
  return (
    <Card variant="default" className="space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
            <span>⚙️</span> General Hospital &amp; Platform Modules
          </h3>
          <p className="text-stone-500 text-xs mt-0.5">
            Enable or disable system-wide clinical services for this hospital tenant.
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          Core Modules
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Toggle: Customer Payment Portal */}
        <div
          onClick={() => toggleCustomerViewFeature("enableCustomerPayments")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableCustomerPayments
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <span className="font-bold text-sm text-stone-900">Online Checkout &amp; Settlements</span>
              {formData.features.enableCustomerPayments ? (
                <Badge variant="success" size="micro">Active</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Allows patients to settle fees online via UPI, Cards, and NetBanking.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableCustomerPayments}
            onChange={() => toggleCustomerViewFeature("enableCustomerPayments")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Raw Classical Homeopathy JSON Case Record */}
        <div
          onClick={() => toggleCustomerViewFeature("enableRawCaseJson")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableRawCaseJson
              ? "bg-purple-50/50 border-purple-300 ring-1 ring-purple-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-bold text-sm text-stone-900">View Raw Case Record (JSON)</span>
              {formData.features.enableRawCaseJson ? (
                <Badge variant="purple" size="micro">Visible</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Hidden (Default)</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Controls whether patients can inspect raw developer homeopathic case schemas.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableRawCaseJson}
            onChange={() => toggleCustomerViewFeature("enableRawCaseJson")}
            className="w-5 h-5 accent-purple-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Google Reviews & Patient Testimonials */}
        <div
          onClick={() => toggleCustomerViewFeature("enableGoogleReviews")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableGoogleReviews
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌟</span>
              <span className="font-bold text-sm text-stone-900">Google Reviews &amp; Testimonials</span>
              {formData.features.enableGoogleReviews ? (
                <Badge variant="success" size="micro">Active</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Enables structured feedback collection and Google Maps review sync.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableGoogleReviews}
            onChange={() => toggleCustomerViewFeature("enableGoogleReviews")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Telemedicine & Remote Consultation */}
        <div
          onClick={() => toggleCustomerViewFeature("enableTelemedicine")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableTelemedicine
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span className="font-bold text-sm text-stone-900">Telemedicine &amp; Video Consults</span>
              {formData.features.enableTelemedicine ? (
                <Badge variant="success" size="micro">Active</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Enables international remote consultations and WhatsApp video link dispatch.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableTelemedicine}
            onChange={() => toggleCustomerViewFeature("enableTelemedicine")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Dispensary & Medicine Ordering */}
        <div
          onClick={() => toggleCustomerViewFeature("enableECommerce")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enableECommerce
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <span className="font-bold text-sm text-stone-900">Dispensary &amp; Medicine Ordering</span>
              {formData.features.enableECommerce ? (
                <Badge variant="success" size="micro">Active</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Allows patients to order remedies from dispensary with courier delivery.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enableECommerce}
            onChange={() => toggleCustomerViewFeature("enableECommerce")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>

        {/* Toggle: Prescription OCR Scan */}
        <div
          onClick={() => toggleCustomerViewFeature("enablePrescriptionScan")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
            formData.features.enablePrescriptionScan
              ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-stone-50/60 border-stone-200 opacity-80"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span className="font-bold text-sm text-stone-900">AI Prescription Scan (OCR)</span>
              {formData.features.enablePrescriptionScan ? (
                <Badge variant="success" size="micro">Active</Badge>
              ) : (
                <Badge variant="neutral" size="micro">Disabled</Badge>
              )}
            </div>
            <p className="text-stone-500 text-xs leading-relaxed">
              Enables scanning and auto-parsing of uploaded clinical prescriptions.
            </p>
          </div>
          <input
            type="checkbox"
            checked={formData.features.enablePrescriptionScan}
            onChange={() => toggleCustomerViewFeature("enablePrescriptionScan")}
            className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Group 2 Dedicated Action Bar: Save & Apply Platform Modules */}
      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
        <p className="text-[11px] text-stone-500">
          Save clinical services, raw JSON schemas, reviews, and e-commerce modules for this clinic.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSavePlatformModules}
        >
          <span>💾</span> Save &amp; Apply Platform Modules
        </Button>
      </div>
    </Card>
  );
};

export default ClinicalModulesSection;

