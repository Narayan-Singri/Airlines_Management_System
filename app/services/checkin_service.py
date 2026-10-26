"""
Ground Staff check-in and boarding pass issuance business logic.
Validates booking confirmation, passenger passport match, baggage, and produces boarding passes.
"""

from typing import Any, Dict
from fastapi import HTTPException, status
import psycopg

from app.database import fetch_one, execute_commit
from app.schemas.checkin import CheckinRequest, BoardingPass


def process_checkin(staff_user: Dict[str, Any], payload: CheckinRequest) -> BoardingPass:
    """
    Ground Staff check-in workflow:
    1. Verifies booking exists and is CONFIRMED.
    2. Validates passenger passport matches.
    3. Ensures one check-in per booking.
    4. Records baggage weight and issues boarding pass.
    5. Updates booking status to CHECKED_IN.
    """
    staff_id = staff_user["user_id"]

    # Retrieve booking and passenger details
    query = """
    SELECT b.booking_id, b.pnr, b.status, b.flight_id, b.seat_no,
           p.passenger_id, p.full_name AS passenger_name, p.passport_no
    FROM booking b
    JOIN passenger p ON p.passenger_id = b.passenger_id
    WHERE b.booking_id = %s;
    """
    booking = fetch_one(query, (payload.booking_id,))
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {payload.booking_id} not found.",
        )

    # Must be CONFIRMED
    if booking["status"] == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check in: Booking has not been paid and confirmed yet.",
        )
    if booking["status"] == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check in: Booking is cancelled.",
        )
    if booking["status"] == "CHECKED_IN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Passenger is already checked in for this booking.",
        )

    # Check passport match
    registered_passport = booking.get("passport_no")
    input_passport = payload.passport_no.strip().upper()
    if not registered_passport or registered_passport.strip().upper() != input_passport:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Passport verification failed: Provided '{input_passport}' does not match registered passenger passport.",
        )

    # Check if checkin row already exists
    existing_checkin = fetch_one(
        "SELECT checkin_id FROM checkin WHERE booking_id = %s;", (payload.booking_id,)
    )
    if existing_checkin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A boarding pass has already been issued for this booking.",
        )

    insert_query = """
    INSERT INTO checkin(booking_id, employee_id, passport_matched, baggage_kg)
    VALUES (%s, %s, %s, %s)
    RETURNING checkin_id, boarding_pass_no;
    """
    try:
        checkin_row = execute_commit(
            insert_query, (payload.booking_id, staff_id, True, payload.baggage_kg)
        )
        # Update booking status to CHECKED_IN
        execute_commit(
            "UPDATE booking SET status = 'CHECKED_IN' WHERE booking_id = %s;",
            (payload.booking_id,),
        )
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in transaction failed: {str(e)}",
        )

    return get_checkin_by_pnr(booking["pnr"])


def get_checkin_by_pnr(pnr: str) -> BoardingPass:
    """Retrieves the issued boarding pass for a given booking PNR."""
    query = """
    SELECT c.checkin_id, c.boarding_pass_no, b.booking_id, b.pnr,
           p.full_name AS passenger_name, p.passport_no,
           f.flight_no, o.iata_code AS origin_code, d.iata_code AS destination_code,
           f.departure_time, b.seat_no, s.class AS seat_class,
           c.baggage_kg, c.checked_in_at, e.full_name AS gate_staff
    FROM checkin c
    JOIN booking b ON b.booking_id = c.booking_id
    JOIN passenger p ON p.passenger_id = b.passenger_id
    JOIN flight f ON f.flight_id = b.flight_id
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN flight_seat s ON s.flight_id = b.flight_id AND s.seat_no = b.seat_no
    JOIN employee e ON e.employee_id = c.employee_id
    WHERE b.pnr = %s;
    """
    row = fetch_one(query, (pnr.strip().upper(),))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No boarding pass found for PNR '{pnr}'. Passenger may not be checked in.",
        )
    return BoardingPass(**row)
