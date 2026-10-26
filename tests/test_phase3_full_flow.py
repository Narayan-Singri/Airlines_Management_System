"""
Phase 3 Full End-to-End System Integration Flow Test.
Demonstrates the full life cycle across all actors:
1. Passenger registers and logs in.
2. Passenger searches flights by origin/destination and chooses a flight.
3. Passenger checks the seat map and picks an available seat.
4. Passenger reserves the seat (PENDING status).
5. Passenger makes a successful payment -> trigger changes status to CONFIRMED.
6. Ground staff verifies passport and baggage weight, performs check-in, and issues boarding pass.
7. Pilot logs technical pre-flight inspection conditions (fuel, oil, tyres, weather).
8. Staff updates flight operational status to DEPARTED.
"""

from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_complete_airline_lifecycle(client):
    # Step 1: Customer Registration & Login
    cust_email = "vikram.patel@example.com"
    reg_resp = client.post(
        "/auth/register",
        json={
            "full_name": "Vikram Patel",
            "email": cust_email,
            "password": "SecurePassword123!",
            "phone": "9820011223",
            "passport_no": "Z99887766",
            "nationality": "Indian",
        },
    )
    assert reg_resp.status_code == 201, reg_resp.text

    login_resp = client.post(
        "/auth/login",
        json={"email": cust_email, "password": "SecurePassword123!"},
    )
    assert login_resp.status_code == 200
    cust_token = login_resp.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # Step 2: Search Flights
    search_resp = client.get("/flights?from=BOM&to=DEL")
    assert search_resp.status_code == 200
    flights = search_resp.json()
    assert len(flights) > 0
    flight = flights[0]
    flight_id = flight["flight_id"]
    initial_available = flight["available_seats"]

    # Step 3: Pick a Seat from Seat Map
    seats_resp = client.get(f"/flights/{flight_id}/seats")
    assert seats_resp.status_code == 200
    seat_map = seats_resp.json()
    # Find first unbooked economy seat
    free_seats = [s for s in seat_map if not s["is_booked"] and s["class_type"] == "ECONOMY"]
    assert len(free_seats) > 0
    chosen_seat = free_seats[0]["seat_no"]

    # Step 4: Book the Seat
    book_resp = client.post(
        "/bookings",
        json={"flight_id": flight_id, "seat_no": chosen_seat},
        headers=cust_headers,
    )
    assert book_resp.status_code == 201, book_resp.text
    booking = book_resp.json()
    b_id = booking["booking_id"]
    pnr = booking["pnr"]
    booking_amt = float(booking["amount"])
    assert booking["status"] == "PENDING"

    # Step 5: Pay for the Booking
    pay_resp = client.post(
        "/payments",
        json={"booking_id": b_id, "amount": booking_amt, "method": "CARD", "status": "SUCCESS"},
        headers=cust_headers,
    )
    assert pay_resp.status_code == 201, pay_resp.text

    # Verify confirmation
    chk_booking = client.get(f"/bookings/{pnr}", headers=cust_headers)
    assert chk_booking.status_code == 200
    assert chk_booking.json()["status"] == "CONFIRMED"

    # Step 6: Ground Staff Check-in & Boarding Pass Issuance
    staff_login = client.post(
        "/auth/staff/login",
        json={"email": "ravi@air.test", "password": "Staff@123"},
    )
    assert staff_login.status_code == 200
    ground_token = staff_login.json()["access_token"]
    ground_headers = {"Authorization": f"Bearer {ground_token}"}

    checkin_resp = client.post(
        "/checkin",
        json={"booking_id": b_id, "passport_no": "Z99887766", "baggage_kg": 18.0},
        headers=ground_headers,
    )
    assert checkin_resp.status_code == 201, checkin_resp.text
    bp = checkin_resp.json()
    assert bp["pnr"] == pnr
    assert bp["seat_no"] == chosen_seat
    assert len(bp["boarding_pass_no"]) > 0

    # Step 7: Pilot Pre-Flight Condition Log
    pilot_login = client.post(
        "/auth/staff/login",
        json={"email": "arjun@air.test", "password": "Pilot@123"},
    )
    assert pilot_login.status_code == 200
    pilot_token = pilot_login.json()["access_token"]
    pilot_headers = {"Authorization": f"Bearer {pilot_token}"}

    cond_resp = client.post(
        f"/flights/{flight_id}/conditions",
        json={
            "fuel_level_pct": 92.5,
            "oil_level_pct": 97.0,
            "tyre_ok": True,
            "weather": "CLEAR",
            "overall": "GOOD",
            "remarks": "Aircraft inspected and certified ready for flight.",
        },
        headers=pilot_headers,
    )
    assert cond_resp.status_code == 201, cond_resp.text
    assert cond_resp.json()["overall"] == "GOOD"

    # Step 8: Update Flight Status
    status_resp = client.patch(
        f"/flights/{flight_id}/status",
        json={"status": "DEPARTED"},
        headers=ground_headers,
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["new_status"] == "DEPARTED"

    # Verify flight detail reflects new status
    final_flight = client.get(f"/flights/{flight_id}").json()
    assert final_flight["status"] == "DEPARTED"
    assert final_flight["available_seats"] == initial_available - 1
