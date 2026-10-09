import React, { useState } from 'react';
import { Activity, Plus, Flame, Check, Trash2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Habit } from '../lib/types';

export function HabitsView() {
  const { habits, addHabit, toggleHabit, deleteHabit } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Personal');

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Theo dõi Thói quen</h2>
          <p className="text-sm text-slate-500">
            Xây dựng tính kỷ luật hàng ngày thông qua chuỗi streak nhất quán
          </p>
        </div>
        <button
          id="btn-add-habit"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Thêm Thói quen
        </button>
      </div>

      {/* Habits List */}
      {(habits || []).length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Activity className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Chưa có thói quen nào</h3>
          <p className="text-xs text-slate-500 mt-1">Bấm nút "Thêm Thói quen" để bắt đầu theo dõi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit: Habit) => {
            const completed = isCompletedToday(habit);
            return (
              <div
                key={habit.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  completed
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => toggleHabit && toggleHabit(habit.id)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      completed
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'border-2 border-slate-300 dark:border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {completed && <Check className="w-5 h-5 stroke-[2.5]" />}
                  </button>
                  <div className="min-w-0">
                    <h4
                      className={`font-semibold text-sm truncate ${
                        completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {habit.name}
                    </h4>
                    <span className="text-[11px] text-slate-400">{habit.category || 'Personal'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg">
                    <Flame className="w-4 h-4 fill-amber-500" />
                    <span>{habit.streak || 0} ngày</span>
                  </div>
                  <button
                    onClick={() => deleteHabit && deleteHabit(habit.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thói Quen Mới</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên thói quen *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tập thể dục 30 phút"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phân loại
                </label>
                <select
                  value={newHabitCategory}
                  onChange={e => setNewHabitCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Personal">Cá nhân</option>
                  <option value="Work">Công việc</option>
                  <option value="Health">Sức khỏe</option>
                  <option value="Study">Học tập</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  Khởi tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
