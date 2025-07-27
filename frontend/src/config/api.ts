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

// Force all Railway HTTP requests to HTTPS
const originalFetch = window.fetch;
window.fetch = function(url: string | Request, ...args: any[]) {
  let urlString = typeof url === 'string' ? url : url.url;
  
  // Convert any Railway HTTP URLs to HTTPS
  if (urlString.includes('web-production-e76a.up.railway.app') && urlString.startsWith('http://')) {
    urlString = urlString.replace('http://', 'https://');
    console.log('🔄 Converted HTTP to HTTPS:', urlString);
    
    if (typeof url === 'string') {
      url = urlString;
    } else {
      url = new Request(urlString, url);
    }
  }
  
  return originalFetch.call(this, url, ...args);
};

export default API_CONFIG; 