/**
 * Application Configuration
 * Modify API_BASE_URL here for local development or production deployment.
 */
export const CONFIG = {
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : window.location.origin,
  APP_NAME: 'SoraKaze Air',
  STORAGE_KEYS: {
    TOKEN: 'sorakaze_jwt_token',
    USER: 'sorakaze_user_profile',
    PENDING_BOOKING: 'sorakaze_pending_booking',
  }
};
