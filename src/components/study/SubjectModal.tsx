import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface SubjectModalProps {
  subject: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function SubjectModal({ subject, onClose, onSave }: SubjectModalProps) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialName = subject?.name || '';
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(subject?.code || '');
  const [targetGrade, setTargetGrade] = useState(subject?.targetGrade ?? 8.5);
  const [currentGrade, setCurrentGrade] = useState(subject?.currentGrade ?? 7.5);
  const [progress, setProgress] = useState(subject?.progress ?? 50);
  const [color, setColor] = useState(subject?.color || '#3b82f6');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const isFormDirty = 
    name.trim() !== initialName ||
    code.trim() !== (subject?.code || '').trim() ||
    Number(targetGrade) !== Number(subject?.targetGrade ?? 8.5) ||
    Number(currentGrade) !== Number(subject?.currentGrade ?? 7.5) ||
    Number(progress) !== Number(subject?.progress ?? 50) ||
    color !== (subject?.color || '#3b82f6');

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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Vui lòng nhập tên môn học');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    const trimmedCode = code.trim();
    const finalName = trimmedCode && !trimmedName.includes(trimmedCode)
      ? `${trimmedName} (${trimmedCode})`
      : trimmedName;

    try {
      onSave({
        name: finalName,
        targetGrade: Number(targetGrade) || 8,
        currentGrade: Number(currentGrade) || 0,
        progress: Math.min(Math.max(Number(progress) || 0, 0), 100),
        color
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
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in cursor-default"
    >
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md bg-white dark:bg-[#141E30] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {subject ? 'Chỉnh sửa Môn học' : 'Thêm Môn học mới'}
          </h3>
          <button 
            type="button" 
            onClick={handleSafeDismiss} 
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên môn học *</label>
            <div className="relative">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="VD: Giải tích 1, Lập trình Web..."
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mã môn học</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="VD: MAT101, IT202..."
                value={code} 
                onChange={e => setCode(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {code && (
                <button
                  type="button"
                  onClick={() => setCode('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Xoá nhanh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm mục tiêu (1-10)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                value={targetGrade} 
                onChange={e => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm hiện tại</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                value={currentGrade} 
                onChange={e => setCurrentGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Tiến độ hoàn thành: {progress}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress} 
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Màu sắc nhận diện</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-blue-500/30' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={handleSafeDismiss} 
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              {subject ? 'Lưu thay đổi' : 'Thêm Môn học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
