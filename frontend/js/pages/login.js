/**
 * Customer Login Page Controller
 */
import { api } from '../api.js';
import { CONFIG } from '../config.js';
import { setToken, setUser, isLoggedIn, isCustomer } from '../auth.js';
import { renderHeader, renderFooter, showToast } from '../ui.js';

const urlParams = new URLSearchParams(window.location.search);
const redirectParam = urlParams.get('redirect');
const isExpired = urlParams.get('expired');

document.addEventListener('DOMContentLoaded', () => {
  renderHeader();
  renderFooter();

  if (isExpired) {
    showToast('Session Expired', 'Please sign in to continue.', 'warning');
  }

  // If already logged in as customer, redirect
  if (isLoggedIn() && isCustomer()) {
    window.location.href = redirectParam || '/my-bookings.html';
    return;
  }

  setupDemoAutofill();
  setupLoginForm();
});

function setupDemoAutofill() {
  const btnDemo = document.getElementById('btn-demo-customer');
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');

  if (btnDemo) {
    btnDemo.addEventListener('click', () => {
      emailInput.value = 'test@mail.test';
      passInput.value = 'Customer@123';
      showToast('Demo Credentials Filled', 'Click Sign In to proceed.', 'info');
    });
  }
}

function setupLoginForm() {
  const form = document.getElementById('customer-login-form');
  const submitBtn = document.getElementById('btn-login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing in...</span>`;

    try {
      const tokenResp = await api.post('/auth/login', { email, password });
      setToken(tokenResp.access_token);

      // Inspect token profile
      const userProfile = await api.get('/auth/me');
      setUser(userProfile);

      showToast('Welcome Back', `Signed in as ${userProfile.full_name || email}`, 'success');

      setTimeout(() => {
        if (redirectParam) {
          window.location.href = redirectParam;
        } else {
          // If pending booking in session, go to checkout, else my-bookings
          const pending = sessionStorage.getItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);
          window.location.href = pending ? '/checkout.html' : '/my-bookings.html';
        }
      }, 700);

    } catch (err) {
      showToast('Sign In Failed', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In</span> <i data-lucide="arrow-right" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
