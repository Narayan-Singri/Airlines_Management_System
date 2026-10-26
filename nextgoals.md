# Next Goals & Roadmap

## Active Phase: Phase 0 (Project Setup)
- [x] Create project directory layout matching target architecture.
- [x] Configure `.gitignore` and `.env.example`.
- [x] Initialize Git repository and link to remote `Narayan-Singri/Airlines_Management_System`.
- [x] Setup Python 3.13 `venv` and install `requirements.txt`.
- [ ] Run automated Phase 0 verification suite (folder structure, packages, imports).
- [ ] Commit Phase 0 to GitHub.

---

## Upcoming Phases

### Phase 1: Database & Seed
- [ ] Save `db/schema.sql` verbatim from Appendix A.
- [ ] Create `db/seed.py` generating real bcrypt password hashes for seed passengers and employees.
- [ ] Execute schema against PostgreSQL (`airline_db`).
- [ ] Verify database schema (tables, foreign keys, triggers, stored procedures, views, check constraints).
- [ ] Verify concurrency and constraint test cases (duplicate seat booking rejected, payment confirms booking, invalid routes rejected).
- [ ] Commit Phase 1.

### Phase 2: Python to Database Connection
- [ ] Implement `app/config.py` with `pydantic-settings`.
- [ ] Implement `app/database.py` with `ConnectionPool` and context managers.
- [ ] Implement `GET /health` endpoint verifying live database ping.
- [ ] Verify connection pool lifecycle and error handling.
- [ ] Commit Phase 2.

### Phase 3: REST API Implementation
- [ ] Implement `app/security.py` (JWT generation/verification, bcrypt hashing, role dependency guards).
- [ ] Implement `app/routers/auth.py` (`POST /auth/register`, `POST /auth/login`, `POST /auth/staff/login`).
- [ ] Implement `app/routers/flights.py` (`GET /flights`, `GET /flights/{id}`, `GET /flights/{id}/seats`).
- [ ] Implement `app/routers/bookings.py` (`POST /bookings`, `GET /bookings/me`, `GET /bookings/{pnr}`, `POST /bookings/{id}/cancel`).
- [ ] Implement `app/routers/payments.py` (`POST /payments`, `GET /bookings/{id}/payments`).
- [ ] Implement `app/routers/checkin.py` (`POST /checkin`, `GET /checkin/{pnr}`).
- [ ] Implement `app/routers/flight_conditions.py` (`POST /flights/{id}/conditions`, `GET /flights/{id}/conditions`).
- [ ] Implement `app/routers/admin.py` (CRUD airports, aircraft, flights, employees, crew assignments).
- [ ] Verify full end-to-end integration flows (customer register -> flight search -> seat book -> payment -> ground checkin -> flight log -> status update).
- [ ] Commit Phase 3.

### Phase 4: Frontend (Future)
- [ ] Client interface development (HTML, CSS, JS).

### Phase 5: Free Cloud Deployment (Future)
- [ ] Cloud database and containerized service deployment.
