"""
Scheduling & Appointment Request Schemas.
"""

from pydantic import BaseModel, Field


class BookAppointmentRequest(BaseModel):
    user_email: str = Field(..., example="patient@example.com")
    user_name: str = Field(..., example="Patient Name")
    user_phone: str | None = Field(default=None, example="+1234567890")
    start_time: str = Field(..., example="2026-11-05T10:00:00")
    end_time: str = Field(..., example="2026-11-05T10:30:00")
    summary: str | None = Field(default=None, example="Clinical Consultation")
    description: str | None = Field(default=None, example="Clinical consultation review")
    calendar_id: str | None = Field(default=None, example="primary")
    hospital_id: str | None = Field(default=None, example="default", description="Hospital / Tenant ID")
    doctor_id: str | None = Field(default=None, example="doc-001", description="Doctor ID in hospital roster")
    continuity_status: str | None = Field(default=None, description="Continuity tag: Continuing Care, Transferred, New")
    hospital_date: str | None = Field(default=None, description="Doctor/Hospital date in facility local timezone")
    clinic_date: str | None = Field(default=None, description="Doctor/Hospital date in facility local timezone")
    hospital_slot: str | None = Field(
        default=None, description="Doctor/Hospital time slot in facility local timezone (24h format)"
    )
    clinic_slot: str | None = Field(
        default=None, description="Doctor/Hospital time slot in facility local timezone (24h format)"
    )
    user_date: str | None = Field(default=None, description="Patient date in patient local timezone")
    user_time: str | None = Field(default=None, description="Patient time in patient local timezone")
    user_timezone: str | None = Field(default=None, description="Patient local IANA timezone e.g. America/New_York")
    consultation_type: str | None = Field(default=None, description="Consultation type e.g. Online Tele-Consultation")


class DoctorSummary(BaseModel):
    id: str
    name: str
    short_name: str | None = None
    title: str | None = None
    qualifications: str | None = None
    specialties: list[str] = Field(default_factory=list)
    avatar_url: str | None = None
    is_active: bool = True
    calendar_id: str | None = None
    is_primary: bool = False


class ContinuityPreferenceResponse(BaseModel):
    is_returning_patient: bool
    status: str  # "new_patient", "preferred_doctor_available", "doctor_unavailable_on_date", "doctor_inactive"
    message: str
    last_visit_date: str | None = None
    preferred_doctor: DoctorSummary | None = None
    previous_doctor_name: str | None = None
    recommended_alternate: DoctorSummary | None = None
    next_available_date: str | None = None
    case_transfer_required: bool = False
    hospital_doctors: list[DoctorSummary] = Field(default_factory=list)
