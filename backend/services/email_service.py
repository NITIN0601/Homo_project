"""
Email Notification Service (Resend API Integration)
Sends transactional appointment booking confirmations to patients and CCs clinic admin.
"""

import logging
import os
from typing import Any

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
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
CLINIC_ADMIN_EMAIL = os.getenv("CLINIC_ADMIN_EMAIL", "vaishnavikshetty@gmail.com")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "Agastya Clinic <onboarding@resend.dev>")


async def send_appointment_confirmation(
    customer_email: str,
    customer_name: str,
    appointment_time: str,
    doctor_name: str = "Dr. Bramarambha K",
    clinic_location: str = "Malleshwaram, Bengaluru",
    api_key: str | None = None
) -> dict[str, Any]:
    """
    Sends an appointment confirmation email via the official Resend API (https://api.resend.com/emails).
    """
    key = api_key or RESEND_API_KEY or os.getenv("RESEND_API_KEY")

    subject = "Appointment Confirmed — Agastya Homoeopathy Clinic"
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #292524; background: #fafaf9; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Agastya Homoeopathy Clinic</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #d8f3dc;">Appointment Confirmation</p>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; font-size: 15px;">Dear <strong>{customer_name}</strong>,</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #44403c;">
              Your consultation appointment with <strong>{doctor_name}</strong> has been successfully confirmed.
            </p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 13px; line-height: 1.6;">
                <tr>
                  <td style="color: #166534; font-weight: bold; width: 140px;">Date &amp; Time:</td>
                  <td style="color: #14532d; font-weight: 800;">{appointment_time}</td>
                </tr>
                <tr>
                  <td style="color: #166534; font-weight: bold;">Doctor:</td>
                  <td style="color: #15803d;">{doctor_name}</td>
                </tr>
                <tr>
                  <td style="color: #166534; font-weight: bold;">Clinic Location:</td>
                  <td style="color: #15803d;">{clinic_location}</td>
                </tr>
              </table>
            </div>

            <p style="margin: 0 0 8px 0; font-size: 12px; color: #78716c;">
              • A Google Calendar invitation has been attached to your calendar.
            </p>
            <p style="margin: 0 0 20px 0; font-size: 12px; color: #78716c;">
              • For any reschedule or urgent queries, contact reception at <strong>+91 70195 76255</strong> or reply to this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 20px 0;" />
            <p style="margin: 0; font-size: 11px; color: #a8a29e; text-align: center;">
              No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru, Karnataka – 560003
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [customer_email],
        "cc": [CLINIC_ADMIN_EMAIL],
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
            "cc": CLINIC_ADMIN_EMAIL,
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
