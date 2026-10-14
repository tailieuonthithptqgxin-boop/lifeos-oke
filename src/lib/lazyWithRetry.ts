import React from 'react';

function resolveComponent(mod: any, exportName?: string): any {
  if (!mod) return null;
  // If user specified an explicit export name
  if (exportName && mod[exportName]) {
    return mod[exportName];
  }
  // Standard default export
  if (mod.default) {
    if (typeof mod.default === 'object' && exportName && mod.default[exportName]) {
      return mod.default[exportName];
    }
    return mod.default;
  }
  // If mod itself is a React component (function or class)
  if (typeof mod === 'function') {
    return mod;
  }
  // Fallback: search for first exported component function in object
  if (typeof mod === 'object') {
    for (const key of Object.keys(mod)) {
      if (typeof mod[key] === 'function' && /^[A-Z]/.test(key)) {
        return mod[key];
      }
    }
  }
  return null;
}

/**
 * Bulletproof dynamic import loader with auto-retry and cache-busting.
 * Eliminates Minified React Error #306 ("Element type is invalid. Received a promise that resolves to: undefined")
 * and handles stale chunks after new deployments on Railway / cloud hosting.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  exportName?: string,
  maxRetries = 2,
  baseInterval = 400
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const mod = await factory();
        const Component = resolveComponent(mod, exportName);
        
        if (!Component || (typeof Component !== 'function' && typeof Component !== 'object')) {
          throw new Error(
            `[LazyLoader] Module "${exportName || 'Component'}" resolved to invalid value (${typeof Component}). Check exports.`
          );
        }

        return { default: Component };
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[LazyLoader] Attempt ${attempt + 1}/${maxRetries + 1} to load "${exportName || 'view'}" failed:`,
          error?.message || error
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, baseInterval * Math.pow(1.5, attempt))
          );
        }
      }
    }

    // If chunk failed permanently (e.g., stale hash after a new build on Railway),
    // automatically reload window ONCE to fetch the new HTML and fresh bundles.
    if (typeof window !== 'undefined') {
      const reloadKey = 'lifeos_chunk_reload_' + (exportName || 'app');
      const hasReloaded = sessionStorage.getItem(reloadKey);
      if (!hasReloaded) {
        sessionStorage.setItem(reloadKey, 'true');
        console.warn(`[LazyLoader] Permanent chunk load failure for "${exportName}". Reloading page to fetch newest build...`, lastError);
        window.location.reload();
        return new Promise(() => {}); // never resolves because page is reloading
      }
      sessionStorage.removeItem(reloadKey);
    }

    throw lastError || new Error(`[LazyLoader] Failed to load module "${exportName || 'view'}"`);
  });
}
