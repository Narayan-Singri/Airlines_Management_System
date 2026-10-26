"""
Pydantic models for Flight and Seat operations.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel


class FlightSearchItem(BaseModel):
    flight_id: int
    flight_no: str
    origin: str
    destination: str
    origin_city: str
    destination_city: str
    departure_time: datetime
    arrival_time: datetime
    base_price: Decimal
    status: str
    available_seats: int


class FlightDetail(BaseModel):
    flight_id: int
    flight_no: str
    origin_id: int
    destination_id: int
    origin_code: str
    destination_code: str
    origin_name: str
    destination_name: str
    origin_city: str
    destination_city: str
    aircraft_id: int
    aircraft_model: str
    registration_no: str
    departure_time: datetime
    arrival_time: datetime
    base_price: Decimal
    status: str
    total_seats: int
    available_seats: int


class SeatItem(BaseModel):
    flight_id: int
    seat_no: str
    class_type: str
    price: Decimal
    is_booked: bool
