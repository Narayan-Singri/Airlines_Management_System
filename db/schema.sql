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
