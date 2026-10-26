"""
Pydantic models for Flight Conditions and Status Management.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field


class FlightConditionCreate(BaseModel):
    fuel_level_pct: Decimal = Field(..., ge=0, le=100)
    oil_level_pct: Decimal = Field(..., ge=0, le=100)
    tyre_ok: bool = True
    weather: Literal["CLEAR", "CLOUDY", "RAIN", "STORM", "FOG"]
    overall: Literal["GOOD", "MODERATE", "POOR"]
    remarks: Optional[str] = None


class FlightConditionDetail(BaseModel):
    condition_id: int
    flight_id: int
    checked_by: int
    inspector_name: str
    checked_at: datetime
    fuel_level_pct: Decimal
    oil_level_pct: Decimal
    tyre_ok: bool
    weather: str
    overall: str
    remarks: Optional[str]


class FlightStatusUpdate(BaseModel):
    status: Literal["SCHEDULED", "BOARDING", "DEPARTED", "ARRIVED", "DELAYED", "CANCELLED"]
