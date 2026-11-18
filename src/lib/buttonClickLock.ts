/**
 * Universal Button Click Lock & Spam-Prevention Engine for LifeOS
 * Free-Tier Scale Optimization: Neutralizes rapid-fire clicking (0.5 - 1.0s cooldown)
 * Prevents mobile users from multi-tapping submit/action buttons and flooding server APIs.
 */

import { useState, useCallback, useRef } from 'react';

const THROTTLE_DURATION_MS = 650; // 0.65s lock window

/**
 * Initializes global DOM capture listener to prevent rapid multi-taps across all buttons
 */
export function initGlobalButtonClickLock(): void {
  if (typeof window === 'undefined') return;

  const lockedButtons = new WeakSet<HTMLElement>();

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Find the closest button or clickable action element
    const btn = target.closest('button, [role="button"], input[type="submit"]') as HTMLElement | null;
    if (!btn) return;

    // Allow opting out via attribute data-no-throttle="true" or navigation tab elements
    if (
      btn.getAttribute('data-no-throttle') === 'true' ||
      btn.getAttribute('aria-disabled') === 'true' ||
      btn.id?.startsWith('mobile-tab-') // Don't delay tab switching
    ) {
      return;
    }

    // If button is already locked in cooldown, intercept and neutralize
    if (lockedButtons.has(btn)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    // Lock button for THROTTLE_DURATION_MS
    lockedButtons.add(btn);
    btn.classList.add('btn-throttled');

    setTimeout(() => {
      lockedButtons.delete(btn);
      btn.classList.remove('btn-throttled');
    }, THROTTLE_DURATION_MS);
  }, true); // Capture phase to guarantee interception before inline handlers
}

/**
 * React Hook for explicit action debouncing & locking
 */
export function useClickLock(cooldownMs: number = THROTTLE_DURATION_MS) {
  const [isLocked, setIsLocked] = useState(false);
  const lockTimerRef = useRef<any>(null);

  const lockAction = useCallback(async <T>(action: () => Promise<T> | T): Promise<T | undefined> => {
    if (isLocked) {
      console.warn('[useClickLock] Action ignored: lock cooldown active.');
      return undefined;
    }

    setIsLocked(true);
    try {
      return await action();
    } finally {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        setIsLocked(false);
      }, cooldownMs);
    }
  }, [isLocked, cooldownMs]);

  return { isLocked, lockAction };
}

/**
 * Utility to debounce any function call
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 400
): (...args: Parameters<T>) => void {
  let timeoutId: any = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Utility to throttle any function call
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number = 600
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}
