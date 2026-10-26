"""
Pydantic models for Ground Check-in and Boarding Passes.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class CheckinRequest(BaseModel):
    booking_id: int
    passport_no: str = Field(..., min_length=2, max_length=20)
    baggage_kg: Decimal = Field(default=Decimal("0.0"), ge=0, le=100)


class BoardingPass(BaseModel):
    checkin_id: int
    boarding_pass_no: str
    booking_id: int
    pnr: str
    passenger_name: str
    passport_no: str
    flight_no: str
    origin_code: str
    destination_code: str
    departure_time: datetime
    seat_no: str
    seat_class: str
    baggage_kg: Decimal
    checked_in_at: datetime
    gate_staff: str
