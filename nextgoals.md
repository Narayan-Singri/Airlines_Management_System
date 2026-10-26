# Next Goals & Roadmap

## Active Phase: Phase 4 (Frontend Web Application)
- [x] **Phase 0**: Project setup, folder structure, dependencies, living documentation.
- [x] **Phase 1**: PostgreSQL schema, seed script with bcrypt hashes, database constraints, procedures, and tests.
- [x] **Phase 2**: Configuration, psycopg 3 connection pool, database transaction managers, `/health` endpoint.
- [x] **Phase 3**: Complete REST API implementation:
  - [x] Authentication & RBAC (`/auth`)
  - [x] Flight search & Seat maps (`/flights`)
  - [x] Race-safe Bookings (`/bookings`)
  - [x] Payments with trigger confirmation (`/payments`)
  - [x] Ground check-in & Boarding passes (`/checkin`)
  - [x] Flight conditions & Status management (`/flights/{id}/conditions`, `status`)
  - [x] Admin management & Crew assignment (`/admin`)
  - [x] Full automated test suite (27 tests passing, concurrency test, and end-to-end flow).
- [ ] Commit and push Phase 3 to GitHub.

---

## Upcoming Phases

### Phase 4: Frontend Web Application
- [ ] Design and implement responsive client interface in `frontend/` (HTML/CSS/Vanilla JS):
  - [ ] Customer portal: Flight search, interactive seat selection, booking flow, payment, and passenger dashboard.
  - [ ] Ground Staff portal: Passenger lookup, passport verification, baggage weight input, and boarding pass printing.
  - [ ] Flight Operations / Pilot portal: Pre-flight technical checklist submission, flight status controls.
  - [ ] Admin portal: Fleet, flight scheduling, employee roster, and crew assignment dashboard.
  - [ ] Connect frontend to FastAPI backend using fetch API and JWT storage.

### Phase 5: Cloud Deployment
- [ ] Prepare Docker containerization (`Dockerfile`, `docker-compose.yml`).
- [ ] Free deployment guidelines and hosting (e.g. Render/Fly.io + hosted PostgreSQL).
