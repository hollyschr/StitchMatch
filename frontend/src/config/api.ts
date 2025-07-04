// API configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';

// Debug: Log the API URL being used
console.log('API_BASE_URL:', API_BASE_URL);

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