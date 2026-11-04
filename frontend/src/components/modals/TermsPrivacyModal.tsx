import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, Badge } from "../ui";
import { useTenant } from "../../context/ThemeProvider";
import { CLINIC } from "../../config";

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const { tenant } = useTenant();
  const hospitalName = tenant.name || CLINIC.FULL_NAME;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScrollProgress(0);
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) {
      setScrollProgress(100);
      setHasScrolledToBottom(true);
      return;
    }
    const progress = Math.min(100, Math.round((scrollTop / totalScrollable) * 100));
    setScrollProgress(progress);
    if (progress >= 90) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirmAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms of Service & DPDP / HIPAA Patient Privacy Policy"
      subtitle={`${hospitalName} · Official Clinical Policy Document v2.4`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <p className="text-[11px] text-stone-500">
            {hasScrolledToBottom ? "✓ You have reached the end of the policy document." : "↓ Scroll to the bottom of the agreement above to enable acceptance."}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!hasScrolledToBottom}
              onClick={handleConfirmAccept}
              className={`font-bold px-6 shadow-md transition-all ${
                hasScrolledToBottom
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                  : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-60"
              }`}
            >
              {hasScrolledToBottom ? "✓ I Have Read & Agree to Terms" : "↓ Scroll to Bottom to Accept"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-4 text-xs">
        {/* Document Header & Scroll Indicator */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
              📜
            </span>
            <div>
              <p className="font-extrabold text-stone-900 text-xs">Patient Informed Consent &amp; Privacy Governance</p>
              <p className="text-[11px] text-stone-500">
                Please scroll through the Terms of Service and Privacy Policy below to complete agreement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-stone-600">{scrollProgress}% Read</span>
            <div className="w-24 bg-stone-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${hasScrolledToBottom ? "bg-emerald-500" : "bg-emerald-600"}`}
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            {hasScrolledToBottom ? (
              <Badge variant="success" size="micro">✓ Complete</Badge>
            ) : (
              <Badge variant="warning" size="micro">Scroll down</Badge>
            )}
          </div>
        </div>

        {/* Scrollable PDF/Doc Simulated Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="bg-white border-2 border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 max-h-96 overflow-y-auto overscroll-contain text-stone-700 leading-relaxed font-sans shadow-inner"
        >
          {/* Section 1: Terms of Service */}
          <div className="space-y-2 border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-stone-900 text-sm">
                Classical Homoeopathy &amp; Tele-Health Consultation Terms of Service
              </h4>
            </div>
            <p className="text-[11px]">
              By creating a patient account with {hospitalName}, you understand and consent that Homoeopathic consultation is an individualised constitutional method of treatment. Consultations involve in-depth case elicitation of physical, mental, emotional, and lifestyle symptoms.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-600">
              <li>Consultations are scheduled on a prior appointment basis with dedicated physician time slots.</li>
              <li>Tele-consultations (video / phone) are intended for outpatient chronic care and non-emergency follow-ups.</li>
              <li><strong>Acute Medical Emergencies:</strong> Homoeopathic tele-care does not replace immediate critical hospital ER care. In case of acute chest pain, severe breathlessness, or trauma, visit your nearest emergency room immediately.</li>
              <li>Patient agrees to provide accurate personal medical history, drug allergies, and current medications during consultation intake.</li>
            </ul>
          </div>

          {/* Section 2: Privacy Policy */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-stone-900 text-sm">
                Protected Health Information (PHI), DPDP &amp; HIPAA Privacy Policy
              </h4>
            </div>
            <p className="text-[11px]">
              We adhere strictly to India’s <em>Digital Personal Data Protection (DPDP) Act</em> and international HIPAA data privacy principles:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-600">
              <li><strong>Zero Data Monetization:</strong> Your medical records, prescriptions, tongue photographs, lab investigations, and case summaries are NEVER sold or shared with third-party advertisers or insurance aggregators.</li>
              <li><strong>End-to-End Encryption:</strong> All patient data in transit and at rest is protected with AES-256 and PBKDF2 cryptography.</li>
              <li><strong>Tenant &amp; Physician Isolation:</strong> Patient records are strictly scoped to {hospitalName}. If you visit multiple clinics, your clinical files remain completely isolated and are never co-mingled.</li>
              <li><strong>Right to Erasure &amp; Portability:</strong> You may request an export or deletion of your digital clinical file at any time by contacting clinic compliance.</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TermsPrivacyModal;

