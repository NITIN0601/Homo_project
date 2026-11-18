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
HOSPITAL_ADMIN_EMAIL = settings.HOSPITAL_ADMIN_EMAIL
RESEND_FROM_EMAIL = settings.RESEND_FROM_EMAIL


async def send_appointment_confirmation(
    customer_email: str,
    customer_name: str,
    appointment_time: str,
    doctor_name: str | None = None,
    hospital_location: str | None = None,
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
    h_name = hospital.get("name", "Medical Center")
    h_city = hospital.get("contact", {}).get("address", {}).get("city", "Bengaluru")
    hosp_loc = hospital_location or f"{h_name}, {h_city}"
    admin_email = HOSPITAL_ADMIN_EMAIL or hospital.get("contact", {}).get("email")
    hospital_phone = hospital.get("contact", {}).get("phone") or settings.HOSPITAL_PHONE
    addr_dict = hospital.get("contact", {}).get("address", {})
    addr_str = (
        f"{addr_dict.get('street', '')}, {addr_dict.get('city', '')} – {addr_dict.get('pincode', '')}"
        if addr_dict
        else settings.HOSPITAL_ADDRESS
    )

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
                  <td style="color: #166534; font-weight: bold;">Hospital Location:</td>
                  <td style="color: #15803d;">{hosp_loc}</td>
                </tr>
              </table>
            </div>

            <p style="margin: 0 0 8px 0; font-size: 12px; color: #78716c;">
              • A Google Calendar invitation has been attached to your calendar.
            </p>
            <p style="margin: 0 0 20px 0; font-size: 12px; color: #78716c;">
              • For any reschedule or urgent queries, contact reception at <strong>{hospital_phone}</strong> or reply to this email.
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
                RESEND_API_URL, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "data": data, "status": "sent"}
    except Exception as exc:
        logger.error("Failed to send email via Resend: %s", exc)
        return {"success": False, "error": str(exc)}


async def send_doctor_onboarding_email(
    doctor_email: str,
    doctor_name: str,
    doctor_title: str,
    hospital_name: str,
    hospital_id: str,
    invite_url: str,
    reg_no: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """
    Sends official doctor onboarding email with credentials and activation link via Resend.
    Allows doctor to sign in via Google OAuth or accept invite link to set password.
    """
    key = api_key or RESEND_API_KEY
    subject = f"Welcome to {hospital_name} — Doctor Portal Credentials & Activation"

    reg_row = (
        f'<p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Medical Reg:</strong> {reg_no}</p>' if reg_no else ""
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
          .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
          .header {{ background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }}
          .body-content {{ padding: 28px 24px; }}
          .btn {{ display: inline-block; background: #047857; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 14px; }}
          .badge {{ display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; }}
          .detail-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">DOCTOR ONBOARDING</span>
            <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 800;">Welcome, Dr. {doctor_name}!</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">{hospital_name} Clinical Practice Network</p>
          </div>
          <div class="body-content">
            <p style="font-size: 14px; line-height: 1.6;">
              You have been registered as a verified consulting practitioner for <strong>{hospital_name}</strong> by the platform Super Administrator.
            </p>
            <div class="detail-box">
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Practitioner:</strong> {doctor_name}</p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Designation:</strong> {doctor_title}</p>
              {reg_row}
              <p style="margin: 0; font-size: 13px;"><strong>Hospital ID:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">{hospital_id}</code></p>
            </div>
            <h3 style="font-size: 14px; margin-top: 24px; margin-bottom: 8px;">How to Sign In to Your Doctor Console:</h3>
            <ul style="font-size: 13px; line-height: 1.7; padding-left: 20px; color: #475569;">
              <li><strong>Option 1 (Google 1-Click Login):</strong> Visit the Doctor Portal and click <em>"Sign In with Google"</em> using this email address (<strong>{doctor_email}</strong>). No password setup required.</li>
              <li><strong>Option 2 (Set Password / Sign Up):</strong> Click the activation link below to establish a secure password for your clinical console.</li>
            </ul>
            <div style="text-align: center; margin: 24px 0;">
              <a href="{invite_url}" class="btn">Activate Doctor Portal Account →</a>
            </div>
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">
              Invite link: {invite_url}<br>
              This link is valid for 7 days. If you did not expect this invite, please contact the facility administrator.
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    payload = {
        "from": f"{hospital_name} <onboarding@resend.dev>",
        "to": [doctor_email],
        "subject": subject,
        "html": html_content,
    }

    if not key or key == "re_YourFreeApiKeyHere":
        logger.warning("RESEND_API_KEY is not configured. Simulating delivery in DEMO mode.")
        return {
            "success": True,
            "status": "mock_delivered",
            "message": "Demo mode: Doctor onboarding email simulated successfully.",
            "doctor_email": doctor_email,
            "invite_url": invite_url,
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
                    return {"success": False, "error": data.get("message", resp.text), "status_code": resp.status_code}
        else:
            req = urllib.request.Request(
                RESEND_API_URL, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {"success": True, "data": data, "status": "sent"}
    except Exception as exc:
        logger.error("Failed to send doctor onboarding email: %s", exc)
        return {"success": False, "error": str(exc)}
