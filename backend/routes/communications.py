"""
Communications Route Handlers.
Handles Resend email notifications and WhatsApp Business message dispatch.
"""

from datetime import datetime, timezone
from typing import Any

from core.security import require_admin_role
from fastapi import APIRouter, Depends, HTTPException
from schemas.communications import (
    EmailNotificationRequest,
    WhatsAppMessageRequest,
    WhatsAppRegisterRequest,
)
from services.data_store import save_whatsapp_config
from services.email_service import send_appointment_confirmation
from services.social_media_service import (
    get_hospital_social_config,
    send_hospital_instagram_dm,
    send_hospital_whatsapp_message,
    update_hospital_social_config,
)

router = APIRouter(tags=["Communications & Notifications"])


@router.post("/email/send", summary="Dispatch email notification via Resend / Simulated Service")
async def send_email_notification_endpoint(
    req: EmailNotificationRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    res = await send_appointment_confirmation(
        customer_email=req.email,
        customer_name="Valued Patient",
        appointment_time=f"Notification: {req.subject}",
    )
    return {
        "success": True,
        "message": f"Email delivered to {req.email}",
        "details": res,
    }


@router.post("/whatsapp/register-admin", summary="Register admin WhatsApp business settings")
async def register_whatsapp_admin_endpoint(
    req: WhatsAppRegisterRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    saved = save_whatsapp_config(req.model_dump())
    return {
        "success": True,
        "message": f"WhatsApp Business registered for {req.doctorName or 'Hospital Admin'}",
        "config": saved,
    }


@router.post("/whatsapp/send-message", summary="Send WhatsApp notification")
async def send_whatsapp_message_endpoint(
    req: WhatsAppMessageRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    """Dispatches a WhatsApp notification using the hospital's configured WhatsApp credentials."""
    h_id = user.get("hospital_id") if isinstance(user, dict) else None
    res = await send_hospital_whatsapp_message(
        hospital_id=h_id,
        to_phone=req.phone,
        message_text=f"Consultation Notification: Your health update for appointment ({req.type}) is ready.",
    )
    return {
        "success": True,
        "messageId": res.get("message_id") or f"wa_msg_{int(datetime.now().timestamp() * 1000)}",
        "recipient": req.phone,
        "type": req.type,
        "dispatched": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "delivery": res,
    }


@router.get("/social/{hospital_id}/profiles", summary="Get hospital social media profiles & chat links")
async def get_social_profiles_endpoint(hospital_id: str):
    """Returns public social media links and messaging channel configs for patient UI."""
    config = get_hospital_social_config(hospital_id)
    return {
        "status": "success",
        "hospital_id": hospital_id,
        "socialMedia": config,
    }


@router.put("/social/{hospital_id}", summary="Update hospital social media & messaging integrations (Admin)")
async def update_social_profiles_endpoint(
    hospital_id: str,
    payload: dict[str, Any],
    user: dict[str, Any] = Depends(require_admin_role),
):
    """Admin: Configures or updates hospital WhatsApp, Instagram, Facebook, and YouTube settings."""
    try:
        updated = update_hospital_social_config(hospital_id, payload)
        return {
            "status": "success",
            "message": f"Social media & messaging integrations updated for {updated.get('name')}.",
            "socialMedia": updated.get("socialMedia"),
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/social/{hospital_id}/instagram/send", summary="Send Instagram DM notification (Admin)")
async def send_instagram_dm_endpoint(
    hospital_id: str,
    payload: dict[str, Any],
    user: dict[str, Any] = Depends(require_admin_role),
):
    """Dispatches or simulates direct Instagram direct message using hospital Instagram account."""
    recipient_id = payload.get("recipient_id") or payload.get("recipientId")
    message_text = payload.get("message") or payload.get("text") or "Hello from your healthcare provider."
    if not recipient_id:
        raise HTTPException(status_code=400, detail="recipient_id is required.")
    res = await send_hospital_instagram_dm(hospital_id, str(recipient_id), str(message_text))
    return {"status": "success", "delivery": res}
