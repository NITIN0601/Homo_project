import React from "react";
import type { HospitalTenantConfig } from "@core/types/tenant";
import { Button, Card } from "../../../shared/ui";
import { BrandingPaletteFields, type BrandingPaletteValues } from "./forms/BrandingPaletteFields";

interface BrandingSectionProps {
  formData: HospitalTenantConfig;
  setFormData: React.Dispatch<React.SetStateAction<HospitalTenantConfig>>;
  onSaveBranding: () => void;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({
  formData,
  setFormData,
  onSaveBranding,
}) => {
  const brandingValues: BrandingPaletteValues = {
    primaryColor: formData.branding.primaryColor,
    accentColor: formData.branding.accentColor,
    logoUrl: formData.branding.logoUrl,
    bannerUrl: formData.branding.bannerUrl,
    aboutHospitalText: formData.branding.aboutHospitalText || "",
  };

  const handleBrandingChange = (field: keyof BrandingPaletteValues, val: string) => {
    setFormData((prev: HospitalTenantConfig) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: val,
      },
    }));
  };

  return (
    <Card variant="default" className="space-y-4">
      <div className="border-b border-stone-100 pb-3">
        <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
          <span>🎨</span> Branding, Media, Logo &amp; Banner
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          Customize logos, header banners, color scheme tokens, and about narrative with synchronized live styling.
        </p>
      </div>

      <BrandingPaletteFields
        values={brandingValues}
        onChange={handleBrandingChange}
      />

      {/* Group Dedicated Action Bar: Save & Apply Branding */}
      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
        <p className="text-[11px] text-stone-500">
          Save facility logo image, header banner image, and brand theme colors.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSaveBranding}
        >
          <span>💾</span> Save &amp; Apply Branding Settings
        </Button>
      </div>
    </Card>
  );
};

export default BrandingSection;
