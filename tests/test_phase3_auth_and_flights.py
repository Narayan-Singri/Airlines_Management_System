"""
Phase 3 Auth and Flights API Test Suite.
Verifies registration, logins, RBAC restrictions, flight searches, and seat map retrieval.
"""

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_customer_registration_and_login(client):
    # Register customer
    reg_payload = {
        "full_name": "Alice Sharma",
        "email": "alice@example.com",
        "password": "Password123!",
        "phone": "9876543210",
        "passport_no": "A98765432",
    }
    reg_resp = client.post("/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text
    user = reg_resp.json()
    assert user["email"] == "alice@example.com"
    assert "password" not in user
    assert "password_hash" not in user

    # Duplicate registration should return 409
    dup_resp = client.post("/auth/register", json=reg_payload)
    assert dup_resp.status_code == 409

    # Login customer
    login_resp = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert token_data["role"] == "customer"
    assert "access_token" in token_data

    # Bad password
    bad_resp = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "WrongPassword"},
    )
    assert bad_resp.status_code == 401


def test_staff_login_and_role_protection(client):
    # Pilot login
    pilot_resp = client.post(
        "/auth/staff/login",
        json={"email": "arjun@air.test", "password": "Pilot@123"},
    )
    assert pilot_resp.status_code == 200
    pilot_token = pilot_resp.json()
    assert pilot_token["role"] == "staff"
    assert pilot_token["emp_type"] == "PILOT"

    # Customer trying staff login must fail
    fake_staff = client.post(
        "/auth/staff/login",
        json={"email": "alice@example.com", "password": "Password123!"},
    )
    assert fake_staff.status_code == 401

    # Staff trying customer login must fail
    fake_cust = client.post(
        "/auth/login",
        json={"email": "arjun@air.test", "password": "Pilot@123"},
    )
    assert fake_cust.status_code == 401


def test_flights_search_and_seat_map(client):
    # Search all flights
    resp = client.get("/flights")
    assert resp.status_code == 200
    flights = resp.json()
    assert len(flights) >= 2
    f = flights[0]
    assert "flight_no" in f
    assert "available_seats" in f

    # Search with filter
    filter_resp = client.get("/flights?from=BOM&to=DEL")
    assert filter_resp.status_code == 200
    filtered = filter_resp.json()
    assert len(filtered) >= 1
    assert all(item["origin"] == "BOM" and item["destination"] == "DEL" for item in filtered)

    # Flight details
    flight_id = f["flight_id"]
    det_resp = client.get(f"/flights/{flight_id}")
    assert det_resp.status_code == 200
    det = det_resp.json()
    assert det["flight_id"] == flight_id
    assert "aircraft_model" in det

    # Flight seat map
    seats_resp = client.get(f"/flights/{flight_id}/seats")
    assert seats_resp.status_code == 200
    seats = seats_resp.json()
    assert len(seats) > 0
    # First row is business
    first_seat = seats[0]
    assert first_seat["seat_no"] == "1A"
    assert first_seat["class_type"] == "BUSINESS"
