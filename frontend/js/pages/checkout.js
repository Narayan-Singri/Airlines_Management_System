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
let selectedPaymentMethod = 'UPI'; // Default: 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'
let activeBookingId = null;
let activeBookingPnr = null;

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('flights');
  renderFooter();

  // Guard: Customer authentication required
  if (!requireCustomerAuth('/login.html')) return;

  loadPendingBooking();
  setupPaymentTabs();
  setupCardFormatting();
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

  updatePayButtonLabel();
}

function updatePayButtonLabel() {
  const payBtn = document.getElementById('btn-pay-confirm');
  if (!payBtn || !pendingBooking) return;

  const label = activeBookingId ? 'Complete Payment' : 'Pay & Confirm';
  payBtn.innerHTML = `
    <span>${label} (${formatCurrency(pendingBooking.total_amount)})</span>
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
      clearAllInlineErrors();

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      selectedPaymentMethod = btn.getAttribute('data-method') || 'UPI';

      const targetPane = document.getElementById(`pane-${selectedPaymentMethod}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // UPI Chip shortcuts
  document.querySelectorAll('.upi-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const handle = chip.getAttribute('data-vpa');
      const vpaInput = document.getElementById('upi-vpa');
      if (!vpaInput) return;
      const prefix = vpaInput.value.split('@')[0] || 'passenger';
      vpaInput.value = `${prefix}${handle}`;
      clearInlineError('err-upi-vpa');
    });
  });
}

/**
 * Format Card Inputs on the fly
 */
function setupCardFormatting() {
  const cardNum = document.getElementById('card-number');
  const cardExp = document.getElementById('card-expiry');
  const cardCvv = document.getElementById('card-cvv');

  if (cardNum) {
    cardNum.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      val = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = val;
      clearInlineError('err-card-number');
    });
  }

  if (cardExp) {
    cardExp.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      e.target.value = val;
      clearInlineError('err-card-expiry');
    });
  }

  if (cardCvv) {
    cardCvv.addEventListener('input', () => {
      clearInlineError('err-card-cvv');
    });
  }

  const cardHolder = document.getElementById('card-holder');
  if (cardHolder) {
    cardHolder.addEventListener('input', () => {
      clearInlineError('err-card-holder');
    });
  }

  const upiInput = document.getElementById('upi-vpa');
  if (upiInput) {
    upiInput.addEventListener('input', () => {
      clearInlineError('err-upi-vpa');
    });
  }
}

/**
 * Inline Error Helpers
 */
function showInlineError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function clearInlineError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function clearAllInlineErrors() {
  document.querySelectorAll('.form-error-inline').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
}

/**
 * Client-side validation prior to network dispatch
 */
function validatePaymentForm() {
  clearAllInlineErrors();
  let isValid = true;

  if (selectedPaymentMethod === 'UPI') {
    const vpaInput = document.getElementById('upi-vpa');
    const vpa = vpaInput ? vpaInput.value.trim() : '';
    if (!vpa) {
      showInlineError('err-upi-vpa', 'Please enter your Virtual Payment Address (VPA).');
      if (vpaInput) vpaInput.focus();
      return false;
    }
    // VPA format validation: username@bank
    const vpaRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-_]{2,}$/;
    if (!vpaRegex.test(vpa)) {
      showInlineError('err-upi-vpa', 'Please enter a valid UPI address (e.g., username@okaxis).');
      if (vpaInput) vpaInput.focus();
      return false;
    }
  } else if (selectedPaymentMethod === 'CARD') {
    const numInput = document.getElementById('card-number');
    const holderInput = document.getElementById('card-holder');
    const expInput = document.getElementById('card-expiry');
    const cvvInput = document.getElementById('card-cvv');

    const num = numInput ? numInput.value.replace(/\s+/g, '') : '';
    const holder = holderInput ? holderInput.value.trim() : '';
    const exp = expInput ? expInput.value.trim() : '';
    const cvv = cvvInput ? cvvInput.value.trim() : '';

    if (!num || !/^\d{13,19}$/.test(num)) {
      showInlineError('err-card-number', 'Please enter a valid 16-digit card number.');
      isValid = false;
    }

    if (!holder || holder.length < 2) {
      showInlineError('err-card-holder', 'Please enter the cardholder name as printed on the card.');
      isValid = false;
    }

    if (!exp || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
      showInlineError('err-card-expiry', 'Enter expiration as MM/YY.');
      isValid = false;
    }

    if (!cvv || !/^\d{3,4}$/.test(cvv)) {
      showInlineError('err-card-cvv', 'Enter 3 or 4-digit CVV.');
      isValid = false;
    }
  } else if (selectedPaymentMethod === 'NETBANKING') {
    const bank = document.querySelector('input[name="bank_select"]:checked');
    if (!bank) {
      showToast('Bank Selection Required', 'Please choose your Netbanking institution.', 'warning');
      return false;
    }
  } else if (selectedPaymentMethod === 'WALLET') {
    const wallet = document.querySelector('input[name="wallet_select"]:checked');
    if (!wallet) {
      showToast('Wallet Selection Required', 'Please choose your digital wallet provider.', 'warning');
      return false;
    }
  }

  return isValid;
}

/**
 * Handle Pay & Confirm Booking
 */
function setupPayButton() {
  const payBtn = document.getElementById('btn-pay-confirm');
  if (!payBtn) return;

  payBtn.addEventListener('click', async () => {
    if (!pendingBooking) return;

    // Validate client-side inputs first
    if (!validatePaymentForm()) {
      return;
    }

    // Double-submit protection: disable button and show spinner
    payBtn.disabled = true;
    payBtn.innerHTML = `
      <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      <span>${activeBookingId ? 'Processing Payment...' : 'Reserving Seat & Processing...'}</span>
    `;

    try {
      // 1. STEP A: Reserve Seat (only if not already created in a previous attempt)
      if (!activeBookingId) {
        const bookingPayload = {
          flight_id: pendingBooking.flight_id,
          seat_no: pendingBooking.seat_no,
        };

        const bookingResp = await api.post('/bookings', bookingPayload);
        activeBookingId = bookingResp.booking_id;
        activeBookingPnr = bookingResp.pnr;
      }

      payBtn.innerHTML = `
        <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
        <span>Confirming Payment (${selectedPaymentMethod})...</span>
      `;

      // 2. STEP B: Record Payment (Invokes trigger payment_confirms_booking)
      // Must exactly match CreatePaymentRequest: booking_id, amount, method, status
      const paymentPayload = {
        booking_id: activeBookingId,
        amount: pendingBooking.total_amount,
        method: selectedPaymentMethod,
        status: 'SUCCESS'
      };

      await api.post('/payments', paymentPayload);

      // 3. Clear pending session storage upon complete success
      sessionStorage.removeItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);

      showToast('Booking Confirmed', `PNR: ${activeBookingPnr}`, 'success');

      setTimeout(() => {
        window.location.href = `/confirmation.html?pnr=${encodeURIComponent(activeBookingPnr)}`;
      }, 700);

    } catch (err) {
      payBtn.disabled = false;
      updatePayButtonLabel();

      if (err.status === 409) {
        showToast(
          'Seat Already Taken',
          `Seat ${pendingBooking.seat_no} was just reserved by someone else. Please choose another seat.`,
          'error'
        );
        setTimeout(() => {
          window.location.href = `/seats.html?flight_id=${pendingBooking.flight_id}`;
        }, 2200);
      } else if (activeBookingId) {
        // Seat reservation succeeded, but payment failed: let user retry payment
        showToast(
          'Payment Processing Failed',
          `Seat ${pendingBooking.seat_no} is held under PNR ${activeBookingPnr}. Please try another payment channel.`,
          'warning'
        );
      } else {
        showToast('Reservation Failed', err.message || 'Unable to complete reservation.', 'error');
      }
    }
  });
}
