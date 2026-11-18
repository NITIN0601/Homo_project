"""
Billing & Invoicing Request Schemas with Enterprise Input Sanitization.
Enforces Pydantic v2 typing, HTML tag stripping, and numeric bounds.
"""

from __future__ import annotations

import html
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PaymentValidateRequest(BaseModel):
    method: str = Field(..., description="Payment method: visa, mastercard, card, upi, vpa")
    value: str = Field(..., description="Card number (with/without spaces) or UPI VPA (e.g. username@bank)")


class CreateConsultationInvoiceRequest(BaseModel):
    id: str | None = Field(default=None, max_length=64, description="Optional client-generated invoice ID")
    patientId: str = Field(..., min_length=1, max_length=64)
    patientName: str = Field(..., min_length=1, max_length=150)
    doctorName: str = Field(..., min_length=1, max_length=150)
    appointmentId: str | None = Field(default=None, max_length=64)
    issueDate: str | None = Field(default=None, max_length=50)
    amountINR: float = Field(..., gt=0, le=10_000_000, description="Amount must be strictly positive")
    amount: float | None = Field(default=None, gt=0, le=10_000_000, description="Universal amount alias")
    currency: str | None = Field(
        default="INR", max_length=10, description="Billing currency e.g. INR, USD, GBP, AED, EUR"
    )
    currencySymbol: str | None = Field(default="₹", max_length=10, description="Display symbol e.g. ₹, $, £, AED, €")
    status: Literal["pending", "processing", "paid", "cancelled"] = Field(default="pending")
    description: str = Field(..., max_length=1000)
    transactionRef: str | None = Field(default=None, max_length=100)
    paymentMethod: Literal["upi", "card", "netbanking", "cash"] | None = Field(default=None)
    paidAt: str | None = Field(default=None, max_length=50)

    @field_validator("patientName", "doctorName", "description", mode="before")
    @classmethod
    def sanitize_text(cls, v: object) -> object:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v

    @field_validator("transactionRef", mode="before")
    @classmethod
    def sanitize_transaction_ref(cls, v: object) -> object:
        if isinstance(v, str):
            return re.sub(r"[^A-Za-z0-9_-]", "", v.strip())
        return v


class UpdateConsultationInvoiceRequest(BaseModel):
    status: Literal["pending", "processing", "paid", "cancelled"] | None = None
    transactionRef: str | None = Field(default=None, max_length=100)
    paymentMethod: str | None = Field(default=None, max_length=50)
    paidAt: str | None = Field(default=None, max_length=50)
    customPatientUpi: str | None = Field(default=None, max_length=120)
    bankName: str | None = Field(default=None, max_length=100)
    amountINR: float | None = Field(default=None, gt=0, le=10_000_000)
    amount: float | None = Field(default=None, gt=0, le=10_000_000)
    currency: str | None = Field(default=None, max_length=10)
    currencySymbol: str | None = Field(default=None, max_length=10)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("transactionRef", mode="before")
    @classmethod
    def sanitize_transaction_ref(cls, v: object) -> object:
        if isinstance(v, str):
            return re.sub(r"[^A-Za-z0-9_-]", "", v.strip())
        return v

    @field_validator("description", "customPatientUpi", "bankName", mode="before")
    @classmethod
    def sanitize_text(cls, v: object) -> object:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v


class OrderItem(BaseModel):
    id: str | None = Field(default=None, max_length=64)
    name: str = Field(..., min_length=1, max_length=150)
    potency: str | None = Field(default=None, max_length=50)
    form: str | None = Field(default=None, max_length=50)
    quantity: int = Field(default=1, ge=1, le=1000)
    priceINR: float = Field(default=0, ge=0, le=1_000_000)

    @field_validator("name", "potency", "form", mode="before")
    @classmethod
    def sanitize_string_fields(cls, v: object) -> object:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v


class CreateOrderRequest(BaseModel):
    id: str | None = Field(default=None, max_length=64)
    patientId: str | None = Field(default=None, max_length=64)
    customerName: str | None = Field(default=None, max_length=150)
    customerEmail: str | None = Field(default=None, max_length=150)
    customerPhone: str | None = Field(default=None, max_length=30)
    shippingAddress: dict[str, str] | None = None
    items: list[OrderItem] = Field(default_factory=list)
    totalAmountINR: float | None = Field(default=0, ge=0, le=10_000_000)
    paymentMethod: str | None = Field(default="cod", max_length=50)
    status: Literal["processing", "dispatched", "delivered", "cancelled"] | None = Field(default="processing")
    createdAt: str | None = None

    @field_validator("customerName", "customerEmail", "customerPhone", mode="before")
    @classmethod
    def sanitize_customer_fields(cls, v: object) -> object:
        if isinstance(v, str):
            return html.escape(v.strip())
        return v
