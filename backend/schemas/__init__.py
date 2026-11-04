"""
Central Pydantic Schemas SSOT.
"""

from schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from schemas.billing import PaymentValidateRequest
from schemas.case_record import HomeopathicCaseRecord
from schemas.clinical import (
    FileHashRequest,
    JevRepertorizeRequest,
    JevSymptomItem,
    PatientRecordCreate,
    TextParseRequest,
    TypeSafeJevClassifyRequest,
)
from schemas.communications import (
    EmailNotificationRequest,
    WhatsAppMessageRequest,
    WhatsAppRegisterRequest,
)
from schemas.dispensary import RestockRequest
from schemas.scheduling import BookAppointmentRequest

__all__ = [
    "GoogleAuthRequest",
    "LoginRequest",
    "RegisterRequest",
    "SendOtpRequest",
    "VerifyOtpRequest",
    "PaymentValidateRequest",
    "HomeopathicCaseRecord",
    "FileHashRequest",
    "JevRepertorizeRequest",
    "JevSymptomItem",
    "PatientRecordCreate",
    "TextParseRequest",
    "TypeSafeJevClassifyRequest",
    "EmailNotificationRequest",
    "WhatsAppMessageRequest",
    "WhatsAppRegisterRequest",
    "RestockRequest",
    "BookAppointmentRequest",
]

