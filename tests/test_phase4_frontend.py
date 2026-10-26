"""
Phase 4 Frontend Verification Test Suite.
Validates existence and integrity of all client pages, design tokens, JavaScript ES modules,
asset licensing documentation, and public frontend endpoints.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_frontend_pages_exist():
    root = Path(__file__).resolve().parent.parent
    frontend_dir = root / "frontend"

    required_html_pages = [
        frontend_dir / "index.html",
        frontend_dir / "search.html",
        frontend_dir / "seats.html",
        frontend_dir / "checkout.html",
        frontend_dir / "confirmation.html",
        frontend_dir / "login.html",
        frontend_dir / "register.html",
        frontend_dir / "my-bookings.html",
        frontend_dir / "manage.html",
        frontend_dir / "status.html",
        frontend_dir / "staff" / "login.html",
        frontend_dir / "staff" / "checkin.html",
        frontend_dir / "staff" / "conditions.html",
        frontend_dir / "staff" / "flight-status.html",
    ]

    for page in required_html_pages:
        assert page.is_file(), f"Missing required frontend page: {page.name}"
        content = page.read_text(encoding="utf-8")
        assert "<!DOCTYPE html>" in content, f"{page.name} must start with DOCTYPE html"
        assert "<html" in content, f"{page.name} must contain <html> tag"


def test_design_system_css_exists():
    root = Path(__file__).resolve().parent.parent
    css_dir = root / "frontend" / "css"

    required_css_files = [
        css_dir / "tokens.css",
        css_dir / "base.css",
        css_dir / "components.css",
        css_dir / "pages" / "home.css",
        css_dir / "pages" / "search.css",
        css_dir / "pages" / "seats.css",
        css_dir / "pages" / "checkout.css",
        css_dir / "pages" / "bookings.css",
        css_dir / "pages" / "status.css",
        css_dir / "pages" / "auth.css",
        css_dir / "pages" / "staff.css",
    ]

    for css in required_css_files:
        assert css.is_file(), f"Missing stylesheet: {css.name}"
        content = css.read_text(encoding="utf-8")
        assert len(content.strip()) > 50, f"{css.name} stylesheet cannot be empty"


def test_js_modules_exist():
    root = Path(__file__).resolve().parent.parent
    js_dir = root / "frontend" / "js"

    required_js_modules = [
        js_dir / "config.js",
        js_dir / "api.js",
        js_dir / "auth.js",
        js_dir / "ui.js",
        js_dir / "pages" / "home.js",
        js_dir / "pages" / "search.js",
        js_dir / "pages" / "seats.js",
        js_dir / "pages" / "checkout.js",
        js_dir / "pages" / "confirmation.js",
        js_dir / "pages" / "login.js",
        js_dir / "pages" / "register.js",
        js_dir / "pages" / "my-bookings.js",
        js_dir / "pages" / "manage.js",
        js_dir / "pages" / "status.js",
        js_dir / "pages" / "staff-login.js",
        js_dir / "pages" / "staff-checkin.js",
        js_dir / "pages" / "staff-conditions.js",
        js_dir / "pages" / "staff-status.js",
    ]

    for js in required_js_modules:
        assert js.is_file(), f"Missing JavaScript module: {js.name}"
        content = js.read_text(encoding="utf-8")
        assert len(content.strip()) > 50, f"{js.name} cannot be empty"


def test_assets_and_readme_documentation():
    root = Path(__file__).resolve().parent.parent
    frontend_dir = root / "frontend"

    assets_md = frontend_dir / "ASSETS.md"
    readme_md = frontend_dir / "README.md"

    assert assets_md.is_file(), "frontend/ASSETS.md must exist"
    assert readme_md.is_file(), "frontend/README.md must exist"

    assets_content = assets_md.read_text(encoding="utf-8")
    assert "Google Fonts" in assets_content
    assert "Lucide Icons" in assets_content
    assert "License" in assets_content


def test_public_frontend_api_endpoints(client):
    # Airports for search dropdowns
    airports_resp = client.get("/flights/airports")
    assert airports_resp.status_code == 200
    airports = airports_resp.json()
    assert isinstance(airports, list)
    assert len(airports) >= 2

    # Flights search
    flights_resp = client.get("/flights")
    assert flights_resp.status_code == 200
    flights = flights_resp.json()
    assert isinstance(flights, list)
    assert len(flights) >= 1

    first_flight = flights[0]
    flight_id = first_flight["flight_id"]
    flight_no = first_flight["flight_no"]

    # Seat map
    seats_resp = client.get(f"/flights/{flight_id}/seats")
    assert seats_resp.status_code == 200
    seats = seats_resp.json()
    assert len(seats) >= 6

    # Public status lookup
    status_resp = client.get(f"/flights/status/lookup?flight_no={flight_no}")
    assert status_resp.status_code == 200
    status_items = status_resp.json()
    assert len(status_items) >= 1
    assert status_items[0]["flight_no"] == flight_no
