/**
 * Booking Confirmation Page Controller
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

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader();
  renderFooter();

  if (!pnrParam) {
    showToast('Missing PNR', 'No booking reference provided.', 'warning');
    setTimeout(() => window.location.href = '/my-bookings.html', 1500);
    return;
  }

  await loadBookingData();
  setupActions();
});

async function loadBookingData() {
  try {
    const booking = await api.get(`/bookings/${pnrParam}`);

    // Populate Fields
    document.getElementById('ticket-pnr').textContent = booking.pnr;
    document.getElementById('ticket-passenger').textContent = booking.passenger_name || 'Passenger';
    document.getElementById('ticket-passport').textContent = booking.passport_no || 'Verified at Counter';
    document.getElementById('ticket-flight-no').textContent = booking.flight_no;
    document.getElementById('ticket-seat').textContent = booking.seat_no;

    document.getElementById('ticket-origin-code').textContent = booking.origin;
    document.getElementById('ticket-origin-city').textContent = booking.origin_city;
    document.getElementById('ticket-dep-time').textContent = `Dep: ${formatDate(booking.departure_time)}, ${formatTime(booking.departure_time)}`;

    document.getElementById('ticket-dest-code').textContent = booking.destination;
    document.getElementById('ticket-dest-city').textContent = booking.destination_city;
    document.getElementById('ticket-arr-time').textContent = `Arr: ${formatDate(booking.arrival_time)}, ${formatTime(booking.arrival_time)}`;

    document.getElementById('ticket-barcode-num').textContent = `*${booking.pnr}-${booking.seat_no}*`;

    // Fetch payments for ledger reference
    try {
      const payments = await api.get(`/bookings/${booking.booking_id}/payments`);
      if (Array.isArray(payments) && payments.length > 0) {
        const lastPay = payments[payments.length - 1];
        const payMethod = lastPay.payment_method || lastPay.method || 'Online';
        document.getElementById('ticket-payment-ref').textContent = `TXN #${lastPay.payment_id} | ${payMethod} (${formatCurrency(lastPay.amount)})`;
      } else {
        document.getElementById('ticket-payment-ref').textContent = `Paid ${formatCurrency(booking.amount)}`;
      }
    } catch (e) {
      document.getElementById('ticket-payment-ref').textContent = `Paid ${formatCurrency(booking.amount)}`;
    }

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    document.getElementById('printable-ticket').innerHTML = `
      <div class="empty-state">
        <p class="text-danger">Unable to load ticket details: ${escapeHTML(err.message)}</p>
        <a href="/my-bookings.html" class="btn btn-primary btn-sm">View My Bookings</a>
      </div>
    `;
  }
}

function setupActions() {
  const copyBtn = document.getElementById('btn-copy-pnr');
  const printBtn = document.getElementById('btn-print-ticket');

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const pnr = document.getElementById('ticket-pnr').textContent;
      navigator.clipboard.writeText(pnr).then(() => {
        showToast('PNR Copied', 'Booking reference copied to clipboard.', 'success');
      });
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}
