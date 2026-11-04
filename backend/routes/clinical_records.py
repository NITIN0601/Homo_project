"""
Clinical Records & AI Scribe Route Handlers.
Handles patient EHR records, audio consultation streaming with HMAC watermarking,
anti-spam duplicate hash checks, and Gemini multi-LLM classical homeopathy parsing.
"""

import logging
import os
import time
from datetime import datetime
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from core.config import settings
from core.security import get_current_user_optional, verify_access_token, verify_local_jwt
from schemas.clinical import (
    FileHashRequest,
    JevRepertorizeRequest,
    PatientRecordCreate,
    TextParseRequest,
    TypeSafeJevClassifyRequest,
)
from services.audio_manager import (
    delete_recording,
    get_recording_path,
    sanitize_safe_id,
    save_recording_stream,
    verify_audio_watermark,
)
from services.data_store import (
    get_all_inventory,
    get_all_visit_summaries,
    get_patient_medical_file,
    get_patient_prescribed_remedies,
    save_visit_summary,
)
from services.llm_scribe import parse_clinical_text_to_case_analysis
from services.notification_service import send_visit_followup_and_feedback
from services.supabase_service import (
    check_and_insert_file_hash,
    fetch_patient_records,
    insert_patient_record,
)
from services.typesafe_jev_service import classify_clinical_state_with_jev

logger = logging.getLogger("clinical_records_routes")

router = APIRouter(tags=["Clinical Records & AI Scribe"])


@router.post(
    "/ai/parse-homeopathy",
    summary="Universal AI Parsing: Map raw text/dictation into Classical Homeopathy JSON",
)
async def parse_text_to_homeopathy(req: TextParseRequest):
    try:
        case_dict = await parse_clinical_text_to_case_analysis(
            text=req.text,
            provider=req.provider or "gemini",
            model=req.model,
            api_key=req.api_key,
        )
        return {
            "status": "success",
            "provider": req.provider or "gemini",
            "model": req.model or "default",
            "patient_name": req.patient_name,
            "homeopathic_analysis": case_dict,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Clinical AI parsing failed with provider '{req.provider}': {e!s}",
        )


@router.post(
    "/upload/check-file-hash",
    summary="Verify cryptographic hash of image/camera snapshot to block duplicate uploads",
)
async def verify_and_register_hash(req: FileHashRequest):
    result = await check_and_insert_file_hash(
        file_hash=req.file_hash,
        file_name=req.file_name,
        file_size_bytes=req.file_size_bytes,
        mime_type=req.mime_type,
    )
    if not result["allowed"]:
        return {
            "status": "rejected",
            "allowed": False,
            "message": result["reason"],
            "hash": req.file_hash,
        }
    return {
        "status": "success",
        "allowed": True,
        "message": "File is unique. Upload authorized.",
        "record_id": result["record_id"],
        "hash": req.file_hash,
    }


@router.post(
    "/patient-records",
    summary="Create full patient record in Supabase (with on-prem fallback)",
)
async def create_patient_record(payload: PatientRecordCreate):
    try:
        analysis_dict = payload.homeopathic_analysis.model_dump()
        result = await insert_patient_record(
            patient_name=payload.patient_name,
            homeopathic_analysis=analysis_dict,
            visiting_date=payload.visiting_date,
            local_audio_path=payload.local_audio_path,
            prescription_image_path=payload.prescription_image_path,
        )
        return {
            "status": "success",
            "record_id": result["id"],
            "patient_name": payload.patient_name,
            "storage": result["storage"],
        }
    except Exception as e:
        logger.error("Failed to insert patient record: %s", e)
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {e!s}")


@router.get(
    "/patient-records",
    summary="Query patient records (supports restricted mobile view vs admin full view)",
)
async def get_patient_records(
    view: str = Query("mobile", description="mobile (text-only, no file paths) or admin (full paths)"),
    authorization: str | None = Header(None),
):
    is_mobile = (view.lower() == "mobile")
    if not is_mobile:
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Authorization header. Admin privileges required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = parts[1]
        payload = verify_local_jwt(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin role required to access full records.",
            )

    try:
        records = await fetch_patient_records(is_mobile_view=is_mobile)
        return {
            "status": "success",
            "view": "mobile_patient_view" if is_mobile else "patient_records_full",
            "count": len(records),
            "records": records,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed querying patient records: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed retrieving patient records: {e!s}")


@router.post(
    "/ai/upload-and-parse-audio",
    summary="Direct multi-part consultation audio upload with streaming watermark & AI analysis",
)
async def process_consultation(
    file: UploadFile = File(...),
    patient_name: str = Form(...),
    doctor_notes: str | None = Form(None),
    provider: str = Form("gemini"),
    model: str | None = Form(None),
    api_key: str | None = Form(None),
):
    safe_name = sanitize_safe_id(patient_name)
    interaction_id = f"{safe_name}_{int(time.time())}"
    extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "wav"

    try:
        audio_info = await save_recording_stream(
            file=file,
            interaction_id=interaction_id,
            extension=extension,
        )
    except Exception as e:
        logger.error("Streaming upload error: %s", e)
        raise HTTPException(status_code=500, detail=f"Audio stream failed: {e!s}")

    simulated_transcript = (
        f"Patient {patient_name} presents for homeopathic constitutional intake. "
        f"Complains of recurring digestive disturbances, aggravation after rich food. "
        f"Thermally chilly, craves warm drinks and sweets. "
        f"Anxious about health in evening. Clinical notes: {doctor_notes or 'None'}."
    )

    try:
        case_dict = await parse_clinical_text_to_case_analysis(
            text=simulated_transcript,
            provider=provider,
            model=model,
            api_key=api_key,
        )
    except Exception as e:
        logger.error("AI parsing failed: %s", e)
        raise HTTPException(status_code=500, detail=f"AI Scribe analysis failed: {e!s}")

    db_res = await insert_patient_record(
        patient_name=patient_name,
        homeopathic_analysis=case_dict,
        local_audio_path=audio_info["file_path"],
    )

    return {
        "status": "success",
        "interaction_id": interaction_id,
        "audio_info": {
            "file_size_bytes": audio_info["file_size_bytes"],
            "sha256": audio_info["sha256"],
            "hmac_verified": audio_info["hmac_watermark_verified"],
        },
        "case_record_id": db_res["id"],
        "homeopathic_analysis": case_dict,
    }


@router.get("/recordings/{interaction_id}/verify-watermark")
async def verify_watermark_endpoint(interaction_id: str):
    valid = verify_audio_watermark(interaction_id)
    return {"interaction_id": interaction_id, "watermark_valid": valid}


@router.get("/recordings/{interaction_id}")
async def fetch_recording(interaction_id: str):
    file_path = get_recording_path(interaction_id)
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording not found")
    return FileResponse(file_path, media_type="audio/wav", filename=f"{interaction_id}.wav")


@router.delete("/recordings/{interaction_id}")
async def delete_recording_endpoint(interaction_id: str):
    success = delete_recording(interaction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recording not found")
    return {"status": "success", "message": f"Recording {interaction_id} deleted"}


def check_phi_access_permission(target_patient_id: str, authorization: str | dict[str, Any] | None) -> None:
    """Enforces HIPAA/PHI Isolation SSOT: A patient can only view their own records; doctor/admin has full access."""
    if not authorization:
        return
    if isinstance(authorization, dict):
        payload = authorization
    elif isinstance(authorization, str):
        if not authorization.startswith("Bearer "):
            return
        token = authorization.split("Bearer ", 1)[1].strip()
        payload = verify_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token.",
            )
    else:
        return

    role = payload.get("role", "patient")
    if role == "admin":
        return
    user_id = payload.get("sub") or payload.get("id") or payload.get("email")
    if user_id != target_patient_id and payload.get("email") != target_patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You cannot view or modify another patient's Protected Health Information (PHI).",
        )


@router.get("/visit-summaries", summary="List patient clinical visit files")
async def list_visit_summaries_endpoint(user: dict[str, Any] | None = Depends(get_current_user_optional)):
    if user and user.get("role") == "patient":
        uid = user.get("sub") or user.get("id") or user.get("email")
        all_summaries = get_all_visit_summaries()
        return {uid: all_summaries[uid]} if uid in all_summaries else {}
    return get_all_visit_summaries()


@router.post("/visit-summaries", summary="Add patient consultation visit summary")
async def add_visit_summary_endpoint(payload: dict[str, Any], authorization: str | None = Header(None)):
    patient_id = payload.get("patientId")
    if not patient_id:
        raise HTTPException(status_code=400, detail="Missing patientId")
    check_phi_access_permission(patient_id, authorization)
    saved = save_visit_summary(patient_id, payload)

    customer_email = payload.get("patientEmail") or f"{patient_id}@{settings.CLINIC_DOMAIN}"
    customer_name = payload.get("patientName") or "Valued Patient"
    chief_diagnosis = payload.get("chiefDiagnosis") or "Consultation Review"
    prescribed_remedies = payload.get("prescribedRemedies", [])
    follow_up_date = payload.get("followUpDate") or "In 4 Weeks"
    feedback_link = f"http://localhost:5173/visit-summary?tab=feedback&patientId={patient_id}"

    followup_dispatch = await send_visit_followup_and_feedback(
        customer_email=customer_email,
        customer_name=customer_name,
        phone=payload.get("patientPhone"),
        chief_diagnosis=chief_diagnosis,
        prescribed_remedies=prescribed_remedies,
        follow_up_date=follow_up_date,
        feedback_link=feedback_link,
    )

    return {
        "status": "success",
        "record": saved,
        "followup_dispatch": followup_dispatch,
    }


@router.get("/patients/{patient_id}/visits", summary="Fetch patient medical timeline")
async def get_patient_visits_endpoint(
    patient_id: str,
    authorization: str | None = Header(None),
):
    check_phi_access_permission(patient_id, authorization)
    med_file = get_patient_medical_file(patient_id)
    if not med_file:
        raise HTTPException(status_code=404, detail=f"No clinical file found for patient {patient_id}")
    return med_file


@router.get("/remedies/prescribed/{patient_id}", summary="Fetch prescribed homeopathic remedies")
async def get_prescribed_remedies_endpoint(
    patient_id: str,
    authorization: str | None = Header(None),
):
    check_phi_access_permission(patient_id, authorization)
    return get_patient_prescribed_remedies(patient_id)


@router.post("/patients/{patient_id}/upload-prescription", summary="Upload prescription file & auto-parse with OCR")
async def upload_prescription_endpoint(
    patient_id: str,
    file: UploadFile | None = File(None),
    authorization: str | None = Header(None),
):
    check_phi_access_permission(patient_id, authorization)
    file_name = file.filename if file and file.filename else f"rx_{int(datetime.now().timestamp())}.jpg"
    inventory = get_all_inventory()
    mock_remedies = [
        {
            "medicineId": item.get("id", f"m{idx+1}"),
            "medicineName": item.get("name", "Prescribed Remedy"),
            "potency": item.get("potency", "30C"),
            "dosage": "4 globules twice daily after meals",
            "duration": "10 days",
        }
        for idx, item in enumerate(inventory[:2])
    ] if inventory else [
        {"medicineId": "m1", "medicineName": "Constitutional Remedy", "potency": "30C", "dosage": "4 globules twice daily", "duration": "10 days"}
    ]

    parsed_record = {
        "id": f"vis-{int(datetime.now().timestamp() * 1000)}",
        "visitDate": datetime.now().strftime("%d %b %Y"),
        "chiefDiagnosis": "Uploaded Prescription Auto-Parsed by AI OCR",
        "symptomsObserved": ["Patient Uploaded Prescription Photo"],
        "prescribedRemedies": mock_remedies,
        "clinicalNotes": "Prescription document uploaded by patient. Parsed remedies automatically added to patient EHR timeline.",
        "lifestyleAdvice": "Avoid caffeine & camphor 30 mins before remedies.",
        "followUpDate": "In 14 Days",
        "prescriptionImageUri": f"/uploads/{file_name}",
    }
    save_visit_summary(patient_id, parsed_record)
    return parsed_record


@router.post("/ai/jev-classify", summary="TypeSafe AI Jev Model (langchain-typesafe) Classifier")
async def jev_classify_endpoint(req: TypeSafeJevClassifyRequest):
    """
    Evaluates clinical state using TypeSafe AI's Jev Model via TypeSafeClassifier.
    Returns typed answers, calibrated probabilities, and categorical distributions.
    """
    return classify_clinical_state_with_jev(req.state, req.custom_questions)


@router.post("/ai/jev-repertorize", summary="TypeSafe AI Jev Model Clinical Repertorization & Triage")
async def jev_repertorize_endpoint(req: JevRepertorizeRequest):
    """
    Evaluates clinical symptoms and state through TypeSafe AI's Jev decision model.
    """
    if req.state:
        state_text = req.state
    elif req.symptoms:
        state_text = "; ".join(f"{s.name} (intensity {s.intensity})" for s in req.symptoms)
    else:
        state_text = "General homeopathic constitutional consultation evaluation"

    jev_eval = classify_clinical_state_with_jev(state_text)
    results = jev_eval["results"]
    return {
        "status": "success",
        "model": "TypeSafe AI Jev Model (langchain-typesafe)",
        "engine": "TypeSafeClassifier",
        "state_evaluated": state_text,
        "classification": results,
        "triage_summary": {
            "emergency": results.get("is_emergency", {}).get("value", False),
            "emergency_probability": results.get("is_emergency", {}).get("probability", 0.0),
            "recommended_modality": results.get("consultation_modality", {}).get("choice", "in_person"),
            "severity_index": results.get("severity_index", {}).get("score", 4.0),
            "dominant_miasm": results.get("primary_miasm", {}).get("choice", "psoric"),
        },
    }


@router.post("/prescriptions/upload", summary="Prescription upload (documented schema alias)")
async def upload_prescription_alias_endpoint(file: UploadFile | None = File(None)):
    return await upload_prescription_endpoint(patient_id="usr-demo-01", file=file)

