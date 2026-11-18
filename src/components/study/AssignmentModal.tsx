import React, { useState, useEffect, useRef } from 'react';
import { FileCheck, X, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface AssignmentModalProps {
  assignment: any;
  subjects?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

export function AssignmentModal({ assignment, subjects = [], onClose, onSave }: AssignmentModalProps) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const initialTitle = assignment?.title || '';
  const [title, setTitle] = useState(initialTitle);
  const [subjectId, setSubjectId] = useState(assignment?.subjectId || subjects[0]?.id || '');
  const [dueDate, setDueDate] = useState(assignment?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [weight, setWeight] = useState(assignment?.weight ?? 15);
  const [status, setStatus] = useState(assignment?.status || 'Chưa làm');
  const [grade, setGrade] = useState(assignment?.grade ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormDirty = 
    title.trim() !== initialTitle ||
    subjectId !== (assignment?.subjectId || subjects[0]?.id || '') ||
    dueDate !== (assignment?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]) ||
    status !== (assignment?.status || 'Chưa làm') ||
    String(grade) !== String(assignment?.grade ?? '');

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
      setErrorMessage('Vui lòng nhập tên bài tập');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      onSave({
        title: trimmedTitle,
        subjectId: subjectId || null,
        dueDate,
        status,
        grade: grade !== '' ? Number(grade) : null,
        estimatedHours: 2,
        actualHours: 0
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
            <FileCheck className="w-5 h-5 text-amber-600" />
            {assignment ? 'Chỉnh sửa Bài tập' : 'Thêm Bài tập mới'}
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên bài tập *</label>
            <div className="relative">
              <input 
                type="text" 
                required
                autoFocus
                placeholder="VD: Bài tập lớn Giữa kỳ, Essay tiếng Anh..."
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn nộp (Due Date)</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="Chưa làm">Chưa làm</option>
                <option value="Đang làm">Đang làm</option>
                <option value="Completed">Hoàn thành</option>
              </select>
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
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              {assignment ? 'Lưu thay đổi' : 'Thêm Bài tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
