"""
Admin management business logic.
Provides CRUD operations for airports, aircraft, flights (with automated seat generation),
employee ISA specialisations, and crew assignments.
"""

from typing import Any, Dict, List
from fastapi import HTTPException, status
import psycopg

from app.database import fetch_one, fetch_all, execute_commit, get_db_cursor
from app.schemas.admin import (
    AirportCreate,
    AircraftCreate,
    FlightCreate,
    EmployeeCreate,
    CrewAssignmentCreate,
)
from app.security import hash_password


# --- AIRPORTS ---
def create_airport(payload: AirportCreate) -> Dict[str, Any]:
    code = payload.iata_code.strip().upper()
    query = """
    INSERT INTO airport(iata_code, name, city, country)
    VALUES (%s, %s, %s, %s)
    RETURNING airport_id, iata_code, name, city, country;
    """
    try:
        return execute_commit(query, (code, payload.name, payload.city, payload.country))
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Airport with IATA code '{code}' already exists.",
        )


def list_airports() -> List[Dict[str, Any]]:
    return fetch_all("SELECT airport_id, iata_code, name, city, country FROM airport ORDER BY iata_code;")


# --- AIRCRAFT ---
def create_aircraft(payload: AircraftCreate) -> Dict[str, Any]:
    reg = payload.registration_no.strip().upper()
    query = """
    INSERT INTO aircraft(registration_no, model, total_seats, status)
    VALUES (%s, %s, %s, %s)
    RETURNING aircraft_id, registration_no, model, total_seats, status;
    """
    try:
        return execute_commit(query, (reg, payload.model, payload.total_seats, payload.status))
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Aircraft with registration '{reg}' already exists.",
        )


def list_aircraft() -> List[Dict[str, Any]]:
    return fetch_all("SELECT aircraft_id, registration_no, model, total_seats, status FROM aircraft ORDER BY aircraft_id;")


# --- FLIGHTS ---
def create_flight(payload: FlightCreate) -> Dict[str, Any]:
    """
    Creates a new flight and automatically generates physical seats via generate_flight_seats().
    """
    if payload.origin_id == payload.destination_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Origin airport cannot be the same as destination airport.",
        )
    if payload.arrival_time <= payload.departure_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arrival time must be strictly after departure time.",
        )

    # Insert flight and generate seats within a transaction
    try:
        with get_db_cursor(commit=True) as cur:
            insert_query = """
            INSERT INTO flight(flight_no, origin_id, destination_id, aircraft_id, departure_time, arrival_time, base_price)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING flight_id, flight_no, origin_id, destination_id, departure_time, arrival_time, base_price, status;
            """
            cur.execute(
                insert_query,
                (
                    payload.flight_no.strip().upper(),
                    payload.origin_id,
                    payload.destination_id,
                    payload.aircraft_id,
                    payload.departure_time,
                    payload.arrival_time,
                    payload.base_price,
                ),
            )
            created_flight = dict(cur.fetchone())
            f_id = created_flight["flight_id"]

            # Automatically generate seats
            cur.execute("SELECT generate_flight_seats(%s);", (f_id,))
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight '{payload.flight_no}' with the same departure time already exists.",
        )
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create flight: {str(e)}",
        )

    return created_flight


def list_flights_admin() -> List[Dict[str, Any]]:
    query = """
    SELECT f.flight_id, f.flight_no, o.iata_code AS origin, d.iata_code AS destination,
           a.model AS aircraft, f.departure_time, f.arrival_time, f.base_price, f.status
    FROM flight f
    JOIN airport o ON o.airport_id = f.origin_id
    JOIN airport d ON d.airport_id = f.destination_id
    JOIN aircraft a ON a.aircraft_id = f.aircraft_id
    ORDER BY f.departure_time DESC;
    """
    return fetch_all(query)


# --- EMPLOYEES ---
def create_employee(payload: EmployeeCreate) -> Dict[str, Any]:
    """Creates an employee record and populates the corresponding ISA table."""
    pwd_hash = hash_password(payload.password)
    try:
        with get_db_cursor(commit=True) as cur:
            emp_insert = """
            INSERT INTO employee(department_id, full_name, email, password_hash, emp_type, salary)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING employee_id, department_id, full_name, email, emp_type, salary;
            """
            cur.execute(
                emp_insert,
                (
                    payload.department_id,
                    payload.full_name,
                    payload.email,
                    pwd_hash,
                    payload.emp_type,
                    payload.salary,
                ),
            )
            emp = dict(cur.fetchone())
            e_id = emp["employee_id"]

            # Disjoint ISA subtype insertion
            if payload.emp_type == "PILOT":
                lic = payload.license_no or f"LIC-{e_id:04d}"
                cur.execute(
                    "INSERT INTO pilot(employee_id, license_no, flight_hours) VALUES (%s, %s, %s);",
                    (e_id, lic, payload.flight_hours or 0),
                )
            elif payload.emp_type == "CABIN_CREW":
                cur.execute(
                    "INSERT INTO cabin_crew(employee_id, languages) VALUES (%s, %s);",
                    (e_id, payload.languages or "English"),
                )
            elif payload.emp_type == "GROUND_STAFF":
                cur.execute(
                    "INSERT INTO ground_staff(employee_id, duty_area) VALUES (%s, %s);",
                    (e_id, payload.duty_area or "CHECKIN"),
                )
    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with email '{payload.email}' or license already exists.",
        )
    except psycopg.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create employee: {str(e)}",
        )

    return emp


def list_employees() -> List[Dict[str, Any]]:
    query = """
    SELECT e.employee_id, e.department_id, d.name AS department_name,
           e.full_name, e.email, e.emp_type, e.salary, e.hire_date
    FROM employee e
    JOIN department d ON d.department_id = e.department_id
    ORDER BY e.employee_id;
    """
    return fetch_all(query)


# --- FLIGHT CREW ASSIGNMENT ---
def assign_crew_to_flight(flight_id: int, payload: CrewAssignmentCreate) -> Dict[str, Any]:
    """Assigns an employee to a flight crew duty."""
    flight = fetch_one("SELECT flight_id FROM flight WHERE flight_id = %s;", (flight_id,))
    if not flight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Flight {flight_id} not found.")

    emp = fetch_one("SELECT employee_id, full_name, emp_type FROM employee WHERE employee_id = %s;", (payload.employee_id,))
    if not emp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Employee {payload.employee_id} not found.")

    query = """
    INSERT INTO flight_crew(flight_id, employee_id, duty)
    VALUES (%s, %s, %s)
    ON CONFLICT (flight_id, employee_id) DO UPDATE SET duty = EXCLUDED.duty
    RETURNING flight_id, employee_id, duty;
    """
    assigned = execute_commit(query, (flight_id, payload.employee_id, payload.duty))
    return {
        "message": f"Employee {emp['full_name']} assigned to flight {flight_id} as {payload.duty}.",
        "assignment": assigned,
    }


def list_flight_crew(flight_id: int) -> List[Dict[str, Any]]:
    query = """
    SELECT c.flight_id, c.employee_id, e.full_name, e.emp_type, c.duty
    FROM flight_crew c
    JOIN employee e ON e.employee_id = c.employee_id
    WHERE c.flight_id = %s;
    """
    return fetch_all(query, (flight_id,))
