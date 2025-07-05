import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Network request interceptor to detect HTTP requests
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
// Force redeploy Fri Jul  4 16:34:33 CDT 2025
