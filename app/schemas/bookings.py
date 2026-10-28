"""
Pydantic models for Booking operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class CreateBookingRequest(BaseModel):
    flight_id: int
    seat_no: str = Field(..., min_length=2, max_length=4)


class BookingDetail(BaseModel):
    booking_id: int
    pnr: str
    passenger_id: int
    passenger_name: str
    passport_no: Optional[str] = None
    flight_id: int
    flight_no: str
    origin_code: str
    destination_code: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    origin_name: Optional[str] = None
    destination_name: Optional[str] = None
    origin_city: Optional[str] = None
    destination_city: Optional[str] = None
    departure_time: datetime
    arrival_time: datetime
    seat_no: str
    seat_class: str
    status: str
    amount: Decimal
    booked_at: datetime


class CancelBookingResponse(BaseModel):
    message: str
    booking_id: int
    pnr: str
    seat_no: str
    status: str
