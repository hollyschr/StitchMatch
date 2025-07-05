// API configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://web-production-e76a.up.railway.app';

// Debug: Log the API URL being used
console.log('=== DEBUG INFO ===');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment variable:', (import.meta as any).env?.VITE_API_URL);
console.log('All env vars:', (import.meta as any).env);
console.log('==================');

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  endpoints: {
    patterns: `${API_BASE_URL}/patterns`,
    users: `${API_BASE_URL}/users`,
    auth: `${API_BASE_URL}/auth`,
    favorites: `${API_BASE_URL}/users`,
    yarn: `${API_BASE_URL}/users`,
    tools: `${API_BASE_URL}/users`,
    pdf: `${API_BASE_URL}/view-pdf`,
  }
};

export default API_CONFIG; 