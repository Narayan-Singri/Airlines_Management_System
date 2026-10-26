/**
 * Seat Selection Page Controller
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { isLoggedIn, isCustomer } from '../auth.js';
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
const flightId = urlParams.get('flight_id');

let flightDetail = null;
let seatsList = [];
let selectedSeat = null;

const AIRPORT_FEE = 350;
const TAX_FEE = 250;

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('flights');
  renderFooter();

  if (!flightId) {
    showToast('No Flight Selected', 'Please select a flight to view seats.', 'warning');
    setTimeout(() => window.location.href = '/search.html', 1500);
    return;
  }

  await loadFlightDetail();
  await loadSeatMap();

  setupProceedButton();
});

/**
 * Fetch Flight Details
 */
async function loadFlightDetail() {
  const headerContainer = document.getElementById('flight-header-summary');
  const flightNoEl = document.getElementById('summary-flight-no');
  const flightRouteEl = document.getElementById('summary-flight-route');
  const flightTimeEl = document.getElementById('summary-flight-time');

  try {
    flightDetail = await api.get(`/flights/${flightId}`);

    headerContainer.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span class="badge badge-scheduled"><span class="badge-dot"></span> ${escapeHTML(flightDetail.status)}</span>
          <span class="text-sm font-bold text-muted">${escapeHTML(flightDetail.flight_no)}</span>
          <span class="text-xs text-muted">| ${escapeHTML(flightDetail.aircraft_model)} (${escapeHTML(flightDetail.registration_no)})</span>
        </div>
        <div class="text-xl font-extrabold" style="color: var(--color-navy);">
          ${escapeHTML(flightDetail.origin_city)} (${escapeHTML(flightDetail.origin_code)}) 
          <i data-lucide="arrow-right" style="display: inline-block; vertical-align: middle; width: 18px; height: 18px; color: var(--color-primary);"></i> 
          ${escapeHTML(flightDetail.destination_city)} (${escapeHTML(flightDetail.destination_code)})
        </div>
        <div class="text-xs text-muted mt-1">
          ${escapeHTML(flightDetail.origin_name)} to ${escapeHTML(flightDetail.destination_name)}
        </div>
      </div>

      <div style="text-align: right;">
        <div class="text-xs text-muted">Departure</div>
        <div class="text-lg font-bold" style="color: var(--color-primary);">
          ${formatDate(flightDetail.departure_time)} at ${formatTime(flightDetail.departure_time)}
        </div>
        <div class="text-xs text-muted mt-1">
          Available Capacity: <strong style="color: var(--color-navy);">${flightDetail.available_seats} / ${flightDetail.total_seats} seats</strong>
        </div>
      </div>
    `;

    flightNoEl.textContent = `${flightDetail.flight_no} (${flightDetail.aircraft_model})`;
    flightRouteEl.textContent = `${flightDetail.origin_code} → ${flightDetail.destination_code}`;
    flightTimeEl.textContent = `${formatDate(flightDetail.departure_time)}, ${formatTime(flightDetail.departure_time)}`;

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    headerContainer.innerHTML = `
      <div style="color: var(--color-danger);">
        <strong>Error loading flight details:</strong> ${escapeHTML(err.message)}
      </div>
    `;
  }
}

/**
 * Fetch and Render Seat Map
 */
async function loadSeatMap() {
  const container = document.getElementById('cabin-rows-container');

  try {
    seatsList = await api.get(`/flights/${flightId}/seats`);

    if (!Array.isArray(seatsList) || seatsList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="text-muted">No seat configuration found for this flight schedule.</p>
        </div>
      `;
      return;
    }

    // Group seats by numeric row number
    const rowsMap = new Map();
    seatsList.forEach(seat => {
      const rowNum = parseInt(seat.seat_no.replace(/\D/g, ''), 10);
      if (!rowsMap.has(rowNum)) {
        rowsMap.set(rowNum, {
          rowNum,
          classType: seat.class_type,
          seats: {}
        });
      }
      const colLetter = seat.seat_no.replace(/\d/g, '').toUpperCase();
      rowsMap.get(rowNum).seats[colLetter] = seat;
    });

    const sortedRows = Array.from(rowsMap.values()).sort((a, b) => a.rowNum - b.rowNum);

    let html = '';
    let currentClass = null;

    sortedRows.forEach(row => {
      // If entering a new class section, insert divider
      if (row.classType !== currentClass) {
        currentClass = row.classType;
        const isBiz = currentClass === 'BUSINESS';
        html += `
          <div class="cabin-section-divider">
            <span class="badge ${isBiz ? 'badge-business' : 'badge-economy'}">
              ${isBiz ? '👑 Business Class' : '✈️ Economy Class'}
            </span>
          </div>
        `;
      }

      // Render Row: A, B, C, [Row No], D, E, F
      html += `<div class="seat-row" data-row="${row.rowNum}">`;

      // Columns A, B, C
      ['A', 'B', 'C'].forEach(col => {
        html += renderSeatButton(row.seats[col]);
      });

      // Aisle with Row Number
      html += `<div class="row-number">${row.rowNum}</div>`;

      // Columns D, E, F
      ['D', 'E', 'F'].forEach(col => {
        html += renderSeatButton(row.seats[col]);
      });

      html += `</div>`;
    });

    container.innerHTML = html;

    // Attach click events
    container.querySelectorAll('.seat-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const seatNo = btn.getAttribute('data-seat-no');
        handleSeatClick(seatNo);
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="text-danger">Failed to load seat layout: ${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}

/**
 * Generate button HTML for a single seat
 */
function renderSeatButton(seat) {
  if (!seat) {
    return `<div style="width: 44px; height: 48px;"></div>`;
  }

  const isBiz = seat.class_type === 'BUSINESS';
  const isBooked = seat.is_booked;
  const isCurrentSelected = selectedSeat && selectedSeat.seat_no === seat.seat_no;

  const classes = [
    'seat-btn',
    isBiz ? 'business' : 'economy',
    isBooked ? 'booked' : '',
    isCurrentSelected ? 'selected' : ''
  ].filter(Boolean).join(' ');

  const disabledAttr = isBooked ? 'disabled' : '';
  const titleAttr = isBooked ? 'Seat already booked' : `${seat.seat_no} (${seat.class_type}) - ${formatCurrency(seat.price)}`;

  return `
    <button type="button" class="${classes}" ${disabledAttr} data-seat-no="${escapeHTML(seat.seat_no)}" title="${escapeHTML(titleAttr)}" aria-label="Seat ${escapeHTML(seat.seat_no)}">
      <span>${escapeHTML(seat.seat_no)}</span>
    </button>
  `;
}

/**
 * Handle seat selection
 */
function handleSeatClick(seatNo) {
  const seatObj = seatsList.find(s => s.seat_no === seatNo);
  if (!seatObj || seatObj.is_booked) return;

  selectedSeat = seatObj;

  // Update UI selection on buttons
  document.querySelectorAll('.seat-btn').forEach(btn => {
    if (btn.getAttribute('data-seat-no') === seatNo) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });

  // Update Summary Sidebar
  const badgeEl = document.getElementById('selected-seat-badge');
  const baseFareEl = document.getElementById('fare-base-amount');
  const totalAmountEl = document.getElementById('fare-total-amount');
  const proceedBtn = document.getElementById('btn-proceed-booking');

  const seatPrice = Number(selectedSeat.price) || 0;
  const totalPayable = seatPrice;

  badgeEl.className = `badge ${selectedSeat.class_type === 'BUSINESS' ? 'badge-business' : 'badge-economy'}`;
  badgeEl.innerHTML = `
    <i data-lucide="check-circle" style="width: 14px; height: 14px;"></i>
    <span>Seat ${escapeHTML(selectedSeat.seat_no)} (${escapeHTML(selectedSeat.class_type)})</span>
  `;

  baseFareEl.textContent = formatCurrency(seatPrice);
  totalAmountEl.textContent = formatCurrency(totalPayable);

  proceedBtn.disabled = false;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Handle Proceed to Checkout Button
 */
function setupProceedButton() {
  const proceedBtn = document.getElementById('btn-proceed-booking');

  proceedBtn.addEventListener('click', () => {
    if (!selectedSeat || !flightDetail) {
      showToast('No Seat Selected', 'Please click an available seat on the cabin map first.', 'warning');
      return;
    }

    const seatPrice = Number(selectedSeat.price) || 0;
    const totalAmount = seatPrice;

    const pendingBooking = {
      flight_id: flightDetail.flight_id,
      flight_no: flightDetail.flight_no,
      aircraft_model: flightDetail.aircraft_model,
      origin: flightDetail.origin_code,
      destination: flightDetail.destination_code,
      origin_city: flightDetail.origin_city,
      destination_city: flightDetail.destination_city,
      departure_time: flightDetail.departure_time,
      arrival_time: flightDetail.arrival_time,
      seat_no: selectedSeat.seat_no,
      class_type: selectedSeat.class_type,
      seat_price: seatPrice,
      total_amount: totalAmount,
    };

    sessionStorage.setItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING, JSON.stringify(pendingBooking));

    // If not logged in as customer, redirect to login with back redirect
    if (!isLoggedIn() || !isCustomer()) {
      showToast('Account Required', 'Please log in as a customer to finalize booking.', 'info');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent('/checkout.html')}`;
      }, 800);
      return;
    }

    window.location.href = '/checkout.html';
  });
}
