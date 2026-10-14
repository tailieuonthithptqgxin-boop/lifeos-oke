import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerPwaServiceWorker } from './lib/pwa';

// Initialize PWA Service Worker for offline capability & desktop/mobile installation
registerPwaServiceWorker();

// Auto-reload to fetch fresh bundles when Vite detects a deployment chunk hash mismatch
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Vite] Preload chunk error detected (likely due to fresh deployment). Reloading page...');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

