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
