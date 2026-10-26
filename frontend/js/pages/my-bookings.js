/**
 * My Bookings Page Controller
 * Renders Animated Ticket Cards with Blue Design System & Micro-Interactions
 */
import { api } from '../api.js';
import { requireCustomerAuth } from '../auth.js';
import {
  renderHeader,
  renderFooter,
  formatCurrency,
  formatDate,
  formatTime,
  escapeHTML,
  showToast
} from '../ui.js';

let myBookings = [];
let pendingCancelBookingId = null;
let cardObserver = null;

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('bookings');
  renderFooter();

  if (!requireCustomerAuth('/login.html')) return;

  setupModal();
  setupTabVisibilityListener();
  await loadMyBookings();
});

/**
 * Handle Tab Hidden / Visible for Performance & Power Saving
 */
function setupTabVisibilityListener() {
  document.addEventListener('visibilitychange', () => {
    const isHidden = document.hidden;
    document.querySelectorAll('.card-ticket').forEach(card => {
      card.classList.toggle('is-paused', isHidden);
    });
  });
}

/**
 * IntersectionObserver to pause infinite animations when cards are off-screen
 */
function setupCardObserver() {
  if (cardObserver) {
    cardObserver.disconnect();
  }

  cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.card-ticket').forEach(card => {
    cardObserver.observe(card);
  });
}

async function loadMyBookings() {
  const container = document.getElementById('bookings-container');
  container.innerHTML = `
    <div class="skeleton-ticket-card">
      <div class="skeleton-ticket-stub"></div>
      <div class="skeleton-ticket-content">
        <div class="skeleton" style="height: 28px; width: 60%;"></div>
        <div class="skeleton" style="height: 40px; width: 90%;"></div>
        <div class="skeleton" style="height: 32px; width: 40%;"></div>
      </div>
    </div>
    <div class="skeleton-ticket-card">
      <div class="skeleton-ticket-stub"></div>
      <div class="skeleton-ticket-content">
        <div class="skeleton" style="height: 28px; width: 60%;"></div>
        <div class="skeleton" style="height: 40px; width: 90%;"></div>
        <div class="skeleton" style="height: 32px; width: 40%;"></div>
      </div>
    </div>
  `;

  try {
    myBookings = await api.get('/bookings/me');

    if (!Array.isArray(myBookings) || myBookings.length === 0) {
      container.innerHTML = `
        <div class="card empty-state" style="max-width: 600px; margin: 0 auto;">
          <div class="empty-state-icon">
            <i data-lucide="ticket" style="width: 36px; height: 36px; color: var(--color-primary);"></i>
          </div>
          <h3 style="margin-top: 12px;">No Bookings Yet</h3>
          <p class="text-sm text-muted">You haven't made any flight reservations yet. Ready to take flight?</p>
          <a href="/search.html" class="btn btn-primary btn-sm mt-4">
            <i data-lucide="search" style="width: 14px; height: 14px;"></i> Search Flights
          </a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = myBookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const statusClass = `badge-${(b.status || 'CONFIRMED').toLowerCase()}`;
      const seatClass = (b.seat_class || 'ECONOMY').toUpperCase();
      const originCode = escapeHTML(b.origin_code || b.origin || 'BOM');
      const destCode = escapeHTML(b.destination_code || b.destination || 'DEL');
      const originCity = escapeHTML(b.origin_city || 'Origin');
      const destCity = escapeHTML(b.destination_city || 'Destination');
      const flightNo = escapeHTML(b.flight_no || 'FL-000');
      const pnr = escapeHTML(b.pnr || 'PNR000');
      const seatNo = escapeHTML(b.seat_no || 'NA');

      return `
        <article class="card-ticket ${isCancelled ? 'ticket-cancelled' : ''}" tabindex="0" aria-label="Flight ${flightNo} ticket for ${originCode} to ${destCode}, PNR ${pnr}">
          <!-- Left Stub / Flight Identity -->
          <div class="container-icons" aria-hidden="true">
            <i data-lucide="plane" class="icon-plane"></i>
            <span class="stub-flight-no">${flightNo}</span>
            <span class="stub-class">${seatClass === 'BUSINESS' ? 'BIZ' : 'ECO'}</span>
          </div>

          <!-- Perforated Notch & Line Separator -->
          <div class="ticket-separator" aria-hidden="true">
            <span class="span-lines"></span>
          </div>

          <!-- Main Ticket Content -->
          <div class="content-ticket">
            <div class="content-data">

              <!-- Destination Header Block -->
              <div class="ticket-destination">
                <!-- Origin -->
                <div class="ticket-dest-point">
                  <span class="city">${originCity}</span>
                  <span class="iata">${originCode}</span>
                  <span class="time">
                    <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                    ${formatTime(b.departure_time)}
                  </span>
                </div>

                <!-- Flight Route Trajectory Indicator -->
                <div class="ticket-flight-path">
                  <span class="ticket-flight-duration">${escapeHTML(b.flight_no)} • Direct</span>
                  <div class="ticket-path-line"></div>
                  <span class="text-xs text-muted" style="font-size: 10px;">${formatDate(b.departure_time)}</span>
                </div>

                <!-- Destination -->
                <div class="ticket-dest-point" style="text-align: right;">
                  <span class="city">${destCity}</span>
                  <span class="iata">${destCode}</span>
                  <span class="time" style="justify-content: flex-end;">
                    <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
                    ${formatTime(b.arrival_time)}
                  </span>
                </div>
              </div>

              <!-- Ticket Info Grid -->
              <div class="ticket-info-grid">
                <!-- PNR -->
                <div class="ticket-data-item">
                  <span class="title">Booking Ref (PNR)</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <span class="subtitle font-mono" style="color: var(--color-primary);">${pnr}</span>
                    <button type="button" class="btn-ticket-copy btn-copy-pnr" data-pnr="${pnr}" title="Copy PNR to clipboard" aria-label="Copy PNR">
                      <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
                    </button>
                  </div>
                </div>

                <!-- Seat -->
                <div class="ticket-data-item">
                  <span class="title">Seat & Cabin</span>
                  <span class="subtitle" style="color: var(--color-navy);">${seatNo} (${seatClass === 'BUSINESS' ? 'Business' : 'Economy'})</span>
                </div>

                <!-- Date -->
                <div class="ticket-data-item">
                  <span class="title">Departure Date</span>
                  <span class="subtitle">${formatDate(b.departure_time)}</span>
                </div>

                <!-- Total Amount -->
                <div class="ticket-data-item">
                  <span class="title">Fare Paid</span>
                  <span class="subtitle font-bold" style="color: var(--color-navy);">${formatCurrency(b.amount)}</span>
                </div>
              </div>

              <!-- Bottom Actions Bar -->
              <div class="ticket-actions-bar">
                <div class="ticket-badges-group">
                  <span class="badge ${statusClass}">
                    <span class="badge-dot"></span> ${escapeHTML(b.status || 'CONFIRMED')}
                  </span>
                  ${isCheckedIn ? '<span class="badge badge-info" style="font-size: 11px;">Boarding Ready</span>' : ''}
                </div>

                <div class="ticket-buttons-group">
                  <a href="/confirmation.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-outline btn-xs" title="View official printable e-ticket">
                    <i data-lucide="file-text" style="width: 13px; height: 13px;"></i> View Ticket
                  </a>

                  ${!isCancelled && !isCheckedIn ? `
                    <a href="/manage.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-primary btn-xs">
                      <i data-lucide="check-square" style="width: 13px; height: 13px;"></i> Check-in
                    </a>
                  ` : ''}

                  ${isCheckedIn ? `
                    <a href="/manage.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-primary btn-xs">
                      <i data-lucide="printer" style="width: 13px; height: 13px;"></i> Boarding Pass
                    </a>
                  ` : ''}

                  ${!isCancelled ? `
                    <button type="button" class="btn btn-danger btn-xs btn-open-cancel" data-id="${b.booking_id}" data-pnr="${pnr}" data-seat="${seatNo}" title="Cancel booking">
                      <i data-lucide="x-circle" style="width: 13px; height: 13px;"></i> Cancel
                    </button>
                  ` : ''}
                </div>
              </div>

            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach copy PNR handlers
    document.querySelectorAll('.btn-copy-pnr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pnr = btn.getAttribute('data-pnr');
        navigator.clipboard.writeText(pnr).then(() => {
          showToast('Copied', `PNR ${pnr} copied to clipboard`, 'success');
        });
      });
    });

    // Attach cancel modal trigger handlers
    document.querySelectorAll('.btn-open-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const pnr = btn.getAttribute('data-pnr');
        const seat = btn.getAttribute('data-seat');
        openCancelModal(id, pnr, seat);
      });
    });

    if (window.lucide) window.lucide.createIcons();

    // Initialize IntersectionObserver to pause off-screen animations
    setupCardObserver();

  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state" style="max-width: 600px; margin: 0 auto;">
        <p class="text-danger font-semibold">Unable to load bookings: ${escapeHTML(err.message)}</p>
        <button type="button" class="btn btn-outline btn-sm mt-3" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

/**
 * Cancel Confirmation Modal Handlers
 */
function setupModal() {
  const modal = document.getElementById('cancel-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-btn-cancel');
  const confirmBtn = document.getElementById('modal-btn-confirm');

  const closeModal = () => {
    modal.classList.remove('open');
    pendingCancelBookingId = null;
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  confirmBtn.addEventListener('click', async () => {
    if (!pendingCancelBookingId) return;

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span>Cancelling...</span>`;

    try {
      await api.post(`/bookings/${pendingCancelBookingId}/cancel`);
      showToast('Booking Cancelled', 'Your reservation was cancelled and the seat has been released.', 'success');
      closeModal();
      await loadMyBookings();
    } catch (err) {
      showToast('Cancellation Failed', err.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<span>Yes, Cancel Reservation</span>`;
    }
  });
}

function openCancelModal(bookingId, pnr, seatNo) {
  pendingCancelBookingId = bookingId;
  document.getElementById('modal-pnr-text').textContent = pnr;
  document.getElementById('modal-seat-text').textContent = seatNo;
  document.getElementById('cancel-modal').classList.add('open');
}
