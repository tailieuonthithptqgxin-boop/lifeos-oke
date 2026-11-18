import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, X, Check, ArrowRight, Plus, Sparkles, Inbox, AlertCircle } from 'lucide-react';
import { Task } from '../../lib/types';
import { soundEngine } from '../../lib/soundEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface TodayTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onAddTask: (title: string, priority?: string) => void;
  onGoToTasks: () => void;
  overdueTasks?: Task[];
  onRescheduleOverdue?: (taskId: string) => void;
  onRescheduleAllOverdue?: () => void;
}

export function TodayTasksModal({
  isOpen,
  onClose,
  tasks,
  onToggleComplete,
  onAddTask,
  onGoToTasks,
  overdueTasks = [],
  onRescheduleOverdue,
  onRescheduleAllOverdue
}: TodayTasksModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (newTitle.trim()) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (newTitle.trim()) {
          triggerShake();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, newTitle, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed || isSubmitting) return;
    try {
      setIsSubmitting(true);
      soundEngine.playPop();
      await Promise.resolve(onAddTask(trimmed));
      setNewTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDoneTask = (t: Task) => {
    const s = (t.status || '').toLowerCase();
    return s === 'hoàn thành' || s === 'hoan thanh' || s === 'completed' || s === 'done' || s === 'đã xong';
  };

  const pending = tasks.filter(t => !isDoneTask(t));
  const completed = tasks.filter(t => isDoneTask(t));

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto animate-modal-enter transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Mobile Swipe / Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Công Việc Hôm Nay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pending.length} việc cần làm · {completed.length} việc đã xong
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeDismiss}
            className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overdue Tasks Section (Active Accountability) */}
        {overdueTasks && overdueTasks.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{overdueTasks.length} việc quá hạn từ trước</span>
              </div>
              {onRescheduleAllOverdue && (
                <button
                  type="button"
                  onClick={onRescheduleAllOverdue}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-500 hover:text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 rounded-lg transition cursor-pointer"
                >
                  Dời tất cả sang hôm nay
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {overdueTasks.map(ot => (
                <div key={ot.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-amber-500/10 text-xs">
                  <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{ot.title}</span>
                  {onRescheduleOverdue && (
                    <button
                      type="button"
                      onClick={() => onRescheduleOverdue(ot.id)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/10 transition cursor-pointer"
                    >
                      Dời sang hôm nay
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Add Input */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            maxLength={255}
            placeholder="Thêm nhanh việc hôm nay (nhấn Enter để lưu)..."
            className="flex-1 px-3.5 py-2.5 min-h-[44px] rounded-xl text-base sm:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder:text-slate-400"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newTitle.trim() || isSubmitting}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang thêm...' : 'Thêm'}</span>
          </button>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map(t => {
              const isDone = isDoneTask(t);
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    soundEngine.playPop();
                    onToggleComplete(t.id);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isDone 
                        ? 'bg-emerald-500 text-white' 
                        : 'border border-slate-300 dark:border-slate-600 text-transparent'
                    }`}>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className={`text-xs font-bold truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                      {t.title}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    (t.priority as string) === 'Cao' || t.priority === 'High'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {t.priority || 'Bình thường'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chưa có công việc nào cho hôm nay.
              </p>
              <p className="text-[11px] text-slate-400">
                Gõ nhanh vào ô phía trên để bắt đầu ngày làm việc năng suất!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>+20 XP mỗi việc hoàn thành</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToTasks();
            }}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
          >
            <span>Đến trang Công Việc</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
