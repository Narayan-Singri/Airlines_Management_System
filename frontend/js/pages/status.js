/**
 * Flight Status Page Controller
 */
import { api } from '../api.js';
import {
  renderHeader,
  renderFooter,
  formatDate,
  formatTime,
  escapeHTML,
  showToast
} from '../ui.js';

const urlParams = new URLSearchParams(window.location.search);
const flightNoParam = urlParams.get('flight_no');
const dateParam = urlParams.get('date');

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('status');
  renderFooter();

  setupForm();

  if (flightNoParam) {
    document.getElementById('lookup-flight-no').value = flightNoParam.toUpperCase();
    if (dateParam) document.getElementById('lookup-date').value = dateParam;
    trackFlight(flightNoParam.toUpperCase(), dateParam);
  }
});

function setupForm() {
  const form = document.getElementById('flight-status-search-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const flightNo = document.getElementById('lookup-flight-no').value.trim().toUpperCase();
    const date = document.getElementById('lookup-date').value;

    if (!flightNo) {
      showToast('Flight Number Required', 'Please enter a flight number (e.g. AI-101).', 'warning');
      return;
    }

    const params = new URLSearchParams({ flight_no: flightNo });
    if (date) params.set('date', date);

    window.history.pushState({}, '', `?${params.toString()}`);
    trackFlight(flightNo, date);
  });
}

async function trackFlight(flightNo, date) {
  const container = document.getElementById('status-results-container');
  container.innerHTML = `
    <div class="skeleton" style="height: 320px; border-radius: var(--radius-xl);"></div>
  `;

  try {
    const query = new URLSearchParams({ flight_no: flightNo });
    if (date) query.set('date', date);

    const results = await api.get(`/flights/status/lookup?${query.toString()}`);

    if (!Array.isArray(results) || results.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <div class="empty-state-icon" style="background: var(--color-danger-bg); color: var(--color-danger);">
            <i data-lucide="alert-circle" style="width: 32px; height: 32px;"></i>
          </div>
          <h3>Flight Not Found</h3>
          <p class="text-sm text-muted">No operational flight matching '${escapeHTML(flightNo)}' was found.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Render the primary matching flight
    const f = results[0];
    const status = f.status || 'SCHEDULED';
    const statusClass = `badge-${status.toLowerCase()}`;

    // Timeline stages
    const stages = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED'];
    const currentIdx = stages.indexOf(status);

    const timelineHtml = stages.map((st, idx) => {
      let nodeClass = '';
      if (status === 'CANCELLED') {
        nodeClass = '';
      } else if (idx < currentIdx) {
        nodeClass = 'completed';
      } else if (idx === currentIdx) {
        nodeClass = 'active';
      }

      return `
        <div class="status-timeline-node ${nodeClass}">
          <div class="timeline-dot">
            ${idx < currentIdx ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
          </div>
          <span class="timeline-label">${st}</span>
        </div>
      `;
    }).join('');

    // Safety Condition Rating
    let conditionHtml = '';
    if (f.overall_condition) {
      const condBadge = `badge-${f.overall_condition.toLowerCase()}`;
      conditionHtml = `
        <div class="condition-summary-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i data-lucide="shield-check" style="width: 20px; height: 20px; color: #38BDF8;"></i>
              <span class="font-bold text-sm" style="text-transform: uppercase; letter-spacing: 0.5px;">
                Pre-Flight Technical Safety Check
              </span>
            </div>
            <span class="badge ${condBadge}">
              <span class="badge-dot"></span> Rating: ${escapeHTML(f.overall_condition)}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 13px;">
            <div>
              <span style="color: #94A3B8;">Weather at Departure:</span>
              <strong style="color: white; margin-left: 6px;">${escapeHTML(f.weather_conditions || 'Clear')}</strong>
            </div>
            <div style="text-align: right;">
              <span style="color: #94A3B8;">Certified Inspection:</span>
              <strong style="color: white; margin-left: 6px;">${f.condition_recorded_at ? formatDate(f.condition_recorded_at) + ' ' + formatTime(f.condition_recorded_at) : 'Recorded'}</strong>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="card">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="badge ${statusClass}">
              <span class="badge-dot"></span> ${escapeHTML(status)}
            </span>
            <span class="text-sm font-bold text-muted ml-2">Flight ${escapeHTML(f.flight_no)}</span>
            <span class="text-xs text-muted">| ${escapeHTML(f.aircraft_model)}</span>
          </div>
          <div class="text-xs font-semibold text-muted">
            Date: ${formatDate(f.departure_time)}
          </div>
        </div>

        <!-- Route Box -->
        <div style="background: var(--color-bg-page); border-radius: var(--radius-lg); padding: var(--space-6); display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--color-border);">
          <div>
            <div class="text-xs font-bold text-muted">ORIGIN</div>
            <div class="font-extrabold text-2xl" style="color: var(--color-navy);">${escapeHTML(f.origin)}</div>
            <div class="text-sm font-semibold text-muted">${escapeHTML(f.origin_city)}</div>
            <div class="text-xs font-bold text-primary mt-2">Dep: ${formatTime(f.departure_time)}</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <i data-lucide="plane" style="color: var(--color-primary); width: 28px; height: 28px;"></i>
            <span class="text-xs text-muted">Non-stop</span>
          </div>

          <div style="text-align: right;">
            <div class="text-xs font-bold text-muted">DESTINATION</div>
            <div class="font-extrabold text-2xl" style="color: var(--color-navy);">${escapeHTML(f.destination)}</div>
            <div class="text-sm font-semibold text-muted">${escapeHTML(f.destination_city)}</div>
            <div class="text-xs font-bold text-primary mt-2">Arr: ${formatTime(f.arrival_time)}</div>
          </div>
        </div>

        <!-- Operational Timeline -->
        <div class="status-timeline">
          ${timelineHtml}
        </div>

        <!-- Technical Safety Inspection Rating Card -->
        ${conditionHtml}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    container.innerHTML = `
      <div class="card empty-state">
        <p class="text-danger">Unable to retrieve flight status: ${escapeHTML(err.message)}</p>
      </div>
    `;
  }
}
