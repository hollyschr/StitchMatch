import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check for and unregister service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('🔍 Found service worker:', registration);
      registration.unregister();
      console.log('🔍 Unregistered service worker');
    }
  });
}

// Comprehensive network request interceptor to detect HTTP requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (typeof url === 'string' && url.includes('web-production-e76a.up.railway.app')) {
    console.log('🔍 FETCH REQUEST DETECTED:', url);
    console.log('🔍 Stack trace:', new Error().stack);
    if (url.startsWith('http://')) {
      console.error('🚨 HTTP REQUEST DETECTED:', url);
      console.error('🚨 Converting to HTTPS...');
      args[0] = url.replace('http://', 'https://');
    }
  }
  return originalFetch.apply(this, args);
};

// Intercept XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (typeof url === 'string' && url.includes('web-production-e76a.up.railway.app')) {
    console.log('🔍 XHR REQUEST DETECTED:', url);
    console.log('🔍 Stack trace:', new Error().stack);
    if (url.startsWith('http://')) {
      console.error('🚨 HTTP XHR REQUEST DETECTED:', url);
      console.error('🚨 Converting to HTTPS...');
      url = url.replace('http://', 'https://');
    }
  }
  return originalXHROpen.call(this, method, url, ...args);
};

// Monitor all network requests using Performance API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name && entry.name.includes('web-production-e76a.up.railway.app')) {
      console.log('🔍 PERFORMANCE REQUEST DETECTED:', entry.name);
      if (entry.name.startsWith('http://')) {
        console.error('🚨 HTTP PERFORMANCE REQUEST DETECTED:', entry.name);
      }
    }
  }
});
observer.observe({ entryTypes: ['resource'] });

// Log all network requests in the Network tab
console.log('🔍 Network interceptor installed - monitoring all requests to Railway domain');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// Force redeploy Fri Jul  4 16:34:33 CDT 2025
