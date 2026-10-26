"""
Payments Router.
Endpoints for processing booking payments and viewing payment history.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status

from app.schemas.payments import CreatePaymentRequest, PaymentDetail
from app.services import payment_service
from app.security import get_current_user

router = APIRouter(tags=["Payments"])


@router.post(
    "/payments",
    response_model=PaymentDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Record a payment for a booking",
)
def create_payment(
    payload: CreatePaymentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Records a payment transaction.
    When payment status is 'SUCCESS', the database trigger payment_confirms_booking
    automatically confirms the associated booking.
    """
    return payment_service.process_payment(current_user, payload)


@router.get(
    "/bookings/{booking_id}/payments",
    response_model=List[PaymentDetail],
    summary="Get payment history for a booking",
)
def get_booking_payments(
    booking_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Retrieves all payment transactions associated with a booking ID."""
    return payment_service.get_booking_payments(booking_id, current_user)
