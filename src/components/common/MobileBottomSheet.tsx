import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useSmartDismiss } from '../../lib/useSmartDismiss';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeight?: string; // e.g. '85dvh', '90dvh'
  showHandle?: boolean;
  showCloseButton?: boolean;
  dismissOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * MobileBottomSheet - Unified mobile bottom sheet component for LifeOS
 * - Touch pull-down gesture to dismiss
 * - Micro-interaction sounds and smooth spring physics
 * - Strict 44px touch targets & Safe area inset bottom support
 * - Safe body scroll lock & smart click-outside dismissal
 * - 100% desktop isolated (md:hidden)
 */
export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  headerAction,
  children,
  footer,
  maxHeight = '88dvh',
  showHandle = true,
  showCloseButton = true,
  dismissOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  contentClassName = ''
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  // Lock body scroll when bottom sheet is active
  useBodyScrollLock(isOpen);

  // Smart dismiss for click outside and escape key
  useSmartDismiss({
    isOpen,
    onDismiss: onClose,
    targetRef: sheetRef,
    closeOnEscape,
    closeOnClickOutside: dismissOnBackdrop
  });

  const handleDismiss = useCallback(() => {
    try {
      soundEngine.playPop();
    } catch {}
    setDragY(0);
    setIsDragging(false);
    onClose();
  }, [onClose]);

  // Touch gesture handlers for pull-down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const deltaY = currentYRef.current - startYRef.current;
    
    // Only allow downward drag
    if (deltaY > 0) {
      // Add slight resistance
      const dampedY = deltaY * 0.75;
      setDragY(dampedY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const deltaY = currentYRef.current - startYRef.current;
    setIsDragging(false);

    // If dragged down more than 75px, trigger dismiss
    if (deltaY > 75) {
      handleDismiss();
    } else {
      // Spring back
      setDragY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/65 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={() => {
          if (dismissOnBackdrop) handleDismiss();
        }}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        style={{
          maxHeight,
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`relative z-50 flex flex-col w-full bg-white dark:bg-[#141E30] border-t border-slate-200 dark:border-white/[0.1] rounded-t-3xl shadow-2xl overflow-hidden animate-bottom-sheet ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Pull Handle Header Area (Draggable) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-3 pb-2 px-4 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          {showHandle && (
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-full mx-auto transition-colors" />
          )}

          {/* Optional Title Bar */}
          {(title || showCloseButton || headerAction) && (
            <div className="flex items-center justify-between pt-2.5 pb-1 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="min-w-0 flex-1 pr-3">
                {typeof title === 'string' ? (
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug truncate">
                    {title}
                  </h3>
                ) : (
                  title
                )}
                {subtitle && (
                  typeof subtitle === 'string' ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  ) : (
                    subtitle
                  )
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {headerAction}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain px-4 py-2 [scrollbar-gutter:stable] ${
            footer ? 'pb-2' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
          } ${contentClassName}`}
        >
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
