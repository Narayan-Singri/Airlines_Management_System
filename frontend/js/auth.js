/**
 * Authentication & Session Management
 * Manages JWT tokens in sessionStorage safely with role verification.
 */
import { CONFIG } from './config.js';

export function getToken() {
  return sessionStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
}

export function setToken(token) {
  if (token) {
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
  } else {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  }
}

export function getUser() {
  const data = sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  }
}

export function clearSession() {
  sessionStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  sessionStorage.removeItem(CONFIG.STORAGE_KEYS.PENDING_BOOKING);
}

export function isLoggedIn() {
  return !!getToken();
}

export function isStaff() {
  const user = getUser();
  return !!(user && (user.role === 'staff' || user.emp_type));
}

export function isCustomer() {
  const user = getUser();
  return !!(user && user.role === 'customer');
}

export function logout(redirectUrl = '/login.html') {
  clearSession();
  window.location.href = redirectUrl;
}

export function getStaffHomeUrl(user = getUser()) {
  if (!user) return '/staff/login.html';
  if (user.emp_type === 'PILOT') {
    return '/staff/conditions.html';
  }
  if (user.emp_type === 'CABIN_CREW') {
    return '/staff/flight-status.html';
  }
  return '/staff/checkin.html';
}

export function setupStaffNavbar(activePage = '') {
  const user = getUser();
  if (!user) return;

  const role = user.emp_type || 'STAFF';
  const roleBadge = document.getElementById('staff-role-badge');
  if (roleBadge) roleBadge.textContent = role;

  const checkinLink = document.querySelector('[data-nav="checkin"]') || document.querySelector('a[href*="checkin"]');
  const conditionsLink = document.querySelector('[data-nav="conditions"]') || document.querySelector('a[href*="conditions"]');
  const statusLink = document.querySelector('[data-nav="status"]') || document.querySelector('a[href*="flight-status"]');

  // Ground check-in is restricted to GROUND_STAFF and ADMIN
  if (checkinLink && role !== 'GROUND_STAFF' && role !== 'ADMIN') {
    checkinLink.remove();
  }
  // Flight conditions logger is restricted to PILOT and ADMIN
  if (conditionsLink && role !== 'PILOT' && role !== 'ADMIN') {
    conditionsLink.remove();
  }
}

/**
 * Route Guard for customer-only pages
 */
export function requireCustomerAuth(redirect = '/login.html') {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = `${redirect}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }
  if (isStaff()) {
    // Staff should not access customer booking pages
    window.location.href = getStaffHomeUrl(user);
    return false;
  }
  return true;
}

/**
 * Route Guard for staff-only portal pages
 */
export function requireStaffAuth(allowedRoles = [], redirect = '/staff/login.html') {
  const token = getToken();
  const user = getUser();
  if (!token || !user || !isStaff()) {
    window.location.href = `${redirect}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }

  if (allowedRoles.length > 0 && user.emp_type) {
    if (!allowedRoles.includes(user.emp_type) && user.emp_type !== 'ADMIN') {
      alert(`Access restricted. Your role '${user.emp_type}' is not authorized for this section.`);
      const fallbackUrl = getStaffHomeUrl(user);
      // Immediately navigate without creating a history loop
      window.location.replace(fallbackUrl);
      return false;
    }
  }
  return true;
}
