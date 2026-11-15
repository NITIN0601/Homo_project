"""
Hospital & Doctor Domain Schemas for Multi-Tenant Management.
"""

from pydantic import BaseModel, Field


class HospitalCreateRequest(BaseModel):
    id: str = Field(..., example="city-care", description="Unique alphanumeric hospital slug/id")
    name: str = Field(..., example="City Care Medical Center")
    short_name: str | None = Field(default=None, example="City Care")
    tagline: str | None = Field(default="Compassionate healthcare", example="Compassionate healthcare")
    domain: str | None = Field(default=None, example="citycare.org")
    phone: str = Field(default="+91 98450 12345", example="+91 98450 12345")
    email: str = Field(default="admin@citycare.org", example="admin@citycare.org")
    street: str | None = Field(default=None, example="123 Health Ave")
    city: str | None = Field(default="Bengaluru", example="Bengaluru")
    state: str | None = Field(default="Karnataka", example="Karnataka")
    country: str | None = Field(default="India", example="India")
    currency: str | None = Field(default=None, example="INR")
    currency_symbol: str | None = Field(default=None, example="₹")
    primary_color: str = Field(default="#0d9488", example="#0d9488")
    accent_color: str = Field(default="#14b8a6", example="#14b8a6")
    features: dict[str, bool] | None = Field(
        default=None,
        description="Feature flag overrides (enableECommerce, enableVoiceStudio, etc.)",
    )


class DoctorCreateRequest(BaseModel):
    hospital_id: str = Field(..., example="default", description="Hospital tenant this practitioner belongs to")
    name: str = Field(..., example="Dr. Jane Doe, MD")
    short_name: str | None = Field(default=None, example="Dr. Jane Doe")
    title: str | None = Field(default=None, example="Senior Consultant Physician")
    email: str = Field(..., example="jane.doe@hospital.org")
    phone: str | None = Field(default="+91 98450 12345", example="+91 98450 12345")
    qualifications: str = Field(default="BHMS, MD", example="BHMS, MD")
    experience_years: int = Field(default=5, ge=0, example=5)
    specialties: list[str] = Field(default_factory=lambda: ["General Practice"], example=["Classical Homeopathy"])
    bio: str | None = Field(default=None, example="Experienced homeopathic clinician.")
    reg_no: str | None = Field(default=None, example="MED-REG-2026-001")
    is_primary: bool = Field(default=False, example=False)


class DevModeToggleRequest(BaseModel):
    use_mock_data: bool = Field(..., description="True to activate Mock Dev Data, False for Production DB/PostgreSQL")


class HospitalOnboardRequest(BaseModel):
    # Hospital details
    id: str = Field(..., example="apollo-care", description="Hospital tenant slug/id")
    name: str = Field(..., example="Apollo Health City")
    short_name: str | None = Field(default=None, example="Apollo Care")
    tagline: str | None = Field(default="Clinical Excellence Everywhere")
    phone: str = Field(default="+91 80 4900 1122")
    email: str = Field(default="admin@apollocare.in")
    street: str | None = Field(default="Jubilee Hills")
    city: str | None = Field(default="Hyderabad")
    state: str | None = Field(default="Telangana")
    pincode: str | None = Field(default="500033")
    country: str | None = Field(default="India")
    currency: str | None = Field(default=None, example="INR")
    currency_symbol: str | None = Field(default=None, example="₹")
    primary_color: str = Field(default="#1e3a8a")
    accent_color: str = Field(default="#0284c7")

    # Operational Hours & Scheduling
    timezone: str | None = Field(default="Asia/Kolkata", example="Asia/Kolkata")
    morning_hours: str | None = Field(default="10:00 AM – 01:30 PM", example="10:00 AM – 01:30 PM")
    evening_hours: str | None = Field(default="05:00 PM – 08:30 PM", example="05:00 PM – 08:30 PM")
    sunday_policy: str | None = Field(default="Prior Appointment Only", example="Prior Appointment Only")

    # Feature / Capability Toggles (What Doctor & Patient can view/use)
    features: dict[str, bool] | None = Field(
        default=None,
        description="Feature flag overrides (Doctor portal & Patient portal capabilities)",
    )

    # Doctor details
    doctor_name: str = Field(..., example="Dr. Rajesh Sharma")
    doctor_title: str | None = Field(default=None, example="Senior Consultant Physician, MD")
    doctor_email: str = Field(..., example="dr.sharma@apollocare.in")
    doctor_phone: str | None = Field(default="+91 98450 12345")
    doctor_qualifications: str | None = Field(default="MD, MBBS, Fellowship in Telemedicine")
    doctor_reg_no: str | None = Field(default=None, example="MCI-2012-8841")
    doctor_experience_years: int = Field(default=10, ge=0)
    doctor_specialties: list[str] = Field(default_factory=lambda: ["General Medicine", "Telehealth"])
    doctor_bio: str | None = Field(default=None)
    doctor_available_days: str | None = Field(default="Monday – Saturday", example="Monday – Saturday")
    doctor_consultation_fee: float | None = Field(default=750.0, ge=0, example=750.0)


class HospitalFeaturesUpdateRequest(BaseModel):
    features: dict[str, bool] = Field(..., description="Map of feature toggles for doctor and patient views")
