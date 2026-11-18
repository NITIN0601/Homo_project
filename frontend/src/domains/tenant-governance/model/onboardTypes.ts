import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "@core/types/tenant";

export interface OnboardHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSlugs: string[];
  initialTenant?: HospitalTenantConfig | null;
  onOnboard: (
    tenant: HospitalTenantConfig,
    doctor: HospitalDoctor,
    features: HospitalFeatures
  ) => Promise<{ inviteUrl: string; emailDelivery?: any } | void>;
}

export interface OnboardFormState {
  hospitalName: string;
  hospitalSlug: string;
  facilityType: "hospital" | "clinic";
  tagline: string;
  phone: string;
  email: string;
  country: string;
  state: string;
  city: string;
  street: string;
  pincode: string;
  timezone: string;
  timezoneManualOverride: boolean;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  bannerUrl: string;
  aboutHospitalText: string;
  termsConditionsText: string;
  privacyPolicyText: string;
  emergencyNotice: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  doctorTitle: string;
  doctorQual: string;
  doctorRegNo: string;
  doctorExp: number;
  doctorSpecialties: string;
  doctorBio: string;
  doctorFee: number;
  morningHours: string;
  eveningHours: string;
  availableDays: string;
  sundayPolicy: "Prior Appointment Only" | "Walk-in OPD" | "Closed";
  features: HospitalFeatures;
}

export interface StepProps {
  form: OnboardFormState;
  updateField: <K extends keyof OnboardFormState>(key: K, value: OnboardFormState[K]) => void;
}
