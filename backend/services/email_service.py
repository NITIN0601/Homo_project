"""
Email Notification Service (Resend API Integration)
Sends transactional appointment booking confirmations to patients and CCs clinic admin.
"""

import logging
from typing import Any

from core.config import settings
from services.doctor_service import get_doctor
from services.hospital_service import get_hospital

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    import json
    import urllib.request

logger = logging.getLogger("email_service")

# Official Resend API endpoint
RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = settings.RESEND_API_KEY
CLINIC_ADMIN_EMAIL = settings.CLINIC_ADMIN_EMAIL
RESEND_FROM_EMAIL = settings.RESEND_FROM_EMAIL


async def send_appointment_confirmation(
    customer_email: str,
    customer_name: str,
    appointment_time: str,
    doctor_name: str | None = None,
    clinic_location: str | None = None,
    hospital_id: str | None = None,
    doctor_id: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Sends an appointment confirmation email via the official Resend API (https://api.resend.com/emails).
    Dynamically resolves hospital branding and attending physician details.
    """
    key = api_key or RESEND_API_KEY
    hospital = get_hospital(hospital_id)
    doctor = get_doctor(doctor_id, hospital.get("id"))

    doc_name = doctor_name or doctor.get("name")
    h_name = hospital.get("name", "Medical Clinic")
    h_city = hospital.get("contact", {}).get("address", {}).get("city", "Bengaluru")
    clinic_loc = clinic_location or f"{h_name}, {h_city}"
    admin_email = CLINIC_ADMIN_EMAIL or hospital.get("contact", {}).get("email")
    clinic_phone = hospital.get("contact", {}).get("phone") or settings.CLINIC_PHONE
    addr_dict = hospital.get("contact", {}).get("address", {})
    addr_str = f"{addr_dict.get('street', '')}, {addr_dict.get('city', '')} – {addr_dict.get('pincode', '')}" if addr_dict else settings.CLINIC_ADDRESS

    subject = f"Appointment Confirmed — {h_name}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #292524; background: #fafaf9; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800;">{h_name}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #d8f3dc;">Appointment Confirmation</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 15px;">Dear <strong>{customer_name}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #44403c;">
              Your consultation appointment with <strong>{doc_name}</strong> has been successfully confirmed.
            </p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 13px; line-height: 1.6;">
                <tr>
                  <td style="color: #166534; font-weight: bold; width: 140px;">Date &amp; Time:</td>
                  <td style="color: #14532d; font-weight: 800;">{appointment_time}</td>
                </tr>
                <tr>
                  <td style="color: #166534; font-weight: bold;">Doctor:</td>
                  <td style="color: #15803d;">{doc_name}</td>
                </tr>
                <tr>
                  <td style="color: #166534; font-weight: bold;">Clinic Location:</td>
                  <td style="color: #15803d;">{clinic_loc}</td>
                </tr>
              </table>
            </div>

            <p style="margin: 0 0 8px 0; font-size: 12px; color: #78716c;">
              • A Google Calendar invitation has been attached to your calendar.
            </p>
            <p style="margin: 0 0 20px 0; font-size: 12px; color: #78716c;">
              • For any reschedule or urgent queries, contact reception at <strong>{clinic_phone}</strong> or reply to this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
            <p style="margin: 0; font-size: 11px; color: #a8a29e; text-align: center;">
              {addr_str}
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

    if not key or key == "re_YourFreeApiKeyHere":
        logger.warning("RESEND_API_KEY is not configured. Simulating delivery in DEMO mode.")
        return {
            "success": True,
            "status": "mock_delivered",
            "message": "Demo mode: Email simulated successfully (set RESEND_API_KEY in .env for live transmission)",
            "customer_email": customer_email,
            "cc": admin_email,
        }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:
        if HAS_HTTPX:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
                data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                if resp.status_code in [200, 201]:
                    return {"success": True, "data": data, "status": "sent"}
                else:
                    logger.error("Resend API error (%d): %s", resp.status_code, resp.text)
                    return {"success": False, "error": data.get("message", resp.text), "status_code": resp.status_code}
        else:
            req = urllib.request.Request(
                RESEND_API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "data": data, "status": "sent"}
    except Exception as exc:
        logger.error("Failed to send email via Resend: %s", exc)
        return {"success": False, "error": str(exc)}
