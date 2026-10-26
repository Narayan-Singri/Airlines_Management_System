"""
Phase 3 Business Flow Test Suite.
Verifies bookings, payments, ground check-in, flight conditions, and admin CRUD.
"""

from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="module")
def customer_auth(client):
    resp = client.post(
        "/auth/login",
        json={"email": "test@mail.test", "password": "Customer@123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def staff_ground_auth(client):
    resp = client.post(
        "/auth/staff/login",
        json={"email": "ravi@air.test", "password": "Staff@123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def staff_pilot_auth(client):
    resp = client.post(
        "/auth/staff/login",
        json={"email": "arjun@air.test", "password": "Pilot@123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_auth(client):
    resp = client.post(
        "/auth/staff/login",
        json={"email": "admin@air.test", "password": "Admin@123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_booking_payment_and_checkin_flow(client, customer_auth, staff_ground_auth):
    # 1. Book seat 7A on Flight 1
    book_resp = client.post(
        "/bookings",
        json={"flight_id": 1, "seat_no": "7A"},
        headers=customer_auth,
    )
    assert book_resp.status_code == 201, book_resp.text
    booking = book_resp.json()
    b_id = booking["booking_id"]
    pnr = booking["pnr"]
    assert booking["status"] == "PENDING"
    assert booking["seat_no"] == "7A"

    # 2. Staff cannot check-in a PENDING booking
    early_checkin = client.post(
        "/checkin",
        json={"booking_id": b_id, "passport_no": "P1234567", "baggage_kg": 15.5},
        headers=staff_ground_auth,
    )
    assert early_checkin.status_code == 400

    # 3. Pay for the booking
    pay_resp = client.post(
        "/payments",
        json={"booking_id": b_id, "amount": 5500.0, "method": "UPI", "status": "SUCCESS"},
        headers=customer_auth,
    )
    assert pay_resp.status_code == 201, pay_resp.text

    # 4. Verify booking status changed to CONFIRMED via trigger
    b_chk = client.get(f"/bookings/{pnr}", headers=customer_auth)
    assert b_chk.status_code == 200
    assert b_chk.json()["status"] == "CONFIRMED"

    # 5. Check-in with incorrect passport must be rejected
    bad_passport = client.post(
        "/checkin",
        json={"booking_id": b_id, "passport_no": "WRONG_PASS", "baggage_kg": 15.5},
        headers=staff_ground_auth,
    )
    assert bad_passport.status_code == 400

    # 6. Check-in with correct passport succeeds
    good_checkin = client.post(
        "/checkin",
        json={"booking_id": b_id, "passport_no": "P1234567", "baggage_kg": 15.5},
        headers=staff_ground_auth,
    )
    assert good_checkin.status_code == 201, good_checkin.text
    bp = good_checkin.json()
    assert bp["pnr"] == pnr
    assert bp["seat_no"] == "7A"
    assert "boarding_pass_no" in bp

    # 7. Check-in again must fail with 409 Conflict
    dup_checkin = client.post(
        "/checkin",
        json={"booking_id": b_id, "passport_no": "P1234567", "baggage_kg": 15.5},
        headers=staff_ground_auth,
    )
    assert dup_checkin.status_code == 409


def test_flight_condition_and_status(client, customer_auth, staff_pilot_auth, staff_ground_auth):
    # Customer trying to log flight condition must be rejected (403)
    unauth = client.post(
        "/flights/1/conditions",
        json={
            "fuel_level_pct": 95.0,
            "oil_level_pct": 98.0,
            "tyre_ok": True,
            "weather": "CLEAR",
            "overall": "GOOD",
            "remarks": "Aircraft ready for pushback",
        },
        headers=customer_auth,
    )
    assert unauth.status_code == 403

    # Pilot logs condition
    pilot_resp = client.post(
        "/flights/1/conditions",
        json={
            "fuel_level_pct": 95.0,
            "oil_level_pct": 98.0,
            "tyre_ok": True,
            "weather": "CLEAR",
            "overall": "GOOD",
            "remarks": "Technical check passed",
        },
        headers=staff_pilot_auth,
    )
    assert pilot_resp.status_code == 201, pilot_resp.text
    cond = pilot_resp.json()
    assert cond["overall"] == "GOOD"
    assert cond["inspector_name"] == "Capt. Arjun Rao"

    # Staff updates flight status
    status_resp = client.patch(
        "/flights/1/status",
        json={"status": "BOARDING"},
        headers=staff_ground_auth,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["new_status"] == "BOARDING"


def test_admin_crud(client, admin_auth, customer_auth):
    # Customer forbidden from admin endpoints
    forbidden = client.get("/admin/airports", headers=customer_auth)
    assert forbidden.status_code == 403

    # Create Airport
    new_apt = client.post(
        "/admin/airports",
        json={"iata_code": "GOI", "name": "Goa Dabolim", "city": "Goa", "country": "India"},
        headers=admin_auth,
    )
    assert new_apt.status_code == 201, new_apt.text

    # Create Aircraft
    new_ac = client.post(
        "/admin/aircraft",
        json={"registration_no": "VT-TEST1", "model": "A321neo", "total_seats": 12, "status": "ACTIVE"},
        headers=admin_auth,
    )
    assert new_ac.status_code == 201, new_ac.text
    ac_id = new_ac.json()["aircraft_id"]

    # Create Flight (should auto-generate seats)
    dep = datetime.now(timezone.utc) + timedelta(days=5)
    arr = dep + timedelta(hours=2)
    new_fl = client.post(
        "/admin/flights",
        json={
            "flight_no": "AI999",
            "origin_id": 1,
            "destination_id": 2,
            "aircraft_id": ac_id,
            "departure_time": dep.isoformat(),
            "arrival_time": arr.isoformat(),
            "base_price": 4500.0,
        },
        headers=admin_auth,
    )
    assert new_fl.status_code == 201, new_fl.text
    new_fl_id = new_fl.json()["flight_id"]

    # Verify seats were generated automatically
    seats_resp = client.get(f"/flights/{new_fl_id}/seats")
    assert seats_resp.status_code == 200
    seats = seats_resp.json()
    assert len(seats) == 12  # matches total_seats
