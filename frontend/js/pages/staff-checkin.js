/**
 * Ground Staff Check-in Desk Controller
 */
import { api } from '../api.js';
import { requireStaffAuth, getUser, logout } from '../auth.js';
import { formatDate, formatTime, escapeHTML, showToast } from '../ui.js';

let currentBooking = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requireStaffAuth(['GROUND_STAFF', 'ADMIN'], '/staff/login.html')) return;

  const user = getUser();
  const roleBadge = document.getElementById('staff-role-badge');
  if (roleBadge) roleBadge.textContent = user.emp_type || 'STAFF';

  const logoutBtn = document.getElementById('btn-staff-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('/staff/login.html'));

  setupDeskLookup();
});

function setupDeskLookup() {
  const form = document.getElementById('desk-lookup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pnr = document.getElementById('desk-pnr-input').value.trim().toUpperCase();
    if (!pnr || pnr.length !== 6) {
      showToast('Invalid PNR', 'Please enter a valid 6-character PNR.', 'warning');
      return;
    }
    await loadBookingDetails(pnr);
  });
}

async function loadBookingDetails(pnr) {
  const workspace = document.getElementById('checkin-workspace');
  workspace.innerHTML = `
    <div class="skeleton" style="height: 280px; border-radius: var(--radius-xl); background: #1E293B;"></div>
  `;

  try {
    currentBooking = await api.get(`/bookings/${pnr}`);

    if (currentBooking.status === 'CHECKED_IN') {
      let bp = null;
      try { bp = await api.get(`/checkin/${pnr}`); } catch (e) {}
      renderAlreadyCheckedIn(currentBooking, bp);
    } else if (currentBooking.status === 'CANCELLED') {
      renderCancelled(currentBooking);
    } else {
      renderVerificationForm(currentBooking);
    }

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    workspace.innerHTML = `
      <div class="staff-card text-center" style="padding: 32px;">
        <i data-lucide="alert-circle" style="color: var(--color-danger); width: 32px; height: 32px; margin-bottom: 8px;"></i>
        <h3>Booking Not Found</h3>
        <p class="text-xs text-muted" style="color: #94A3B8;">${escapeHTML(err.message)}</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Render Side-by-Side Verification Checklist & Check-in Action
 */
function renderVerificationForm(b) {
  const workspace = document.getElementById('checkin-workspace');

  workspace.innerHTML = `
    <div class="staff-card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 14px; margin-bottom: 20px;">
        <div>
          <span class="badge badge-confirmed"><span class="badge-dot"></span> CONFIRMED RESERVATION</span>
          <span class="text-xs text-muted ml-2">PNR: <strong style="color: #38BDF8;">${escapeHTML(b.pnr)}</strong></span>
        </div>
        <div class="text-xs font-mono" style="color: #94A3B8;">Flight ${escapeHTML(b.flight_no)}</div>
      </div>

      <!-- Side by Side Data Comparison -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
        <!-- Left: Reservation on System -->
        <div style="background: #0F172A; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
          <div class="text-xs font-bold text-muted mb-2" style="color: #38BDF8;">SYSTEM RESERVATION DATA</div>
          <div style="margin-bottom: 8px;">
            <div class="text-xs text-muted">Passenger Name</div>
            <div class="font-bold text-sm">${escapeHTML(b.passenger_name)}</div>
          </div>
          <div style="margin-bottom: 8px;">
            <div class="text-xs text-muted">Flight Route</div>
            <div class="font-semibold text-xs">${escapeHTML(b.origin_city)} (${escapeHTML(b.origin)}) → ${escapeHTML(b.destination_city)} (${escapeHTML(b.destination)})</div>
          </div>
          <div>
            <div class="text-xs text-muted">Assigned Seat</div>
            <div class="font-bold text-base" style="color: var(--color-primary);">${escapeHTML(b.seat_no)}</div>
          </div>
        </div>

        <!-- Right: Ground Verification Controls -->
        <div style="background: #0F172A; padding: 16px; border-radius: 8px; border: 1px solid #334155;">
          <div class="text-xs font-bold text-muted mb-2" style="color: var(--color-accent);">DOCUMENT & BAGGAGE SCREENING</div>
          <div style="margin-bottom: 12px;">
            <label class="text-xs text-muted" for="verify-passport">Passenger Passport / ID</label>
            <input type="text" id="verify-passport" class="form-control staff-input" value="${escapeHTML(b.passport_no || '')}" placeholder="Enter Passport No" style="margin-top: 4px; text-transform: uppercase;" required>
          </div>
          <div>
            <label class="text-xs text-muted" for="verify-baggage">Checked Baggage Weight (kg)</label>
            <input type="number" id="verify-baggage" class="form-control staff-input" value="15.0" step="0.5" min="0" max="60" style="margin-top: 4px;" required>
          </div>
        </div>
      </div>

      <!-- Verification Checkbox & Action Button -->
      <div style="border-top: 1px solid #334155; padding-top: 16px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 16px; cursor: pointer;">
          <input type="checkbox" id="check-passport-match" style="width: 18px; height: 18px; accent-color: var(--color-accent);" checked>
          <span>I verify that the passenger identity matches the government passport on record.</span>
        </label>

        <button type="button" id="btn-issue-bp" class="btn btn-accent btn-lg btn-block">
          <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> Issue Boarding Pass
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-issue-bp').addEventListener('click', async () => {
    const passportInput = document.getElementById('verify-passport').value.trim();
    const baggageWeight = parseFloat(document.getElementById('verify-baggage').value) || 0;
    const matchCheck = document.getElementById('check-passport-match').checked;

    if (!passportInput) {
      showToast('Passport Required', 'Please enter passport number for international/ground clearance.', 'warning');
      return;
    }
    if (!matchCheck) {
      showToast('Verification Required', 'Please confirm passenger passport verification.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-issue-bp');
    btn.disabled = true;
    btn.innerHTML = `<span>Issuing Boarding Pass...</span>`;

    try {
      const bpResp = await api.post('/checkin', {
        pnr: b.pnr,
        passport_no: passportInput,
        baggage_kg: baggageWeight,
      });

      showToast('Checked In', `Boarding pass ${bpResp.boarding_pass_no} issued!`, 'success');
      await loadBookingDetails(b.pnr);

    } catch (err) {
      showToast('Check-in Failed', err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> Issue Boarding Pass`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

/**
 * Render Already Checked In State
 */
function renderAlreadyCheckedIn(b, bp) {
  const workspace = document.getElementById('checkin-workspace');
  workspace.innerHTML = `
    <div class="staff-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <span class="badge badge-arrived"><span class="badge-dot"></span> PASSENGER CHECKED IN</span>
        <span class="text-xs text-muted">Pass No: <strong style="color: white;">${escapeHTML(bp?.boarding_pass_no || 'BP-' + b.pnr)}</strong></span>
      </div>

      <div style="background: #0F172A; border-radius: 8px; padding: 20px; border: 1px solid #334155; margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
          <div>
            <div class="text-xs text-muted">Passenger</div>
            <div class="font-bold text-sm">${escapeHTML(b.passenger_name)}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Seat</div>
            <div class="font-bold text-sm" style="color: #38BDF8;">${escapeHTML(b.seat_no)}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Gate</div>
            <div class="font-bold text-sm" style="color: var(--color-accent);">${escapeHTML(bp?.gate || 'GATE 12A')}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Baggage Recorded</div>
            <div class="font-bold text-sm">${bp?.baggage_kg ? bp.baggage_kg + ' kg' : 'Standard'}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 12px;">
        <a href="/manage.html?pnr=${encodeURIComponent(b.pnr)}" target="_blank" class="btn btn-outline btn-sm" style="color: #38BDF8; border-color: #334155;">
          <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Open Printable Boarding Pass
        </a>
      </div>
    </div>
  `;
}

function renderCancelled(b) {
  const workspace = document.getElementById('checkin-workspace');
  workspace.innerHTML = `
    <div class="staff-card text-center" style="padding: 32px;">
      <span class="badge badge-cancelled" style="margin-bottom: 12px;"><span class="badge-dot"></span> BOOKING CANCELLED</span>
      <h3>Cannot Check In Cancelled Ticket</h3>
      <p class="text-xs text-muted" style="color: #94A3B8;">This reservation was cancelled by the customer or airline operations.</p>
    </div>
  `;
}
