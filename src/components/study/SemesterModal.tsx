import React, { useState, useEffect, useRef } from 'react';
import { Calendar, X, AlertCircle } from 'lucide-react';
import { AcademicSemester } from '../../lib/gradeEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface SemesterModalProps {
  onClose: () => void;
  onSaveSemester: (newSem: AcademicSemester) => void;
}

export function SemesterModal({ onClose, onSaveSemester }: SemesterModalProps) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const [name, setName] = useState('');
  const [year, setYear] = useState('2024 - 2025');
  const [targetGpa, setTargetGpa] = useState<number>(8.0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormDirty = name.trim().length > 0;

  const triggerShake = () => {
    soundEngine.playPop();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập tên học kỳ (ví dụ: Học kỳ 2)');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      onSaveSemester({
        id: 'sem_' + Date.now(),
        name: trimmed,
        year: year.trim(),
        isCurrent: true,
        targetGpa: Number(targetGpa) || 8.0
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isFormDirty) triggerShake();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting, isFormDirty]);

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget && !isSubmitting) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs cursor-default animate-in fade-in"
    >
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm bg-white dark:bg-[#141E30] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Thêm Học kỳ mới
          </h3>
          <button 
            type="button" 
            onClick={handleSafeDismiss} 
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên học kỳ *</label>
            <div className="relative">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="VD: Học kỳ 1, Kì Hè 2025..."
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Xoá nhanh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Năm học</label>
            <input 
              type="text" 
              placeholder="VD: 2024 - 2025"
              value={year} 
              onChange={e => setYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mục tiêu GPA kỳ này</label>
            <input 
              type="number" 
              step="0.1" 
              min="0" 
              max="10"
              value={targetGpa} 
              onChange={e => setTargetGpa(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={handleSafeDismiss} 
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              Lưu học kỳ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
