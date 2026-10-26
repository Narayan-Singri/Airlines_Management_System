"""
Bookings Router.
Endpoints for reserving seats, viewing booking histories, inspecting PNRs, and cancellations.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status

from app.schemas.bookings import CreateBookingRequest, BookingDetail, CancelBookingResponse
from app.services import booking_service
from app.security import get_current_user, require_customer

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "",
    response_model=BookingDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Book a flight seat",
)
def book_seat(
    payload: CreateBookingRequest,
    current_user: Dict[str, Any] = Depends(require_customer),
):
    """
    Reserves a seat on a flight using PostgreSQL row-level locks via book_seat().
    Returns 409 Conflict if the seat is already taken.
    """
    customer_id = current_user["user_id"]
    return booking_service.create_booking(customer_id, payload)


@router.get(
    "/me",
    response_model=List[BookingDetail],
    summary="List all bookings for current customer",
)
def list_my_bookings(
    current_user: Dict[str, Any] = Depends(require_customer),
):
    """Returns the full booking history for the authenticated customer."""
    customer_id = current_user["user_id"]
    return booking_service.get_customer_bookings(customer_id)


@router.get(
    "/{pnr}",
    response_model=BookingDetail,
    summary="Get booking details by PNR",
)
def get_booking_by_pnr(
    pnr: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Retrieves booking details for a 6-character PNR.
    Customers may only view their own bookings; staff may view any.
    """
    return booking_service.get_booking_by_pnr(pnr, current_user)


@router.post(
    "/{booking_id}/cancel",
    response_model=CancelBookingResponse,
    summary="Cancel a booking and release the seat",
)
def cancel_booking(
    booking_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Cancels a booking using cancel_booking() and frees the seat in flight_seat.
    Customers may only cancel their own bookings.
    """
    return booking_service.cancel_booking_by_id(booking_id, current_user)
