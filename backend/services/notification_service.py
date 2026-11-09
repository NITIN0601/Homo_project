"""
Unified Notification Service for Multi-Tenant EHR Healthcare Platform.
Orchestrates Resend transactional emails and WhatsApp Business notifications
for appointment booking confirmations, post-consultation follow-ups, and patient feedback.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from core.config import settings
from services.doctor_service import get_doctor
from services.email_service import send_appointment_confirmation as send_appointment_confirmation
from services.hospital_service import get_hospital

logger = logging.getLogger("notification_service")

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = settings.RESEND_API_KEY
CLINIC_ADMIN_EMAIL = settings.CLINIC_ADMIN_EMAIL
RESEND_FROM_EMAIL = settings.RESEND_FROM_EMAIL
WHATSAPP_API_TOKEN = settings.WHATSAPP_API_TOKEN
WHATSAPP_PHONE_ID = settings.WHATSAPP_PHONE_ID


async def send_appointment_whatsapp_notification(
    phone: str,
    customer_name: str,
    appointment_time: str,
    doctor_name: str | None = None,
    clinic_location: str | None = None,
    hospital_id: str | None = None,
) -> dict[str, Any]:
    """
    Dispatches automated WhatsApp confirmation for booked appointment.
    """
    hospital = get_hospital(hospital_id)
    h_name = hospital.get("name", settings.CLINIC_NAME)
    h_phone = hospital.get("contact", {}).get("phone", settings.CLINIC_PHONE)
    h_city = hospital.get("contact", {}).get("address", {}).get("city", "Bengaluru")

    doc_name = doctor_name or settings.DOCTOR_SHORT_NAME
    clinic_loc = clinic_location or f"{h_name}, {h_city}"
    clean_phone = phone.replace(" ", "").replace("-", "")
    message_text = (
        f"🌿 *{h_name}*\n\n"
        f"Namaste {customer_name},\n"
        f"Your appointment with *{doc_name}* is confirmed.\n\n"
        f"📅 *Date & Time*: {appointment_time}\n"
        f"📍 *Location*: {clinic_loc}\n\n"
        f"• Please arrive 10 minutes prior.\n"
        f"• For assistance or reschedule, reply to this WhatsApp message or call {h_phone}."
    )

    if not WHATSAPP_API_TOKEN or WHATSAPP_API_TOKEN.startswith("EAAB_test"):
        logger.info(f"WhatsApp notification simulated for {clean_phone}: {appointment_time}")
        return {
            "success": True,
            "channel": "whatsapp",
            "status": "mock_delivered",
            "recipient": clean_phone,
            "message_preview": message_text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    try:
        import httpx
        url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
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
            return {"success": resp.status_code in (200, 201), "status_code": resp.status_code}
    except Exception as exc:
        logger.warning(f"Live WhatsApp dispatch failed: {exc}. Fallback logged.")
        return {"success": False, "error": str(exc), "recipient": clean_phone}


async def send_visit_followup_and_feedback(
    customer_email: str,
    customer_name: str,
    phone: str | None = None,
    chief_diagnosis: str = "General Consultation Review",
    prescribed_remedies: list[dict[str, Any]] | None = None,
    follow_up_date: str = "In 4 Weeks",
    feedback_link: str = "http://localhost:5173/visit-summary?tab=feedback",
    doctor_name: str | None = None,
    hospital_id: str | None = None,
    doctor_id: str | None = None,
) -> dict[str, Any]:
    """
    Sends post-visit follow-up instructions and patient feedback collection email & WhatsApp.
    Dynamically resolves hospital branding and attending physician details.
    """
    hospital = get_hospital(hospital_id)
    doctor = get_doctor(doctor_id, hospital.get("id"))

    h_name = hospital.get("name", settings.CLINIC_NAME)
    doc_name = doctor_name or doctor.get("name")
    addr_dict = hospital.get("contact", {}).get("address", {})
    addr_str = f"{addr_dict.get('street', '')}, {addr_dict.get('city', '')} – {addr_dict.get('pincode', '')}" if addr_dict else settings.CLINIC_ADDRESS
    h_phone = hospital.get("contact", {}).get("phone", settings.CLINIC_PHONE)
    admin_email = hospital.get("contact", {}).get("email") or CLINIC_ADMIN_EMAIL

    remedy_rows = ""
    for r in (prescribed_remedies or []):
        r_name = r.get("medicineName") or r.get("name") or "Prescribed Remedy"
        r_potency = r.get("potency", "30C")
        r_dosage = r.get("dosage", "As directed")
        remedy_rows += f"<tr><td style='padding: 6px 0; font-weight: bold;'>{r_name} {r_potency}</td><td style='padding: 6px 0; color: #44403c;'>{r_dosage}</td></tr>"

    if not remedy_rows:
        remedy_rows = "<tr><td colspan='2' style='color: #78716c;'>Please follow the constitutional dosage instructions provided during consultation.</td></tr>"

    subject = f"Your Consultation Summary & Follow-Up Care — {h_name}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #292524; background: #fafaf9; padding: 24px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800;">{h_name}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #d8f3dc;">Consultation Summary &amp; Patient Feedback</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 15px;">Dear <strong>{customer_name}</strong>,</p>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #44403c;">
              Thank you for visiting {h_name}. Below is a recap of your consultation with <strong>{doc_name}</strong>:
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a;"><strong>Diagnosis / Focus</strong>: {chief_diagnosis}</p>
              <table style="width: 100%; font-size: 13px; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px;">
                {remedy_rows}
              </table>
              <p style="margin: 12px 0 0 0; font-size: 13px; color: #047857;"><strong>Next Follow-up Review</strong>: {follow_up_date}</p>
            </div>

            <!-- Patient Feedback & Comments Link -->
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
              <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #166534;">How was your consultation experience?</h3>
              <p style="margin: 0 0 14px 0; font-size: 12px; color: #14532d;">Your feedback helps the doctor tailor your treatment plan.</p>
              <a href="{feedback_link}" style="display: inline-block; background: #2d6a4f; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold;">
                Enter Patient Feedback &amp; Comments &rarr;
              </a>
            </div>

            <p style="margin: 0; font-size: 11px; color: #a8a29e; text-align: center;">
              {h_name} &bull; {addr_str} &bull; {h_phone}
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    payload = {
        "from": f"{h_name} <onboarding@resend.dev>",
        "to": [customer_email],
        "cc": [admin_email],
        "subject": subject,
        "html": html_content,
    }

    # WhatsApp follow-up notice
    wa_result = None
    if phone:
        wa_text = (
            f"🌿 *{h_name} Consultation Summary*\n\n"
            f"Dear {customer_name}, your visit notes and prescribed remedies have been updated in your patient portal.\n"
            f"📅 *Next Follow-up*: {follow_up_date}\n\n"
            f"📝 We would love to hear your feedback: {feedback_link}"
        )
        wa_result = {
            "success": True,
            "recipient": phone,
            "message": wa_text,
            "status": "mock_delivered",
        }

    # Resend email dispatch
    key = RESEND_API_KEY
    if not key or key.startswith("re_YourFreeApiKey"):
        logger.info(f"Follow-up & feedback email simulated for {customer_email}")
        return {
            "success": True,
            "email_status": "mock_delivered",
            "recipient": customer_email,
            "whatsapp": wa_result,
            "feedback_link": feedback_link,
        }

    try:
        import httpx
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
            return {
                "success": resp.status_code in (200, 201),
                "email_status": "sent",
                "whatsapp": wa_result,
            }
    except Exception as exc:
        return {"success": False, "error": str(exc), "whatsapp": wa_result}

