import React, { useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';
import { LifeHarmonyRadarWidget } from '../LifeHarmonyRadarWidget';
import { LifeHarmonyOverview } from '../../lib/lifeHarmonyEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface LifeHarmonyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  harmony: LifeHarmonyOverview;
  onExploreGoals?: () => void;
}

export function LifeHarmonyDetailModal({
  isOpen,
  onClose,
  harmony,
  onExploreGoals
}: LifeHarmonyDetailModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto animate-modal-enter transition-transform"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Chỉ Số Cân Bằng Cuộc Sống 5D</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đo lường sự hài hòa 5 trụ cột: Sức khỏe, Sự nghiệp, Học tập, Tài chính, Tinh thần.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Life Harmony Radar Widget */}
        <div className="pt-1">
          <LifeHarmonyRadarWidget
            harmony={harmony}
            onExploreGoals={onExploreGoals}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
