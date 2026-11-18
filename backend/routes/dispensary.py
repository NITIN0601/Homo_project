"""
Dispensary & Inventory Route Handlers.
Handles remedy catalogue, stock quantities, restock thresholds, and supplier batch numbers.
"""

from typing import Any

from core.security import require_admin_role
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from schemas.dispensary import RestockRequest, UpdateInventoryItemRequest
from services.data_store import (
    get_all_inventory,
    restock_inventory_item,
    update_inventory_item,
)
from services.supabase_service import (
    fetch_inventory_from_supabase,
    sync_inventory_to_supabase,
    update_inventory_item_in_supabase,
)

router = APIRouter(tags=["Dispensary & Inventory"])


@router.get("/inventory", summary="Get dispensary inventory list (Priority 1: Supabase)")
async def get_inventory_endpoint(
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    sb_items = await fetch_inventory_from_supabase()
    items = sb_items if sb_items else get_all_inventory()
    hospital_id = getattr(request.state, "hospital_id", None)
    if hospital_id and hospital_id != "default":
        items = [i for i in items if (i.get("hospitalId") or i.get("hospital_id") or "default").lower() == hospital_id.lower()]
    return items[offset : offset + limit]


@router.put("/inventory/{item_id}", summary="Update inventory remedy item (Priority 1: Supabase)")
async def update_inventory_endpoint(
    item_id: str,
    payload: UpdateInventoryItemRequest,
    user: dict[str, Any] = Depends(require_admin_role),
):
    data = payload.model_dump(exclude_none=True)
    sb_updated = await update_inventory_item_in_supabase(item_id, data)
    local_updated = update_inventory_item(item_id, data)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return sb_updated or local_updated


@router.post("/inventory/{item_id}/restock", summary="Restock remedy supply (Priority 1: Supabase)")
async def restock_inventory_endpoint(
    item_id: str,
    req: RestockRequest | None = None,
    user: dict[str, Any] = Depends(require_admin_role),
):
    qty = req.qty if req else 10
    updated = restock_inventory_item(item_id, qty)
    if not updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await sync_inventory_to_supabase(updated)
    return {"success": True, "item": updated}
