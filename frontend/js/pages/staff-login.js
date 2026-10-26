/**
 * Staff Portal Login Controller
 */
import { api } from '../api.js';
import { setToken, setUser, isStaff } from '../auth.js';
import { showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  setupAutofill();
  setupStaffLoginForm();
});

function setupAutofill() {
  const emailInput = document.getElementById('staff-email');
  const passInput = document.getElementById('staff-password');

  document.querySelectorAll('.btn-autofill').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const role = btn.getAttribute('data-role');
      emailInput.value = email;

      if (email.startsWith('ravi')) passInput.value = 'Staff@123';
      else if (email.startsWith('arjun')) passInput.value = 'Pilot@123';
      else if (email.startsWith('admin')) passInput.value = 'Admin@123';

      showToast('Filled', `Demo operator (${role}) credentials loaded.`, 'info');
    });
  });
}

function setupStaffLoginForm() {
  const form = document.getElementById('staff-login-form');
  const submitBtn = document.getElementById('btn-staff-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Authorizing...</span>`;

    try {
      const resp = await api.post('/auth/staff/login', { email, password });
      setToken(resp.access_token);

      const profile = await api.get('/auth/me');
      setUser(profile);

      showToast('Authorization Granted', `Welcome ${profile.full_name} (${profile.emp_type})`, 'success');

      setTimeout(() => {
        if (profile.emp_type === 'PILOT') {
          window.location.href = '/staff/conditions.html';
        } else {
          window.location.href = '/staff/checkin.html';
        }
      }, 700);

    } catch (err) {
      showToast('Access Denied', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Authorize Access</span> <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
