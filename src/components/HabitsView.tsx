import React, { useState, useEffect } from 'react';
import { Activity, Plus, Flame, Check, Trash2, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Habit } from '../lib/types';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';
import { StateHandler } from './common/StateHandler';

export function HabitsView() {
  const { habits = [], addHabit, toggleHabit, deleteHabit, language } = useAppStore();
  const isVi = language === 'vi';
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(isVi ? 'Cá nhân' : 'Personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!showAddModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) setShowAddModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, isSubmitting]);

  const today = new Date().toISOString().split('T')[0];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = newHabitName.trim();
    if (!trimmedName) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên thói quen' : 'Please enter habit name');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await addHabit({
        name: trimmedName,
        category: newHabitCategory,
        target: 1,
        streak: 0,
        bestStreak: 0,
        status: 'Active',
        completedDates: []
      });

      setNewHabitName('');
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMessage(err?.message || (isVi ? 'Lỗi khi tạo thói quen' : 'Failed to create habit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompletedToday = (habit: Habit) => {
    let dates: string[] = [];
    if (Array.isArray(habit.completedDates)) {
      dates = habit.completedDates;
    } else if (typeof habit.completedDates === 'string') {
      try {
        dates = JSON.parse(habit.completedDates);
      } catch {
        dates = [];
      }
    }
    return dates.includes(today);
  };

  const completedTodayCount = habits.filter(h => isCompletedToday(h)).length;

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {isVi ? 'Theo dõi Thói quen' : 'Habits Tracker'}
            </h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {isVi ? 'Kỷ luật mỗi ngày' : 'Daily Routine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium break-words">
            {isVi 
              ? `Xây dựng chuỗi kỷ luật liên tục (${completedTodayCount}/${habits.length} hoàn thành hôm nay)` 
              : `Build lasting discipline (${completedTodayCount}/${habits.length} completed today)`}
          </p>
        </div>
        <button
          type="button"
          id="btn-add-habit"
          onClick={() => {
            setErrorMessage(null);
            setShowAddModal(true);
          }}
          className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isVi ? 'Thêm thói quen' : 'Add Habit'}</span>
        </button>
      </div>

      {/* Main Habits List with StateHandler */}
      <StateHandler
        isEmpty={habits.length === 0}
        type="list"
        skeletonCount={3}
        emptyTitle={isVi ? 'Chưa có thói quen nào được theo dõi' : 'No habits tracked yet'}
        emptyDescription={isVi ? 'Nhấp "Thêm thói quen" để bắt đầu xây dựng chuỗi kỷ luật ngay hôm nay!' : 'Click "Add Habit" to start building your streak today!'}
        onEmptyAction={() => {
          setErrorMessage(null);
          setShowAddModal(true);
        }}
        emptyActionLabel={isVi ? 'Thêm thói quen ngay' : 'Add Habit Now'}
      >
        <div className="space-y-3 animate-page-enter w-full min-w-0">
          {habits.map((habit: Habit) => {
            const completed = isCompletedToday(habit);
            return (
              <div
                key={habit.id}
                className={`flex items-start sm:items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all gap-2.5 sm:gap-4 w-full min-w-0 shadow-xs ${
                  completed
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {/* Touch Target Check-in >= 44x44px */}
                  <button
                    type="button"
                    onClick={() => {
                      if (toggleHabit) toggleHabit(habit.id);
                      if (!completed) {
                        soundEngine.playPop();
                        const otherIncomplete = habits.filter(h => h.id !== habit.id && !isCompletedToday(h));
                        if (otherIncomplete.length === 0) {
                          triggerConfetti();
                          soundEngine.playCelebration();
                          soundEngine.speak('Awesome! You have completed all your habits for today!');
                        }
                      }
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center rounded-2xl transition-all cursor-pointer shrink-0 mt-0.5 sm:mt-0"
                    title={completed ? (isVi ? 'Đánh dấu chưa hoàn thành' : 'Mark incomplete') : (isVi ? 'Hoàn thành hôm nay' : 'Check in today')}
                    aria-label={`Toggle habit ${habit.name}`}
                  >
                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                      completed
                        ? 'bg-emerald-500 border border-emerald-500 text-white shadow-xs scale-105'
                        : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                    }`}>
                      {completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </button>

                  <div className="min-w-0 flex-1 py-0.5">
                    <h4
                      className={`font-semibold text-sm sm:text-base leading-snug break-words transition-colors ${
                        completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {habit.name}
                    </h4>

                    {/* Category Tag on Mobile (Displayed underneath title to preserve maximum title width) */}
                    <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-md">
                        {habit.category || (isVi ? 'Cá nhân' : 'Personal')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-1.5 sm:ml-0 mt-0.5 sm:mt-0">
                  {/* Category Tag (Desktop/Tablet >= 640px) */}
                  <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                    {habit.category || (isVi ? 'Cá nhân' : 'Personal')}
                  </span>

                  {/* Streak Count */}
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 sm:px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-800/60 shadow-2xs">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span className="font-mono tabular-nums">{habit.streak || 0}</span>
                    <span className="text-[10px] sm:text-[11px]">{isVi ? 'ngày' : 'd'}</span>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => {
                      const confirmMsg = isVi 
                        ? `Bạn có chắc muốn xóa thói quen "${habit.name}" không?` 
                        : `Are you sure you want to delete habit "${habit.name}"?`;
                      if (window.confirm?.(confirmMsg)) {
                        deleteHabit && deleteHabit(habit.id);
                      }
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title={isVi ? 'Xóa thói quen' : 'Delete habit'}
                    aria-label={`Delete habit ${habit.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </StateHandler>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowAddModal(false);
          }}
          className="fixed inset-0 z-[80] bg-slate-900/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-backdrop-fade cursor-default"
          role="dialog"
          aria-modal="true"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-4 animate-modal-enter my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isVi ? 'Thói Quen Mới' : 'New Habit'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={isSubmitting}
                className="w-9 h-9 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Tên thói quen' : 'Habit Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={isVi ? 'VD: Đọc 20 trang sách, Chạy bộ 30p...' : 'e.g. Read 20 pages, 30m Run...'}
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Danh mục' : 'Category'}
                </label>
                <select
                  value={newHabitCategory}
                  onChange={e => setNewHabitCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value={isVi ? 'Cá nhân' : 'Personal'}>{isVi ? 'Cá nhân' : 'Personal'}</option>
                  <option value={isVi ? 'Công việc' : 'Work'}>{isVi ? 'Công việc' : 'Work'}</option>
                  <option value={isVi ? 'Sức khỏe' : 'Health'}>{isVi ? 'Sức khỏe' : 'Health'}</option>
                  <option value={isVi ? 'Học tập' : 'Study'}>{isVi ? 'Học tập' : 'Study'}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isVi ? 'Đang tạo...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{isVi ? 'Tạo Thói Quen' : 'Create Habit'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default HabitsView;
