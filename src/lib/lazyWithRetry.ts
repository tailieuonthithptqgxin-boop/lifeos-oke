import React from 'react';

/**
 * Bulletproof dynamic import loader with auto-retry and cache-busting
 * Solves: "TypeError: Failed to fetch dynamically imported module"
 * which occurs in development (HMR / Vite pre-bundle transforms) or production
 * when a chunk is recompiled or stale in browser cache.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>,
  retriesLeft = 2,
  interval = 400
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const component = await factory();
      return component.default ? component : { default: component };
    } catch (error: any) {
      if (retriesLeft <= 0) {
        // If still failing after retries in browser session, force one clean reload of window
        const hasReloaded = sessionStorage.getItem('lifeos_chunk_failed_reload');
        if (!hasReloaded && typeof window !== 'undefined') {
          sessionStorage.setItem('lifeos_chunk_failed_reload', 'true');
          console.warn('[LazyLoader] Chunk load failed permanently, reloading page to get fresh bundle...', error);
          window.location.reload();
          return new Promise(() => {}); // never resolves because page is reloading
        }
        sessionStorage.removeItem('lifeos_chunk_failed_reload');
        throw error;
      }

      console.warn(`[LazyLoader] Chunk load failed, retrying in ${interval}ms (${retriesLeft} retries left)...`, error);
      await new Promise(resolve => setTimeout(resolve, interval));
      return lazyWithRetry(factory, retriesLeft - 1, interval * 1.5)._payload._result;
    }
  });
}
