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
    primary_color: str = Field(default="#0d9488", example="#0d9488")
    accent_color: str = Field(default="#14b8a6", example="#14b8a6")
    features: dict[str, bool] | None = Field(
        default=None,
        description="Feature flag overrides (enableECommerce, enableVoiceStudio, etc.)",
    )


class DoctorCreateRequest(BaseModel):
    hospital_id: str = Field(..., example="agastya", description="Hospital tenant this practitioner belongs to")
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
