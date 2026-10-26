# System Context: Airlines Management System

## Current Status
- **Current Phase**: Phase 1 Complete (Database Schema & Seed Data)
- **Git Repository**: Synced with GitHub (`Narayan-Singri/Airlines_Management_System`)
- **Database Status**: Local PostgreSQL 18 instance running database `airline_db` with `airline` schema active.
- **Python Environment**: Python 3.13 virtual environment (`venv`) with all dependencies installed.

## Implemented Components
1. **Schema (`db/schema.sql`)**:
   - Reference tables: `airport`, `aircraft`, `department`.
   - Employee ISA Hierarchy: `employee`, `pilot`, `cabin_crew`, `ground_staff`, `dependent`.
   - Core operations: `passenger`, `flight`, `flight_seat`, `flight_crew`, `flight_condition`.
   - Transactional tables: `booking`, `payment`, `checkin`.
   - Indexes: Partial indexes (`uq_live_seat`, `idx_seat_available`), composite indexes (`idx_flight_search`, `idx_cond_flight`, `idx_flight_status`).
   - Stored procedures: `generate_flight_seats(p_flight_id)`, `book_seat(p_passenger, p_flight, p_seat)` with row locking (`FOR UPDATE`), `cancel_booking(p_booking)`.
   - Triggers: `payment_confirms_booking` calling `trg_confirm_booking()` to transition booking status to `CONFIRMED`.
   - Views: `v_flight_search` aggregating real-time available seat counts.
2. **Seed Script (`db/seed.py`)**:
   - Applies `db/schema.sql`.
   - Hashes passwords using bcrypt with salt for all sample employees (Pilot, Cabin, Ground Staff, Admin) and customer accounts.
3. **Automated Verification**:
   - `tests/test_phase0_setup.py`: Verified structure and imports (4/4 passed).
   - `tests/test_phase1_database.py`: Verified tables, constraints, triggers, views, procedures, and negative test cases (10/10 passed).

## Key Design Decisions & Verification
- `AvailableSeats` is never stored; verified that `v_flight_search` returns `total_seats - booked_seats`.
- Double-booking is strictly prohibited by both `book_seat()` row check and `uq_live_seat` partial unique index.
- Checked-in status and confirmation are transaction-safe through trigger automation.

## How to Run & Test
- **Database Seed**: `python db/seed.py`
- **Run Tests**: `pytest -v tests/`
