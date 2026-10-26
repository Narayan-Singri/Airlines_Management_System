"""
Flights Router.
Public endpoints for flight search, flight details, and real-time seat maps.
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Query

from app.schemas.flights import FlightSearchItem, FlightDetail, SeatItem
from app.services import flight_service

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get(
    "",
    response_model=List[FlightSearchItem],
    summary="Search scheduled flights",
)
def search_flights(
    origin: Optional[str] = Query(None, alias="from", description="Origin airport IATA code (e.g. BOM)"),
    destination: Optional[str] = Query(None, alias="to", description="Destination airport IATA code (e.g. DEL)"),
    travel_date: Optional[date] = Query(None, alias="date", description="Departure date (YYYY-MM-DD)"),
):
    """
    Search flights dynamically using the v_flight_search view.
    Includes real-time available seat counts.
    """
    return flight_service.search_flights(origin=origin, destination=destination, travel_date=travel_date)


@router.get(
    "/{flight_id}",
    response_model=FlightDetail,
    summary="Get flight details by ID",
)
def get_flight_details(flight_id: int):
    """Retrieves comprehensive flight specifications, aircraft details, and capacity."""
    return flight_service.get_flight_detail(flight_id)


@router.get(
    "/{flight_id}/seats",
    response_model=List[SeatItem],
    summary="Get seat map and availability",
)
def get_flight_seats(flight_id: int):
    """Retrieves physical seat map layout, seat class (Business/Economy), pricing, and booking status."""
    return flight_service.get_flight_seats(flight_id)
