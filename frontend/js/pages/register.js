/**
 * Customer Registration Page Controller
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { setToken, setUser } from '../auth.js';
import { renderHeader, renderFooter, showToast } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();

  setupRegisterForm();
});

function setupRegisterForm() {
  const form = document.getElementById('customer-register-form');
  const submitBtn = document.getElementById('btn-reg-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value.trim() || null;
    const passportNo = document.getElementById('reg-passport').value.trim().toUpperCase() || null;
    const nationality = document.getElementById('reg-nationality').value.trim() || 'Indian';

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating account...</span>`;

    try {
      // 1. Register customer
      await api.post('/auth/register', {
        full_name: fullName,
        email,
        password,
        phone,
        passport_no: passportNo,
        nationality
      });

      showToast('Registration Successful', 'Signing you in...', 'success');

      // 2. Automatically authenticate
      const tokenResp = await api.post('/auth/login', { email, password });
      setToken(tokenResp.access_token);

      const profile = await api.get('/auth/me');
      setUser(profile);

      setTimeout(() => {
        const pending = sessionStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);
        window.location.href = pending ? '/checkout.html' : '/my-bookings.html';
      }, 800);

    } catch (err) {
      showToast('Registration Failed', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Account & Sign In</span> <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
