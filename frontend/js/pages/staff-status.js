/**
 * Staff Flight Status Operations Controller
 */
import { api } from '../api.js';
import { requireStaffAuth, getUser, logout, setupStaffNavbar } from '../auth.js';
import { formatDate, escapeHTML, showToast } from '../ui.js';

let flightsList = [];
let selectedFlightId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireStaffAuth([], '/staff/login.html')) return;
  setupStaffNavbar('status');

  const user = getUser();
  const roleBadge = document.getElementById('staff-role-badge');
  if (roleBadge) roleBadge.textContent = user.emp_type || 'STAFF';

  const logoutBtn = document.getElementById('btn-staff-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', () => logout('/staff/login.html'));

  await loadFlights();
  setupStatusTriggers();
});

async function loadFlights() {
  const select = document.getElementById('ops-flight-select');

  try {
    flightsList = await api.get('/flights');
    if (!Array.isArray(flightsList) || flightsList.length === 0) {
      select.innerHTML = '<option value="">No flights found</option>';
      return;
    }

    select.innerHTML = flightsList.map(f => `
      <option value="${f.flight_id}">
        Flight ${escapeHTML(f.flight_no)}: ${escapeHTML(f.origin)} → ${escapeHTML(f.destination)} (${formatDate(f.departure_time)})
      </option>
    `).join('');

    selectedFlightId = flightsList[0].flight_id;
    await updateFlightDisplay(selectedFlightId);

    select.addEventListener('change', async (e) => {
      selectedFlightId = parseInt(e.target.value, 10);
      await updateFlightDisplay(selectedFlightId);
    });

  } catch (err) {
    select.innerHTML = '<option value="">Failed to load flight list</option>';
  }
}

async function updateFlightDisplay(flightId) {
  const statusDisplay = document.getElementById('current-status-display');
  const routeDisplay = document.getElementById('current-route-display');

  try {
    const flight = await api.get(`/flights/${flightId}`);
    statusDisplay.textContent = flight.status;
    routeDisplay.textContent = `${flight.origin_code} → ${flight.destination_code} (${flight.flight_no})`;

    // Highlight active button
    document.querySelectorAll('.btn-status-trigger').forEach(btn => {
      if (btn.getAttribute('data-status') === flight.status) {
        btn.style.backgroundColor = '#334155';
        btn.style.fontWeight = 'bold';
      } else {
        btn.style.backgroundColor = 'transparent';
        btn.style.fontWeight = 'normal';
      }
    });

  } catch (err) {
    statusDisplay.textContent = 'ERROR';
  }
}

function setupStatusTriggers() {
  document.querySelectorAll('.btn-status-trigger').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!selectedFlightId) {
        showToast('No Flight Selected', 'Please select a flight to update.', 'warning');
        return;
      }

      const targetStatus = btn.getAttribute('data-status');
      btn.disabled = true;

      try {
        await api.patch(`/flights/${selectedFlightId}/status`, { status: targetStatus });
        showToast('Status Updated', `Flight status transitioned to ${targetStatus}`, 'success');
        await updateFlightDisplay(selectedFlightId);
      } catch (err) {
        showToast('Update Failed', err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  });
}
