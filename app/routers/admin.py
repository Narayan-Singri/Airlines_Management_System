"""
Admin Router.
Protected endpoints for administrative management of airports, aircraft, flights, employees, and crew.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status

from app.schemas.admin import (
    AirportCreate,
    AircraftCreate,
    FlightCreate,
    EmployeeCreate,
    CrewAssignmentCreate,
)
from app.services import admin_service
from app.security import require_roles

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


# --- AIRPORTS ---
@router.post(
    "/airports",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new airport",
)
def add_airport(
    payload: AirportCreate,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Adds a new airport to the reference dataset."""
    return admin_service.create_airport(payload)


@router.get(
    "/airports",
    summary="List all airports",
)
def get_airports(
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Retrieves all registered airports."""
    return admin_service.list_airports()


# --- AIRCRAFT ---
@router.post(
    "/aircraft",
    status_code=status.HTTP_201_CREATED,
    summary="Add a new aircraft to fleet",
)
def add_aircraft(
    payload: AircraftCreate,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Registers an aircraft model and total physical capacity."""
    return admin_service.create_aircraft(payload)


@router.get(
    "/aircraft",
    summary="List aircraft fleet",
)
def get_aircraft(
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Retrieves fleet overview."""
    return admin_service.list_aircraft()


# --- FLIGHTS ---
@router.post(
    "/flights",
    status_code=status.HTTP_201_CREATED,
    summary="Create a scheduled flight and generate seats",
)
def create_flight(
    payload: FlightCreate,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """
    Schedules a new flight.
    Automatically generates the physical seat map with Business and Economy tiers
    using the generate_flight_seats() database stored procedure.
    """
    return admin_service.create_flight(payload)


@router.get(
    "/flights",
    summary="List all flights (Admin view)",
)
def get_all_flights(
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Retrieves all scheduled flights."""
    return admin_service.list_flights_admin()


# --- EMPLOYEES ---
@router.post(
    "/employees",
    status_code=status.HTTP_201_CREATED,
    summary="Add a new employee and ISA role",
)
def add_employee(
    payload: EmployeeCreate,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Creates an employee with bcrypt password hash and inserts into pilot/cabin_crew/ground_staff table."""
    return admin_service.create_employee(payload)


@router.get(
    "/employees",
    summary="List all employees",
)
def get_employees(
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Lists company employees across all departments."""
    return admin_service.list_employees()


# --- CREW ASSIGNMENT ---
@router.post(
    "/flights/{flight_id}/crew",
    status_code=status.HTTP_201_CREATED,
    summary="Assign employee to flight duty",
)
def assign_crew(
    flight_id: int,
    payload: CrewAssignmentCreate,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Assigns Captain, First Officer, Cabin Crew, or Ground Staff to a flight schedule."""
    return admin_service.assign_crew_to_flight(flight_id, payload)


@router.get(
    "/flights/{flight_id}/crew",
    summary="List assigned crew for a flight",
)
def get_flight_crew(
    flight_id: int,
    admin_user: Dict[str, Any] = Depends(require_roles(["ADMIN"])),
):
    """Lists the personnel assigned to work a flight."""
    return admin_service.list_flight_crew(flight_id)
