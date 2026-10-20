import React, { useState, useEffect } from 'react';
import { toast, ToastItem } from '../lib/toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((updated) => {
      setToasts(updated);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite"
      aria-label="Thông báo hệ thống"
      className="fixed top-4 inset-x-0 sm:top-5 sm:right-6 sm:left-auto z-[9999] flex flex-col items-center sm:items-end gap-2.5 px-4 pointer-events-none max-w-full sm:max-w-md w-full"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === 'success';
        const isError = item.type === 'error';
        const isWarning = item.type === 'warning';

        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto w-full flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-3 fade-in ${
              isSuccess
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/40'
                : isError
                ? 'bg-rose-950/95 text-rose-100 border-rose-500/40 shadow-rose-950/40'
                : isWarning
                ? 'bg-amber-950/95 text-amber-100 border-amber-500/40 shadow-amber-950/40'
                : 'bg-slate-900/95 text-slate-100 border-slate-700/60 shadow-slate-950/50'
            }`}
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.5]" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400 stroke-[2.5]" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 stroke-[2.5]" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 stroke-[2.5]" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              {item.title && (
                <h4 className="font-bold text-xs sm:text-sm tracking-tight leading-snug">
                  {item.title}
                </h4>
              )}
              <p className={`text-xs leading-relaxed ${item.title ? 'mt-0.5 opacity-90' : 'font-medium'}`}>
                {item.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="shrink-0 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
