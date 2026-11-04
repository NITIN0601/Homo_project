"""
Billing & Invoicing Request Schemas.
"""

from pydantic import BaseModel, Field


class PaymentValidateRequest(BaseModel):
    method: str = Field(..., description="Payment method: visa, mastercard, card, upi, vpa")
    value: str = Field(..., description="Card number (with/without spaces) or UPI VPA (e.g. username@bank)")
