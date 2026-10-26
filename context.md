# System Context: Airlines Management System

## Current Status
- **Current Phase**: Phase 0 (Project Setup)
- **Git Repository**: Initialized, tracked on GitHub (`https://github.com/Narayan-Singri/Airlines_Management_System.git`)
- **Virtual Environment**: Python 3.13 virtual environment (`venv`) configured with dependencies (`fastapi`, `uvicorn`, `psycopg[binary]`, `psycopg_pool`, `pydantic-settings`, `pyjwt`, `bcrypt`, `pytest`, `httpx`).

## Implemented Components
1. **Repository Structure**:
   - `app/`: Source code package with `schemas/`, `routers/`, `services/`.
   - `db/`: Database schema, seeds, queries.
   - `tests/`: Automated test suite.
   - `frontend/`: Preserved as an empty placeholder (`.gitkeep`).
2. **Environment Configuration**:
   - `.env.example`: Template for local database credentials, connection pool parameters, JWT secret, and CORS origins.
   - `.gitignore`: Configured to ignore secrets, cache, and virtual environments.

## Key Design Decisions
- **Raw Parameterized SQL**: Psycopg 3 (`psycopg-pool`) without ORM to keep SQL explicit and transparent for DBMS demonstration.
- **Seat Availability Derivation**: Avoided storing stale `available_seats`; dynamically computed via `v_flight_search` and `flight_seat` row states.
- **Concurrency Control**: DB row locking (`FOR UPDATE`) in `book_seat()` stored procedure to guarantee race-free booking.
- **Disjoint ISA Specialisation**: Employee roles (Pilot, Cabin Crew, Ground Staff) inherit from a single `employee` table.

## How to Run & Test
- **Virtualenv Activation**: `.\venv\Scripts\Activate.ps1`
- **Install Dependencies**: `pip install -r requirements.txt`
- **Testing**: `pytest tests/`

## Known Issues / Action Items
- Local PostgreSQL database `airline_db` must be created and schema applied in Phase 1.
