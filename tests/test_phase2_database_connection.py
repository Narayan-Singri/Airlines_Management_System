"""
Phase 2 Database Connection & Health Verification Suite.
Verifies connection pool lifecycle, queries, transactions, and /health endpoint error handling.
"""

from unittest.mock import patch
from fastapi.testclient import TestClient
import pytest
from psycopg_pool import ConnectionPool

from app.config import settings
from app.database import (
    init_db_pool,
    close_db_pool,
    get_pool,
    fetch_one,
    fetch_all,
    get_db_cursor,
    check_db_health,
)
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_pool_lifecycle():
    # Test closing pool and reopening
    close_db_pool()
    p = init_db_pool(min_size=1, max_size=3)
    assert isinstance(p, ConnectionPool)
    assert not p.closed

    # Verify connection checkout works
    with p.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 42;")
            assert cur.fetchone()[0] == 42

    # Clean shutdown
    close_db_pool()
    assert p.closed

    # Ensure get_pool lazily reopens
    p2 = get_pool()
    assert not p2.closed


def test_helpers_fetch_one_and_fetch_all():
    row = fetch_one("SELECT airport_id, iata_code FROM airport WHERE iata_code = %s;", ("BOM",))
    assert isinstance(row, dict)
    assert row["iata_code"] == "BOM"

    rows = fetch_all("SELECT airport_id, iata_code FROM airport ORDER BY airport_id;")
    assert isinstance(rows, list)
    assert len(rows) >= 3
    assert all(isinstance(r, dict) for r in rows)


def test_transaction_rollback_on_exception():
    with pytest.raises(RuntimeError):
        with get_db_cursor(commit=True) as cur:
            cur.execute(
                """
                INSERT INTO airport(iata_code, name, city) 
                VALUES ('TMP', 'Temp Airport', 'Temp City');
                """
            )
            # Simulate unexpected failure
            raise RuntimeError("Forced error to test rollback")

    # Verify airport was NOT inserted
    check = fetch_one("SELECT airport_id FROM airport WHERE iata_code = 'TMP';")
    assert check is None


def test_health_endpoint_success(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["database"] == "airline_db"


def test_health_endpoint_db_unreachable(client):
    # Mock check_db_health to simulate database failure
    with patch("app.main.check_db_health") as mock_health:
        mock_health.return_value = {
            "status": "unhealthy",
            "error": "OperationalError: connection refused to port 5432",
        }
        response = client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "OperationalError" in data["database"]["error"]
