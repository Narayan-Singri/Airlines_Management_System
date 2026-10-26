"""
Flight search, details, and seat map business logic.
Queries PostgreSQL view v_flight_search and relational flight tables using raw SQL.
"""

from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status

from app.database import fetch_one, fetch_all
from app.schemas.flights import FlightSearchItem, FlightDetail, SeatItem


def search_flights(
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    travel_date: Optional[date] = None,
) -> List[FlightSearchItem]:
    """
    Searches available flights using the v_flight_search database view.
    Filterable by origin airport code, destination airport code, and departure date.
    """
    conditions = []
    params = []

    if origin:
        conditions.append("origin = %s")
        params.append(origin.strip().upper())
    if destination:
        conditions.append("destination = %s")
        params.append(destination.strip().upper())
    if travel_date:
        conditions.append("departure_time::date = %s")
        params.append(travel_date)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
    SELECT flight_id, flight_no, origin, destination, origin_city, destination_city,
           departure_time, arrival_time, base_price, status, available_seats
    FROM v_flight_search
    {where_clause}
    ORDER BY departure_time ASC;
    """
    rows = fetch_all(query, tuple(params))
    return [FlightSearchItem(**r) for r in rows]


def get_flight_detail(flight_id: int) -> FlightDetail:
    """Retrieves full flight specifications, route info, and seat counts."""
    query = """
    SELECT f.flight_id, f.flight_no, f.origin_id, f.destination_id,
           o.iata_code AS origin_code, d.iata_code AS destination_code,
           o.name AS origin_name, d.name AS destination_name,
           o.city AS origin_city, d.city AS destination_city,
           f.aircraft_id, a.model AS aircraft_model, a.registration_no,
           f.departure_time, f.arrival_time, f.base_price, f.status,
           a.total_seats,
           COUNT(s.seat_no) FILTER (WHERE NOT s.is_booked) AS available_seats
    FROM flight f
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN aircraft a ON a.aircraft_id = f.aircraft_id
    LEFT JOIN flight_seat s ON s.flight_id = f.flight_id
    WHERE f.flight_id = %s
    GROUP BY f.flight_id, o.iata_code, d.iata_code, o.name, d.name,
             o.city, d.city, a.model, a.registration_no, a.total_seats;
    """
    row = fetch_one(query, (flight_id,))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found.",
        )
    return FlightDetail(**row)


def get_flight_seats(flight_id: int) -> List[SeatItem]:
    """Retrieves the full seat map layout and availability for a flight."""
    # Verify flight exists
    flight = fetch_one("SELECT flight_id FROM flight WHERE flight_id = %s;", (flight_id,))
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found.",
        )

    query = """
    SELECT flight_id, seat_no, class AS class_type, price, is_booked
    FROM flight_seat
    WHERE flight_id = %s
    ORDER BY (regexp_replace(seat_no, '[^0-9]', '', 'g'))::int, seat_no;
    """
    rows = fetch_all(query, (flight_id,))
    return [SeatItem(**r) for r in rows]
