"""
Check-in and Boarding Pass Router.
Authorized for Ground Staff (and Admin) to verify passengers and issue boarding passes.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, status

from app.schemas.checkin import CheckinRequest, BoardingPass
from app.services import checkin_service
from app.security import require_roles, get_current_user

router = APIRouter(prefix="/checkin", tags=["Check-in"])


@router.post(
    "",
    response_model=BoardingPass,
    status_code=status.HTTP_201_CREATED,
    summary="Ground staff check-in and boarding pass issuance",
)
def checkin_passenger(
    payload: CheckinRequest,
    staff_user: Dict[str, Any] = Depends(require_roles(["GROUND_STAFF", "ADMIN"])),
):
    """
    Ground staff checks in a passenger:
    - Validates booking is CONFIRMED.
    - Validates passenger passport matches.
    - Records baggage weight.
    - Issues boarding pass and transitions booking to CHECKED_IN.
    """
    return checkin_service.process_checkin(staff_user, payload)


@router.get(
    "/{pnr}",
    response_model=BoardingPass,
    summary="Get boarding pass by PNR",
)
def get_boarding_pass(
    pnr: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves an issued boarding pass for a given booking PNR."""
    return checkin_service.get_checkin_by_pnr(pnr)
