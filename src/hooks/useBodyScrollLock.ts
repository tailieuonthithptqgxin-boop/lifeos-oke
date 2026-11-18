import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Restores original overflow and touchAction styles when closed or unmounted.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isLocked]);
}
