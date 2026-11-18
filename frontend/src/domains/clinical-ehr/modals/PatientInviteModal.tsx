import React, { useState } from "react";
import type { UserProfile } from "@core/types";
import { Modal, Button } from "../../../shared/ui";
import { api } from "@app/api/apiServiceFacade";
import { useTenant } from "@core/tenancy";
import { useHospital } from "@core/tenancy/context/useHospital";

interface PatientInviteModalProps {
  patient: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatientInviteModal: React.FC<PatientInviteModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const { tenant } = useTenant();
  const { facilityLabel } = useHospital();
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(Boolean(patient?.phone));

  if (!patient || !isOpen) return null;

  const handleGenerateInvite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.invite({
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        hospital_id: tenant.id,
        role: "patient",
        custom_message: customMessage.trim() || undefined,
        send_email: sendEmail,
        send_sms: sendSms,
      });
      if (res && res.invite_url) {
        setInviteUrl(res.invite_url);
      } else {
        setError("Failed to generate invite token. Please retry.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not generate activation invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendWhatsApp = () => {
    if (!inviteUrl || !patient.phone) return;
    const cleanPhone = patient.phone.replace(/\D/g, "");
    const notePart = customMessage.trim() ? `\n\nNote from ${tenant.name}: "${customMessage.trim()}"` : "";
    const waText = encodeURIComponent(
      `Hello ${patient.name}, your doctor at ${tenant.name} (${facilityLabel}) has invited you to activate your personal health portal. Complete your registration to view prescriptions and bills:${notePart}\n\n${inviteUrl}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${waText}`, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`✉️ Send ${facilityLabel} Portal Activation`}
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-1.5">
          <p className="text-stone-700 font-bold">
            Patient: <span className="text-stone-900">{patient.name}</span>
          </p>
          <p className="text-stone-500">
            Email: <span className="font-mono text-stone-800">{patient.email}</span> · Phone: {patient.phone || "Not on file"}
          </p>
          <p className="text-[11px] text-stone-400">
            {facilityLabel} Scope: <strong>{tenant.name}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {!inviteUrl ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-700 block">
                Custom Invitation Note (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={`Personal note to ${patient.name} from ${tenant.name} administration...`}
                rows={2}
                className="w-full text-xs bg-white border border-stone-300 rounded-xl p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-bold text-stone-700 text-[11px] uppercase tracking-wider">
                Automated Dispatch Options
              </p>
              <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Send dynamic branded email to <strong>{patient.email}</strong></span>
              </label>
              {patient.phone && (
                <label className="flex items-center gap-2 cursor-pointer text-stone-700">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Dispatch SMS / WhatsApp notice to <strong>{patient.phone}</strong></span>
                </label>
              )}
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Generating an invitation creates a secure, 7-day token bound directly to {tenant.name}.
            </p>

            <Button
              type="button"
              variant="primary"
              fullWidth
              isLoading={loading}
              onClick={handleGenerateInvite}
              className="py-2.5 rounded-xl text-xs font-bold"
            >
              Dispatch Customized {facilityLabel} Activation Link →
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1 animate-fadeIn">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                Unique Activation URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="w-full text-xs font-mono bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-stone-800 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 text-xs"
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleSendWhatsApp}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent text-xs rounded-xl py-2.5"
              >
                <span>📱</span> Send on WhatsApp
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="text-xs rounded-xl py-2.5"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};


export default PatientInviteModal;
