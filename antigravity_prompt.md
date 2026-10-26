# ANTIGRAVITY PROMPT - Airline Management System (Backend + APIs only)

> Paste everything below this line into Antigravity as the task prompt.

---

## ROLE

You are a senior backend engineer and database architect. Build the **complete backend** (PostgreSQL database + Python FastAPI REST API) for an **Airline Management System** (DBMS college project). Write clean, professional, well-structured, well-commented code. Work in phases, test as you go, and keep three living documents up to date so any other AI or human can continue the work.

## HARD CONSTRAINTS

- Database: **PostgreSQL, run locally and managed through pgAdmin**. Do NOT use Supabase, Firebase, Neon or any hosted DB service for development.
- Backend: **Python 3.11+ with FastAPI**, using **psycopg 3** (`psycopg[binary]`, `psycopg_pool`) with raw parameterised SQL. No ORM, because this is a DBMS project and the SQL must stay visible.
- Frontend (HTML/CSS/JS) comes LATER. In this task, create an **empty `frontend/` folder** (only a `.gitkeep` and nothing else). Do not write any frontend code.
- Everything must stay deployable for free later: all config through environment variables, no hardcoded credentials, CORS enabled and configurable, a `requirements.txt`, and a health endpoint. Do NOT deploy anything now.
- Never hardcode secrets. Use a `.env` file (git-ignored) plus a committed `.env.example`.
- All SQL must be parameterised (no string-formatted queries).

## DOCUMENTATION RULES (CRITICAL)

Create and maintain these three files in the project root for the whole task:

1. **`README.md`**: project goals, scope, tech stack, architecture diagram (ASCII is fine), the final file/folder structure, setup and run instructions, the list of API endpoints, and the DB design explanation (table purposes). Update it whenever the structure changes.
2. **`context.md`**: the CURRENT implementation state, rewritten by you **after completing every task**: what is built, how it works, key design decisions, how to run and test it, known issues. Another AI must be able to read only this file and know exactly where things stand.
3. **`nextgoals.md`**: a prioritised checklist of what to do next, with the current phase and the exact next step. Update it after every task. If the user switches to a different AI, this file tells it what to do.

Rule: do not mark a task done until `context.md` and `nextgoals.md` reflect it.

## TESTING RULES (CRITICAL)

Test side by side with building, not at the end. **After finishing each phase (and each major endpoint group), spawn a subagent whose only job is to test that work**: run the SQL checks or API calls, try failure cases (bad input, duplicates, unauthorised access, double booking), and report pass or fail with evidence. Fix every failure before moving on. Keep the tests in a `tests/` folder (pytest + FastAPI `TestClient` or `httpx`) so they can be re-run.

## PROJECT BACKGROUND (what we decided)

Core features:
- **Customers (passengers)**: register, log in, search flights by origin, destination and date, view seats, book a seat, pay, view or cancel their bookings.
- **Staff (ground staff)**: check travellers in by matching booking and passport data, record baggage, issue a boarding pass.
- **Flight operations (pilots / authorised staff)**: record pre-flight **flight conditions** (fuel level, oil level, tyres, weather, overall GOOD / MODERATE / POOR) and update flight status (SCHEDULED, BOARDING, DEPARTED, ARRIVED, DELAYED, CANCELLED).
- **Admin**: manage flights, aircraft, airports, employees.

Corrections already made to the original ER/EER diagrams (keep them):
1. Flight has TWO airport relations (origin and destination), implemented as two foreign keys.
2. `AvailableSeats` is NOT stored. It is derived by counting free rows in `flight_seat`, which prevents stale data and overbooking.
3. `FlightNo` is not a primary key. The same number repeats daily, so use a surrogate `flight_id` and `UNIQUE(flight_no, departure_time)`.
4. Employee ISA (disjoint) specialisation: `pilot`, `cabin_crew`, `ground_staff` share the employee primary key.
5. Added `checkin`, `flight_condition`, `flight_crew` and `aircraft`.

## SCHEMA

The full PostgreSQL schema is in **Appendix A** at the bottom of this prompt. Save it **verbatim** as `db/schema.sql`. It includes tables, constraints, indexes, the `book_seat()`, `cancel_booking()` and `generate_flight_seats()` functions, the payment-confirms-booking trigger, the `v_flight_search` view and sample data. You may improve it if you find a real bug (document every change in `context.md`), but do not remove the design decisions above. Seed users must have **real bcrypt password hashes** produced by a seed script, not the literal `CHANGE_ME`.

## TARGET FOLDER STRUCTURE

```
airline-management/
├── README.md
├── context.md
├── nextgoals.md
├── .env.example
├── .gitignore
├── requirements.txt
├── db/
│   ├── schema.sql
│   ├── seed.py            # creates users with bcrypt hashes
│   └── queries/           # optional: reusable SQL files
├── app/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── config.py          # env settings (pydantic-settings)
│   ├── database.py        # connection pool + helpers
│   ├── security.py        # bcrypt hashing, JWT create/verify, role guards
│   ├── schemas/           # pydantic request/response models
│   ├── routers/
│   │   ├── auth.py
│   │   ├── flights.py
│   │   ├── bookings.py
│   │   ├── payments.py
│   │   ├── checkin.py
│   │   ├── flight_conditions.py
│   │   └── admin.py
│   └── services/          # business logic called by routers
├── tests/
└── frontend/              # EMPTY for now (.gitkeep only)
```

## PHASES

### Phase 0: Project setup
- Create the folder structure, virtual environment, `requirements.txt` (fastapi, uvicorn, psycopg[binary], psycopg_pool, pydantic-settings, python-jose or pyjwt, passlib[bcrypt] or bcrypt, pytest, httpx, python-dotenv), `.gitignore`, `.env.example`.
- Write the first versions of `README.md`, `context.md`, `nextgoals.md`.
- Tell me exactly what I must do manually (install PostgreSQL, create the database in pgAdmin, fill in `.env`).
- Test: subagent verifies the environment installs and the folders exist.

### Phase 1: Database
- Create `db/schema.sql` from Appendix A. Create `db/seed.py`.
- Run the schema against the local PostgreSQL database.
- Test: a subagent verifies every table, constraint, index, function, trigger and view exists, then tests: duplicate seat booking is rejected, `book_seat` on a taken seat fails, `cancel_booking` frees the seat, a successful payment confirms the booking, `origin = destination` is rejected, `arrival < departure` is rejected, and the search view returns correct available-seat counts.
- Explain, in `README.md`, why each table exists (high level).

### Phase 2: Python to database connection
- Implement `config.py`, `database.py` (connection pool, context-managed transactions, row-to-dict helper), and a `GET /health` endpoint that checks DB connectivity.
- Test: a subagent verifies pool startup and shutdown, a successful query, and clean error handling when the DB is unreachable.

### Phase 3: APIs
Implement with proper validation, status codes and error messages. Roles are `customer` and `staff` (with `emp_type` PILOT / CABIN_CREW / GROUND_STAFF / ADMIN). Use JWT bearer auth and bcrypt.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (customer), `POST /auth/login` (customer), `POST /auth/staff/login` |
| Flights | `GET /flights?from=BOM&to=DEL&date=YYYY-MM-DD` (public, uses `v_flight_search`), `GET /flights/{id}`, `GET /flights/{id}/seats` |
| Bookings | `POST /bookings` (calls `book_seat()`), `GET /bookings/me`, `GET /bookings/{pnr}`, `POST /bookings/{id}/cancel` |
| Payments | `POST /payments` (confirms booking via trigger), `GET /bookings/{id}/payments` |
| Check-in | `POST /checkin` (ground staff only: validates the booking is CONFIRMED, matches the passenger's passport, one check-in per booking, issues boarding pass), `GET /checkin/{pnr}` |
| Flight conditions | `POST /flights/{id}/conditions` (pilot or admin), `GET /flights/{id}/conditions` (staff), latest-condition summary |
| Flight status | `PATCH /flights/{id}/status` (staff) |
| Admin | CRUD for airports, aircraft, flights (auto-call `generate_flight_seats()` when a flight is created), employees, plus assign crew to a flight |

Rules:
- Customers can only see and cancel their own bookings.
- Staff endpoints must reject customer tokens, and customer endpoints must reject unauthenticated calls.
- Never return password hashes.
- Booking and payment must be race-safe (rely on `book_seat()` row locking). Add a concurrency test where two bookings target the same seat and exactly one succeeds.
- Test: after each router is done, a subagent tests it end to end, including the failure cases. Finish with a full flow test: register, search, pick a seat, book, pay, staff check-in, flight condition logged, flight status updated.
- FastAPI auto-docs at `/docs` must work and be clean (tags, summaries, response models).

## CODE QUALITY STANDARDS

- Type hints everywhere, docstrings on public functions, small single-purpose functions, routers thin and logic in `services/`.
- Consistent error responses, meaningful HTTP codes (400, 401, 403, 404, 409, 422).
- No dead code, no hardcoded values that belong in config, no duplicated SQL.
- Meaningful names, consistent formatting (PEP 8; use `ruff` or `black` if available).

## DEFINITION OF DONE

- The schema loads cleanly in pgAdmin and the sample data works.
- `uvicorn app.main:app --reload` starts, `/docs` shows every endpoint, and the full flow works.
- `pytest` passes.
- `frontend/` is empty.
- `README.md`, `context.md` and `nextgoals.md` are accurate and current, with `nextgoals.md` pointing at the next step (Phase 4: frontend, then Phase 5: free deployment).

## START NOW

Begin with Phase 0. Before each phase, say in one or two lines what you are about to do. After each phase, spawn the testing subagent, fix its findings, update the three docs, then continue to the next phase without waiting for me unless you are blocked on something only I can do (for example PostgreSQL credentials).

---

## APPENDIX A: db/schema.sql (save verbatim)

```sql
-- =====================================================================
-- AIRLINE MANAGEMENT SYSTEM - PostgreSQL schema (run in pgAdmin Query Tool)
-- =====================================================================

DROP SCHEMA IF EXISTS airline CASCADE;
CREATE SCHEMA airline;
SET search_path = airline;

-- ---------- 1. REFERENCE DATA ----------
CREATE TABLE airport (
    airport_id  SERIAL PRIMARY KEY,
    iata_code   CHAR(3)      NOT NULL UNIQUE,      -- BOM, DEL, BLR
    name        VARCHAR(120) NOT NULL,
    city        VARCHAR(80)  NOT NULL,
    country     VARCHAR(80)  NOT NULL DEFAULT 'India'
);

CREATE TABLE aircraft (
    aircraft_id     SERIAL PRIMARY KEY,
    registration_no VARCHAR(20) NOT NULL UNIQUE,   -- VT-ABC
    model           VARCHAR(60) NOT NULL,          -- A320, B737
    total_seats     INT NOT NULL CHECK (total_seats > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','MAINTENANCE','RETIRED'))
);

-- ---------- 2. EMPLOYEES (department + ISA specialisation) ----------
CREATE TABLE department (
    department_id SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE employee (
    employee_id   SERIAL PRIMARY KEY,
    department_id INT NOT NULL REFERENCES department(department_id),
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                   -- staff login
    emp_type      VARCHAR(15) NOT NULL
                  CHECK (emp_type IN ('PILOT','CABIN_CREW','GROUND_STAFF','ADMIN')),
    salary        NUMERIC(10,2) CHECK (salary >= 0),
    hire_date     DATE NOT NULL DEFAULT CURRENT_DATE
);

-- disjoint specialisation: an employee appears in at most one of these
CREATE TABLE pilot (
    employee_id  INT PRIMARY KEY REFERENCES employee(employee_id) ON DELETE CASCADE,
    license_no   VARCHAR(30) NOT NULL UNIQUE,
    flight_hours INT NOT NULL DEFAULT 0
);
CREATE TABLE cabin_crew (
    employee_id INT PRIMARY KEY REFERENCES employee(employee_id) ON DELETE CASCADE,
    languages   VARCHAR(100)
);
CREATE TABLE ground_staff (
    employee_id INT PRIMARY KEY REFERENCES employee(employee_id) ON DELETE CASCADE,
    duty_area   VARCHAR(40) NOT NULL DEFAULT 'CHECKIN'   -- CHECKIN, BAGGAGE, GATE
);

CREATE TABLE dependent (
    dependent_id SERIAL PRIMARY KEY,
    employee_id  INT NOT NULL REFERENCES employee(employee_id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    relationship VARCHAR(30)  NOT NULL,
    date_of_birth DATE
);

-- ---------- 3. CUSTOMERS ----------
CREATE TABLE passenger (
    passenger_id  SERIAL PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                   -- customer login
    phone         VARCHAR(20),
    passport_no   VARCHAR(20) UNIQUE,
    date_of_birth DATE,
    nationality   VARCHAR(50)
);

-- ---------- 4. FLIGHTS ----------
CREATE TABLE flight (
    flight_id        SERIAL PRIMARY KEY,
    flight_no        VARCHAR(10) NOT NULL,         -- AI101 (repeats daily, so NOT unique alone)
    origin_id        INT NOT NULL REFERENCES airport(airport_id),
    destination_id   INT NOT NULL REFERENCES airport(airport_id),
    aircraft_id      INT NOT NULL REFERENCES aircraft(aircraft_id),
    departure_time   TIMESTAMPTZ NOT NULL,
    arrival_time     TIMESTAMPTZ NOT NULL,
    base_price       NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    status           VARCHAR(15) NOT NULL DEFAULT 'SCHEDULED'
                     CHECK (status IN ('SCHEDULED','BOARDING','DEPARTED','ARRIVED','DELAYED','CANCELLED')),
    CHECK (origin_id <> destination_id),
    CHECK (arrival_time > departure_time),
    UNIQUE (flight_no, departure_time)
);

-- One row per physical seat per flight. Replaces the stored "AvailableSeats"
-- (a derived value that goes stale): available = COUNT(*) WHERE NOT is_booked.
CREATE TABLE flight_seat (
    flight_id INT NOT NULL REFERENCES flight(flight_id) ON DELETE CASCADE,
    seat_no   VARCHAR(4) NOT NULL,                 -- 12A
    class     VARCHAR(10) NOT NULL DEFAULT 'ECONOMY' CHECK (class IN ('ECONOMY','BUSINESS')),
    price     NUMERIC(10,2) NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (flight_id, seat_no)
);

-- which employees work which flight (M:N)
CREATE TABLE flight_crew (
    flight_id   INT NOT NULL REFERENCES flight(flight_id) ON DELETE CASCADE,
    employee_id INT NOT NULL REFERENCES employee(employee_id),
    duty        VARCHAR(20) NOT NULL CHECK (duty IN ('CAPTAIN','FIRST_OFFICER','CABIN','GROUND')),
    PRIMARY KEY (flight_id, employee_id)
);

-- Pre-flight technical / safety checks (a LOG: many checks per flight)
CREATE TABLE flight_condition (
    condition_id    SERIAL PRIMARY KEY,
    flight_id       INT NOT NULL REFERENCES flight(flight_id) ON DELETE CASCADE,
    checked_by      INT NOT NULL REFERENCES employee(employee_id),
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    fuel_level_pct  NUMERIC(5,2) CHECK (fuel_level_pct  BETWEEN 0 AND 100),
    oil_level_pct   NUMERIC(5,2) CHECK (oil_level_pct   BETWEEN 0 AND 100),
    tyre_ok         BOOLEAN NOT NULL DEFAULT TRUE,
    weather         VARCHAR(20) CHECK (weather IN ('CLEAR','CLOUDY','RAIN','STORM','FOG')),
    overall         VARCHAR(10) NOT NULL CHECK (overall IN ('GOOD','MODERATE','POOR')),
    remarks         TEXT
);

-- ---------- 5. BOOKING, PAYMENT, CHECK-IN ----------
CREATE TABLE booking (
    booking_id   SERIAL PRIMARY KEY,
    pnr          CHAR(6) NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text),1,6)),
    passenger_id INT NOT NULL REFERENCES passenger(passenger_id),
    flight_id    INT NOT NULL,
    seat_no      VARCHAR(4) NOT NULL,
    status       VARCHAR(12) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','CHECKED_IN')),
    amount       NUMERIC(10,2) NOT NULL,
    booked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (flight_id, seat_no) REFERENCES flight_seat(flight_id, seat_no)
);
-- A seat can have only ONE live booking (cancelled ones free it up)
CREATE UNIQUE INDEX uq_live_seat ON booking(flight_id, seat_no) WHERE status <> 'CANCELLED';

CREATE TABLE payment (
    payment_id   SERIAL PRIMARY KEY,
    booking_id   INT NOT NULL REFERENCES booking(booking_id),
    amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    method       VARCHAR(15) NOT NULL CHECK (method IN ('UPI','CARD','NETBANKING','WALLET')),
    status       VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
    paid_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE checkin (
    checkin_id       SERIAL PRIMARY KEY,
    booking_id       INT NOT NULL UNIQUE REFERENCES booking(booking_id),  -- once per booking
    employee_id      INT NOT NULL REFERENCES employee(employee_id),       -- who verified
    passport_matched BOOLEAN NOT NULL,
    baggage_kg       NUMERIC(5,2) DEFAULT 0,
    boarding_pass_no VARCHAR(12) NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text),1,10)),
    checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 6. INDEXES (beyond those PK/UNIQUE create automatically) ----------
CREATE INDEX idx_flight_search   ON flight(origin_id, destination_id, departure_time);
CREATE INDEX idx_flight_status   ON flight(status, departure_time);
CREATE INDEX idx_booking_pass    ON booking(passenger_id);
CREATE INDEX idx_booking_flight  ON booking(flight_id);
CREATE INDEX idx_payment_booking ON payment(booking_id);
CREATE INDEX idx_seat_available  ON flight_seat(flight_id) WHERE NOT is_booked;
CREATE INDEX idx_cond_flight     ON flight_condition(flight_id, checked_at DESC);
CREATE INDEX idx_employee_dept   ON employee(department_id);

-- ---------- 7. BUSINESS LOGIC IN THE DB ----------
-- Create seats for a flight: rows of 6 (A-F); first 3 rows are BUSINESS.
CREATE FUNCTION generate_flight_seats(p_flight_id INT) RETURNS VOID AS $$
DECLARE v_total INT; v_base NUMERIC;
BEGIN
    SELECT a.total_seats, f.base_price INTO v_total, v_base
    FROM flight f JOIN aircraft a USING (aircraft_id) WHERE f.flight_id = p_flight_id;

    INSERT INTO flight_seat(flight_id, seat_no, class, price)
    SELECT p_flight_id,
           r || substr('ABCDEF', c, 1),
           CASE WHEN r <= 3 THEN 'BUSINESS' ELSE 'ECONOMY' END,
           CASE WHEN r <= 3 THEN v_base * 2.5 ELSE v_base END
    FROM generate_series(1, CEIL(v_total / 6.0)::INT) r,
         generate_series(1, 6) c
    WHERE (r - 1) * 6 + c <= v_total;
END $$ LANGUAGE plpgsql;

-- Race-safe booking: row lock stops two people grabbing the same seat.
CREATE FUNCTION book_seat(p_passenger INT, p_flight INT, p_seat VARCHAR)
RETURNS INT AS $$
DECLARE v_price NUMERIC; v_id INT;
BEGIN
    SELECT price INTO v_price FROM flight_seat
    WHERE flight_id = p_flight AND seat_no = p_seat AND NOT is_booked
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seat % is not available', p_seat; END IF;

    UPDATE flight_seat SET is_booked = TRUE WHERE flight_id = p_flight AND seat_no = p_seat;
    INSERT INTO booking(passenger_id, flight_id, seat_no, amount)
    VALUES (p_passenger, p_flight, p_seat, v_price) RETURNING booking_id INTO v_id;
    RETURN v_id;
END $$ LANGUAGE plpgsql;

-- Cancel a booking and free the seat.
CREATE FUNCTION cancel_booking(p_booking INT) RETURNS VOID AS $$
DECLARE v_flight INT; v_seat VARCHAR;
BEGIN
    UPDATE booking SET status = 'CANCELLED' WHERE booking_id = p_booking
      AND status <> 'CANCELLED' RETURNING flight_id, seat_no INTO v_flight, v_seat;
    IF v_flight IS NULL THEN RAISE EXCEPTION 'Booking not found or already cancelled'; END IF;
    UPDATE flight_seat SET is_booked = FALSE WHERE flight_id = v_flight AND seat_no = v_seat;
END $$ LANGUAGE plpgsql;

-- When a payment succeeds, confirm the booking automatically.
CREATE FUNCTION trg_confirm_booking() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'SUCCESS' THEN
        UPDATE booking SET status = 'CONFIRMED' WHERE booking_id = NEW.booking_id AND status = 'PENDING';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER payment_confirms_booking AFTER INSERT OR UPDATE OF status ON payment
FOR EACH ROW EXECUTE FUNCTION trg_confirm_booking();

-- Handy view for the search page: flights + available seat count
CREATE VIEW v_flight_search AS
SELECT f.flight_id, f.flight_no, o.iata_code AS origin, d.iata_code AS destination,
       o.city AS origin_city, d.city AS destination_city,
       f.departure_time, f.arrival_time, f.base_price, f.status,
       COUNT(s.seat_no) FILTER (WHERE NOT s.is_booked) AS available_seats
FROM flight f
JOIN airport o ON o.airport_id = f.origin_id
JOIN airport d ON d.airport_id = f.destination_id
LEFT JOIN flight_seat s ON s.flight_id = f.flight_id
GROUP BY f.flight_id, o.iata_code, d.iata_code, o.city, d.city;

-- ---------- 8. SAMPLE DATA ----------
INSERT INTO airport(iata_code,name,city) VALUES
 ('BOM','Chhatrapati Shivaji Maharaj Intl','Mumbai'),
 ('DEL','Indira Gandhi Intl','Delhi'),
 ('BLR','Kempegowda Intl','Bengaluru');
INSERT INTO aircraft(registration_no,model,total_seats) VALUES ('VT-ABC','A320',180),('VT-XYZ','B737',162);
INSERT INTO department(name) VALUES ('Flight Operations'),('Cabin Services'),('Ground Operations'),('Administration');
INSERT INTO employee(department_id,full_name,email,password_hash,emp_type,salary) VALUES
 (1,'Capt. Arjun Rao','arjun@air.test','CHANGE_ME','PILOT',350000),
 (2,'Meera Nair','meera@air.test','CHANGE_ME','CABIN_CREW',90000),
 (3,'Ravi Kumar','ravi@air.test','CHANGE_ME','GROUND_STAFF',55000);
INSERT INTO pilot VALUES (1,'ATPL-1001',6500);
INSERT INTO cabin_crew VALUES (2,'English, Hindi');
INSERT INTO ground_staff VALUES (3,'CHECKIN');
INSERT INTO passenger(full_name,email,password_hash,phone,passport_no) VALUES
 ('Test Passenger','test@mail.test','CHANGE_ME','9999999999','P1234567');

INSERT INTO flight(flight_no,origin_id,destination_id,aircraft_id,departure_time,arrival_time,base_price)
VALUES ('AI101',1,2,1, now()+interval '2 days', now()+interval '2 days 2 hours', 5500),
       ('AI202',2,3,2, now()+interval '3 days', now()+interval '3 days 3 hours', 6200);
SELECT generate_flight_seats(flight_id) FROM flight;

-- Try it:
--   SELECT * FROM v_flight_search;
--   SELECT book_seat(1, 1, '10A');
--   INSERT INTO payment(booking_id,amount,method,status) VALUES (1,5500,'UPI','SUCCESS');
```
