/**
 * Flight Technical Conditions Controller
 */
import { api } from '../api.js';
import { requireStaffAuth, getUser, logout } from '../auth.js';
import { formatDate, formatTime, escapeHTML, showToast } from '../ui.js';

let flightsList = [];
let selectedFlightId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireStaffAuth(['PILOT', 'ADMIN'], '/staff/login.html')) return;

  const user = getUser();
  const roleBadge = document.getElementById('staff-role-badge');
  if (roleBadge) roleBadge.textContent = user.emp_type || 'PILOT';

  const logoutBtn = document.getElementById('btn-staff-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('/staff/login.html'));

  await loadFlights();
  setupConditionForm();
});

async function loadFlights() {
  const select = document.getElementById('flight-select');
  try {
    flightsList = await api.get('/flights');
    if (!Array.isArray(flightsList) || flightsList.length === 0) {
      select.innerHTML = '<option value="">No flights scheduled</option>';
      return;
    }

    select.innerHTML = flightsList.map(f => `
      <option value="${f.flight_id}">
        Flight ${escapeHTML(f.flight_no)}: ${escapeHTML(f.origin)} → ${escapeHTML(f.destination)} (${formatDate(f.departure_time)})
      </option>
    `).join('');

    selectedFlightId = flightsList[0].flight_id;
    await loadHistory(selectedFlightId);

    select.addEventListener('change', async (e) => {
      selectedFlightId = parseInt(e.target.value, 10);
      await loadHistory(selectedFlightId);
    });

  } catch (err) {
    select.innerHTML = '<option value="">Failed to load flights</option>';
  }
}

async function loadHistory(flightId) {
  const container = document.getElementById('conditions-history-container');
  container.innerHTML = `
    <div class="skeleton" style="height: 120px; background: #0F172A;"></div>
  `;

  try {
    const history = await api.get(`/flights/${flightId}/conditions`);

    if (!Array.isArray(history) || history.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94A3B8; font-size: 13px;">
          No technical inspection reports logged for this flight yet.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="staff-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Inspector ID</th>
            <th>Rating</th>
            <th>Fuel %</th>
            <th>Oil %</th>
            <th>Tyres</th>
            <th>Weather</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${history.map(item => {
            const badgeClass = `badge-${(item.overall || 'GOOD').toLowerCase()}`;
            return `
              <tr>
                <td class="font-mono text-xs">${formatDate(item.checked_at)} ${formatTime(item.checked_at)}</td>
                <td>Staff #${item.checked_by}</td>
                <td>
                  <span class="badge ${badgeClass}"><span class="badge-dot"></span> ${escapeHTML(item.overall)}</span>
                </td>
                <td>${item.fuel_level_pct}%</td>
                <td>${item.oil_level_pct}%</td>
                <td>${item.tyre_ok ? '✅ OK' : '❌ Issue'}</td>
                <td>${escapeHTML(item.weather || '-')}</td>
                <td class="text-xs" style="max-width: 200px; color: #94A3B8;">${escapeHTML(item.remarks || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

  } catch (err) {
    container.innerHTML = `
      <div style="padding: 16px; color: var(--color-danger); font-size: 13px;">
        Failed to load condition history: ${escapeHTML(err.message)}
      </div>
    `;
  }
}

function setupConditionForm() {
  const form = document.getElementById('condition-entry-form');
  const submitBtn = document.getElementById('btn-submit-condition');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFlightId) {
      showToast('No Flight Selected', 'Please select a scheduled flight.', 'warning');
      return;
    }

    const payload = {
      fuel_level_pct: parseFloat(document.getElementById('cond-fuel').value),
      oil_level_pct: parseFloat(document.getElementById('cond-oil').value),
      tyre_ok: document.getElementById('cond-tyre').checked,
      weather: document.getElementById('cond-weather').value,
      overall: document.getElementById('cond-overall').value,
      remarks: document.getElementById('cond-remarks').value.trim() || null,
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Submitting Safety Log...</span>`;

    try {
      await api.post(`/flights/${selectedFlightId}/conditions`, payload);
      showToast('Report Logged', 'Pre-flight safety inspection recorded.', 'success');
      await loadHistory(selectedFlightId);
    } catch (err) {
      showToast('Submission Failed', err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> Submit Certified Inspection Log
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
