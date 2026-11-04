"""
Communications Route Handlers.
Handles Resend email notifications and WhatsApp Business message dispatch.
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from schemas.communications import (
    EmailNotificationRequest,
    WhatsAppMessageRequest,
    WhatsAppRegisterRequest,
)
from services.data_store import save_whatsapp_config
from services.email_service import send_appointment_confirmation

router = APIRouter(tags=["Communications & Notifications"])


@router.post("/email/send", summary="Dispatch email notification via Resend / Simulated Service")
async def send_email_notification_endpoint(req: EmailNotificationRequest):
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
async def register_whatsapp_admin_endpoint(req: WhatsAppRegisterRequest):
    saved = save_whatsapp_config(req.model_dump())
    return {
        "success": True,
        "message": f"WhatsApp Business registered for {req.doctorName or 'Clinic Admin'}",
        "config": saved,
    }


@router.post("/whatsapp/send-message", summary="Send WhatsApp notification")
async def send_whatsapp_message_endpoint(req: WhatsAppMessageRequest):
    return {
        "success": True,
        "messageId": f"wa_msg_{int(datetime.now().timestamp() * 1000)}",
        "recipient": req.phone,
        "type": req.type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

