import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.fetch to attach token from localStorage
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = localStorage.getItem('token');
      if (token) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('Authorization')) {
            init.headers.set('Authorization', `Bearer ${token}`);
          }
        } else if (Array.isArray(init.headers)) {
          const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
          if (!hasAuth) {
            init.headers.push(['Authorization', `Bearer ${token}`]);
          }
        } else {
          const headersRecord = init.headers as Record<string, string>;
          if (!headersRecord['Authorization'] && !headersRecord['authorization']) {
            headersRecord['Authorization'] = `Bearer ${token}`;
          }
        }
      }
      return originalFetch(input, init);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.warn("Failed to redefine window.fetch using Object.defineProperty", err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
