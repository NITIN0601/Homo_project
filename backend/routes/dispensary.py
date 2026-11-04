"""
Dispensary & Inventory Route Handlers.
Handles remedy catalogue, stock quantities, restock thresholds, and supplier batch numbers.
"""

from typing import Any
from fastapi import APIRouter, HTTPException

from schemas.dispensary import RestockRequest
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
async def get_inventory_endpoint():
    sb_items = await fetch_inventory_from_supabase()
    if sb_items:
        return sb_items
    return get_all_inventory()


@router.put("/inventory/{item_id}", summary="Update inventory remedy item (Priority 1: Supabase)")
async def update_inventory_endpoint(item_id: str, payload: dict[str, Any]):
    sb_updated = await update_inventory_item_in_supabase(item_id, payload)
    local_updated = update_inventory_item(item_id, payload)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return sb_updated or local_updated


@router.post("/inventory/{item_id}/restock", summary="Restock remedy supply (Priority 1: Supabase)")
async def restock_inventory_endpoint(item_id: str, req: RestockRequest | None = None):
    qty = req.qty if req else 10
    updated = restock_inventory_item(item_id, qty)
    if not updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await sync_inventory_to_supabase(updated)
    return {"success": True, "item": updated}

