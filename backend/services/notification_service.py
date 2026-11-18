"""
Unified Notification Service for Multi-Tenant EHR Healthcare Platform.
Orchestrates Resend transactional emails and WhatsApp Business notifications
for appointment booking confirmations, post-consultation follow-ups, and patient feedback.
"""

import logging
from typing import Any

from core.config import settings
from services.doctor_service import get_doctor
from services.email_service import send_appointment_confirmation as send_appointment_confirmation
from services.hospital_service import get_hospital
from services.social_media_service import send_hospital_whatsapp_message

logger = logging.getLogger("notification_service")

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = settings.RESEND_API_KEY
HOSPITAL_ADMIN_EMAIL = settings.HOSPITAL_ADMIN_EMAIL
RESEND_FROM_EMAIL = settings.RESEND_FROM_EMAIL
WHATSAPP_API_TOKEN = settings.WHATSAPP_API_TOKEN
WHATSAPP_PHONE_ID = settings.WHATSAPP_PHONE_ID


async def send_appointment_whatsapp_notification(
    phone: str,
    customer_name: str,
    appointment_time: str,
    doctor_name: str | None = None,
    hospital_location: str | None = None,
    hospital_id: str | None = None,
) -> dict[str, Any]:
    """
    Dispatches automated WhatsApp confirmation for booked appointment.
    """
    hospital = get_hospital(hospital_id)
    h_name = hospital.get("name", settings.HOSPITAL_NAME)
    h_phone = hospital.get("contact", {}).get("phone", settings.HOSPITAL_PHONE)
    h_city = hospital.get("contact", {}).get("address", {}).get("city", "Bengaluru")

    doc_name = doctor_name or settings.DOCTOR_SHORT_NAME
    hosp_loc = hospital_location or f"{h_name}, {h_city}"
    message_text = (
        f"🌿 *{h_name}*\n\n"
        f"Namaste {customer_name},\n"
        f"Your appointment with *{doc_name}* is confirmed.\n\n"
        f"📅 *Date & Time*: {appointment_time}\n"
        f"📍 *Location*: {hosp_loc}\n\n"
        f"• Please arrive 10 minutes prior.\n"
        f"• For assistance or reschedule, reply to this WhatsApp message or call {h_phone}."
    )

    return await send_hospital_whatsapp_message(
        hospital_id=hospital.get("id"),
        to_phone=phone,
        message_text=message_text,
        template_name="appointment_confirmation",
    )


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

    h_name = hospital.get("name", settings.HOSPITAL_NAME)
    doc_name = doctor_name or doctor.get("name")
    addr_dict = hospital.get("contact", {}).get("address", {})
    addr_str = (
        f"{addr_dict.get('street', '')}, {addr_dict.get('city', '')} – {addr_dict.get('pincode', '')}"
        if addr_dict
        else settings.HOSPITAL_ADDRESS
    )
    h_phone = hospital.get("contact", {}).get("phone", settings.HOSPITAL_PHONE)
    admin_email = hospital.get("contact", {}).get("email") or HOSPITAL_ADMIN_EMAIL

    remedy_rows = ""
    for r in prescribed_remedies or []:
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


async def send_user_invite_notification(
    email: str,
    name: str,
    role: str,
    hospital_id: str | None,
    invite_url: str,
    phone: str | None = None,
    custom_message: str | None = None,
    send_email: bool = True,
    send_sms: bool = True,
) -> dict[str, Any]:
    """
    Dispatches dynamic, tenant-branded invitation notifications via Email (Resend)
    and SMS / WhatsApp. All messaging is dynamically customized based on the active
    hospital/clinic profile, facility classification, branding palette, user role,
    and optional custom administrative note.
    """
    hospital = get_hospital(hospital_id)
    h_name = hospital.get("name", settings.HOSPITAL_NAME)
    facility_type = hospital.get("facilityType", "hospital")
    facility_label = "Clinic" if facility_type == "clinic" else "Hospital"
    branding = hospital.get("branding", {})
    primary_color = branding.get("primaryColor", "#1b4332")
    accent_color = branding.get("accentColor", "#2d6a4f")
    tagline = hospital.get("tagline", "Clinical Excellence & Compassionate Healthcare")
    contact = hospital.get("contact", {})
    h_phone = contact.get("phone", settings.HOSPITAL_PHONE)
    h_email = contact.get("email", settings.HOSPITAL_ADMIN_EMAIL)
    addr = contact.get("address", {})
    addr_str = (
        f"{addr.get('street', '')}, {addr.get('city', '')} – {addr.get('pincode', '')}"
        if isinstance(addr, dict) and addr.get("city")
        else settings.HOSPITAL_ADDRESS
    )

    clean_role = (role or "patient").strip().lower()
    if clean_role in ("doctor", "physician"):
        portal_name = f"{h_name} Doctor Clinical Console"
        role_title = "Doctor & Consulting Physician"
        action_btn_text = "Activate Doctor Clinical Console →"
        role_description = (
            f"You have been invited to join the medical practitioner network at <strong>{h_name}</strong>. "
            "Manage patient case taking, repertorization, clinical SOAP notes, and digital prescriptions."
        )
    elif clean_role in ("admin", "super_admin"):
        portal_name = f"{h_name} Administration Console"
        role_title = f"{facility_label} Administrator"
        action_btn_text = f"Access {facility_label} Admin Portal →"
        role_description = (
            f"You have been granted administrative privileges for <strong>{h_name}</strong>. "
            f"Oversee {facility_label.lower()} operations, staff rosters, patient accounts, and billing reconciliation."
        )
    else:
        portal_name = f"{h_name} Patient Portal"
        role_title = "Patient Healthcare Portal"
        action_btn_text = "Activate Patient Health Portal →"
        role_description = (
            f"You have been invited to access your secure patient portal at <strong>{h_name}</strong>. "
            "View consultation summaries, prescribed remedies, appointment bookings, and tax-exempt receipts."
        )

    # Dynamic Custom Note callout block
    custom_note_html = ""
    if custom_message and custom_message.strip():
        custom_note_html = f"""
        <div style="background: #f8fafc; border-left: 4px solid {primary_color}; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
          <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #475569;">Note from {h_name} Administration:</p>
          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1e293b; font-style: italic;">&ldquo;{custom_message.strip()}&rdquo;</p>
        </div>
        """

    subject = f"Welcome to {h_name} — Your {facility_label} Portal Invitation"
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
          .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }}
          .header {{ background: linear-gradient(135deg, {primary_color} 0%, {accent_color} 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
          .badge {{ display: inline-block; background: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }}
          .body-content {{ padding: 28px 24px; }}
          .btn {{ display: inline-block; background: {primary_color}; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; margin-top: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }}
          .detail-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; }}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span class="badge">{facility_label.upper()} INVITATION</span>
            <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 800;">Welcome, {name}!</h1>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255, 255, 255, 0.85);">{tagline}</p>
          </div>
          <div class="body-content">
            <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              {role_description}
            </p>

            {custom_note_html}

            <div class="detail-box">
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>{facility_label}:</strong> {h_name}</p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Invited Role:</strong> {role_title}</p>
              <p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Account Email:</strong> {email}</p>
              <p style="margin: 0; font-size: 13px;"><strong>Activation Window:</strong> 7 Days (Single-Use Secure Link)</p>
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="{invite_url}" class="btn">{action_btn_text}</a>
            </div>

            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0;">
              • <strong>Fast Google Login</strong>: If this email matches your Google account, you can also log in directly using <em>&ldquo;Sign in with Google&rdquo;</em>.<br>
              • Need assistance? Contact reception at <strong>{h_phone}</strong> or reply to this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="margin: 0; font-size: 11px; color: #94a3b8; text-align: center;">
              {h_name} &bull; {addr_str} &bull; {h_email}
            </p>
          </div>
        </div>
      </body>
    </html>
    """

    email_delivery: dict[str, Any] = {"requested": send_email, "status": "skipped"}
    if send_email:
        payload = {
            "from": f"{h_name} <onboarding@resend.dev>",
            "to": [email],
            "subject": subject,
            "html": html_content,
        }
        key = RESEND_API_KEY
        if not key or key.startswith("re_YourFreeApiKey"):
            logger.info(f"Customized invite email simulated for {email} ({h_name})")
            email_delivery = {
                "requested": True,
                "status": "mock_delivered",
                "recipient": email,
                "facility": h_name,
                "subject": subject,
            }
        else:
            try:
                import httpx

                headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(RESEND_API_URL, json=payload, headers=headers)
                    email_delivery = {
                        "requested": True,
                        "status": "sent" if resp.status_code in (200, 201) else "failed",
                        "status_code": resp.status_code,
                    }
            except Exception as exc:
                email_delivery = {"requested": True, "status": "error", "error": str(exc)}

    sms_delivery: dict[str, Any] = {"requested": send_sms, "status": "skipped"}
    if send_sms and phone:
        wa_text = (
            f"🌿 *{h_name}*\n"
            f"Official {facility_label} Portal Invitation\n\n"
            f"Dear {name},\n"
            f"You have been invited to join the *{portal_name}*.\n\n"
            + (f"💬 *Note*: \"{custom_message.strip()}\"\n\n" if custom_message and custom_message.strip() else "")
            + f"🔗 *Activate Your Account*: {invite_url}\n"
            f"⏱️ Link is valid for 7 days.\n\n"
            f"• For help, call reception at {h_phone} or email {h_email}."
        )

        sms_delivery = await send_hospital_whatsapp_message(
            hospital_id=hospital.get("id"),
            to_phone=phone,
            message_text=wa_text,
            template_name="user_portal_invitation",
        )
        sms_delivery["requested"] = True
        sms_delivery["facility"] = h_name
        sms_delivery["message"] = wa_text

    return {
        "success": True,
        "facility_name": h_name,
        "facility_type": facility_type,
        "facility_label": facility_label,
        "email": email_delivery,
        "sms": sms_delivery,
    }
