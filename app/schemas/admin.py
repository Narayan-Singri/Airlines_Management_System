"""
Pydantic models for Admin Operations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field


class AirportCreate(BaseModel):
    iata_code: str = Field(..., min_length=3, max_length=3)
    name: str = Field(..., max_length=120)
    city: str = Field(..., max_length=80)
    country: str = Field(default="India", max_length=80)


class AircraftCreate(BaseModel):
    registration_no: str = Field(..., max_length=20)
    model: str = Field(..., max_length=60)
    total_seats: int = Field(..., gt=0)
    status: Literal["ACTIVE", "MAINTENANCE", "RETIRED"] = "ACTIVE"


class FlightCreate(BaseModel):
    flight_no: str = Field(..., max_length=10)
    origin_id: int
    destination_id: int
    aircraft_id: int
    departure_time: datetime
    arrival_time: datetime
    base_price: Decimal = Field(..., ge=0)


class EmployeeCreate(BaseModel):
    department_id: int
    full_name: str = Field(..., max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6)
    emp_type: Literal["PILOT", "CABIN_CREW", "GROUND_STAFF", "ADMIN"]
    salary: Optional[Decimal] = Field(None, ge=0)
    license_no: Optional[str] = None
    flight_hours: Optional[int] = 0
    languages: Optional[str] = None
    duty_area: Optional[str] = "CHECKIN"


class CrewAssignmentCreate(BaseModel):
    employee_id: int
    duty: Literal["CAPTAIN", "FIRST_OFFICER", "CABIN", "GROUND"]
