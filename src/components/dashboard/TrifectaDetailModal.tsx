import React, { useState, useEffect, useRef } from 'react';
import { Target, X, Check, Plus, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Task } from '../../lib/types';
import { soundEngine } from '../../lib/soundEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface TrifectaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  slotTaskIds: [string, string, string];
  onToggleComplete: (taskId: string) => void;
  onSelectTaskForSlot: (slotIndex: number, taskId: string) => void;
  onAddTask: (title: string, priority?: string) => void;
  onGoToTasks: () => void;
}

export function TrifectaDetailModal({
  isOpen,
  onClose,
  tasks,
  slotTaskIds,
  onToggleComplete,
  onSelectTaskForSlot,
  onAddTask,
  onGoToTasks
}: TrifectaDetailModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const [activeSlotPicker, setActiveSlotPicker] = useState<number | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSafeDismiss = () => {
    if (inlineTitle.trim()) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inlineTitle.trim()) {
          triggerShake();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inlineTitle, onClose]);

  if (!isOpen) return null;

  const slotColors = [
    { border: 'border-rose-400', badge: 'bg-rose-500 text-white', label: '1. Việc Quan Trọng Nhất' },
    { border: 'border-amber-400', badge: 'bg-amber-500 text-white', label: '2. Việc Trọng Tâm Thứ Hai' },
    { border: 'border-emerald-400', badge: 'bg-emerald-500 text-white', label: '3. Việc Trọng Tâm Thứ Ba' }
  ];

  const handleQuickAdd = (slotIdx: number) => {
    if (!inlineTitle.trim()) return;
    soundEngine.playPop();
    onAddTask(inlineTitle.trim(), 'Cao');
    setInlineTitle('');
    setActiveSlotPicker(null);
  };

  const isDoneTask = (t?: Task | null) => {
    if (!t || !t.status) return false;
    const s = t.status.toLowerCase();
    return s === 'hoàn thành' || s === 'hoan thanh' || s === 'completed' || s === 'done' || s === 'đã xong';
  };

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
        className={`bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto animate-modal-enter transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* Mobile Swipe / Drag Handle Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Quy Tắc Tam Hợp (Rule of 3)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chọn đúng 3 việc quan trọng nhất cần hoàn thành trong ngày hôm nay.</p>
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

        {/* 3 Slots */}
        <div className="space-y-3">
          {slotTaskIds.map((taskId, idx) => {
            const task = tasks.find(t => t.id === taskId);
            const isDone = isDoneTask(task);
            const style = slotColors[idx];

            return (
              <div 
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all ${
                  task 
                    ? (isDone ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70') 
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {style.label}
                  </span>
                  {task && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        onToggleComplete(task.id);
                      }}
                      className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                        isDone 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isDone ? 'Đã xong' : 'Xong'}</span>
                    </button>
                  )}
                </div>

                {task ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSlotPicker(activeSlotPicker === idx ? null : idx)}
                      className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold hover:underline shrink-0 cursor-pointer min-h-[32px] flex items-center"
                    >
                      Đổi việc
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveSlotPicker(activeSlotPicker === idx ? null : idx)}
                      className="w-full min-h-[44px] py-2 text-xs font-semibold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Chọn hoặc tạo công việc cho vị trí này</span>
                    </button>
                  </div>
                )}

                {/* Inline Task Picker or Quick Creator */}
                {activeSlotPicker === idx && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={inlineTitle}
                        onChange={e => setInlineTitle(e.target.value)}
                        placeholder="Nhập tên việc mới hoặc chọn ở dưới..."
                        className="flex-1 px-3 py-2 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickAdd(idx);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(idx)}
                        disabled={!inlineTitle.trim()}
                        className="px-3.5 py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
                      >
                        Thêm
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pt-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                      {tasks
                        .filter(t => !isDoneTask(t) && !slotTaskIds.includes(t.id))
                        .slice(0, 8)
                        .map(t => (
                          <div
                            key={t.id}
                            onClick={() => {
                              soundEngine.playPop();
                              onSelectTaskForSlot(idx, t.id);
                              setActiveSlotPicker(null);
                            }}
                            className="p-2 text-xs rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 cursor-pointer truncate transition-colors flex items-center gap-1.5"
                          >
                            <Plus className="w-3 h-3 text-purple-500 shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Hoàn thành cả 3 việc để nhận <strong>+50 XP</strong></span>
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToTasks();
            }}
            className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
          >
            <span>Đến trang Công Việc</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
