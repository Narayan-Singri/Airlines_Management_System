# System Context: Airlines Management System

## Current Status
- **Current Phase**: Phase 4 Complete (Frontend Web Application & Client Interface)
- **Git Repository**: Synced with GitHub (`Narayan-Singri/Airlines_Management_System`)
- **Database Status**: Local PostgreSQL 18 instance running database `airline_db` with `airline` schema active and seeded.
- **Python Environment**: Python 3.13 virtual environment (`venv`) with all dependencies installed.
- **Frontend Environment**: Zero-build static interface using HTML5, CSS custom properties (design tokens), and native ES Modules.

## Implemented Components
1. **Core Database (`db/`)**:
   - `schema.sql`: Full relational schema (16 tables, constraints, partial unique indexes, functions `generate_flight_seats`, `book_seat`, `cancel_booking`, trigger `payment_confirms_booking`, and view `v_flight_search`).
   - `seed.py`: Applied schema with real bcrypt password hashes for seed passengers and employees.
2. **Infrastructure (`app/`)**:
   - `config.py`: Environment configuration via `pydantic-settings`.
   - `database.py`: psycopg 3 connection pool with context-managed transactions, row-to-dict mappings, and health checks.
   - `security.py`: bcrypt password hashing, JWT generation/validation, role guards (`require_customer`, `require_staff`, `require_roles`).
   - `main.py`: FastAPI app with CORS middleware, lifespan events, health endpoint, and all router inclusions.
3. **API Routers & Services (`app/routers/` & `app/services/`)**:
   - `auth`: `POST /auth/register`, `POST /auth/login`, `POST /auth/staff/login`, `GET /auth/me`.
   - `flights`: `GET /flights?from=BOM&to=DEL&date=YYYY-MM-DD`, `GET /flights/airports`, `GET /flights/status/lookup`, `GET /flights/{id}`, `GET /flights/{id}/seats`.
   - `bookings`: `POST /bookings`, `GET /bookings/me`, `GET /bookings/{pnr}`, `POST /bookings/{id}/cancel`.
   - `payments`: `POST /payments`, `GET /bookings/{id}/payments`.
   - `checkin`: `POST /checkin`, `GET /checkin/{pnr}`.
   - `flight_conditions`: `POST /flights/{id}/conditions`, `GET /flights/{id}/conditions`, `GET /flights/{id}/conditions/latest`, `PATCH /flights/{id}/status`.
   - `admin`: CRUD for airports, aircraft, flights (with auto seat generation), employees, and flight crew assignments.
4. **Client Interface (`frontend/`)**:
   - `tokens.css`, `base.css`, `components.css`: Cohesive design system (Primary Blue `#1363DF`, Deep Navy `#0B2545`, Orange Accent `#FF6B35`, Plus Jakarta Sans typography, elevation shadows, responsive breakpoints).
   - `js/config.js`, `js/api.js`, `js/auth.js`, `js/ui.js`: Centralized base URL, JWT bearer injection, friendly error normalizer, 401 token redirect, toasts, modals, and formatters.
   - `index.html`: Animated hero (gliding SVG airplane & dashed flight path), 3-tab search card, live popular routes, why-us, and 3-step guide.
   - `search.html`: Filter sidebar (price slider, time slots, available only), sort dropdown, and flight schedule cards.
   - `seats.html`: Interactive cabin layout (columns A-F with aisle), Business & Economy tiers, live price recalculation, and 409 conflict handling.
   - `checkout.html`: Passenger details, payment methods (UPI, Card, Netbanking, Wallet), booking + payment trigger confirmation.
   - `confirmation.html`: Confirmed PNR banner, printable e-ticket with barcode and payment reference.
   - `login.html` & `register.html`: Customer authentication with session management and quick-fill demo credentials.
   - `my-bookings.html`: Customer booking history with ticket inspection and seat cancellation modal.
   - `manage.html`: PNR reservation retrieval and official printable digital boarding pass.
   - `status.html`: Live flight tracker with 4-stage operational timeline and certified technical safety check summary.
   - `staff/`: Role-guarded portal for Ground Staff (`checkin.html`), Pilots (`conditions.html`), and Operations (`flight-status.html`).
   - `ASSETS.md`: Licensing and attribution log for Google Fonts, Lucide Icons, and original vector artwork.
   - `README.md`: Architecture guide and run instructions.
5. **Automated Verification Suites (`tests/`)**:
   - `test_phase0_setup.py`: Directory and import validation (4 passed).
   - `test_phase1_database.py`: Database schema, procedures, constraints, and triggers (10 passed).
   - `test_phase2_database_connection.py`: Connection pool lifecycle, rollback, and health checks (5 passed).
   - `test_phase3_auth_and_flights.py`: Registration, JWT logins, RBAC restrictions, flight searches, and seat layouts (3 passed).
   - `test_phase3_bookings_payments_checkin.py`: Booking, payment trigger, checkin validation, condition log, and admin CRUD (3 passed).
   - `test_phase3_concurrency.py`: Race condition seat reservation test proving exactly one succeeds and one receives 409 Conflict (1 passed).
   - `test_phase3_full_flow.py`: Full end-to-end integration lifecycle test (1 passed).
   - `test_phase4_frontend.py`: Client page integrity, design token stylesheets, ES modules, documentation, and public endpoints (5 passed).
   - **Total Tests**: 32 passed, 0 failures.

## Key Design Decisions & Security Standards
- **Race Condition Prevention**: Relies on PostgreSQL row locks (`FOR UPDATE`) within `book_seat()`. Concurrency test confirms zero double-booking possibility.
- **Dynamic Capacity Tracking**: Storing stale `AvailableSeats` was completely avoided; computed via `v_flight_search` and `flight_seat` states.
- **Privacy & Ownership**: Customers can only view and cancel their own bookings; password hashes are never exposed in any schema or response.
- **Role-Based Guards**: Strict dependency injection checks reject customer tokens from staff endpoints and vice-versa.
- **XSS & Untrusted Data Protection**: All user and backend API responses are passed through HTML entity sanitizers before DOM insertion.

## How to Run & Test
- **Start Backend API Server**:
  ```powershell
  uvicorn app.main:app --reload --port 8000
  ```
- **Start Frontend Web Server**:
  ```powershell
  python -m http.server 3000 --directory frontend
  ```
  Open: [http://localhost:3000](http://localhost:3000)
- **Interactive Documentation**:
  - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
  - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Run Complete Test Suite**:
  ```powershell
  pytest -v
  ```
