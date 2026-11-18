import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface AdminConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isProcessing?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  variant = 'danger',
  isProcessing = false,
  onConfirm,
  onClose
}) => {
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      icon: <Trash2 className="w-5 h-5 stroke-[2]" />,
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white'
    },
    warning: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-5 h-5 stroke-[2]" />,
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white'
    },
    info: {
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      icon: <CheckCircle2 className="w-5 h-5 stroke-[2]" />,
      btnBg: 'bg-blue-600 hover:bg-blue-500 text-white'
    }
  }[variant];

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-default"
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (!isProcessing && e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${variantStyles.iconBg}`}>
              {variantStyles.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-50"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              soundEngine.playPop();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={async () => {
              soundEngine.playPop();
              await onConfirm();
            }}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${variantStyles.btnBg}`}
          >
            {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
