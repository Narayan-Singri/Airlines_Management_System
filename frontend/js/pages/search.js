/**
 * Flight Search Results Page Controller
 */
import { api } from '../api.js';
import {
  renderHeader,
  renderFooter,
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  escapeHTML,
  showToast
} from '../ui.js';

let rawFlights = [];
let filteredFlights = [];
let airportsList = [];

// Query parameters
const urlParams = new URLSearchParams(window.location.search);
let originParam = urlParams.get('from') || '';
let destParam = urlParams.get('to') || '';
let dateParam = urlParams.get('date') || '';
let classParam = urlParams.get('class') || 'ALL';

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('flights');
  renderFooter();

  await loadAirports();
  initModifyBar();
  setupFilterHandlers();

  await fetchAndRenderFlights();
});

/**
 * Load airports list for dropdowns
 */
async function loadAirports() {
  const fromSelect = document.getElementById('modify-from');
  const toSelect = document.getElementById('modify-to');

  try {
    airportsList = await api.get('/flights/airports');
    if (!Array.isArray(airportsList)) return;

    let options = '<option value="">All Airports</option>';
    airportsList.forEach(apt => {
      options += `<option value="${escapeHTML(apt.iata_code)}">${escapeHTML(apt.city)} (${escapeHTML(apt.iata_code)})</option>`;
    });

    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
  } catch (err) {
    console.error('Failed to load airports:', err);
  }
}

/**
 * Sync URL params into top search modification bar
 */
function initModifyBar() {
  const fromSelect = document.getElementById('modify-from');
  const toSelect = document.getElementById('modify-to');
  const dateInput = document.getElementById('modify-date');
  const classSelect = document.getElementById('modify-class');
  const modifyForm = document.getElementById('modify-search-form');

  if (originParam) fromSelect.value = originParam;
  if (destParam) toSelect.value = destParam;
  if (dateParam) dateInput.value = dateParam;
  if (classParam) classSelect.value = classParam;

  modifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newFrom = fromSelect.value;
    const newTo = toSelect.value;
    const newDate = dateInput.value;
    const newClass = classSelect.value;

    if (newFrom && newTo && newFrom === newTo) {
      showToast('Invalid Route', 'Origin and Destination cannot be identical.', 'error');
      return;
    }

    const params = new URLSearchParams();
    if (newFrom) params.set('from', newFrom);
    if (newTo) params.set('to', newTo);
    if (newDate) params.set('date', newDate);
    if (newClass) params.set('class', newClass);

    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    originParam = newFrom;
    destParam = newTo;
    dateParam = newDate;
    classParam = newClass;

    fetchAndRenderFlights();
  });
}

/**
 * Fetch flights from backend with applied query parameters
 */
async function fetchAndRenderFlights() {
  const container = document.getElementById('flight-cards-container');
  const headline = document.getElementById('results-headline');
  const subtext = document.getElementById('results-subtext');

  container.innerHTML = `
    <div class="skeleton" style="height: 140px; margin-bottom: 16px;"></div>
    <div class="skeleton" style="height: 140px; margin-bottom: 16px;"></div>
    <div class="skeleton" style="height: 140px;"></div>
  `;

  const queryParams = new URLSearchParams();
  if (originParam) queryParams.set('from', originParam);
  if (destParam) queryParams.set('to', destParam);
  if (dateParam) queryParams.set('date', dateParam);

  const endpoint = `/flights${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  try {
    const data = await api.get(endpoint);
    rawFlights = Array.isArray(data) ? data : [];

    // Update headline
    if (originParam && destParam) {
      headline.textContent = `${originParam} → ${destParam}`;
      subtext.textContent = dateParam ? `Flights departing on ${formatDate(dateParam)}` : 'All scheduled departures';
    } else {
      headline.textContent = 'All Available Flights';
      subtext.textContent = 'Showing scheduled flight departures';
    }

    // Set max price bounds in filter
    if (rawFlights.length > 0) {
      const maxFlightPrice = Math.max(...rawFlights.map(f => Number(f.base_price) || 0));
      const priceSlider = document.getElementById('filter-max-price');
      if (priceSlider && maxFlightPrice > 0) {
        priceSlider.max = Math.ceil(maxFlightPrice / 1000) * 1000 + 2000;
        priceSlider.value = priceSlider.max;
        document.getElementById('price-slider-value').textContent = `Up to ${formatCurrency(priceSlider.value)}`;
      }
    }

    applyFiltersAndSort();
  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-icon" style="background-color: var(--color-danger-bg); color: var(--color-danger);">
          <i data-lucide="alert-circle" style="width: 32px; height: 32px;"></i>
        </div>
        <h3>Unable to Load Flights</h3>
        <p class="text-sm text-muted">${escapeHTML(err.message)}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">Retry Search</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Setup sidebar filters and sort dropdown
 */
function setupFilterHandlers() {
  const priceSlider = document.getElementById('filter-max-price');
  const priceDisplay = document.getElementById('price-slider-value');
  const timeCheckboxes = document.querySelectorAll('input[name="time_slot"]');
  const availableOnlyCheck = document.getElementById('filter-available-only');
  const sortSelect = document.getElementById('sort-select');
  const resetBtn = document.getElementById('btn-reset-filters');

  if (priceSlider) {
    priceSlider.addEventListener('input', () => {
      priceDisplay.textContent = `Up to ${formatCurrency(priceSlider.value)}`;
      applyFiltersAndSort();
    });
  }

  timeCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => applyFiltersAndSort());
  });

  if (availableOnlyCheck) {
    availableOnlyCheck.addEventListener('change', () => applyFiltersAndSort());
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => applyFiltersAndSort());
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (priceSlider) priceSlider.value = priceSlider.max;
      priceDisplay.textContent = `Up to ${formatCurrency(priceSlider.value)}`;
      timeCheckboxes.forEach(cb => cb.checked = true);
      if (availableOnlyCheck) availableOnlyCheck.checked = true;
      if (sortSelect) sortSelect.value = 'price_asc';
      applyFiltersAndSort();
    });
  }
}

/**
 * Filter and sort flights in memory
 */
function applyFiltersAndSort() {
  const container = document.getElementById('flight-cards-container');
  const maxPrice = Number(document.getElementById('filter-max-price')?.value) || Infinity;
  const hideSoldOut = document.getElementById('filter-available-only')?.checked;
  const sortValue = document.getElementById('sort-select')?.value || 'price_asc';

  // Time slots checked
  const activeSlots = Array.from(document.querySelectorAll('input[name="time_slot"]:checked')).map(cb => cb.value);

  filteredFlights = rawFlights.filter(f => {
    // Price filter
    if (Number(f.base_price) > maxPrice) return false;

    // Available seats filter
    if (hideSoldOut && f.available_seats <= 0) return false;

    // Departure time slots
    const depHour = new Date(f.departure_time).getHours();
    let slot = 'evening';
    if (depHour < 12) slot = 'morning';
    else if (depHour < 18) slot = 'afternoon';

    if (!activeSlots.includes(slot)) return false;

    return true;
  });

  // Sorting
  filteredFlights.sort((a, b) => {
    switch (sortValue) {
      case 'price_asc':
        return Number(a.base_price) - Number(b.base_price);
      case 'price_desc':
        return Number(b.base_price) - Number(a.base_price);
      case 'dep_asc':
        return new Date(a.departure_time) - new Date(b.departure_time);
      case 'duration_asc': {
        const durA = new Date(a.arrival_time) - new Date(a.departure_time);
        const durB = new Date(b.arrival_time) - new Date(b.departure_time);
        return durA - durB;
      }
      case 'seats_desc':
        return b.available_seats - a.available_seats;
      default:
        return 0;
    }
  });

  renderFlightCards();
}

/**
 * Render flight cards into container
 */
function renderFlightCards() {
  const container = document.getElementById('flight-cards-container');

  if (filteredFlights.length === 0) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-icon">
          <i data-lucide="plane" style="width: 32px; height: 32px;"></i>
        </div>
        <h3>No Flights Found</h3>
        <p class="text-sm text-muted">No scheduled flights match your selected route, dates, or filter criteria.</p>
        <button class="btn btn-outline btn-sm" id="btn-clear-empty-filters">Reset Filters</button>
      </div>
    `;
    const clearBtn = document.getElementById('btn-clear-empty-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        document.getElementById('btn-reset-filters')?.click();
      });
    }
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filteredFlights.map(f => {
    const isSoldOut = f.available_seats <= 0;
    const duration = formatDuration(f.departure_time, f.arrival_time);
    const statusClass = `badge-${(f.status || 'SCHEDULED').toLowerCase()}`;

    return `
      <div class="flight-card">
        <!-- Route and Times -->
        <div class="flight-route-info">
          <div class="flight-time-block">
            <div class="flight-time">${formatTime(f.departure_time)}</div>
            <div class="flight-airport-code">${escapeHTML(f.origin)}</div>
            <div class="flight-city-name">${escapeHTML(f.origin_city)}</div>
          </div>

          <div class="flight-duration-line">
            <span class="flight-duration-text">${duration}</span>
            <div class="flight-path-bar">
              <i data-lucide="plane" class="flight-path-plane" style="width: 14px; height: 14px;"></i>
            </div>
            <span class="text-xs text-muted" style="margin-top: 4px;">Non-stop</span>
          </div>

          <div class="flight-time-block" style="text-align: right;">
            <div class="flight-time">${formatTime(f.arrival_time)}</div>
            <div class="flight-airport-code">${escapeHTML(f.destination)}</div>
            <div class="flight-city-name">${escapeHTML(f.destination_city)}</div>
          </div>
        </div>

        <!-- Badges & Meta -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span> ${escapeHTML(f.status)}
            </span>
            <span class="text-xs font-semibold text-muted">Flight ${escapeHTML(f.flight_no)}</span>
          </div>
          <div>
            ${isSoldOut 
              ? `<span class="badge badge-cancelled">Sold Out</span>` 
              : `<span class="badge" style="background-color: var(--color-primary-light); color: var(--color-primary);">
                   <i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> ${f.available_seats} seats left
                 </span>`
            }
          </div>
        </div>

        <!-- Pricing & Action -->
        <div class="flight-pricing-block">
          <div>
            <div class="text-xs text-muted">Base Fare per person</div>
            <div class="flight-price-amount">${formatCurrency(f.base_price)}</div>
          </div>

          ${isSoldOut
            ? `<button class="btn btn-secondary" disabled>Sold Out</button>`
            : `<a href="/seats.html?flight_id=${f.flight_id}" class="btn btn-primary">
                 <span>Select Seats</span>
                 <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
               </a>`
          }
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}
