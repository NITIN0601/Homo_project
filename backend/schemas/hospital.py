"""
Hospital & Doctor Domain Schemas for Multi-Tenant Management.
"""

from pydantic import BaseModel, Field


class HospitalDeploymentSchema(BaseModel):
    backend_url: str | None = Field(default="", example="https://api.hospital.org")
    frontend_url: str | None = Field(default="", example="https://hospital.org")
    deployment_status: str | None = Field(default="draft", example="draft")
    deployment_version: str | None = Field(default="v1.0.0", example="v1.0.0")
    last_deployed_at: str | None = Field(default=None)
    supported_browsers: list[str] | None = Field(
        default_factory=lambda: ["Chrome >= 110", "Safari >= 16", "Firefox >= 115", "Edge >= 110"]
    )
    supported_devices: list[str] | None = Field(
        default_factory=lambda: [
            "Desktop (macOS / Windows / Linux)",
            "Tablet (iPad / Android Tablet)",
            "Mobile (iOS / Android)",
        ]
    )


class HospitalLLMSchema(BaseModel):
    provider: str | None = Field(default="gemini", example="gemini")
    model_id: str | None = Field(default="gemini-1.5-flash", example="gemini-1.5-flash")
    api_key: str | None = Field(default="", example="")
    endpoint_url: str | None = Field(default="", example="")


class HospitalPaymentGatewaySchema(BaseModel):
    provider: str | None = Field(default="upi", example="upi")
    merchant_id: str | None = Field(default="", example="")
    api_key: str | None = Field(default="", example="")
    account_email: str | None = Field(default="", example="")
    upi_id: str | None = Field(default="", example="")


class HospitalGoogleIntegrationSchema(BaseModel):
    client_id: str | None = Field(default="", example="")
    calendar_id: str | None = Field(default="primary", example="primary")
    service_account_email: str | None = Field(default="", example="")


class HospitalWhatsAppSchema(BaseModel):
    enabled: bool = Field(default=True)
    business_account_id: str | None = Field(default="", example="WABA-99881122")
    phone_number_id: str | None = Field(default="", example="1092837465")
    api_token: str | None = Field(default="", example="EAAB...")
    display_number: str | None = Field(default="+91 98450 12345", example="+91 98450 12345")
    custom_greeting: str | None = Field(default=None, example="Namaste! Welcome to our healthcare center.")
    chat_url: str | None = Field(default=None, example="https://wa.me/919845012345")


class HospitalInstagramSchema(BaseModel):
    enabled: bool = Field(default=True)
    handle: str | None = Field(default="", example="@cliniccare")
    profile_url: str | None = Field(default="", example="https://instagram.com/cliniccare")
    account_id: str | None = Field(default="", example="ig_10293847")
    access_token: str | None = Field(default="", example="")
    auto_reply_enabled: bool = Field(default=False)
    direct_booking_enabled: bool = Field(default=True)


class HospitalSocialMediaSchema(BaseModel):
    whatsapp: HospitalWhatsAppSchema | None = Field(default_factory=HospitalWhatsAppSchema)
    instagram: HospitalInstagramSchema | None = Field(default_factory=HospitalInstagramSchema)
    facebook_url: str | None = Field(default="")
    youtube_url: str | None = Field(default="")
    linkedin_url: str | None = Field(default="")


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
    facility_type: str | None = Field(default="hospital", example="hospital", description="'hospital' or 'clinic'")
    primary_color: str = Field(default="#0d9488", example="#0d9488")
    accent_color: str = Field(default="#14b8a6", example="#14b8a6")
    logo_url: str | None = Field(default="/generic-hospital-logo.svg", example="/generic-hospital-logo.svg")
    banner_url: str | None = Field(default="/assets/banner.jpg", example="/assets/banner.jpg")
    about_hospital_text: str | None = Field(default=None, example="Specialized outpatient medical facility.")
    terms_conditions_text: str | None = Field(default=None)
    privacy_policy_text: str | None = Field(default=None)
    emergency_notice: str | None = Field(default=None)
    legal: dict[str, str | None] | None = Field(default=None)
    deployment: HospitalDeploymentSchema | None = Field(default=None)
    llm_config: HospitalLLMSchema | None = Field(default=None)
    payment_gateway: HospitalPaymentGatewaySchema | None = Field(default=None)
    google_integration: HospitalGoogleIntegrationSchema | None = Field(default=None)
    social_media: HospitalSocialMediaSchema | None = Field(default=None)
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
    facility_type: str | None = Field(default="hospital", example="hospital", description="'hospital' or 'clinic'")
    primary_color: str = Field(default="#1e3a8a")
    accent_color: str = Field(default="#0284c7")
    logo_url: str | None = Field(default="/generic-hospital-logo.svg", example="/generic-hospital-logo.svg")
    banner_url: str | None = Field(default="/assets/banner.jpg", example="/assets/banner.jpg")
    about_hospital_text: str | None = Field(
        default=None, example="Comprehensive health center dedicated to clinical precision."
    )
    terms_conditions_text: str | None = Field(default=None)
    privacy_policy_text: str | None = Field(default=None)
    emergency_notice: str | None = Field(default=None)
    legal: dict[str, str | None] | None = Field(default=None)

    # Deployment, LLM, Payment Accounts & Google Integrations
    deployment: HospitalDeploymentSchema | None = Field(default=None)
    llm_config: HospitalLLMSchema | None = Field(default=None)
    payment_gateway: HospitalPaymentGatewaySchema | None = Field(default=None)
    google_integration: HospitalGoogleIntegrationSchema | None = Field(default=None)
    social_media: HospitalSocialMediaSchema | None = Field(default=None)

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
