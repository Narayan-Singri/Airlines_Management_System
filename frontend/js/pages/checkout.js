/**
 * Checkout & Payment Page Controller
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { getUser, requireCustomerAuth } from '../auth.js';
import {
  renderHeader,
  renderFooter,
  formatCurrency,
  formatDate,
  formatTime,
  escapeHTML,
  showToast
} from '../ui.js';

let pendingBooking = null;
let selectedPaymentMethod = 'UPI';

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('flights');
  renderFooter();

  // Guard: Customer authentication required
  if (!requireCustomerAuth('/login.html')) return;

  loadPendingBooking();
  setupPaymentTabs();
  setupPayButton();
});

/**
 * Load Pending Booking from Session Storage
 */
function loadPendingBooking() {
  const raw = sessionStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);
  if (!raw) {
    showToast('No Active Booking', 'Please select a flight and seat first.', 'warning');
    setTimeout(() => window.location.href = '/search.html', 1500);
    return;
  }

  try {
    pendingBooking = JSON.parse(raw);
  } catch (e) {
    window.location.href = '/search.html';
    return;
  }

  // Pre-fill Passenger details from authenticated profile
  const user = getUser();
  const nameInput = document.getElementById('passenger-name');
  const emailInput = document.getElementById('passenger-email');
  const phoneInput = document.getElementById('passenger-phone');
  const passportInput = document.getElementById('passenger-passport');

  if (nameInput) nameInput.value = user.full_name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput && user.phone) phoneInput.value = user.phone;
  if (passportInput && user.passport_no) passportInput.value = user.passport_no;

  // Set stepper link back to seats
  const stepperSeatsLink = document.getElementById('stepper-seats-link');
  if (stepperSeatsLink) {
    stepperSeatsLink.href = `/seats.html?flight_id=${pendingBooking.flight_id}`;
  }

  // Populate Right Column Trip Summary
  document.getElementById('checkout-flight-no').textContent = pendingBooking.flight_no;
  document.getElementById('checkout-route').textContent = `${pendingBooking.origin_city} (${pendingBooking.origin}) → ${pendingBooking.destination_city} (${pendingBooking.destination})`;
  document.getElementById('checkout-time').textContent = `${formatDate(pendingBooking.departure_time)} at ${formatTime(pendingBooking.departure_time)}`;
  document.getElementById('checkout-aircraft').textContent = `Aircraft: ${pendingBooking.aircraft_model || 'Commercial Jet'}`;

  const classBadge = document.getElementById('checkout-class-badge');
  classBadge.className = `badge ${pendingBooking.class_type === 'BUSINESS' ? 'badge-business' : 'badge-economy'}`;
  classBadge.textContent = pendingBooking.class_type === 'BUSINESS' ? 'Business Class' : 'Economy';

  document.getElementById('checkout-seat-no').textContent = pendingBooking.seat_no;
  document.getElementById('checkout-base-fare').textContent = formatCurrency(pendingBooking.seat_price);
  document.getElementById('checkout-total-amount').textContent = formatCurrency(pendingBooking.total_amount);

  document.getElementById('btn-pay-confirm').innerHTML = `
    <span>Pay & Confirm (${formatCurrency(pendingBooking.total_amount)})</span>
    <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Setup Payment Method Tabs
 */
function setupPaymentTabs() {
  const tabBtns = document.querySelectorAll('.pay-tab-btn');
  const panes = document.querySelectorAll('.payment-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      selectedPaymentMethod = btn.getAttribute('data-method');

      const targetPane = document.getElementById(`pane-${selectedPaymentMethod}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // UPI Chip shortcuts
  document.querySelectorAll('.upi-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const handle = chip.getAttribute('data-vpa');
      const vpaInput = document.getElementById('upi-vpa');
      const prefix = vpaInput.value.split('@')[0] || 'passenger';
      vpaInput.value = `${prefix}${handle}`;
    });
  });
}

/**
 * Handle Pay & Confirm Booking
 */
function setupPayButton() {
  const payBtn = document.getElementById('btn-pay-confirm');

  payBtn.addEventListener('click', async () => {
    if (!pendingBooking) return;

    payBtn.disabled = true;
    payBtn.innerHTML = `<span>Processing Reservation...</span>`;

    try {
      // 1. STEP A: Reserve Seat (Invokes PostgreSQL row-level locks via book_seat())
      const bookingPayload = {
        flight_id: pendingBooking.flight_id,
        seat_no: pendingBooking.seat_no,
      };

      const bookingResp = await api.post('/bookings', bookingPayload);

      payBtn.innerHTML = `<span>Confirming Payment...</span>`;

      // 2. STEP B: Record Payment (Invokes trigger payment_confirms_booking)
      const paymentPayload = {
        booking_id: bookingResp.booking_id,
        amount: pendingBooking.total_amount,
        payment_method: selectedPaymentMethod,
        status: 'SUCCESS'
      };

      await api.post('/payments', paymentPayload);

      // 3. Clear pending session storage
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);

      showToast('Booking Confirmed', `PNR: ${bookingResp.pnr}`, 'success');

      setTimeout(() => {
        window.location.href = `/confirmation.html?pnr=${encodeURIComponent(bookingResp.pnr)}`;
      }, 700);

    } catch (err) {
      payBtn.disabled = false;
      payBtn.innerHTML = `
        <span>Pay & Confirm (${formatCurrency(pendingBooking.total_amount)})</span>
        <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
      `;
      if (window.lucide) window.lucide.createIcons();

      if (err.status === 409) {
        showToast(
          'Seat Already Taken',
          `Seat ${pendingBooking.seat_no} was just reserved by someone else. Please choose another seat.`,
          'error'
        );
        setTimeout(() => {
          window.location.href = `/seats.html?flight_id=${pendingBooking.flight_id}`;
        }, 2000);
      } else {
        showToast('Payment / Reservation Failed', err.message, 'error');
      }
    }
  });
}
