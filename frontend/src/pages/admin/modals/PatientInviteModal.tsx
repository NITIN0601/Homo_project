import React, { useState } from "react";
import type { UserProfile } from "../../../types";
import { Modal, Button } from "../../../components/ui";
import { api } from "../../../services/api";
import { useTenant } from "../../../context/ThemeProvider";

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
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const waText = encodeURIComponent(
      `Hello ${patient.name}, your doctor at ${tenant.name} has created your clinical medical record. Complete your portal registration to view prescriptions and bills:\n${inviteUrl}`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${waText}`, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✉️ Send Patient Portal Activation"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs space-y-1.5">
          <p className="text-stone-700 font-bold">
            Patient: <span className="text-stone-900">{patient.name}</span>
          </p>
          <p className="text-stone-500">
            Email: <span className="font-mono text-stone-800">{patient.email}</span> · Phone: {patient.phone}
          </p>
          <p className="text-[11px] text-stone-400">
            Hospital Scope: <strong>{tenant.name}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium">
            ⚠️ {error}
          </div>
        )}

        {!inviteUrl ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-stone-600 leading-relaxed">
              Generating an invitation creates a secure, 7-day token bound directly to this hospital.
              The patient will be prompted to create their portal password upon opening the link.
            </p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              isLoading={loading}
              onClick={handleGenerateInvite}
              className="py-2.5 rounded-xl text-xs font-bold"
            >
              Generate 7-Day Portal Activation Link →
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

