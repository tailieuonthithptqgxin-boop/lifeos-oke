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
    // only reload window if user is NOT in an active learning/study session!
    if (typeof window !== 'undefined') {
      const isStudying = Boolean(
        localStorage.getItem('lifeos_vocab_session_state') ||
        localStorage.getItem('lifeos_pomodoro_active_session') ||
        sessionStorage.getItem('lifeos_active_study')
      );

      if (!isStudying) {
        const reloadKey = 'lifeos_chunk_reload_' + (exportName || 'app');
        const hasReloaded = sessionStorage.getItem(reloadKey);
        if (!hasReloaded) {
          sessionStorage.setItem(reloadKey, 'true');
          console.warn(`[LazyLoader] Permanent chunk load failure for "${exportName}". Reloading page to fetch newest build...`, lastError);
          window.location.reload();
        } else {
          sessionStorage.removeItem(reloadKey);
        }
      } else {
        console.warn(`[LazyLoader] Chunk load error for "${exportName}", but auto-reload was suppressed to protect active learning data.`);
      }
    }

    // Rather than throwing unhandled rejection and causing infinite Suspense spinner or full page crash,
    // return a self-healing fallback UI with interactive retry button
    const FallbackRecoveryComponent: React.FC = () => {
      return React.createElement(
        'div',
        { className: 'flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[420px]' },
        React.createElement(
          'div',
          { className: 'max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-4' },
          React.createElement('div', { className: 'w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl font-bold' }, '⚠️'),
          React.createElement('h3', { className: 'text-base font-bold text-slate-900 dark:text-white' }, `Không thể tải phân hệ ${exportName || 'yêu cầu'}`),
          React.createElement('p', { className: 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed' }, 'Kết nối mạng bị gián đoạn hoặc phiên bản vừa được cập nhật. Dữ liệu của bạn vẫn an toàn trong cơ sở dữ liệu.'),
          React.createElement(
            'div',
            { className: 'flex flex-col sm:flex-row items-center justify-center gap-3 pt-2' },
            React.createElement('button', {
              type: 'button',
              onClick: () => window.location.reload(),
              className: 'w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer'
            }, 'Tải lại trang web'),
            React.createElement('button', {
              type: 'button',
              onClick: () => { window.location.href = '/'; },
              className: 'w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer'
            }, 'Về bảng điều khiển')
          )
        )
      );
    };

    return { default: FallbackRecoveryComponent as unknown as T };
  });
}
