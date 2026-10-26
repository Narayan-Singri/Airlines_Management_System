"""
Pydantic models for Payments.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field


class CreatePaymentRequest(BaseModel):
    booking_id: int
    amount: Decimal = Field(..., gt=0)
    method: Literal["UPI", "CARD", "NETBANKING", "WALLET"]
    status: Literal["SUCCESS", "FAILED"] = "SUCCESS"


class PaymentDetail(BaseModel):
    payment_id: int
    booking_id: int
    amount: Decimal
    method: str
    status: str
    paid_at: datetime
