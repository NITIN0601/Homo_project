"""
Billing & Invoicing Route Handlers.
Handles consultation invoices, payment submission, UTR verification,
and offline Luhn/UPI payment validation.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from core.config import settings
from core.security import get_current_user_optional, scope_items_to_patient_or_admin
from schemas.billing import PaymentValidateRequest
from services.hospital_service import get_hospital
from services.data_store import (
    get_all_invoices,
    load_json,
    save_invoice,
    save_json,
    update_invoice,
)
from services.payment_validator import PaymentValidator

router = APIRouter(tags=["Billing & Payments"])

ORDERS_FILE = "orders_sync.json"


def get_all_orders() -> list[dict[str, Any]]:
    return load_json(ORDERS_FILE, default=[])


def save_order(order: dict[str, Any]) -> list[dict[str, Any]]:
    current = get_all_orders()
    idx = next((i for i, o in enumerate(current) if o.get("id") == order.get("id")), -1)
    if idx >= 0:
        current[idx] = {**current[idx], **order}
    else:
        current.insert(0, order)
    save_json(ORDERS_FILE, current)
    return current


@router.get("/consultation-invoices", summary="List all consultation invoices")
async def list_invoices_endpoint(user: dict[str, Any] | None = Depends(get_current_user_optional)):
    all_invoices = get_all_invoices()
    return scope_items_to_patient_or_admin(
        all_invoices,
        user,
        id_fields=("patientId", "patientEmail"),
    )


@router.post("/consultation-invoices", summary="Create consultation invoice")
async def create_invoice_endpoint(payload: dict[str, Any]):
    return save_invoice(payload)


@router.put("/consultation-invoices/{invoice_id}", summary="Update consultation invoice / submit payment")
async def update_invoice_endpoint(invoice_id: str, payload: dict[str, Any]):
    updated = update_invoice(invoice_id, payload)
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
async def list_orders_endpoint():
    return get_all_orders()


@router.post("/orders/create", summary="Place medicine order")
@router.post("/orders", summary="Place medicine order (alias)")
async def create_order_endpoint(payload: dict[str, Any]):
    order_id = payload.get("id") or f"ORD-{int(datetime.now().timestamp() * 1000)}"
    payload["id"] = order_id
    payload.setdefault("status", "processing")
    payload.setdefault("createdAt", datetime.now(timezone.utc).isoformat())
    save_order(payload)
    return {
        "success": True,
        "message": f"Order #{order_id} recorded successfully.",
        "orderId": order_id,
        "order": payload,
    }


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
            {"status": "Order Placed & Verified", "location": shipping_origin, "timestamp": "Just now", "completed": True},
            {"status": f"Handed over to {default_courier}", "location": "Sort Facility Hub", "timestamp": "In Progress", "completed": False, "active": True},
        ],
        "estimatedDelivery": "3-5 business days",
    }

