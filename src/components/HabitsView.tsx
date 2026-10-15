import React, { useState } from 'react';
import { Activity, Plus, Flame, Check, Trash2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Habit } from '../lib/types';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';

export function HabitsView() {
  const { habits, addHabit, toggleHabit, deleteHabit, language } = useAppStore();
  const isVi = language === 'vi';
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(isVi ? 'Cá nhân' : 'Personal');

  const today = new Date().toISOString().split('T')[0];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    await addHabit({
      name: newHabitName.trim(),
      category: newHabitCategory,
      target: 1,
      streak: 0,
      bestStreak: 0,
      status: 'Active',
      completedDates: []
    });

    setNewHabitName('');
    setShowAddModal(false);
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

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#0F172A] dark:text-white tracking-tight truncate">
              {isVi ? 'Theo dõi Thói quen' : 'Habits Tracker'}
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 shrink-0">
              {isVi ? 'Kỷ luật mỗi ngày' : 'Daily Routine'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 font-normal break-words">
            {isVi 
              ? 'Xây dựng kỷ luật mỗi ngày thông qua duy trì chuỗi thói quen liên tục' 
              : 'Build lasting daily discipline through continuous habit streaks'}
          </p>
        </div>
        <button
          id="btn-add-habit"
          onClick={() => setShowAddModal(true)}
          className="h-9 px-3.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer shrink-0 shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> <span>{isVi ? 'Thêm thói quen' : 'Add Habit'}</span>
        </button>
      </div>

      {/* Habits List */}
      {(habits || []).length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-8 sm:p-12 text-center animate-page-enter w-full min-w-0">
          <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-[#0F172A] dark:text-white text-sm sm:text-base">
            {isVi ? 'Chưa có thói quen nào được theo dõi' : 'No habits tracked yet'}
          </h3>
          <p className="text-xs text-[#64748B] mt-1 font-normal break-words">
            {isVi 
              ? 'Nhấp "Thêm thói quen" để bắt đầu xây dựng chuỗi kỷ luật ngay hôm nay!' 
              : 'Click "Add Habit" to start building your streak today!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-page-enter w-full min-w-0">
          {habits.map((habit: Habit) => {
            const completed = isCompletedToday(habit);
            return (
              <div
                key={habit.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors gap-3 sm:gap-4 w-full min-w-0 shadow-2xs ${
                  completed
                    ? 'bg-[#F8FAFC] dark:bg-slate-900/40 border-[#E2E8F0] dark:border-slate-800'
                    : 'bg-white dark:bg-slate-900 border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      completed
                        ? 'bg-[#10B981] border border-[#10B981] text-white shadow-2xs'
                        : 'border border-[#CBD5E1] dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-500'
                    }`}
                  >
                    {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`font-medium text-sm break-words line-clamp-1 ${
                        completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-[#0F172A] dark:text-white'
                      }`}
                    >
                      {habit.name}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Pastel Category Tag */}
                  <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 px-2.5 py-0.5 rounded">
                    {habit.category || 'Personal'}
                  </span>

                  {/* Delicate Light Orange Streak Badge */}
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>{habit.streak || 0} {isVi ? 'ngày' : 'd'}</span>
                  </div>

                  <button
                    onClick={() => {
                      const confirmMsg = isVi 
                        ? `Bạn có chắc muốn xóa thói quen "${habit.name}" không?` 
                        : `Are you sure you want to delete habit "${habit.name}"?`;
                      if (window.confirm?.(confirmMsg)) {
                        deleteHabit && deleteHabit(habit.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title={isVi ? 'Xóa thói quen' : 'Delete habit'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs animate-backdrop-fade">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-lg space-y-4 animate-modal-enter">
            <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
              {isVi ? 'Thói Quen Mới' : 'New Habit'}
            </h3>
            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên thói quen *' : 'Habit Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isVi ? 'VD: Đọc 20 trang sách, Tập thể dục 30p' : 'e.g. Read 20 pages, 30m Workout'}
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Danh mục' : 'Category'}
                </label>
                <select
                  value={newHabitCategory}
                  onChange={e => setNewHabitCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value={isVi ? 'Cá nhân' : 'Personal'}>{isVi ? 'Cá nhân' : 'Personal'}</option>
                  <option value={isVi ? 'Công việc' : 'Work'}>{isVi ? 'Công việc' : 'Work'}</option>
                  <option value={isVi ? 'Sức khỏe' : 'Health'}>{isVi ? 'Sức khỏe' : 'Health'}</option>
                  <option value={isVi ? 'Học tập' : 'Study'}>{isVi ? 'Học tập' : 'Study'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-xs cursor-pointer"
                >
                  {isVi ? 'Tạo Thói Quen' : 'Create Habit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
