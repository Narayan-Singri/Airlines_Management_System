"""
Flight Conditions and Status business logic.
Handles pre-flight technical safety checks (fuel, oil, tyres, weather, overall) and flight status updates.
"""

from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import psycopg

from app.database import fetch_one, fetch_all, execute_commit
from app.schemas.conditions import FlightConditionCreate, FlightConditionDetail, FlightStatusUpdate


def log_flight_condition(
    flight_id: int, staff_user: Dict[str, Any], payload: FlightConditionCreate
) -> FlightConditionDetail:
    """
    Logs pre-flight condition report.
    Authorized for PILOT or ADMIN employees.
    """
    # Verify flight exists
    flight = fetch_one("SELECT flight_id FROM flight WHERE flight_id = %s;", (flight_id,))
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found.",
        )

    staff_id = staff_user["user_id"]
    query = """
    INSERT INTO flight_condition(flight_id, checked_by, fuel_level_pct, oil_level_pct, tyre_ok, weather, overall, remarks)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING condition_id;
    """
    params = (
        flight_id,
        staff_id,
        payload.fuel_level_pct,
        payload.oil_level_pct,
        payload.tyre_ok,
        payload.weather,
        payload.overall,
        payload.remarks,
    )
    try:
        inserted = execute_commit(query, params)
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to record flight condition: {str(e)}",
        )

    return get_condition_by_id(inserted["condition_id"])


def get_condition_by_id(condition_id: int) -> FlightConditionDetail:
    """Retrieves condition record by ID."""
    query = """
    SELECT c.condition_id, c.flight_id, c.checked_by, e.full_name AS inspector_name,
           c.checked_at, c.fuel_level_pct, c.oil_level_pct, c.tyre_ok, c.weather, c.overall, c.remarks
    FROM flight_condition c
    JOIN employee e ON e.employee_id = c.checked_by
    WHERE c.condition_id = %s;
    """
    row = fetch_one(query, (condition_id,))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight condition record {condition_id} not found.",
        )
    return FlightConditionDetail(**row)


def get_flight_conditions(flight_id: int) -> List[FlightConditionDetail]:
    """Retrieves all pre-flight conditions logged for a flight ordered by checked_at DESC."""
    # Verify flight exists
    flight = fetch_one("SELECT flight_id FROM flight WHERE flight_id = %s;", (flight_id,))
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found.",
        )

    query = """
    SELECT c.condition_id, c.flight_id, c.checked_by, e.full_name AS inspector_name,
           c.checked_at, c.fuel_level_pct, c.oil_level_pct, c.tyre_ok, c.weather, c.overall, c.remarks
    FROM flight_condition c
    JOIN employee e ON e.employee_id = c.checked_by
    WHERE c.flight_id = %s
    ORDER BY c.checked_at DESC;
    """
    rows = fetch_all(query, (flight_id,))
    return [FlightConditionDetail(**r) for r in rows]


def get_latest_condition(flight_id: int) -> Optional[FlightConditionDetail]:
    """Retrieves the most recent condition report for a flight."""
    query = """
    SELECT c.condition_id, c.flight_id, c.checked_by, e.full_name AS inspector_name,
           c.checked_at, c.fuel_level_pct, c.oil_level_pct, c.tyre_ok, c.weather, c.overall, c.remarks
    FROM flight_condition c
    JOIN employee e ON e.employee_id = c.checked_by
    WHERE c.flight_id = %s
    ORDER BY c.checked_at DESC
    LIMIT 1;
    """
    row = fetch_one(query, (flight_id,))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No flight conditions logged for flight {flight_id}.",
        )
    return FlightConditionDetail(**row)


def update_flight_status(flight_id: int, payload: FlightStatusUpdate) -> Dict[str, Any]:
    """
    Updates the operational status of a flight.
    Allowed statuses: SCHEDULED, BOARDING, DEPARTED, ARRIVED, DELAYED, CANCELLED.
    """
    flight = fetch_one("SELECT flight_id, status FROM flight WHERE flight_id = %s;", (flight_id,))
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found.",
        )

    execute_commit(
        "UPDATE flight SET status = %s WHERE flight_id = %s;",
        (payload.status, flight_id),
    )
    return {
        "message": f"Flight {flight_id} status updated to {payload.status}.",
        "flight_id": flight_id,
        "old_status": flight["status"],
        "new_status": payload.status,
    }
