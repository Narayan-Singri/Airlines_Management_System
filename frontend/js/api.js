/**
 * Unified API Client Module
 * Handles all HTTP requests, JWT authorization headers, JSON responses, and error handling.
 */
import { CONFIG } from './config.js';
import { getToken, clearSession, isStaff } from './auth.js';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Perform an HTTP request to the backend API.
 * @param {string} endpoint - Path, e.g. '/flights' or '/auth/login'
 * @param {object} options - Fetch options (method, headers, body)
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    throw new ApiError(
      'Unable to connect to airline service. Please ensure the backend server is running.',
      0,
      netErr
    );
  }

  // Handle 401 Unauthorized: token expired or invalid
  if (response.status === 401) {
    // If not calling login/register itself
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      const redirectPage = isStaff() ? '/staff/login.html' : '/login.html';
      clearSession();
      window.location.href = `${redirectPage}?expired=1`;
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred. Please try again.';
    if (response.status === 401) {
      errorMsg = 'Your session has expired. Please sign in again.';
    } else if (response.status === 409) {
      errorMsg = typeof data?.detail === 'string' ? data.detail : 'This seat or resource is already booked or conflicting. Please choose another option.';
    } else if (response.status === 422 && data && Array.isArray(data.detail)) {
      // Map Pydantic validation errors to human-friendly messages
      const friendlyErrors = data.detail.map(err => {
        const field = err.loc ? err.loc[err.loc.length - 1] : 'field';
        if (field === 'method') return 'Please select a valid payment method (UPI, Card, Netbanking, or Wallet).';
        if (field === 'seat_no') return 'A valid seat selection is required.';
        if (field === 'amount') return 'Payment amount must be greater than zero.';
        if (field === 'passport_no') return 'A valid passport number is required.';
        if (field === 'flight_id') return 'Flight identification is missing.';
        return `Please check ${field}: ${err.msg}`;
      });
      errorMsg = friendlyErrors.join('. ');
    } else if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMsg = data.detail;
      } else if (data.message) {
        errorMsg = data.message;
      }
    }
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

// Convenience methods
export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};
