import React, { useState } from "react";
import type { HospitalTenantConfig, HospitalFeatures } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FeatureToggleGroup } from "../../components/common/FeatureToggleGroup";

export interface ManageFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: HospitalTenantConfig | null;
  onSave: (features: HospitalFeatures) => Promise<void> | void;
}

interface ManageFeaturesBodyProps {
  hospital: HospitalTenantConfig;
  onClose: () => void;
  onSave: (features: HospitalFeatures) => Promise<void> | void;
}

const ManageFeaturesBody: React.FC<ManageFeaturesBodyProps> = ({ hospital, onClose, onSave }) => {
  const [features, setFeatures] = useState<HospitalFeatures>(() => ({ ...hospital.features }));
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof HospitalFeatures, value: boolean) => {
    setFeatures((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "enableOnlinePayments") {
        next.enableCustomerPayments = value;
      } else if (key === "enableCustomerPayments") {
        next.enableOnlinePayments = value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(features);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-4 py-2">
        <FeatureToggleGroup features={features} onChange={handleToggle} category="all" />
      </div>

      <div className="flex items-center justify-end gap-2 w-full pt-4 border-t border-stone-100">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isSaving ? "Saving..." : "Save Feature Governance →"}
        </Button>
      </div>
    </>
  );
};

export const ManageFeaturesModal: React.FC<ManageFeaturesModalProps> = ({
  isOpen,
  onClose,
  hospital,
  onSave,
}) => {
  if (!hospital) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Feature Enablement & Governance: ${hospital.name}`}
      subtitle={`Super Admin Master Control: Enable or disable Hospital features, Doctor clinical capabilities, and Patient portal visibility for ${hospital.name}.`}
    >
      <ManageFeaturesBody
        key={hospital.id}
        hospital={hospital}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
};
