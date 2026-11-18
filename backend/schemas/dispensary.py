"""
Dispensary & Pharmacy Stock Request Schemas.
"""

from pydantic import BaseModel, Field


class RestockRequest(BaseModel):
    qty: int = Field(default=10, ge=1, le=1000)


class UpdateInventoryItemRequest(BaseModel):
    name: str | None = None
    potency: str | None = None
    form: str | None = None
    stock: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, ge=0.0)
    price_inr: float | None = Field(default=None, ge=0.0)
    priceINR: float | None = Field(default=None, ge=0.0)
    category: str | None = None
    supplierBatch: str | None = None
    expiryDate: str | None = None
