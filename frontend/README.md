# Airlines Management System - Frontend

A modern, responsive, and accessible client interface for the Airline Management System. Built with semantic HTML5, Vanilla CSS (design tokens), and modular ES JavaScript.

---

## Architecture Overview

- **Zero Build Step**: Native ES Modules and Vanilla CSS. Runs immediately in any modern browser.
- **Unified API Client (`js/api.js`)**: All communication with the FastAPI backend routes through a single client that injects JWT Bearer tokens, normalizes errors, and automatically handles token expiration.
- **Centralized Configuration (`js/config.js`)**: Switch the backend URL (`API_BASE_URL`) in one place for local dev or production deployment.
- **Role-Based Access Control**: Safe token storage in `sessionStorage` with role guards preventing customer access to staff pages and vice-versa.

---

## Directory Structure

```
frontend/
├── index.html             # Landing page with hero animation & 3-tab search card
├── search.html            # Flight results with filters, sorting, and live seat count
├── seats.html             # Physical cabin seat map (Business & Economy tiers)
├── checkout.html          # Booking summary & payment gateway (UPI, Card, Netbanking, Wallet)
├── confirmation.html      # Confirmation with PNR & printable e-ticket
├── login.html             # Customer login
├── register.html          # Customer registration
├── my-bookings.html       # Customer booking history & cancellation
├── manage.html            # PNR lookup & boarding pass viewing
├── status.html            # Public flight status & safety inspection summary
├── staff/
│   ├── login.html         # Staff & flight operations authentication
│   ├── checkin.html       # Ground staff check-in desk & boarding pass issuance
│   ├── conditions.html    # Pilot/Admin technical inspection logger & history
│   └── flight-status.html # Operational status controller (SCHEDULED, BOARDING, etc.)
├── css/
│   ├── tokens.css         # Color palette, spacing, typography, radii, shadows
│   ├── base.css           # Global resets, typography defaults, utilities
│   ├── components.css     # Buttons, cards, modals, tabs, badges, toasts, stepper
│   └── pages/             # Page-specific styling
├── js/
│   ├── config.js          # API base configuration
│   ├── api.js             # Unified HTTP fetch client with auth & error mapping
│   ├── auth.js            # JWT session manager & role-based route guards
│   ├── ui.js              # Toasts, modals, shared navbar & footer renderer
│   └── pages/             # Page-specific controllers
└── ASSETS.md              # Open source license tracking
```

---

## Running Locally

1. **Start the FastAPI Backend**:
   ```powershell
   uvicorn app.main:app --reload --port 8000
   ```

2. **Serve the Frontend**:
   You can serve the `frontend/` folder using Python's built-in HTTP server or any static web server:
   ```powershell
   cd frontend
   python -m http.server 3000
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Sample Credentials for Testing

- **Customer**: `test@mail.test` / `Customer@123`
- **Pilot**: `arjun@air.test` / `Pilot@123`
- **Cabin Crew**: `meera@air.test` / `Cabin@123`
- **Ground Staff**: `ravi@air.test` / `Staff@123`
- **Admin**: `admin@air.test` / `Admin@123`
