"""
Payment processing business logic.
Records payment transactions and invokes automatic booking confirmation via database trigger.
"""

from typing import Any, Dict, List
from fastapi import HTTPException, status
import psycopg

from app.database import fetch_one, fetch_all, execute_commit
from app.schemas.payments import CreatePaymentRequest, PaymentDetail


def process_payment(user: Dict[str, Any], payload: CreatePaymentRequest) -> PaymentDetail:
    """
    Creates a payment for a booking.
    When status is 'SUCCESS', PostgreSQL trigger payment_confirms_booking updates booking to 'CONFIRMED'.
    """
    # Check booking exists
    booking = fetch_one(
        "SELECT booking_id, passenger_id, status, amount FROM booking WHERE booking_id = %s;",
        (payload.booking_id,),
    )
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {payload.booking_id} not found.",
        )

    # Authorization
    if user.get("role") == "customer" and booking["passenger_id"] != user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot pay for another passenger's booking.",
        )

    if booking["status"] == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot pay for a cancelled booking.",
        )

    query = """
    INSERT INTO payment(booking_id, amount, method, status)
    VALUES (%s, %s, %s, %s)
    RETURNING payment_id, booking_id, amount, method, method AS payment_method, status, paid_at;
    """
    try:
        created = execute_commit(
            query, (payload.booking_id, payload.amount, payload.method, payload.status)
        )
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment transaction failed: {str(e)}",
        )

    return PaymentDetail(**created)


def get_booking_payments(booking_id: int, user: Dict[str, Any]) -> List[PaymentDetail]:
    """Retrieves payment ledger entries for a given booking ID."""
    booking = fetch_one(
        "SELECT booking_id, passenger_id FROM booking WHERE booking_id = %s;",
        (booking_id,),
    )
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found.",
        )

    if user.get("role") == "customer" and booking["passenger_id"] != user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view payments for another passenger's booking.",
        )

    query = """
    SELECT payment_id, booking_id, amount, method, method AS payment_method, status, paid_at
    FROM payment
    WHERE booking_id = %s
    ORDER BY paid_at DESC;
    """
    rows = fetch_all(query, (booking_id,))
    return [PaymentDetail(**r) for r in rows]
