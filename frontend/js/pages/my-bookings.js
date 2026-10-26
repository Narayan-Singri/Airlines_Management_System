/**
 * My Bookings Page Controller
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

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('bookings');
  renderFooter();

  if (!requireCustomerAuth('/login.html')) return;

  setupModal();
  await loadMyBookings();
});

async function loadMyBookings() {
  const container = document.getElementById('bookings-container');
  container.innerHTML = `
    <div class="skeleton" style="height: 180px; margin-bottom: 16px;"></div>
    <div class="skeleton" style="height: 180px;"></div>
  `;

  try {
    myBookings = await api.get('/bookings/me');

    if (!Array.isArray(myBookings) || myBookings.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <div class="empty-state-icon">
            <i data-lucide="ticket" style="width: 32px; height: 32px;"></i>
          </div>
          <h3>No Bookings Yet</h3>
          <p class="text-sm text-muted">You haven't made any flight reservations yet.</p>
          <a href="/search.html" class="btn btn-primary btn-sm mt-3">Book a Flight Now</a>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = myBookings.map(b => {
      const isCancelled = b.status === 'CANCELLED';
      const isCheckedIn = b.status === 'CHECKED_IN';
      const statusClass = `badge-${(b.status || 'CONFIRMED').toLowerCase()}`;

      return `
        <div class="booking-item-card">
          <!-- Card Header -->
          <div class="booking-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="badge ${statusClass}">
                <span class="badge-dot"></span> ${escapeHTML(b.status)}
              </span>
              <span class="text-xs font-semibold text-muted">Flight ${escapeHTML(b.flight_no)}</span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-xs text-muted">PNR:</span>
              <strong class="font-mono text-base" style="color: var(--color-primary); letter-spacing: 1px;">${escapeHTML(b.pnr)}</strong>
              <button type="button" class="btn btn-outline btn-xs btn-copy-pnr" data-pnr="${escapeHTML(b.pnr)}" title="Copy PNR">
                <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </div>

          <!-- Route & Times Grid -->
          <div class="booking-route-grid">
            <div>
              <div class="font-extrabold text-lg" style="color: var(--color-navy);">
                ${escapeHTML(b.origin_city)} (${escapeHTML(b.origin)}) → ${escapeHTML(b.destination_city)} (${escapeHTML(b.destination)})
              </div>
              <div class="text-xs text-muted mt-1">
                Departure: <strong>${formatDate(b.departure_time)}</strong> at ${formatTime(b.departure_time)}
              </div>
            </div>

            <div>
              <div class="text-xs text-muted">Seat Assigned</div>
              <div class="font-bold text-base" style="color: var(--color-primary);">${escapeHTML(b.seat_no)}</div>
            </div>

            <div style="text-align: right;">
              <div class="text-xs text-muted">Total Paid</div>
              <div class="font-extrabold text-lg" style="color: var(--color-navy);">${formatCurrency(b.amount)}</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="booking-actions">
            <a href="/confirmation.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-outline btn-sm">
              <i data-lucide="file-text" style="width: 14px; height: 14px;"></i> View E-Ticket
            </a>

            ${!isCancelled && !isCheckedIn ? `
              <a href="/manage.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-primary btn-sm">
                <i data-lucide="check-square" style="width: 14px; height: 14px;"></i> Check-in
              </a>
            ` : ''}

            ${isCheckedIn ? `
              <a href="/manage.html?pnr=${encodeURIComponent(b.pnr)}" class="btn btn-primary btn-sm">
                <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Boarding Pass
              </a>
            ` : ''}

            ${!isCancelled ? `
              <button type="button" class="btn btn-danger btn-sm btn-open-cancel" data-id="${b.booking_id}" data-pnr="${escapeHTML(b.pnr)}" data-seat="${escapeHTML(b.seat_no)}">
                <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i> Cancel
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach event handlers
    document.querySelectorAll('.btn-copy-pnr').forEach(btn => {
      btn.addEventListener('click', () => {
        const pnr = btn.getAttribute('data-pnr');
        navigator.clipboard.writeText(pnr).then(() => {
          showToast('Copied', `PNR ${pnr} copied to clipboard`, 'success');
        });
      });
    });

    document.querySelectorAll('.btn-open-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const pnr = btn.getAttribute('data-pnr');
        const seat = btn.getAttribute('data-seat');
        openCancelModal(id, pnr, seat);
      });
    });

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <p class="text-danger">Unable to load bookings: ${escapeHTML(err.message)}</p>
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
