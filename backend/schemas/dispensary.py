"""
Dispensary & Pharmacy Stock Request Schemas.
"""

from pydantic import BaseModel, Field


class RestockRequest(BaseModel):
    qty: int = Field(default=10, ge=1, le=1000)
