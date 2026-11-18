"""
Unified Social Media & 3rd-Party Messaging Service for Multi-Tenant EHR.
Provides reusable functions for per-hospital WhatsApp Business Cloud API,
Instagram Messaging, Facebook Pages, and public social profile links.
All configurations originate from the hospital onboarding flow.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from core.config import settings
from services.hospital_service import get_hospital, save_hospital

logger = logging.getLogger("social_media_service")


def get_default_social_config(hospital_name: str = "Healthcare Facility", phone: str = "+91 98450 12345") -> dict[str, Any]:
    """Provides initial draft social media and messaging configuration."""
    clean_digits = "".join(filter(str.isdigit, phone))
    return {
        "whatsapp": {
            "enabled": True,
            "businessAccountId": "",
            "phoneNumberId": "",
            "apiToken": "",
            "displayNumber": phone,
            "customGreeting": f"Namaste from {hospital_name}!",
            "chatUrl": f"https://wa.me/{clean_digits}" if clean_digits else "",
        },
        "instagram": {
            "enabled": True,
            "handle": "",
            "profileUrl": "",
            "accountId": "",
            "accessToken": "",
            "autoReplyEnabled": False,
            "directBookingEnabled": True,
        },
        "facebook": {
            "enabled": False,
            "pageUrl": "",
            "pageId": "",
            "accessToken": "",
        },
        "youtube": {
            "enabled": False,
            "channelUrl": "",
            "channelName": "",
        },
        "linkedin": {
            "enabled": False,
            "companyUrl": "",
            "companyName": "",
        },
    }


def get_hospital_social_config(hospital_id: str | None) -> dict[str, Any]:
    """Retrieves the hospital's dedicated social media configuration, initializing defaults if absent."""
    hospital = get_hospital(hospital_id)
    social = hospital.get("socialMedia")
    if not social or not isinstance(social, dict):
        h_name = hospital.get("name", settings.HOSPITAL_NAME)
        h_phone = hospital.get("contact", {}).get("phone", settings.HOSPITAL_PHONE)
        social = get_default_social_config(h_name, h_phone)
    return social


async def send_hospital_whatsapp_message(
    hospital_id: str | None,
    to_phone: str,
    message_text: str,
    template_name: str | None = None,
) -> dict[str, Any]:
    """
    Dispatches a WhatsApp notification using the specific hospital's WhatsApp Cloud credentials.
    Falls back to mock delivery gracefully if live tokens are not configured in demo/test mode.
    """
    hospital = get_hospital(hospital_id)
    h_name = hospital.get("name", settings.HOSPITAL_NAME)
    social = get_hospital_social_config(hospital_id)
    wa_config = social.get("whatsapp", {})

    clean_phone = "".join(filter(str.isdigit, to_phone))
    api_token = wa_config.get("apiToken") or settings.WHATSAPP_API_TOKEN
    phone_number_id = wa_config.get("phoneNumberId") or settings.WHATSAPP_PHONE_ID

    # Live Meta Graph API dispatch when hospital has configured credentials
    if api_token and phone_number_id and not api_token.startswith("EAAB_test"):
        try:
            import httpx

            url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            }
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "text",
                "text": {"body": message_text},
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    msg_id = data.get("messages", [{}])[0].get("id", f"wa_live_{int(datetime.now().timestamp() * 1000)}")
                    return {
                        "success": True,
                        "channel": "whatsapp",
                        "status": "sent",
                        "hospital_id": hospital.get("id"),
                        "hospital_name": h_name,
                        "recipient": clean_phone,
                        "message_id": msg_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                else:
                    logger.warning(f"Meta WhatsApp API error for {h_name}: HTTP {resp.status_code} - {resp.text}")
                    return {
                        "success": False,
                        "channel": "whatsapp",
                        "status": "failed",
                        "status_code": resp.status_code,
                        "error": resp.text,
                        "recipient": clean_phone,
                    }
        except Exception as exc:
            logger.error(f"Live WhatsApp dispatch failed for {h_name}: {exc}")
            return {
                "success": False,
                "channel": "whatsapp",
                "status": "error",
                "error": str(exc),
                "recipient": clean_phone,
            }

    # Simulation / Demo delivery
    logger.info(f"WhatsApp message simulated for {clean_phone} via {h_name}")
    return {
        "success": True,
        "channel": "whatsapp",
        "status": "mock_delivered",
        "hospital_id": hospital.get("id"),
        "hospital_name": h_name,
        "recipient": clean_phone,
        "message_preview": message_text,
        "template": template_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def send_hospital_instagram_dm(
    hospital_id: str | None,
    recipient_id: str,
    message_text: str,
) -> dict[str, Any]:
    """
    Dispatches or schedules an Instagram direct notification via Instagram Graph API
    using the specific hospital's Instagram Business Account credentials.
    """
    hospital = get_hospital(hospital_id)
    h_name = hospital.get("name", settings.HOSPITAL_NAME)
    social = get_hospital_social_config(hospital_id)
    ig_config = social.get("instagram", {})

    access_token = ig_config.get("accessToken")
    account_id = ig_config.get("accountId")

    if access_token and account_id:
        try:
            import httpx

            url = f"https://graph.facebook.com/v18.0/{account_id}/messages"
            headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
            payload = {
                "recipient": {"id": recipient_id},
                "message": {"text": message_text},
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                return {
                    "success": resp.status_code in (200, 201),
                    "channel": "instagram",
                    "status": "sent" if resp.status_code in (200, 201) else "failed",
                    "hospital_id": hospital.get("id"),
                    "recipient": recipient_id,
                }
        except Exception as exc:
            logger.error(f"Instagram DM failed for {h_name}: {exc}")
            return {"success": False, "channel": "instagram", "status": "error", "error": str(exc)}

    logger.info(f"Instagram notification simulated for {recipient_id} via {h_name}")
    return {
        "success": True,
        "channel": "instagram",
        "status": "mock_delivered",
        "hospital_id": hospital.get("id"),
        "hospital_name": h_name,
        "recipient": recipient_id,
        "message_preview": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def update_hospital_social_config(
    hospital_id: str,
    social_updates: dict[str, Any],
) -> dict[str, Any]:
    """Updates the hospital's social media and WhatsApp/Instagram integrations."""
    hospital = get_hospital(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital '{hospital_id}' not found.")

    current_social = hospital.get("socialMedia") or get_default_social_config(
        hospital.get("name", "Hospital"),
        hospital.get("contact", {}).get("phone", "+1 555-0100"),
    )

    for channel, config in social_updates.items():
        if isinstance(config, dict) and isinstance(current_social.get(channel), dict):
            current_social[channel].update(config)
        else:
            current_social[channel] = config

    hospital["socialMedia"] = current_social
    hospital["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return save_hospital(hospital)
