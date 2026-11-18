import React, { useState, useEffect, useRef } from 'react';
import { Target, X, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';
import { saveExamDraft, loadExamDraft, clearExamDraft } from '../../lib/learningAutoSave';

interface ExamModalProps {
  exam: any;
  subjects?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

export function ExamModal({ exam, subjects = [], onClose, onSave }: ExamModalProps) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialTitle = exam?.title || '';
  const [title, setTitle] = useState(initialTitle);
  const [subjectId, setSubjectId] = useState(exam?.subjectId || subjects[0]?.id || '');
  const [date, setDate] = useState(exam?.date || exam?.examDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [targetScore, setTargetScore] = useState(exam?.targetScore ?? 8.5);
  const [actualScore, setActualScore] = useState(exam?.actualScore ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Save & Instant Recovery for Exam Drafts
  useEffect(() => {
    if (!exam) {
      const draft = loadExamDraft();
      if (draft && draft.title?.trim()) {
        setTitle(draft.title);
        if (draft.subjectId) setSubjectId(draft.subjectId);
        if (draft.date) setDate(draft.date);
        if (draft.targetScore) setTargetScore(draft.targetScore);
        if (draft.actualScore !== undefined) setActualScore(draft.actualScore);
      }
    }
  }, [exam]);

  useEffect(() => {
    if (!exam && title.trim()) {
      saveExamDraft({
        title,
        subjectId,
        date,
        targetScore: Number(targetScore),
        actualScore
      });
    }
  }, [exam, title, subjectId, date, targetScore, actualScore]);

  const isFormDirty = 
    title.trim() !== initialTitle ||
    subjectId !== (exam?.subjectId || subjects[0]?.id || '') ||
    date !== (exam?.date || exam?.examDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]) ||
    Number(targetScore) !== Number(exam?.targetScore ?? 8.5) ||
    String(actualScore) !== String(exam?.actualScore ?? '');

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
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Vui lòng nhập tên kỳ thi');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    clearExamDraft();
    try {
      onSave({
        title: trimmedTitle,
        subjectId: subjectId || null,
        examDate: date,
        targetScore: Number(targetScore) || 8,
        actualScore: actualScore !== '' ? Number(actualScore) : null,
        status: 'Upcoming'
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
            <Target className="w-5 h-5 text-rose-600" />
            {exam ? 'Chỉnh sửa Kỳ thi' : 'Thêm Lịch thi mới'}
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên kỳ thi *</label>
            <div className="relative">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="VD: Thi Cuối kỳ Giải tích, Giữa kỳ Tiếng Anh..."
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
              {title && (
                <button
                  type="button"
                  onClick={() => setTitle('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Xoá nhanh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Môn học</label>
            <select 
              value={subjectId} 
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày thi (Exam Date)</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm mục tiêu (1-10)</label>
              <input 
                type="number"
                step="0.1"
                min="0"
                max="10" 
                value={targetScore} 
                onChange={e => setTargetScore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none font-bold text-rose-600"
              />
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
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              {exam ? 'Lưu thay đổi' : 'Thêm Kỳ thi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
