import React from "react";
import type { HospitalTenantConfig } from "../../../types/tenant";
import { Button, Card, Input } from "../../../components/ui";

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
  return (
    <Card variant="default" className="space-y-4">
      <div className="border-b border-stone-100 pb-3">
        <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
          <span>🎨</span> Branding, Media, Logo &amp; Banner
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          Customize logos, header banners, and hospital color scheme tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Clinic Logo URL"
          value={formData.branding.logoUrl || ""}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              branding: { ...p.branding, logoUrl: e.target.value },
            }))
          }
          placeholder="https://example.com/logo.png"
        />
        <Input
          label="Clinic Header Banner Image URL"
          value={formData.branding.bannerUrl || ""}
          onChange={(e) =>
            setFormData((p) => ({
              ...p,
              branding: { ...p.branding, bannerUrl: e.target.value },
            }))
          }
          placeholder="https://example.com/clinic-banner.jpg"
        />
      </div>

      {/* Color Palettes preview */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-bold text-stone-700">Hospital Brand Colors:</span>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
            style={{ backgroundColor: formData.branding.primaryColor }}
          />
          <span className="font-mono text-stone-600">Primary: {formData.branding.primaryColor}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
            style={{ backgroundColor: formData.branding.accentColor }}
          />
          <span className="font-mono text-stone-600">Accent: {formData.branding.accentColor}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
            style={{ backgroundColor: formData.branding.neutralBg }}
          />
          <span className="font-mono text-stone-600">Bg: {formData.branding.neutralBg}</span>
        </div>
      </div>

      {/* Group Dedicated Action Bar: Save & Apply Branding */}
      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
        <p className="text-[11px] text-stone-500">
          Save clinic logo image, header banner image, and brand theme colors.
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

