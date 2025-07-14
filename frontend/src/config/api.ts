// API configuration - HARDCODED RAILWAY URL
const API_BASE_URL = 'https://web-production-e76a.up.railway.app';

// Debug: Log the API URL being used
console.log('=== DEBUG INFO ===');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment variable:', (import.meta as any).env?.VITE_API_URL);
console.log('All env vars:', (import.meta as any).env);
console.log('Cache bust timestamp:', Date.now());
console.log('==================');

// URL validation function
const validateUrl = (url: string) => {
  if (url.startsWith('http://')) {
    console.error('🚨 HTTP URL DETECTED:', url);
    console.error('🚨 This should be HTTPS!');
    // Convert to HTTPS
    return url.replace('http://', 'https://');
  }
  return url;
};

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  endpoints: {
    patterns: validateUrl(`${API_BASE_URL}/patterns`),
    users: validateUrl(`${API_BASE_URL}/users`),
    auth: validateUrl(`${API_BASE_URL}/auth`),
    favorites: validateUrl(`${API_BASE_URL}/users`),
    yarn: validateUrl(`${API_BASE_URL}/users`),
    tools: validateUrl(`${API_BASE_URL}/users`),
    pdf: validateUrl(`${API_BASE_URL}/view-pdf`),
  }
};

// Debug: Log the constructed endpoints
console.log('=== API ENDPOINTS DEBUG ===');
console.log('patterns endpoint:', API_CONFIG.endpoints.patterns);
console.log('users endpoint:', API_CONFIG.endpoints.users);
console.log('favorites endpoint:', API_CONFIG.endpoints.favorites);
console.log('==========================');

export default API_CONFIG; 