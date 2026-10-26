"""
Phase 1 Database Verification Suite.
Verifies all tables, constraints, functions, triggers, views, and business logic.
"""

import os
from pathlib import Path
import psycopg
import pytest
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "airline_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "admin")

CONN_STRING = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"


@pytest.fixture(scope="module")
def db_conn():
    with psycopg.connect(CONN_STRING, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("SET search_path = airline;")
        yield conn


def test_all_tables_exist(db_conn):
    expected_tables = {
        "airport",
        "aircraft",
        "department",
        "employee",
        "pilot",
        "cabin_crew",
        "ground_staff",
        "dependent",
        "passenger",
        "flight",
        "flight_seat",
        "flight_crew",
        "flight_condition",
        "booking",
        "payment",
        "checkin",
    }
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'airline' AND table_type = 'BASE TABLE';
            """
        )
        existing_tables = {row[0] for row in cur.fetchall()}
    assert expected_tables.issubset(existing_tables), f"Missing tables: {expected_tables - existing_tables}"


def test_views_exist(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'airline';
            """
        )
        views = {row[0] for row in cur.fetchall()}
    assert "v_flight_search" in views


def test_functions_and_procedures_exist(db_conn):
    expected_funcs = {"generate_flight_seats", "book_seat", "cancel_booking", "trg_confirm_booking"}
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'airline';
            """
        )
        funcs = {row[0] for row in cur.fetchall()}
    assert expected_funcs.issubset(funcs), f"Missing functions: {expected_funcs - funcs}"


def test_triggers_exist(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'airline';
            """
        )
        triggers = {row[0] for row in cur.fetchall()}
    assert "payment_confirms_booking" in triggers


def test_origin_equals_destination_rejected(db_conn):
    with db_conn.cursor() as cur:
        with pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(
                """
                INSERT INTO flight(flight_no, origin_id, destination_id, aircraft_id, departure_time, arrival_time, base_price)
                VALUES ('TEST99', 1, 1, 1, now()+interval '10 days', now()+interval '10 days 2 hours', 5000);
                """
            )


def test_arrival_before_departure_rejected(db_conn):
    with db_conn.cursor() as cur:
        with pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(
                """
                INSERT INTO flight(flight_no, origin_id, destination_id, aircraft_id, departure_time, arrival_time, base_price)
                VALUES ('TEST98', 1, 2, 1, now()+interval '10 days 2 hours', now()+interval '10 days', 5000);
                """
            )


def test_book_seat_and_duplicate_booking_prevention(db_conn):
    with db_conn.cursor() as cur:
        # Book an available seat
        cur.execute("SELECT book_seat(1, 1, '4A');")
        booking_id = cur.fetchone()[0]
        assert booking_id > 0

        # Verify seat is marked booked
        cur.execute("SELECT is_booked FROM flight_seat WHERE flight_id = 1 AND seat_no = '4A';")
        assert cur.fetchone()[0] is True

        # Attempt to book the same seat via book_seat (should raise exception)
        with pytest.raises(psycopg.Error) as exc_info:
            cur.execute("SELECT book_seat(1, 1, '4A');")
        assert "not available" in str(exc_info.value).lower()

        # Attempt direct insert to trigger unique partial index uq_live_seat
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute(
                """
                INSERT INTO booking(passenger_id, flight_id, seat_no, amount, status)
                VALUES (1, 1, '4A', 5500, 'PENDING');
                """
            )


def test_cancel_booking_frees_seat(db_conn):
    with db_conn.cursor() as cur:
        # Find the booking for 4A
        cur.execute("SELECT booking_id FROM booking WHERE flight_id = 1 AND seat_no = '4A' AND status <> 'CANCELLED';")
        booking_id = cur.fetchone()[0]

        # Cancel it
        cur.execute("SELECT cancel_booking(%s);", (booking_id,))

        # Verify booking status is CANCELLED
        cur.execute("SELECT status FROM booking WHERE booking_id = %s;", (booking_id,))
        assert cur.fetchone()[0] == "CANCELLED"

        # Verify flight_seat is free again
        cur.execute("SELECT is_booked FROM flight_seat WHERE flight_id = 1 AND seat_no = '4A';")
        assert cur.fetchone()[0] is False

        # Verify cancelling again raises exception
        with pytest.raises(psycopg.Error):
            cur.execute("SELECT cancel_booking(%s);", (booking_id,))


def test_payment_confirms_booking_trigger(db_conn):
    with db_conn.cursor() as cur:
        # Book seat 5A
        cur.execute("SELECT book_seat(1, 1, '5A');")
        b_id = cur.fetchone()[0]

        # Verify status is PENDING
        cur.execute("SELECT status FROM booking WHERE booking_id = %s;", (b_id,))
        assert cur.fetchone()[0] == "PENDING"

        # Insert successful payment
        cur.execute(
            """
            INSERT INTO payment(booking_id, amount, method, status)
            VALUES (%s, 5500, 'UPI', 'SUCCESS');
            """,
            (b_id,),
        )

        # Trigger should update booking status to CONFIRMED
        cur.execute("SELECT status FROM booking WHERE booking_id = %s;", (b_id,))
        assert cur.fetchone()[0] == "CONFIRMED"


def test_v_flight_search_seat_counts(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("SELECT total_seats FROM aircraft WHERE aircraft_id = 1;")
        total_seats = cur.fetchone()[0]

        cur.execute("SELECT available_seats FROM v_flight_search WHERE flight_id = 1;")
        avail = cur.fetchone()[0]

        cur.execute("SELECT count(*) FROM flight_seat WHERE flight_id = 1 AND is_booked = TRUE;")
        booked = cur.fetchone()[0]

        assert avail + booked == total_seats
