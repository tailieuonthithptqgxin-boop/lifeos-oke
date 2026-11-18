import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerPwaServiceWorker } from './lib/pwa';
import { initGlobalButtonClickLock } from './lib/buttonClickLock';

// Global anti-spam button lock (protects Free Tier from rapid-fire multi-tap request flooding)
initGlobalButtonClickLock();

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

// Resilient chunk error handler: Suppress aggressive reloads to protect active user sessions
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const isStudying = Boolean(
    localStorage.getItem('lifeos_vocab_session_state') ||
    localStorage.getItem('lifeos_pomodoro_active_session') ||
    sessionStorage.getItem('lifeos_active_study')
  );
  if (isStudying) {
    console.warn('[Vite] Preload chunk error detected, but auto-reload was suppressed to protect active learning session.');
    return;
  }
  const reloadKey = 'lifeos_vite_preload_retry';
  const hasRetried = sessionStorage.getItem(reloadKey);
  if (!hasRetried) {
    sessionStorage.setItem(reloadKey, 'true');
    console.warn('[Vite] Preload chunk mismatch. Performing safe one-time reload...');
    window.location.reload();
  } else {
    sessionStorage.removeItem(reloadKey);
    console.warn('[Vite] Preload chunk retry already attempted. Preserving active session.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

