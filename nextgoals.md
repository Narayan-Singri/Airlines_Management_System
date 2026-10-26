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
- [x] **Task 3: Hero Plane Artwork & Motion**:
  - [x] Replaced banner plane with high-performance picture element (`assets/plane.webp` + `assets/plane.png`).
  - [x] Floating flight motion, trailing speed streak lines behind it, layered behind text (`z-index: 1`, `pointer-events: none`).
  - [x] Scroll-driven parallax with responsive adjustments for 360px, 768px, 1280px, and 1920px.
- [x] **Task 4: Slow-Rotating Earth Background**:
  - [x] Integrated `assets/map.png` / `assets/map.webp` as texture background on Popular Routes section.
  - [x] Continuous GPU rotation (140s), clipped overflow, zero layout shift or horizontal scroll.
  - [x] Off-screen pausing via `IntersectionObserver` and `prefers-reduced-motion` compliance.
- [x] **Task 5: Baggage Image Integration**:
  - [x] Integrated `assets/baggage.png` / `assets/baggage.webp` with gentle floating shadow on `manage.html` (Baggage Guidelines & Allowance) and `confirmation.html` (Departure & Check-in Reminder).
  - [x] Mobile-responsive layout stacking cleanly at 360px viewport without overflow.
- [x] **Task 6: Assets Documentation & Final Regression**:
  - [x] Recorded assets in `frontend/ASSETS.md` noting dimensions, WebP compression, loading strategy, and academic project notice (not for redistribution).
  - [x] Regression testing across desktop and mobile viewports with browser subagent.

---

## Postponed / Cancelled Phases
- **Phase 5: Cloud Deployment & Containerization**: Cancelled / On Hold. Free deployment, Docker, and CI/CD pipelines are out of scope.
