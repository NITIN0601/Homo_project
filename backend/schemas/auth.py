"""
Authentication & User Request Schemas.
"""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str = Field(..., example="user@example.com")
    password: str = Field(..., example="SecurePassword123!")


class RegisterRequest(BaseModel):
    name: str = Field(..., example="Patient Name")
    first_name: str | None = Field(default=None, example="First")
    middle_name: str | None = Field(default=None, example="")
    last_name: str | None = Field(default=None, example="Last")
    email: str = Field(..., example="user@example.com")
    password: str = Field(..., min_length=6, example="Secret123!")
    role: str | None = Field(default="patient", example="patient")
    phone: str | None = Field(default=None, example="+1234567890")
    hospital_id: str | None = Field(default="agastya", example="agastya")


class SendOtpRequest(BaseModel):
    email: str = Field(..., example="user@example.com")


class VerifyOtpRequest(BaseModel):
    email: str = Field(..., example="user@example.com")
    otp: str = Field(..., example="123456")


class GoogleAuthRequest(BaseModel):
    id_token: str | None = None
    email: str = Field(..., example="user@example.com")
    name: str = Field(default="Google User", example="Authenticated User")
    portal_intent: str = Field(default="patient", description="'admin' or 'patient'")
    hospital_id: str | None = Field(default="agastya", example="agastya")


class InviteUserRequest(BaseModel):
    name: str = Field(..., example="Dr. Jane Smith")
    email: str = Field(..., example="doctor@hospital.org")
    role: str = Field(default="patient", description="'patient', 'admin', or 'doctor'")
    hospital_id: str = Field(default="agastya", example="agastya")
    phone: str | None = Field(default=None, example="+1234567890")
    send_notification: bool = Field(default=True, description="Send automated invite email")


class VerifyInviteRequest(BaseModel):
    token: str = Field(..., example="inv_abc123456")
    password: str = Field(..., min_length=6, example="NewPassword123!")
