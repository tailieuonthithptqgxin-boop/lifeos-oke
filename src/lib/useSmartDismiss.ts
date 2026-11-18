/**
 * Production Smart Dismiss & Layered Overlay Management System
 * Provides resilient Click-Outside detection, Touch dismissal, and Layered Escape Stacking.
 * Guaranteed zero-leak event listeners with automatic cleanup.
 */
import { useEffect, useRef, useCallback, RefObject } from 'react';

// Global Stacking Manager for Layered Dismissal (Escape key closes topmost overlay first)
type DismissHandler = () => void;
const dismissStack: DismissHandler[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (dismissStack.length > 0) {
          const topHandler = dismissStack[dismissStack.length - 1];
          if (typeof topHandler === 'function') {
            e.preventDefault();
            e.stopPropagation();
            topHandler();
          }
        }
      }
    },
    true // Capture phase to intercept before children
  );
}

export interface UseSmartDismissOptions {
  isOpen: boolean;
  onDismiss: () => void;
  targetRef: RefObject<HTMLElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  ignoreRefs?: Array<RefObject<HTMLElement | null>>;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  disabled?: boolean;
}

export function useSmartDismiss({
  isOpen,
  onDismiss,
  targetRef,
  triggerRef,
  ignoreRefs = [],
  closeOnEscape = true,
  closeOnClickOutside = true,
  disabled = false
}: UseSmartDismissOptions) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Stable handler for stack registration
  const handleDismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  // 1. Layered Escape Stack Management
  useEffect(() => {
    if (!isOpen || disabled || !closeOnEscape) return;

    dismissStack.push(handleDismiss);
    return () => {
      const idx = dismissStack.lastIndexOf(handleDismiss);
      if (idx !== -1) {
        dismissStack.splice(idx, 1);
      }
    };
  }, [isOpen, disabled, closeOnEscape, handleDismiss]);

  // 2. Click Outside & Touch Outside Detection
  useEffect(() => {
    if (!isOpen || disabled || !closeOnClickOutside) return;

    let touchStartOutside = false;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const container = targetRef.current;
      if (!container) return;

      // Click Inside check: If the click occurred inside the popup, do nothing
      if (container.contains(target)) {
        return;
      }

      // Trigger button check: If the user clicked the toggle button, let toggle handler handle it
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }

      // Ignore refs check: (e.g. portal elements or custom interactive controls)
      for (const ref of ignoreRefs) {
        if (ref.current && ref.current.contains(target)) {
          return;
        }
      }

      // Click is genuinely outside: dismiss!
      onDismissRef.current();
    };

    // For touch devices, ensure gesture started outside to avoid accidental dismiss on swipe/scroll
    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !targetRef.current) return;
      touchStartOutside = !targetRef.current.contains(target);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartOutside) return;
      handlePointerDown(event);
      touchStartOutside = false;
    };

    // Attach passive listeners to document
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, disabled, closeOnClickOutside, targetRef, triggerRef, ignoreRefs]);
}
