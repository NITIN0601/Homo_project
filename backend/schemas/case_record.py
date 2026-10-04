"""
Classical Homeopathy Pydantic v2 Schema Definitions.
Strict typing, clinical enum validations, and automatic default sanitization.
"""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

ThermalStateEnum = Literal["Chilly", "Hot", "Ambothermal", "Unknown"]
MiasmEnum = Literal["Psoric", "Sycotic", "Syphilitic", "Tubercular", "Acute", "Mixed"]


class SpeechLanguage(BaseModel):
    original: str = Field(default="Telugu", description="Spoken consultation language")
    processed: str = Field(default="English", description="Target processed medical language")


class Metadata(BaseModel):
    interaction_id: str = Field(default="", description="Unique clinical encounter identifier")
    visiting_date: str = Field(default="", description="YYYY-MM-DD consultation date")
    visiting_time: str = Field(default="", description="HH:MM consultation start time")
    speech_language: SpeechLanguage = Field(default_factory=SpeechLanguage)
    audio_checksum_sha256: str | None = Field(default=None, description="SHA-256 hash of raw recording")
    recording_retained: bool = Field(default=True, description="Whether doctor kept the audio source of truth")
    recording_path: str | None = Field(default=None, description="Local path to immutable source recording")
    raw_transcript: str | None = Field(default="", description="Raw speech-to-text transcript")


class DoctorDetails(BaseModel):
    doctor_id: str = Field(default="DOC-BK-001")
    name: str = Field(default="Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH")
    clinic_name: str = Field(default="Agastya Homoeopathy Clinic")


class PatientDetails(BaseModel):
    name: str = Field(default="")
    age: int | None = Field(default=None)
    gender: str | None = Field(default=None)
    place_of_birth: str | None = Field(default=None)
    is_existing_patient: bool = Field(default=True)

    @field_validator("age", mode="before")
    @classmethod
    def parse_age(cls, v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None


class PastIllnessItem(BaseModel):
    condition: str = Field(default="")
    onset_year: int | None = Field(default=None)
    status: str | None = Field(default="")


class FamilyHistoryItem(BaseModel):
    relation: str = Field(default="")
    condition: str = Field(default="")


class AllopathicMedication(BaseModel):
    drug_name: str = Field(default="")
    dosage: str = Field(default="")
    frequency: str = Field(default="")
    purpose: str = Field(default="")


class PreviousHomeopathicRemedy(BaseModel):
    remedy: str = Field(default="")
    potency: str = Field(default="")
    outcome: str = Field(default="")


class DrugHistory(BaseModel):
    allopathic_medications: list[AllopathicMedication] = Field(default_factory=list)
    previous_homeopathic_remedies: list[PreviousHomeopathicRemedy] = Field(default_factory=list)
    drug_allergies: list[str] = Field(default_factory=list)


class PatientMedicalHistory(BaseModel):
    past_illnesses: list[PastIllnessItem] = Field(default_factory=list)
    family_history: list[FamilyHistoryItem] = Field(default_factory=list)
    drug_history: DrugHistory = Field(default_factory=DrugHistory)


class Modalities(BaseModel):
    aggravation: str = Field(default="", description="Factors worsening the complaints (e.g. cold air, morning)")
    amelioration: str = Field(default="", description="Factors relieving the complaints (e.g. warmth, rest)")


class ChiefComplaintItem(BaseModel):
    location: str = Field(default="", description="Organ, tissue, or anatomical position")
    sensation: str = Field(default="", description="Type of pain, sensation, or discomfort")
    modalities: Modalities = Field(default_factory=Modalities)
    concomitants: str | None = Field(default="", description="Accompanying systemic or unrelated symptoms")


class CravingsAversions(BaseModel):
    cravings: list[str] = Field(default_factory=list)
    aversions: list[str] = Field(default_factory=list)


class GeneralsAndConstitution(BaseModel):
    thermal_state: str = Field(default="Chilly", description="Chilly, Hot, or Ambothermal")
    thirst: str = Field(default="", description="Thirsty, Thirstless, drinks small sips, large quantities")
    cravings_aversions: CravingsAversions = Field(default_factory=CravingsAversions)
    sleep_and_dreams: str = Field(default="")
    mental_emotional_state: str = Field(default="", description="Mind rubric & disposition")


class HomeopathicCaseAnalysis(BaseModel):
    chief_complaints: list[ChiefComplaintItem] = Field(default_factory=list)
    generals_and_constitution: GeneralsAndConstitution = Field(default_factory=GeneralsAndConstitution)


class ClinicalSummary(BaseModel):
    conversation_summary: str = Field(default="")
    miasmatic_predominance: str = Field(default="Psoric", description="Psoric, Sycotic, Syphilitic, or Tubercular")


class PrescribedRemedyItem(BaseModel):
    remedy_name: str = Field(default="", description="Latin homeopathic simillimum name")
    potency: str = Field(default="30C", description="e.g. 30C, 200C, 1M, Q/LM-1")
    dosage_form: str = Field(default="Globules (Size 30 cane sugar pills)")
    frequency: str = Field(default="Twice daily")
    instructions: str = Field(default="")


class NextVisit(BaseModel):
    recommended_date: str | None = Field(default=None)
    time_frame: str | None = Field(default="In 14 days")


class TreatmentPlan(BaseModel):
    medicines_suggested: list[PrescribedRemedyItem] = Field(default_factory=list)
    next_visit: NextVisit = Field(default_factory=NextVisit)


class PatientVisibilityPermissions(BaseModel):
    share_remedies: bool = Field(default=True)
    share_modalities: bool = Field(default=True)
    share_lifestyle: bool = Field(default=True)
    share_mental_state: bool = Field(default=False)
    share_miasm: bool = Field(default=False)
    share_conversation_summary: bool = Field(default=False)


class HomeopathicCaseRecord(BaseModel):
    """
    Master Clinical Schema for Classical Homeopathy Consultations.
    Matches standard homeopathic case taking (Hahnemannian Organon §83-§104).
    """
    metadata: Metadata = Field(default_factory=Metadata)
    doctor_details: DoctorDetails = Field(default_factory=DoctorDetails)
    patient_details: PatientDetails = Field(default_factory=PatientDetails)
    patient_medical_history: PatientMedicalHistory = Field(default_factory=PatientMedicalHistory)
    homeopathic_case_analysis: HomeopathicCaseAnalysis = Field(default_factory=HomeopathicCaseAnalysis)
    clinical_summary: ClinicalSummary = Field(default_factory=ClinicalSummary)
    treatment_plan: TreatmentPlan = Field(default_factory=TreatmentPlan)
    patient_visibility_permissions: PatientVisibilityPermissions = Field(
        default_factory=PatientVisibilityPermissions
    )
