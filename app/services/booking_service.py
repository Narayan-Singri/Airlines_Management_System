"""
Booking business logic.
Integrates directly with PostgreSQL race-safe stored procedures book_seat() and cancel_booking().
"""

from typing import Any, Dict, List
from fastapi import HTTPException, status
import psycopg

from app.database import get_db_cursor, fetch_one, fetch_all
from app.schemas.bookings import CreateBookingRequest, BookingDetail, CancelBookingResponse


def create_booking(customer_id: int, payload: CreateBookingRequest) -> BookingDetail:
    """
    Executes race-safe seat booking using book_seat(passenger_id, flight_id, seat_no).
    Throws 409 Conflict if seat is already booked or doesn't exist.
    """
    seat_clean = payload.seat_no.strip().upper()
    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                "SELECT book_seat(%s, %s, %s);",
                (customer_id, payload.flight_id, seat_clean),
            )
            booking_id = cur.fetchone()["book_seat"]
    except psycopg.Error as e:
        error_msg = str(e).strip()
        if "is not available" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Seat '{seat_clean}' on flight {payload.flight_id} is already booked or unavailable.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to book seat: {error_msg}",
        )

    return get_booking_by_id(booking_id)


def get_booking_by_id(booking_id: int) -> BookingDetail:
    """Retrieves full details of a specific booking by ID."""
    query = """
    SELECT b.booking_id, b.pnr, b.passenger_id, p.full_name AS passenger_name, p.passport_no,
           b.flight_id, f.flight_no,
           o.iata_code AS origin_code, d.iata_code AS destination_code,
           o.iata_code AS origin, d.iata_code AS destination,
           o.name AS origin_name, d.name AS destination_name,
           o.city AS origin_city, d.city AS destination_city,
           f.departure_time, f.arrival_time, b.seat_no, s.class AS seat_class,
           b.status, b.amount, b.booked_at
    FROM booking b
    JOIN passenger p ON p.passenger_id = b.passenger_id
    JOIN flight f ON f.flight_id = b.flight_id
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN flight_seat s ON s.flight_id = b.flight_id AND s.seat_no = b.seat_no
    WHERE b.booking_id = %s;
    """
    row = fetch_one(query, (booking_id,))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found.",
        )
    return BookingDetail(**row)


def get_customer_bookings(customer_id: int) -> List[BookingDetail]:
    """Retrieves all bookings made by the authenticated customer."""
    query = """
    SELECT b.booking_id, b.pnr, b.passenger_id, p.full_name AS passenger_name, p.passport_no,
           b.flight_id, f.flight_no,
           o.iata_code AS origin_code, d.iata_code AS destination_code,
           o.iata_code AS origin, d.iata_code AS destination,
           o.name AS origin_name, d.name AS destination_name,
           o.city AS origin_city, d.city AS destination_city,
           f.departure_time, f.arrival_time, b.seat_no, s.class AS seat_class,
           b.status, b.amount, b.booked_at
    FROM booking b
    JOIN passenger p ON p.passenger_id = b.passenger_id
    JOIN flight f ON f.flight_id = b.flight_id
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN flight_seat s ON s.flight_id = b.flight_id AND s.seat_no = b.seat_no
    WHERE b.passenger_id = %s
    ORDER BY b.booked_at DESC;
    """
    rows = fetch_all(query, (customer_id,))
    return [BookingDetail(**r) for r in rows]


def get_booking_by_pnr(pnr: str, user: Dict[str, Any]) -> BookingDetail:
    """
    Retrieves booking by 6-character PNR.
    Enforces authorization: customers can only view their own bookings; staff can view any.
    """
    query = """
    SELECT b.booking_id, b.pnr, b.passenger_id, p.full_name AS passenger_name, p.passport_no,
           b.flight_id, f.flight_no,
           o.iata_code AS origin_code, d.iata_code AS destination_code,
           o.iata_code AS origin, d.iata_code AS destination,
           o.name AS origin_name, d.name AS destination_name,
           o.city AS origin_city, d.city AS destination_city,
           f.departure_time, f.arrival_time, b.seat_no, s.class AS seat_class,
           b.status, b.amount, b.booked_at
    FROM booking b
    JOIN passenger p ON p.passenger_id = b.passenger_id
    JOIN flight f ON f.flight_id = b.flight_id
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN flight_seat s ON s.flight_id = b.flight_id AND s.seat_no = b.seat_no
    WHERE b.pnr = %s;
    """
    row = fetch_one(query, (pnr.strip().upper(),))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with PNR '{pnr}' not found.",
        )

    # Authorization check
    if user.get("role") == "customer" and row["passenger_id"] != user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You may only view your own bookings.",
        )

    return BookingDetail(**row)


def cancel_booking_by_id(booking_id: int, user: Dict[str, Any]) -> CancelBookingResponse:
    """
    Cancels a booking using cancel_booking(p_booking) and frees the physical seat.
    Enforces authorization: customers can only cancel their own bookings.
    """
    booking = fetch_one(
        "SELECT booking_id, pnr, passenger_id, seat_no, status FROM booking WHERE booking_id = %s;",
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
            detail="Access forbidden: You cannot cancel another passenger's booking.",
        )

    if booking["status"] == "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled.",
        )

    try:
        with get_db_cursor(commit=True) as cur:
            cur.execute("SELECT cancel_booking(%s);", (booking_id,))
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to cancel booking: {str(e)}",
        )

    return CancelBookingResponse(
        message="Booking cancelled successfully and seat released.",
        booking_id=booking_id,
        pnr=booking["pnr"],
        seat_no=booking["seat_no"],
        status="CANCELLED",
    )
