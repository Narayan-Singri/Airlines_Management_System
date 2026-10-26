# Next Goals & Roadmap

## Active Phase: Phase 4 Polish & Visual Upgrades
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
- [x] **Phase 4 Core**: Frontend Web Application:
  - [x] Design tokens system (`tokens.css`), base resets (`base.css`), and UI components (`components.css`).
  - [x] Unified API fetch client (`api.js`) and JWT session security (`auth.js`).
  - [x] Animated Landing Page (`index.html`) with SVG flight path, 3-tab search card, and popular routes.
  - [x] Flight Search Results (`search.html`) with filters, time slots, sort options, and live seat count badges.
  - [x] Physical Cabin Seat Map (`seats.html`) with Business & Economy class tiers, real-time recalculation, and 409 conflict prevention.
  - [x] Review & Payment Gateway (`checkout.html`) with multi-channel payment (UPI, Card, Netbanking, Wallet).
  - [x] Printable E-Ticket Confirmation (`confirmation.html`) with copy PNR and PDF printing.
  - [x] Customer Sign In (`login.html`) and Registration (`register.html`) with quick-fill demo accounts.
  - [x] My Bookings Management (`my-bookings.html`) with ticket lookup and cancellation modal releasing seats.
  - [x] Manage Booking & Check-in (`manage.html`) with official printable digital boarding pass.
  - [x] Public Live Flight Tracker (`status.html`) with 4-stage operational timeline and pre-flight technical safety check rating.
  - [x] Role-guarded Staff Portal (`staff/checkin.html`, `staff/conditions.html`, `staff/flight-status.html`).
  - [x] Automated frontend test suite (`tests/test_phase4_frontend.py` - total 32 tests passing).

## Current Polish Tasks
- [x] **Task 1: Fix Payment Failure & Validation**:
  - [x] Mapped payment payload strictly to backend schema `CreatePaymentRequest` (`method: 'UPI'|'CARD'|'NETBANKING'|'WALLET'`).
  - [x] Client-side input validation with clean inline errors (`.form-error-inline`).
  - [x] Friendly API error translation (no raw `body.method` toasts).
  - [x] Total price consistency across seat selection, checkout, confirmation, and my bookings (`total_amount == seatPrice`).
  - [x] Trip Summary layout styling (labels left, amounts right, bold total with divider).
  - [x] Double-submit button lock and partial failure retry path.
  - [x] Real browser subagent verification of end-to-end booking flow.
- [x] **Task 2: My Bookings Animated Ticket Cards**:
  - [x] Adapt Uiverse ticket card design with FlyNow blue palette (`--color-primary`, `--color-primary-light`, `--color-navy`).
  - [x] Fluid responsive layout down to 360px viewport.
  - [x] IntersectionObserver animation pausing and `prefers-reduced-motion` compliance.
  - [x] Status badges, cancel confirmation modal, and sanitized data rendering.
- [ ] **Task 3: Hero Plane Artwork & Motion**:
  - [ ] Replace banner plane with `assets/plane.png`.
  - [ ] Floating flight motion, speed trail lines behind it, layered behind text (`z-index`, `pointer-events: none`).
  - [ ] Scroll-driven parallax with responsive adjustments.
- [ ] **Task 4: Slow-Rotating Earth Background**:
  - [ ] Integrate `assets/map.png` as texture background on popular routes section.
  - [ ] Continuous GPU rotation (90-180s), clipped overflow, no layout shift or horizontal scroll.
  - [ ] Off-screen and `prefers-reduced-motion` pausing.
- [ ] **Task 5: Baggage Image Integration**:
  - [ ] Integrate `assets/baggage.png` with gentle floating shadow on `manage.html` and/or `confirmation.html`.
- [ ] **Task 6: Assets Documentation & Final Regression**:
  - [ ] Document assets in `frontend/ASSETS.md` noting academic use.
  - [ ] Full regression testing across desktop and mobile viewports.

---

## Postponed / Cancelled Phases
- **Phase 5: Cloud Deployment & Containerization**: Cancelled / On Hold. Free deployment, Docker, and CI/CD pipelines are out of scope.
