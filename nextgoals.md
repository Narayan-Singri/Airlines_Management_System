# Next Goals & Roadmap

## Active Phase: Phase 2 (Python to Database Connection)
- [x] Phase 0: Project setup, folder structure, dependencies, living documentation.
- [x] Phase 1: PostgreSQL schema, seed script with bcrypt hashes, database constraints and tests.
- [ ] Implement `app/config.py` using `pydantic-settings` to load configuration from `.env`.
- [ ] Implement `app/database.py` with `ConnectionPool` (`psycopg_pool`), context-managed transactions, and row-to-dict helpers.
- [ ] Implement `app/main.py` with FastAPI lifespan for pool startup/shutdown, CORS middleware, and `GET /health` endpoint.
- [ ] Create test suite `tests/test_phase2_database_connection.py` verifying pool lifecycle, live query execution, and database unreachable error handling.
- [ ] Commit and push Phase 2 to GitHub.

---

## Upcoming Phases

### Phase 3: REST API Implementation
- [ ] `app/security.py`: JWT generation, verification, bcrypt password helpers, role-based dependency injection guards.
- [ ] `app/routers/auth.py`: Registration and login endpoints (`POST /auth/register`, `POST /auth/login`, `POST /auth/staff/login`).
- [ ] `app/routers/flights.py`: Flight search, detail, and seat map (`GET /flights`, `GET /flights/{id}`, `GET /flights/{id}/seats`).
- [ ] `app/routers/bookings.py`: Reservation endpoints (`POST /bookings`, `GET /bookings/me`, `GET /bookings/{pnr}`, `POST /bookings/{id}/cancel`).
- [ ] `app/routers/payments.py`: Payment creation (`POST /payments`, `GET /bookings/{id}/payments`).
- [ ] `app/routers/checkin.py`: Ground checkin (`POST /checkin`, `GET /checkin/{pnr}`).
- [ ] `app/routers/flight_conditions.py`: Pre-flight logs (`POST /flights/{id}/conditions`, `GET /flights/{id}/conditions`).
- [ ] `app/routers/admin.py`: Fleet, airport, flight, and employee administration.
- [ ] Integration tests: Concurrency booking test and full customer-to-checkin lifecycle test.
- [ ] Commit and push Phase 3.

### Phase 4: Frontend (Future)
- [ ] Web interface (HTML/CSS/JS) consuming the REST APIs.

### Phase 5: Cloud Deployment (Future)
- [ ] Free containerized cloud deployment and database provisioning.
