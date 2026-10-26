# Next Goals & Roadmap

## Active Phase: Phase 3 (REST API Implementation)
- [x] Phase 0: Project setup, folder structure, dependencies, living documentation.
- [x] Phase 1: PostgreSQL schema, seed script with bcrypt hashes, database constraints and tests.
- [x] Phase 2: Configuration, psycopg 3 connection pool, database transaction managers, `/health` endpoint.
- [ ] Implement `app/security.py`:
  - Password hashing & verification (`bcrypt`).
  - JWT token generation & verification (`pyjwt`).
  - FastAPI Depends guards: `get_current_user`, `require_customer`, `require_staff`, `require_role(role)`.
- [ ] Implement Pydantic request/response models in `app/schemas/`.
- [ ] Implement Routers & Services in `app/routers/` & `app/services/`:
  - `auth.py`: `POST /auth/register`, `POST /auth/login`, `POST /auth/staff/login`
  - `flights.py`: `GET /flights`, `GET /flights/{id}`, `GET /flights/{id}/seats`
  - `bookings.py`: `POST /bookings`, `GET /bookings/me`, `GET /bookings/{pnr}`, `POST /bookings/{id}/cancel`
  - `payments.py`: `POST /payments`, `GET /bookings/{id}/payments`
  - `checkin.py`: `POST /checkin`, `GET /checkin/{pnr}`
  - `flight_conditions.py`: `POST /flights/{id}/conditions`, `GET /flights/{id}/conditions`, `PATCH /flights/{id}/status`
  - `admin.py`: CRUD for airports, aircraft, flights, employees, flight crew assignments.
- [ ] Automated Testing:
  - Unit tests for each router and RBAC guard.
  - Concurrency test (two bookings competing for the exact same seat).
  - Full end-to-end flow test (register -> search -> pick seat -> book -> pay -> checkin -> condition -> status).
- [ ] Commit and push Phase 3 to GitHub.

---

## Upcoming Phases

### Phase 4: Frontend (Future)
- [ ] Responsive UI consuming the REST APIs.

### Phase 5: Cloud Deployment (Future)
- [ ] Free containerized cloud deployment and database provisioning.
