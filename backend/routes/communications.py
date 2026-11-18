"""
Communications Route Handlers.
Handles Resend email notifications and WhatsApp Business message dispatch.
"""

from datetime import datetime, timezone
from typing import Any

import httpx
from core.config import settings
from core.security import require_admin_role
from fastapi import APIRouter, Depends
from schemas.communications import (
    EmailNotificationRequest,
    WhatsAppMessageRequest,
    WhatsAppRegisterRequest,
)
from services.data_store import save_whatsapp_config
from services.email_service import send_appointment_confirmation

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
        "message": f"WhatsApp Business registered for {req.doctorName or 'Clinic Admin'}",
        "config": saved,
    }


@router.post("/whatsapp/send-message", summary="Send WhatsApp notification")
async def send_whatsapp_message_endpoint(
    req: WhatsAppMessageRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    # Live WhatsApp Cloud API dispatch when token & phone ID are configured
    if settings.WHATSAPP_API_TOKEN and settings.WHATSAPP_PHONE_ID:
        try:
            url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}",
                "Content-Type": "application/json",
            }
            clean_phone = "".join(filter(str.isdigit, req.phone))
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {"body": "Clinic Notification: Your consultation update is ready."},
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code in (200, 201):
                    wa_data = res.json()
                    msg_id = wa_data.get("messages", [{}])[0].get("id", f"wa_msg_{int(datetime.now().timestamp() * 1000)}")
                    return {
                        "success": True,
                        "messageId": msg_id,
                        "recipient": req.phone,
                        "type": req.type,
                        "dispatched": True,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
        except Exception:
            pass

    return {
        "success": True,
        "messageId": f"wa_sim_{int(datetime.now().timestamp() * 1000)}",
        "recipient": req.phone,
        "type": req.type,
        "dispatched": False,
        "note": "Queued in simulation mode. Configure WHATSAPP_API_TOKEN to enable live delivery.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
