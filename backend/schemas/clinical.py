"""
Clinical Records, AI Scribe & Repertorization Request Schemas.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from schemas.case_record import HomeopathicCaseRecord


class TextParseRequest(BaseModel):
    text: str = Field(..., description="Raw clinical dictation or patient consultation text")
    provider: str | None = Field(default="gemini", description="LLM Provider: gemini, groq, openai, anthropic, ollama")
    model: str | None = Field(default=None, description="Specific model name (e.g. gemini-2.5-flash, llama-3.3-70b-versatile)")
    api_key: str | None = Field(default=None, description="Optional custom user API key for BYOK")
    patient_name: str | None = Field(default="Anonymous Consultation", description="Patient identifier")


class FileHashRequest(BaseModel):
    file_hash: str = Field(..., description="Cryptographic SHA-256 hash of image content")
    file_name: str = Field(..., description="Original file name uploaded")
    file_size_bytes: int = Field(..., ge=1, description="Size in bytes")
    mime_type: str = Field(default="image/jpeg", description="MIME type")


class PatientRecordCreate(BaseModel):
    patient_name: str = Field(..., example="Patient Name")
    visiting_date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    homeopathic_analysis: HomeopathicCaseRecord
    local_audio_path: str | None = None
    prescription_image_path: str | None = None


class TypeSafeJevClassifyRequest(BaseModel):
    state: str = Field(
        ...,
        description="Clinical patient complaint or dictation text to classify with TypeSafe AI Jev",
        example="Patient reports acute throbbing headache and burning sensation aggravated by noise and light",
    )
    custom_questions: dict[str, Any] | None = None


class JevSymptomItem(BaseModel):
    name: str = Field(..., example="Bloating and gas after eating")
    category: str = Field(default="general", example="general")
    is_srp: bool = Field(default=False, example=False)
    intensity: int = Field(default=2, ge=1, le=4)


class JevRepertorizeRequest(BaseModel):
    symptoms: list[JevSymptomItem] | None = None
    state: str | None = None
