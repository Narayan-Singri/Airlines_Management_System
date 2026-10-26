"""
Flight Conditions and Flight Status Router.
Endpoints for pre-flight safety inspections and operational status updates.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status

from app.schemas.conditions import (
    FlightConditionCreate,
    FlightConditionDetail,
    FlightStatusUpdate,
)
from app.services import condition_service
from app.security import require_staff, require_roles

router = APIRouter(prefix="/flights", tags=["Flight Conditions & Status"])


@router.post(
    "/{flight_id}/conditions",
    response_model=FlightConditionDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Record pre-flight technical/safety inspection",
)
def record_flight_condition(
    flight_id: int,
    payload: FlightConditionCreate,
    staff_user: Dict[str, Any] = Depends(require_roles(["PILOT", "ADMIN"])),
):
    """
    Logs technical pre-flight parameters (fuel %, oil %, tyres, weather, overall rating).
    Authorized for Pilots and Admins.
    """
    return condition_service.log_flight_condition(flight_id, staff_user, payload)


@router.get(
    "/{flight_id}/conditions",
    response_model=List[FlightConditionDetail],
    summary="Get condition inspection history for a flight",
)
def get_flight_conditions(
    flight_id: int,
    staff_user: Dict[str, Any] = Depends(require_staff),
):
    """Retrieves all condition logs for a flight. Authorized for all staff members."""
    return condition_service.get_flight_conditions(flight_id)


@router.get(
    "/{flight_id}/conditions/latest",
    response_model=FlightConditionDetail,
    summary="Get latest condition inspection for a flight",
)
def get_latest_flight_condition(
    flight_id: int,
    staff_user: Dict[str, Any] = Depends(require_staff),
):
    """Retrieves the most recent condition inspection for a flight."""
    return condition_service.get_latest_condition(flight_id)


@router.patch(
    "/{flight_id}/status",
    summary="Update operational status of a flight",
)
def update_flight_status(
    flight_id: int,
    payload: FlightStatusUpdate,
    staff_user: Dict[str, Any] = Depends(require_staff),
):
    """
    Updates flight operational status (SCHEDULED, BOARDING, DEPARTED, ARRIVED, DELAYED, CANCELLED).
    Authorized for all staff members.
    """
    return condition_service.update_flight_status(flight_id, payload)
