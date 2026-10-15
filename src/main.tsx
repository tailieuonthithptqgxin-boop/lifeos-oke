import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerPwaServiceWorker } from './lib/pwa';

// Clean up deprecated notification entries from localStorage if present
try {
  const visible = localStorage.getItem('lifeos_visible_modules');
  if (visible && visible.includes('notification')) {
    const parsed = JSON.parse(visible);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((id: string) => !id.includes('notification'));
      localStorage.setItem('lifeos_visible_modules', JSON.stringify(cleaned));
    }
  }
} catch (e) {}

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

