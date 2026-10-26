# System Context: Airlines Management System

## Current Status
- **Current Phase**: Phase 2 Complete (Database Connection & Health Monitoring)
- **Git Repository**: Synced with GitHub (`Narayan-Singri/Airlines_Management_System`)
- **Database Status**: Local PostgreSQL 18 instance running database `airline_db` with `airline` schema active.
- **Python Environment**: Python 3.13 virtual environment (`venv`) with psycopg 3 connection pool and FastAPI integration.

## Implemented Components
1. **Settings (`app/config.py`)**:
   - `pydantic-settings` model reading DB connection parameters, pool sizes, JWT secret, and CORS origins.
2. **Database Module (`app/database.py`)**:
   - `ConnectionPool` (`psycopg_pool`) initialized and shut down cleanly.
   - Context manager `get_db_connection()` setting search_path to `airline`.
   - Context manager `get_db_cursor()` using `dict_row` and supporting automatic or manual transaction commit/rollback.
   - Query helpers: `fetch_one()`, `fetch_all()`, `execute_commit()`.
   - Health check helper `check_db_health()`.
3. **FastAPI Application (`app/main.py`)**:
   - Lifespan handler managing connection pool lifecycle.
   - CORS middleware configured via settings.
   - Root endpoint `GET /` and health endpoint `GET /health` (returns 200 when connected, 503 if unreachable).
4. **Verification & Tests**:
   - `tests/test_phase0_setup.py`: Directory and import validation (4 passed).
   - `tests/test_phase1_database.py`: Schema, constraints, triggers, and procedures (10 passed).
   - `tests/test_phase2_database_connection.py`: Pool lifecycle, dict queries, rollback, and `/health` failure handling (5 passed). Total: 19 passed.

## Key Design Decisions
- Direct connection pooling with psycopg 3 without ORM overhead.
- Safe transaction rollbacks guarantee atomicity on unexpected exceptions.
- Graceful health checking with explicit 503 HTTP status when database connectivity is interrupted.

## How to Run & Test
- **Start Backend**: `uvicorn app.main:app --reload`
- **Run Tests**: `pytest -v tests/`
