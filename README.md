# Airlines Management System (Backend + Database)

A robust, enterprise-grade Airline Management System backend built with **PostgreSQL** (managed via pgAdmin) and **FastAPI** (Python 3.11+). 

This project uses raw parameterised SQL via **psycopg 3** and connection pooling (`psycopg_pool`) instead of an ORM to keep database operations and relational algebra fully explicit, transparent, and inspectable.

---

## 1. Project Goals & Scope

- **Concurrency-Safe Seat Reservation**: Prevents race conditions and double-booking using PostgreSQL row-level locks (`FOR UPDATE`) within stored procedures.
- **Dynamic Capacity Tracking**: Avoids stale derived columns; real-time available seats are computed dynamically using relational queries and indexed views (`v_flight_search`).
- **Role-Based Access Control (RBAC)**: Secure JWT bearer authentication and bcrypt password hashing supporting distinct actor workflows:
  - **Customers**: Search flights, view seats, book, make payments, inspect/cancel bookings.
  - **Ground Staff**: Passport verification, baggage weight recording, boarding pass issuance.
  - **Flight Operations (Pilots / Flight Ops)**: Pre-flight technical condition logging (fuel, oil, tyres, weather, overall rating) and flight status transitions.
  - **Administrators**: Manage airports, aircraft fleets, flight schedules, employee records, and flight crew assignments.

---

## 2. Architecture Diagram

```
+--------------------------------------------------------------------------+
|                                CLIENTS                                   |
|   +-----------------------+                    +---------------------+   |
|   |  Customer Web / App   |                    | Staff & Admin Portal|   |
|   +-----------+-----------+                    +----------+----------+   |
+---------------|-------------------------------------------|--------------+
                | HTTP / REST (JSON)                        |
                +---------------------+---------------------+
                                      |
                                      v
+--------------------------------------------------------------------------+
|                     FASTAPI BACKEND SERVICE                              |
|                                                                          |
|   [ CORS Middleware ] -> [ JWT Security & Role Authorization Guards ]     |
|                                     |                                    |
|   +---------------------------------+--------------------------------+   |
|   |                         API ROUTERS                              |   |
|   |  /auth  |  /flights  |  /bookings  |  /payments  |  /checkin ... |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------+--------------------------------+   |
|   |                       SERVICE LAYER                              |   |
|   |       (Business rules, validation, error mapping)                |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------+--------------------------------+   |
|   |            DATABASE MODULE (psycopg 3 + Connection Pool)         |   |
|   |        (Context-managed transactions, row-to-dict mappings)      |   |
|   +---------------------------------+--------------------------------+   |
+-------------------------------------|------------------------------------+
                                      | Parameterised SQL / Procedures
                                      v
+--------------------------------------------------------------------------+
|                       POSTGRESQL DATABASE (pgAdmin)                      |
|                                                                          |
|   - Reference Data: airport, aircraft, department                        |
|   - ISA Hierarchy: employee -> pilot | cabin_crew | ground_staff         |
|   - Core Operations: flight, flight_seat, flight_crew, flight_condition  |
|   - Transactions: booking, payment, checkin                              |
|   - DB Logic: book_seat(), cancel_booking(), generate_flight_seats()     |
|   - Triggers: payment_confirms_booking trigger on payment                |
|   - Views: v_flight_search (real-time availability)                      |
+--------------------------------------------------------------------------+
```

---

## 3. Technology Stack

- **Language & Runtime**: Python 3.11+ / 3.13
- **Web Framework**: FastAPI (Asynchronous ASGI API framework)
- **Database Engine**: PostgreSQL 18 (Local instance)
- **Database Driver**: psycopg 3 (`psycopg[binary]`, `psycopg_pool`)
- **Validation & Settings**: Pydantic v2 & `pydantic-settings`
- **Security & Authentication**: PyJWT, bcrypt
- **Testing**: Pytest, HTTPX, FastAPI `TestClient`
- **Server**: Uvicorn ASGI Server

---

## 4. Target Project Structure

```
Airlines_Management_System/
├── README.md              # Project documentation, architecture, schema explanations
├── context.md             # Living log of system status and implementation state
├── nextgoals.md           # Prioritised roadmap of tasks and next steps
├── .env.example           # Safe environment variable template
├── .env                   # Local credentials (git-ignored)
├── .gitignore             # Git ignore configuration
├── requirements.txt       # Project dependencies
├── db/
│   ├── schema.sql         # Verbatim PostgreSQL schema definition
│   ├── seed.py            # Seed script with real bcrypt hashes
│   └── queries/           # Reusable SQL files
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app, CORS, router mounts, lifespan
│   ├── config.py          # Pydantic settings loading from .env
│   ├── database.py        # Connection pool and transaction context managers
│   ├── security.py        # Passwords, JWT tokens, role guards
│   ├── schemas/           # Pydantic schemas (Request / Response)
│   ├── routers/           # Endpoint controllers
│   │   ├── auth.py
│   │   ├── flights.py
│   │   ├── bookings.py
│   │   ├── payments.py
│   │   ├── checkin.py
│   │   ├── flight_conditions.py
│   │   └── admin.py
│   └── services/          # Pure business logic and SQL dispatch
├── tests/                 # Automated test suite (Phase 0-4)
└── frontend/              # Complete modern responsive client interface
    ├── index.html         # Landing page with hero animation & 3-tab search card
    ├── search.html        # Flight search results with price & time filters
    ├── seats.html         # Interactive cabin seat map (Business & Economy tiers)
    ├── checkout.html      # Booking & multi-channel payment (UPI, Card, Netbanking, Wallet)
    ├── confirmation.html  # PNR confirmation & printable e-ticket
    ├── login.html         # Customer sign in
    ├── register.html      # Customer registration
    ├── my-bookings.html   # Booking management & seat cancellation
    ├── manage.html        # PNR lookup & official boarding pass issuance
    ├── status.html        # Public flight status & technical condition log
    ├── staff/             # Internal role-guarded portal (Ground Staff, Pilots, Admin)
    ├── css/               # Design tokens, base resets, components, and page styles
    ├── js/                # Unified API client, JWT auth guards, and controllers
    ├── ASSETS.md          # Open-source asset licensing and attribution
    └── README.md          # Frontend architecture and deployment guide
```

---

## 5. Database Design & Table Explanations

| Table | Purpose |
|---|---|
| `airport` | Reference data for airports (`iata_code`, name, city, country). |
| `aircraft` | Fleet details (`registration_no`, model, total seats, operational status). |
| `department` | Organizational divisions (Flight Ops, Cabin Services, Ground Ops, Admin). |
| `employee` | Base entity for all staff (`emp_type`: PILOT, CABIN_CREW, GROUND_STAFF, ADMIN). |
| `pilot` | Disjoint ISA table storing pilot license number and logged flight hours. |
| `cabin_crew` | Disjoint ISA table storing crew languages spoken. |
| `ground_staff` | Disjoint ISA table storing duty area (CHECKIN, BAGGAGE, GATE). |
| `dependent` | Family/dependent records of employees. |
| `passenger` | Customer accounts with credentials, contact info, and passport number. |
| `flight` | Flight schedules with origin, destination, aircraft, departure, arrival, price, and status. |
| `flight_seat` | Granular seat map per flight (class, price, booking state). Prevents stale counters. |
| `flight_crew` | Many-to-Many assignment of employees to specific flights with designated duties. |
| `flight_condition` | Log of pre-flight mechanical/weather checks (fuel %, oil %, tyres, weather, rating). |
| `booking` | Reservations with unique PNR, linked passenger, flight, and seat. |
| `payment` | Payment ledger (UPI, CARD, NETBANKING, WALLET) triggering automatic booking confirmation. |
| `checkin` | Ground check-in records matching passenger passport, baggage weight, and boarding pass. |

---

## 6. API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Customer registration
- `POST /auth/login` - Customer JWT login
- `POST /auth/staff/login` - Staff & Admin JWT login
- `GET /auth/me` - Authenticated profile inspection

### Flights (`/flights`)
- `GET /flights?from=BOM&to=DEL&date=YYYY-MM-DD` - Search flights with real-time seat counts
- `GET /flights/airports` - Public airport listing for city search dropdowns
- `GET /flights/status/lookup?flight_no=AI-101` - Public flight status and pre-flight safety check
- `GET /flights/{id}` - Comprehensive flight specifications
- `GET /flights/{id}/seats` - Physical cabin layout and seat availability

### Bookings (`/bookings`)
- `POST /bookings` - Reserve a flight seat (concurrency-safe `book_seat()`)
- `GET /bookings/me` - List customer's own booking history
- `GET /bookings/{pnr}` - View booking details by 6-character PNR
- `POST /bookings/{id}/cancel` - Cancel booking and free seat (`cancel_booking()`)

### Payments (`/payments`)
- `POST /payments` - Record payment (triggers booking confirmation)
- `GET /bookings/{id}/payments` - Retrieve payment records for a booking

### Check-in (`/checkin`)
- `POST /checkin` - Ground staff check-in (validates booking, passport match, baggage, issues boarding pass)
- `GET /checkin/{pnr}` - Retrieve check-in record and digital boarding pass

### Flight Conditions & Status (`/flights/{id}`)
- `POST /flights/{id}/conditions` - Pilot/Admin technical inspection log
- `GET /flights/{id}/conditions` - Inspection log history
- `GET /flights/{id}/conditions/latest` - Latest condition inspection
- `PATCH /flights/{id}/status` - Operational status transition (SCHEDULED, BOARDING, DEPARTED, ARRIVED, DELAYED, CANCELLED)

### Admin (`/admin`)
- CRUD operations for `airports`, `aircraft`, `flights`, `employees`
- Flight crew assignments (`/admin/flights/{id}/crew`)

---

## 7. Setup & Run Instructions

### Prerequisites
1. **Python 3.11+ / 3.13** installed.
2. **PostgreSQL** running locally and accessible via pgAdmin.

### Step-by-Step Setup
1. **Clone the Repository**:
   ```powershell
   git clone https://github.com/Narayan-Singri/Airlines_Management_System.git
   cd Airlines_Management_System
   ```
2. **Activate Virtual Environment**:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
3. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your local PostgreSQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=airline_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   ```
5. **Database Initialization**:
   Run the seed script to apply schema and configure sample user credentials:
   ```powershell
   python db/seed.py
   ```
6. **Start the API Server**:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```
7. **Start the Frontend Web Application**:
   ```powershell
   python -m http.server 3000 --directory frontend
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

8. **Interactive API Documentation**:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
