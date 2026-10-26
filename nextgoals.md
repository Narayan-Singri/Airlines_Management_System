# Next Goals & Roadmap

## Active Phase: Phase 5 (Cloud Deployment & Containerization)
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
- [x] **Phase 4**: Frontend Web Application:
  - [x] Design tokens system (`tokens.css`), base resets (`base.css`), and UI components (`components.css`).
  - [x] Unified API fetch client (`api.js`) and JWT session security (`auth.js`).
  - [x] Animated Landing Page (`index.html`) with SVG airplane glide, dashed bezier flight path, 3-tab search card, and popular routes.
  - [x] Flight Search Results (`search.html`) with price range slider, departure time slots, sort options, and live seat count badges.
  - [x] Physical Cabin Seat Map (`seats.html`) with Business & Economy class tiers, real-time recalculation, and 409 conflict prevention.
  - [x] Review & Payment Gateway (`checkout.html`) with multi-channel payment (UPI, Card, Netbanking, Wallet) and confirmation trigger.
  - [x] Printable E-Ticket Confirmation (`confirmation.html`) with copy PNR and PDF printing.
  - [x] Customer Sign In (`login.html`) and Registration (`register.html`) with quick-fill demo accounts.
  - [x] My Bookings Management (`my-bookings.html`) with ticket lookup and cancellation modal releasing seats.
  - [x] Manage Booking & Check-in (`manage.html`) with official printable digital boarding pass.
  - [x] Public Live Flight Tracker (`status.html`) with 4-stage operational timeline and pre-flight technical safety check rating.
  - [x] Role-guarded Staff Portal (`staff/`):
    - [x] Staff login (`staff/login.html`) with role-based routing.
    - [x] Ground check-in desk (`staff/checkin.html`) with passport verification and baggage screening.
    - [x] Pilot technical safety logger (`staff/conditions.html`) with inspection history table.
    - [x] Flight operations status controller (`staff/flight-status.html`) with operational transitions.
  - [x] Automated frontend test suite (`tests/test_phase4_frontend.py` - 5 tests passed, total 32 tests passing).

---

## Upcoming Phases

### Phase 5: Cloud Deployment
- [ ] Prepare Docker containerization (`Dockerfile`, `docker-compose.yml`) for FastAPI backend and frontend.
- [ ] Free deployment guidelines and hosting setup (e.g., Render/Fly.io + hosted PostgreSQL or Supabase/Neon).
- [ ] Static hosting configuration (GitHub Pages / Vercel / Netlify) with environment-based `API_BASE_URL`.
