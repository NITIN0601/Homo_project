"""
Billing & Invoicing Route Handlers.
Handles consultation invoices, payment submission, UTR verification,
and offline Luhn/UPI payment validation.
"""

from datetime import datetime, timezone
from typing import Any

from core.config import settings
from core.security import (
    get_current_user,
    get_current_user_optional,
    require_admin_role,
    scope_items_to_patient_or_admin,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from schemas.billing import (
    CreateConsultationInvoiceRequest,
    CreateOrderRequest,
    PaymentValidateRequest,
    UpdateConsultationInvoiceRequest,
)
from services.data_store import (
    get_all_invoices,
    get_all_orders,
    save_invoice,
    save_order,
    update_invoice,
)
from services.hospital_service import get_hospital
from services.payment_validator import PaymentValidator

router = APIRouter(tags=["Billing & Payments"])


@router.get("/consultation-invoices", summary="List all consultation invoices")
async def list_invoices_endpoint(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict[str, Any] | None = Depends(get_current_user_optional),
):
    all_invoices = get_all_invoices()
    hospital_id = getattr(request.state, "hospital_id", None)
    scoped = scope_items_to_patient_or_admin(
        all_invoices,
        user,
        id_fields=("patientId", "patientEmail"),
        hospital_id=hospital_id,
    )
    return scoped[offset : offset + limit]


@router.post("/consultation-invoices", summary="Create consultation invoice")
async def create_invoice_endpoint(
    payload: CreateConsultationInvoiceRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    data = payload.model_dump(exclude_none=True)
    if not data.get("id"):
        data["id"] = f"INV-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    return save_invoice(data)


@router.put("/consultation-invoices/{invoice_id}", summary="Update consultation invoice / submit payment")
async def update_invoice_endpoint(
    invoice_id: str,
    payload: UpdateConsultationInvoiceRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    data = payload.model_dump(exclude_none=True)
    updated = update_invoice(invoice_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@router.post("/validate-payment", tags=["Payment Verification"])
async def validate_payment_endpoint(payload: PaymentValidateRequest):
    """
    Offline data-integrity verification for Visa, Mastercard, and UPI IDs.
    Enforces Luhn Mod-10 algorithm and structural regex patterns without network latency.
    """
    result = PaymentValidator.validate_payment(payload.method, payload.value)
    return result.to_dict()


# ─── Orders & 3rd Party Logistics API ─────────────────────────────────────────


@router.get("/orders", summary="List all orders")
async def list_orders_endpoint(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict[str, Any] | None = Depends(get_current_user_optional),
):
    all_orders = get_all_orders()
    hospital_id = getattr(request.state, "hospital_id", None)
    scoped = scope_items_to_patient_or_admin(
        all_orders,
        user,
        id_fields=("customerEmail", "patientEmail", "userId"),
        hospital_id=hospital_id,
    )
    return scoped[offset : offset + limit]


@router.post("/orders/create", summary="Place medicine order")
@router.post("/orders", summary="Place medicine order (alias)")
async def create_order_endpoint(
    payload: CreateOrderRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    data = payload.model_dump(exclude_none=True)
    # HIPAA / Integrity guard: Non-admin patients can only place orders under their own email
    if user.get("role") == "patient":
        user_email = user.get("email")
        if user_email:
            data["customerEmail"] = user_email
            data["patientEmail"] = user_email
    order_id = data.get("id") or f"ORD-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    data["id"] = order_id
    data.setdefault("status", "processing")
    data.setdefault("createdAt", datetime.now(timezone.utc).isoformat())
    save_order(data)
    return {
        "success": True,
        "message": f"Order #{order_id} recorded successfully.",
        "orderId": order_id,
        "order": data,
    }


@router.get("/consultation-invoices/{invoice_id}/export", summary="Export print-ready clinical invoice")
async def export_invoice_html(
    invoice_id: str,
    user: dict[str, Any] = Depends(require_admin_role),
):
    """Generates a print-ready, CSS-styled HTML clinical invoice with proper print margins."""
    all_invoices = get_all_invoices()
    target = next((inv for inv in all_invoices if inv.get("id") == invoice_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Invoice not found")

    hospital = get_hospital()
    hosp_name = hospital.get("name", settings.HOSPITAL_NAME)
    curr_sym = target.get("currencySymbol") or "₹"
    amount = target.get("amount") or target.get("total") or 0.0

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice {invoice_id} — {hosp_name}</title>
<style>
  @page {{ size: A4; margin: 20mm; }}
  @media print {{ body {{ -webkit-print-color-adjust: exact; }} }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; }}
  .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }}
  .header h1 {{ margin: 0; color: #0369a1; font-size: 24px; }}
  .meta {{ display: flex; justify-content: space-between; margin-bottom: 24px; }}
  .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
  th, td {{ padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
  th {{ background: #f1f5f9; font-weight: 600; }}
  .total {{ text-align: right; font-size: 18px; font-weight: bold; margin-top: 16px; color: #0369a1; }}
</style>
</head>
<body onload="window.print()">
  <div class="header">
    <h1>{hosp_name}</h1>
    <p>Clinical Consultation & Pharmacy Invoice</p>
  </div>
  <div class="meta">
    <div>
      <strong>Invoice No:</strong> {invoice_id}<br>
      <strong>Date:</strong> {target.get("date", datetime.now().strftime("%Y-%m-%d"))}<br>
      <strong>Status:</strong> {target.get("status", "Pending").upper()}
    </div>
    <div>
      <strong>Patient:</strong> {target.get("patientName", "Valued Patient")}<br>
      <strong>Email:</strong> {target.get("patientEmail", "N/A")}<br>
      <strong>Doctor:</strong> {target.get("doctorName", settings.DOCTOR_NAME)}
    </div>
  </div>
  <div class="card">
    <table>
      <thead>
        <tr><th>Description</th><th>Type</th><th style="text-align: right;">Amount</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>{target.get("description", "Homeopathic Consultation & Prescription Review")}</td>
          <td>Consultation</td>
          <td style="text-align: right;">{curr_sym}{amount}</td>
        </tr>
      </tbody>
    </table>
    <div class="total">Total Due / Paid: {curr_sym}{amount}</div>
  </div>
</body>
</html>"""
    return Response(content=html, media_type="text/html")


@router.get("/logistics/track/{tracking_id}", summary="Track order shipment")
async def track_shipment_endpoint(tracking_id: str):
    orders = get_all_orders()
    hospital = get_hospital()
    default_courier = hospital.get("logistics", {}).get("defaultCourier", settings.DEFAULT_COURIER_PARTNER)
    shipping_origin = hospital.get("logistics", {}).get("shippingOrigin", f"{hospital.get('name')} Central Pharmacy")

    matching = next((o for o in orders if o.get("trackingId") == tracking_id or o.get("id") == tracking_id), None)
    if matching:
        return {
            "trackingId": tracking_id,
            "status": matching.get("status", "in_transit"),
            "courierPartner": matching.get("courierPartner", default_courier),
            "trackingSteps": matching.get("trackingSteps", []),
            "estimatedDelivery": matching.get("estimatedDelivery", "3-5 business days"),
        }
    return {
        "trackingId": tracking_id,
        "status": "in_transit",
        "courierPartner": default_courier,
        "trackingSteps": [
            {
                "status": "Order Placed & Verified",
                "location": shipping_origin,
                "timestamp": "Just now",
                "completed": True,
            },
            {
                "status": f"Handed over to {default_courier}",
                "location": "Sort Facility Hub",
                "timestamp": "In Progress",
                "completed": False,
                "active": True,
            },
        ],
        "estimatedDelivery": "3-5 business days",
    }
