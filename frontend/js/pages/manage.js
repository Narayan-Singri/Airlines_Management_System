/**
 * Manage Booking & Customer Check-in Controller
 */
import { api } from '../api.js';
import {
  renderHeader,
  renderFooter,
  formatCurrency,
  formatDate,
  formatTime,
  escapeHTML,
  showToast
} from '../ui.js';

const urlParams = new URLSearchParams(window.location.search);
const pnrParam = urlParams.get('pnr');

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('manage');
  renderFooter();

  setupLookupForm();

  if (pnrParam) {
    document.getElementById('lookup-pnr').value = pnrParam.toUpperCase();
    lookupBooking(pnrParam.toUpperCase());
  }
});

function setupLookupForm() {
  const form = document.getElementById('pnr-lookup-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pnr = document.getElementById('lookup-pnr').value.trim().toUpperCase();
    if (!pnr || pnr.length !== 6) {
      showToast('Invalid PNR', 'Please enter a valid 6-character PNR reference.', 'warning');
      return;
    }
    window.history.pushState({}, '', `?pnr=${encodeURIComponent(pnr)}`);
    lookupBooking(pnr);
  });
}

async function lookupBooking(pnr) {
  const container = document.getElementById('booking-result-container');
  container.innerHTML = `
    <div class="skeleton" style="height: 280px; border-radius: var(--radius-xl);"></div>
  `;

  try {
    const booking = await api.get(`/bookings/${pnr}`);

    if (booking.status === 'CHECKED_IN') {
      // Fetch Boarding Pass details
      let boardingPass = null;
      try {
        boardingPass = await api.get(`/checkin/${pnr}`);
      } catch (e) {
        boardingPass = null;
      }
      renderBoardingPass(booking, boardingPass);
    } else {
      renderConfirmedSummary(booking);
    }

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-icon" style="background: var(--color-danger-bg); color: var(--color-danger);">
          <i data-lucide="alert-circle" style="width: 32px; height: 32px;"></i>
        </div>
        <h3>Booking Not Found</h3>
        <p class="text-sm text-muted">${escapeHTML(err.message)}</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Render Official Digital Boarding Pass
 */
function renderBoardingPass(booking, bp) {
  const container = document.getElementById('booking-result-container');

  // Compute boarding time (45 mins before departure)
  const depTime = new Date(booking.departure_time);
  const boardingTime = new Date(depTime.getTime() - 45 * 60000);

  const gate = bp?.gate || 'GATE 12A';
  const baggageKg = bp?.baggage_kg ? `${bp.baggage_kg} kg` : 'Standard (15 kg)';
  const bpNumber = bp?.boarding_pass_no || `BP-${booking.pnr}`;

  container.innerHTML = `
    <div class="boarding-pass-card" id="printable-boarding-pass">
      <div class="boarding-pass-header">
        <div class="ticket-brand-logo">
          <span class="footer-logo-badge" style="padding: 4px 10px; margin-bottom: 0;">
            <picture>
              <source srcset="/assets/logo.webp" type="image/webp">
              <img src="/assets/logo-clean.png" alt="SoraKaze Air" width="84" height="28" style="height: 28px; width: auto;">
            </picture>
          </span>
        </div>
        <div style="text-align: right;">
          <div class="text-xs" style="color: #E0EDFF; text-transform: uppercase;">BOARDING PASS</div>
          <span class="badge" style="background: white; color: var(--color-primary); font-weight: 800;">
            ${escapeHTML(bpNumber)}
          </span>
        </div>
      </div>

      <div class="boarding-pass-body">
        <div class="boarding-grid">
          <div>
            <div class="ticket-field-label">Passenger Name</div>
            <div class="ticket-field-value">${escapeHTML(booking.passenger_name)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Flight</div>
            <div class="ticket-field-value">${escapeHTML(booking.flight_no)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Seat</div>
            <div class="ticket-field-value" style="color: var(--color-primary); font-size: 1.25rem;">${escapeHTML(booking.seat_no)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Gate</div>
            <div class="ticket-field-value" style="color: var(--color-accent); font-size: 1.25rem;">${escapeHTML(gate)}</div>
          </div>
        </div>

        <div class="boarding-grid">
          <div>
            <div class="ticket-field-label">Boarding Time</div>
            <div class="ticket-field-value font-mono" style="color: var(--color-navy);">${formatTime(boardingTime)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Departure</div>
            <div class="ticket-field-value font-mono">${formatTime(booking.departure_time)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Date</div>
            <div class="ticket-field-value">${formatDate(booking.departure_time)}</div>
          </div>
          <div>
            <div class="ticket-field-label">Baggage Recorded</div>
            <div class="ticket-field-value">${escapeHTML(baggageKg)}</div>
          </div>
        </div>

        <!-- Route visualizer -->
        <div style="background: var(--color-bg-page); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-6); display: flex; align-items: center; justify-content: space-between; margin: var(--space-4) 0;">
          <div>
            <div class="text-xs font-bold text-muted">FROM</div>
            <div class="font-extrabold text-xl" style="color: var(--color-navy);">${escapeHTML(booking.origin_city)} (${escapeHTML(booking.origin)})</div>
          </div>
          <i data-lucide="plane" style="color: var(--color-primary); width: 22px; height: 22px;"></i>
          <div style="text-align: right;">
            <div class="text-xs font-bold text-muted">TO</div>
            <div class="font-extrabold text-xl" style="color: var(--color-navy);">${escapeHTML(booking.destination_city)} (${escapeHTML(booking.destination)})</div>
          </div>
        </div>

        <div class="boarding-notch-divider"></div>

        <!-- Footer Barcode -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <div class="text-xs text-muted">Electronic Boarding Token</div>
            <span class="badge badge-confirmed"><span class="badge-dot"></span> Checked In & Cleared</span>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="height: 36px; display: flex; gap: 3px; align-items: center;" aria-hidden="true">
              <span style="width: 3px; height: 100%; background: #0F172A;"></span>
              <span style="width: 1px; height: 100%; background: #0F172A;"></span>
              <span style="width: 4px; height: 100%; background: #0F172A;"></span>
              <span style="width: 2px; height: 100%; background: #0F172A;"></span>
              <span style="width: 6px; height: 100%; background: #0F172A;"></span>
              <span style="width: 2px; height: 100%; background: #0F172A;"></span>
              <span style="width: 5px; height: 100%; background: #0F172A;"></span>
            </div>
            <span class="text-xs font-mono text-muted" style="letter-spacing: 2px;">${escapeHTML(booking.pnr)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Button (No Print) -->
    <div class="text-center mt-6 no-print">
      <button type="button" class="btn btn-primary btn-lg" onclick="window.print()">
        <i data-lucide="printer" style="width: 18px; height: 18px;"></i> Print Boarding Pass
      </button>
    </div>
  `;
}

/**
 * Render Confirmed (Not Checked In) Booking Summary
 */
function renderConfirmedSummary(booking) {
  const container = document.getElementById('booking-result-container');
  const isCancelled = booking.status === 'CANCELLED';

  container.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); margin-bottom: var(--space-4);">
        <div>
          <span class="badge ${isCancelled ? 'badge-cancelled' : 'badge-confirmed'}">
            <span class="badge-dot"></span> ${escapeHTML(booking.status)}
          </span>
          <span class="text-sm font-bold text-muted ml-2">Flight ${escapeHTML(booking.flight_no)}</span>
        </div>
        <div class="font-mono text-lg font-extrabold" style="color: var(--color-primary); letter-spacing: 1px;">
          PNR: ${escapeHTML(booking.pnr)}
        </div>
      </div>

      ${!isCancelled ? `
        <div style="background-color: var(--color-primary-light); border-left: 4px solid var(--color-primary); padding: var(--space-4); border-radius: var(--radius-sm); margin-bottom: var(--space-6);">
          <div class="font-bold text-sm" style="color: var(--color-navy); margin-bottom: 2px;">
            Booking Confirmed &amp; Seat Secured
          </div>
          <p class="text-xs text-secondary" style="margin: 0;">
            Ground check-in desk at the departure airport will verify your passport and baggage weight to issue your physical or digital boarding pass.
          </p>
        </div>
      ` : `
        <div style="background-color: var(--color-danger-bg); border-left: 4px solid var(--color-danger); padding: var(--space-4); border-radius: var(--radius-sm); margin-bottom: var(--space-6);">
          <div class="font-bold text-sm" style="color: var(--color-danger); margin-bottom: 2px;">
            Reservation Cancelled
          </div>
          <p class="text-xs text-danger-text" style="margin: 0;">
            This booking was cancelled and the seat was released.
          </p>
        </div>
      `}

      <div class="ticket-grid">
        <div>
          <div class="ticket-field-label">Passenger</div>
          <div class="ticket-field-value">${escapeHTML(booking.passenger_name)}</div>
        </div>
        <div>
          <div class="ticket-field-label">Passport No</div>
          <div class="ticket-field-value">${escapeHTML(booking.passport_no || 'On File')}</div>
        </div>
        <div>
          <div class="ticket-field-label">Assigned Seat</div>
          <div class="ticket-field-value" style="color: var(--color-primary);">${escapeHTML(booking.seat_no)}</div>
        </div>
        <div>
          <div class="ticket-field-label">Total Amount</div>
          <div class="ticket-field-value">${formatCurrency(booking.amount)}</div>
        </div>
      </div>

      <div style="background: var(--color-bg-page); border-radius: var(--radius-lg); padding: var(--space-4) var(--space-6); display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-6);">
        <div>
          <div class="text-xs font-bold text-muted">ORIGIN</div>
          <div class="font-extrabold text-lg" style="color: var(--color-navy);">${escapeHTML(booking.origin_city)} (${escapeHTML(booking.origin)})</div>
          <div class="text-xs text-muted mt-1">Dep: ${formatDate(booking.departure_time)} at ${formatTime(booking.departure_time)}</div>
        </div>
        <i data-lucide="arrow-right" style="color: var(--color-primary); width: 22px; height: 22px;"></i>
        <div style="text-align: right;">
          <div class="text-xs font-bold text-muted">DESTINATION</div>
          <div class="font-extrabold text-lg" style="color: var(--color-navy);">${escapeHTML(booking.destination_city)} (${escapeHTML(booking.destination)})</div>
          <div class="text-xs text-muted mt-1">Arr: ${formatDate(booking.arrival_time)} at ${formatTime(booking.arrival_time)}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-6);">
        <a href="/confirmation.html?pnr=${encodeURIComponent(booking.pnr)}" class="btn btn-outline btn-sm">
          <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> View Full E-Ticket
        </a>
      </div>
    </div>
  `;
}
