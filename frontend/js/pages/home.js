/**
 * Home Page Controller
 */
import { api } from '../api.js';
import { renderHeader, renderFooter, showToast, formatCurrency, formatDate, formatTime, escapeHTML } from '../ui.js';

let airportsList = [];
let adultsCount = 1;
let selectedClass = 'ECONOMY';

document.addEventListener('DOMContentLoaded', async () => {
  renderHeader('home');
  renderFooter();

  setupTabs();
  setupPassengerPicker();
  setupTripTypeToggle();
  setupSwapButton();
  setDefaultDates();

  await loadAirports();
  await loadPopularRoutes();

  setupForms();
});

/**
 * Setup Tabs (Search Flights / Manage Booking / Flight Status)
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.search-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const activePane = document.getElementById(targetTab);
      if (activePane) activePane.classList.add('active');
    });
  });
}

/**
 * Set default departure date to today / tomorrow
 */
function setDefaultDates() {
  const departInput = document.getElementById('search-depart-date');
  const returnInput = document.getElementById('search-return-date');
  const statusDateInput = document.getElementById('status-date');

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatIsoDate = d => d.toISOString().split('T')[0];

  const minDateStr = formatIsoDate(today);
  if (departInput) {
    departInput.min = minDateStr;
    departInput.value = formatIsoDate(tomorrow);
  }
  if (returnInput) {
    returnInput.min = minDateStr;
  }
  if (statusDateInput) {
    statusDateInput.value = minDateStr;
  }
}

/**
 * Trip Type (One way vs Round trip)
 */
function setupTripTypeToggle() {
  const radios = document.querySelectorAll('input[name="trip_type"]');
  const returnGroup = document.getElementById('return-date-group');
  const returnInput = document.getElementById('search-return-date');

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'roundtrip') {
        returnGroup.style.opacity = '1';
        returnInput.disabled = false;
        returnInput.required = true;
      } else {
        returnGroup.style.opacity = '0.5';
        returnInput.disabled = true;
        returnInput.required = false;
        returnInput.value = '';
      }
    });
  });
}

/**
 * Swap Origin and Destination dropdowns
 */
function setupSwapButton() {
  const swapBtn = document.getElementById('btn-swap-cities');
  const fromSelect = document.getElementById('search-from');
  const toSelect = document.getElementById('search-to');

  if (swapBtn && fromSelect && toSelect) {
    swapBtn.addEventListener('click', () => {
      const temp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = temp;
    });
  }
}

/**
 * Passenger & Class Popover
 */
function setupPassengerPicker() {
  const pickerBtn = document.getElementById('passenger-selector-btn');
  const popover = document.getElementById('passenger-popover');
  const btnPlus = document.getElementById('btn-adults-plus');
  const btnMinus = document.getElementById('btn-adults-minus');
  const countDisplay = document.getElementById('adults-count');
  const classSelect = document.getElementById('cabin-class-select');
  const summaryText = document.getElementById('passenger-summary-text');
  const applyBtn = document.getElementById('btn-apply-passengers');

  if (!pickerBtn || !popover) return;

  pickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== pickerBtn) {
      popover.classList.remove('open');
    }
  });

  const updateSummary = () => {
    const classLabel = selectedClass === 'BUSINESS' ? 'Business' : 'Economy';
    summaryText.textContent = `${adultsCount} ${adultsCount === 1 ? 'Passenger' : 'Passengers'} / ${classLabel}`;
  };

  btnPlus.addEventListener('click', () => {
    if (adultsCount < 9) {
      adultsCount++;
      countDisplay.textContent = adultsCount;
      btnMinus.disabled = false;
      updateSummary();
    }
  });

  btnMinus.addEventListener('click', () => {
    if (adultsCount > 1) {
      adultsCount--;
      countDisplay.textContent = adultsCount;
      if (adultsCount === 1) btnMinus.disabled = true;
      updateSummary();
    }
  });

  classSelect.addEventListener('change', () => {
    selectedClass = classSelect.value;
    updateSummary();
  });

  applyBtn.addEventListener('click', () => {
    popover.classList.remove('open');
  });
}

/**
 * Load Airports for city dropdowns
 */
async function loadAirports() {
  const fromSelect = document.getElementById('search-from');
  const toSelect = document.getElementById('search-to');

  try {
    airportsList = await api.get('/flights/airports');
    if (!Array.isArray(airportsList) || airportsList.length === 0) return;

    let optionsHtml = '<option value="">Select City / Airport</option>';
    airportsList.forEach(apt => {
      optionsHtml += `<option value="${escapeHTML(apt.iata_code)}">${escapeHTML(apt.city)} (${escapeHTML(apt.iata_code)}) - ${escapeHTML(apt.name)}</option>`;
    });

    if (fromSelect) {
      fromSelect.innerHTML = optionsHtml;
      // Default to BOM if available
      if (airportsList.some(a => a.iata_code === 'BOM')) fromSelect.value = 'BOM';
    }
    if (toSelect) {
      toSelect.innerHTML = optionsHtml;
      // Default to DEL if available
      if (airportsList.some(a => a.iata_code === 'DEL')) toSelect.value = 'DEL';
    }
  } catch (err) {
    console.error('Failed to load airports:', err);
  }
}

/**
 * Load popular flights from backend
 */
async function loadPopularRoutes() {
  const container = document.getElementById('popular-routes-grid');
  if (!container) return;

  try {
    const flights = await api.get('/flights');
    if (!Array.isArray(flights) || flights.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p class="text-muted">No scheduled flights currently listed.</p>
        </div>
      `;
      return;
    }

    // Show up to 6 unique route cards
    const displayedRoutes = flights.slice(0, 6);
    container.innerHTML = displayedRoutes.map(f => `
      <div class="route-card">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="badge badge-scheduled">
              <span class="badge-dot"></span> Non-stop
            </span>
            <span class="text-xs font-semibold text-muted">${escapeHTML(f.flight_no)}</span>
          </div>

          <div class="route-city-pair">
            <div>
              <div class="font-bold text-lg" style="color: var(--color-navy);">${escapeHTML(f.origin_city)}</div>
              <div class="text-xs font-semibold text-muted">${escapeHTML(f.origin)}</div>
            </div>
            <i data-lucide="arrow-right" style="color: var(--color-primary); width: 20px; height: 20px;"></i>
            <div style="text-align: right;">
              <div class="font-bold text-lg" style="color: var(--color-navy);">${escapeHTML(f.destination_city)}</div>
              <div class="text-xs font-semibold text-muted">${escapeHTML(f.destination)}</div>
            </div>
          </div>

          <div class="text-xs text-muted" style="margin-bottom: 16px;">
            Dep: ${formatDate(f.departure_time)} at ${formatTime(f.departure_time)}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 14px;">
          <div>
            <div class="text-xs text-muted">Starting from</div>
            <div class="font-extrabold text-lg" style="color: var(--color-primary);">${formatCurrency(f.base_price)}</div>
          </div>
          <a href="/seats.html?flight_id=${f.flight_id}" class="btn btn-primary btn-sm">
            Book Seat <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
          </a>
        </div>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <p class="text-muted">Unable to load scheduled routes at this time.</p>
      </div>
    `;
  }
}

/**
 * Setup Form submissions
 */
function setupForms() {
  // Flight search form
  const searchForm = document.getElementById('flight-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const origin = document.getElementById('search-from').value;
      const destination = document.getElementById('search-to').value;
      const departDate = document.getElementById('search-depart-date').value;

      if (!origin || !destination) {
        showToast('Selection Required', 'Please select both origin and destination cities.', 'warning');
        return;
      }
      if (origin === destination) {
        showToast('Invalid Route', 'Origin and Destination cannot be the same city.', 'error');
        return;
      }

      const params = new URLSearchParams({
        from: origin,
        to: destination,
        date: departDate,
        class: selectedClass,
        pax: adultsCount,
      });

      window.location.href = `/search.html?${params.toString()}`;
    });
  }

  // Quick manage / checkin lookup
  const manageForm = document.getElementById('quick-manage-form');
  if (manageForm) {
    manageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pnr = document.getElementById('manage-pnr').value.trim().toUpperCase();
      if (!pnr || pnr.length !== 6) {
        showToast('Invalid PNR', 'Please enter a valid 6-character PNR code.', 'warning');
        return;
      }
      window.location.href = `/manage.html?pnr=${encodeURIComponent(pnr)}`;
    });
  }

  // Quick flight status lookup
  const statusForm = document.getElementById('quick-status-form');
  if (statusForm) {
    statusForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const flightNo = document.getElementById('status-flight-no').value.trim().toUpperCase();
      const statusDate = document.getElementById('status-date').value;

      if (!flightNo) {
        showToast('Flight Number Required', 'Please enter a flight number (e.g. AI-101).', 'warning');
        return;
      }

      const params = new URLSearchParams({ flight_no: flightNo });
      if (statusDate) params.set('date', statusDate);

      window.location.href = `/status.html?${params.toString()}`;
    });
  }
}
