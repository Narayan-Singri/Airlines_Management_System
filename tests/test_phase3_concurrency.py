"""
Phase 3 Concurrency Verification Suite.
Validates race-safe seat reservation where two concurrent booking attempts target
the exact same seat on the same flight, proving that exactly one succeeds and one receives 409 Conflict.
"""

from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_concurrent_seat_booking(client):
    # Register two distinct customers
    c1_email = "racer1@test.com"
    c2_email = "racer2@test.com"

    client.post(
        "/auth/register",
        json={"full_name": "Racer One", "email": c1_email, "password": "Password123!"},
    )
    client.post(
        "/auth/register",
        json={"full_name": "Racer Two", "email": c2_email, "password": "Password123!"},
    )

    token1 = client.post("/auth/login", json={"email": c1_email, "password": "Password123!"}).json()["access_token"]
    token2 = client.post("/auth/login", json={"email": c2_email, "password": "Password123!"}).json()["access_token"]

    target_flight_id = 2
    target_seat = "10B"

    def attempt_booking(token):
        return client.post(
            "/bookings",
            json={"flight_id": target_flight_id, "seat_no": target_seat},
            headers={"Authorization": f"Bearer {token}"},
        )

    # Fire both booking requests concurrently
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(attempt_booking, token1)
        f2 = executor.submit(attempt_booking, token2)
        resp1 = f1.result()
        resp2 = f2.result()

    status_codes = [resp1.status_code, resp2.status_code]

    # Exactly one must succeed (201) and the other must fail with conflict (409)
    assert 201 in status_codes, f"Expected one 201 Created, got: {status_codes}"
    assert 409 in status_codes, f"Expected one 409 Conflict, got: {status_codes}"
    assert status_codes.count(201) == 1
    assert status_codes.count(409) == 1
