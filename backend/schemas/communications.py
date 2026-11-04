"""
Communications, Email & WhatsApp Request Schemas.
"""

from pydantic import BaseModel, Field


class EmailNotificationRequest(BaseModel):
    email: str = Field(..., example="patient@example.com")
    subject: str = Field(..., example="Appointment Reminder")
    body: str | None = Field(default=None, example="Your consultation is scheduled tomorrow at 10:00 AM.")


class WhatsAppRegisterRequest(BaseModel):
    doctorName: str = Field(default="", example="Attending Physician")
    phoneNumberId: str | None = Field(default=None, example="100609346426085")
    businessAccountId: str | None = Field(default=None, example="100609346426084")
    accessToken: str | None = Field(default=None, example="EAAB...")
    whatsappNumber: str | None = Field(default=None, example="+91 70195 76255")
    autoNotifyRegistration: bool | None = Field(default=True)
    autoNotifyPrescriptions: bool | None = Field(default=True)

    model_config = {"extra": "allow"}


class WhatsAppMessageRequest(BaseModel):
    phone: str = Field(..., example="+91 98450 12345")
    message: str = Field(..., example="Your appointment is confirmed.")
    type: str = Field(default="text")
