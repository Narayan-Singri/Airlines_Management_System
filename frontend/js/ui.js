/**
 * UI Utilities & Shared Component Renderers
 * Provides consistent navbar, footer, toast notifications, formatters, and XSS sanitization.
 */
import { getUser, isLoggedIn, isStaff, isCustomer, logout, getStaffHomeUrl } from './auth.js';

/**
 * Escape raw strings before rendering into innerHTML to prevent XSS.
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format currency amount with INR or USD symbol.
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  if (currency === 'INR') {
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format date string into human readable format, e.g. '18 Aug 2026'
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Format time string into '14:30'
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Compute flight duration between two ISO timestamps, e.g. '2h 15m'
 */
export function formatDuration(departureIso, arrivalIso) {
  if (!departureIso || !arrivalIso) return '';
  const dep = new Date(departureIso);
  const arr = new Date(arrivalIso);
  const diffMs = arr - dep;
  if (diffMs <= 0) return '0h';
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins > 0 ? mins + 'm' : ''}`;
}

/**
 * Show a toast notification on bottom-right of viewport.
 * @param {string} title
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 */
export function showToast(title, message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="flex: 1;">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${message ? `<div class="toast-msg">${escapeHTML(message)}</div>` : ''}
    </div>
    <button class="toast-close" style="color: #94A3B8; font-size: 16px; line-height: 1;" aria-label="Close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/**
 * Render standard header across customer pages.
 */
export function renderHeader(activePage = '') {
  const headerContainer = document.getElementById('site-header');
  if (!headerContainer) return;

  const user = getUser();
  const loggedIn = isLoggedIn();

  let userSection = '';
  if (loggedIn && isCustomer()) {
    const firstName = user.full_name ? user.full_name.split(' ')[0] : 'Passenger';
    userSection = `
      <div class="user-menu-wrapper" style="position: relative;">
        <button id="user-menu-toggle" class="user-menu-btn">
          <i data-lucide="user" style="width: 16px; height: 16px;"></i>
          <span>Hi, ${escapeHTML(firstName)}</span>
          <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
        </button>
        <div id="user-dropdown" class="card" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); width: 200px; padding: 8px; z-index: 200; box-shadow: var(--shadow-lg);">
          <a href="/my-bookings.html" class="btn btn-outline btn-block btn-sm" style="justify-content: flex-start; border: none; margin-bottom: 4px;">
            <i data-lucide="ticket" style="width: 14px; height: 14px;"></i> My Bookings
          </a>
          <button id="logout-btn" class="btn btn-danger btn-block btn-sm" style="justify-content: flex-start;">
            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i> Sign Out
          </button>
        </div>
      </div>
    `;
  } else if (loggedIn && isStaff()) {
    const staffHome = getStaffHomeUrl(user);
    userSection = `
      <a href="${staffHome}" class="btn btn-sm btn-accent">
        <i data-lucide="shield" style="width: 14px; height: 14px;"></i> Staff Portal (${escapeHTML(user.emp_type || 'Staff')})
      </a>
      <button id="logout-btn" class="btn btn-sm btn-outline">Sign Out</button>
    `;
  } else {
    userSection = `
      <a href="/login.html" class="btn btn-sm btn-outline">Log In</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Sign Up</a>
    `;
  }

  headerContainer.innerHTML = `
    <div class="container nav-container">
      <a href="/index.html" class="brand-logo" aria-label="SoraKaze Air">
        <picture>
          <source srcset="/assets/logo.webp" type="image/webp">
          <img src="/assets/logo-clean.png" alt="SoraKaze Air" class="brand-logo-img" width="126" height="42" loading="eager">
        </picture>
      </a>

      <nav class="nav-links">
        <a href="/index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
        <a href="/search.html" class="nav-link ${activePage === 'flights' ? 'active' : ''}">Search Flights</a>
        <a href="/manage.html" class="nav-link ${activePage === 'manage' ? 'active' : ''}">Manage & Check-in</a>
        <a href="/status.html" class="nav-link ${activePage === 'status' ? 'active' : ''}">Flight Status</a>
        ${loggedIn && isCustomer() ? `<a href="/my-bookings.html" class="nav-link ${activePage === 'bookings' ? 'active' : ''}">My Bookings</a>` : ''}
      </nav>

      <div class="nav-actions">
        ${userSection}
        <button id="mobile-toggle-btn" class="mobile-menu-btn" aria-label="Toggle navigation">
          <i data-lucide="menu" style="width: 24px; height: 24px;"></i>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div id="mobile-drawer" class="mobile-nav-drawer">
      <a href="/index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a>
      <a href="/search.html" class="nav-link ${activePage === 'flights' ? 'active' : ''}">Search Flights</a>
      <a href="/manage.html" class="nav-link ${activePage === 'manage' ? 'active' : ''}">Manage & Check-in</a>
      <a href="/status.html" class="nav-link ${activePage === 'status' ? 'active' : ''}">Flight Status</a>
      ${loggedIn && isCustomer() ? `<a href="/my-bookings.html" class="nav-link ${activePage === 'bookings' ? 'active' : ''}">My Bookings</a>` : ''}
      <hr style="border: 0; border-top: 1px solid var(--color-border); margin: 8px 0;" />
      <a href="/staff/login.html" class="nav-link text-muted" style="font-size: 13px;">
        <i data-lucide="lock" style="width: 14px; height: 14px; display: inline;"></i> Staff Access
      </a>
    </div>
  `;

  // Attach event handlers
  const userMenuBtn = document.getElementById('user-menu-toggle');
  const userDropdown = document.getElementById('user-dropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
      userDropdown.style.display = 'none';
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logout());
  }

  const mobileBtn = document.getElementById('mobile-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  if (mobileBtn && mobileDrawer) {
    mobileBtn.addEventListener('click', () => {
      mobileDrawer.classList.toggle('open');
    });
  }

  // Render Lucide icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Render standard footer.
 */
export function renderFooter() {
  const footerContainer = document.getElementById('site-footer');
  if (!footerContainer) return;

  footerContainer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/index.html" class="footer-logo-badge" aria-label="SoraKaze Air Home">
            <picture>
              <source srcset="/assets/logo.webp" type="image/webp">
              <img src="/assets/logo-clean.png" alt="SoraKaze Air" class="brand-logo-img" width="108" height="36" loading="lazy">
            </picture>
          </a>
          <p style="color: #94A3B8; font-size: 14px; max-width: 320px; line-height: 1.6;">
            World-class flight bookings, transparent fares, and seamless passenger ground check-in. Safe travels across India and global destinations.
          </p>
        </div>

        <div class="footer-col">
          <h4>Passenger Services</h4>
          <div class="footer-links">
            <a href="/search.html" class="footer-link">Book Flights</a>
            <a href="/manage.html" class="footer-link">Online Check-in</a>
            <a href="/status.html" class="footer-link">Live Flight Status</a>
            <a href="/my-bookings.html" class="footer-link">Manage Bookings</a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Company & Safety</h4>
          <div class="footer-links">
            <a href="/index.html#why-us" class="footer-link">Why Fly With Us</a>
            <a href="/index.html#popular-routes" class="footer-link">Popular Destinations</a>
            <a href="/status.html" class="footer-link">Technical Inspection Logs</a>
            <a href="/staff/login.html" class="footer-link">Staff & Operations Portal</a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Support & Security</h4>
          <p style="color: #94A3B8; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
            24x7 Customer Priority Care & On-Time Arrival Guarantee.
          </p>
          <div style="display: flex; gap: 8px; color: #38BDF8; font-size: 13px; font-weight: 600;">
            <i data-lucide="phone-call" style="width: 16px; height: 16px;"></i> +91 1800-SORAKAZE
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div>&copy; ${new Date().getFullYear()} SoraKaze Air. All rights reserved.</div>
        <div style="display: flex; gap: 16px;">
          <span>PostgreSQL 18 Powered</span>
          <span>FastAPI REST Architecture</span>
          <a href="/staff/login.html" style="color: #64748B;">Internal Staff Access</a>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
