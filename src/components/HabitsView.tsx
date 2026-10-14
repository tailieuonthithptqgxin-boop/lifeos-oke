import React, { useState } from 'react';
import { Activity, Plus, Flame, Check, Trash2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Habit } from '../lib/types';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';

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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Habits Tracker</h2>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Habits Streak
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Build lasting daily discipline through continuous habit streaks
          </p>
        </div>
        <button
          id="btn-add-habit"
          onClick={() => setShowAddModal(true)}
          className="btn-squishy px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black rounded-2xl flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Habit
        </button>
      </div>

      {/* Habits List */}
      {(habits || []).length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center animate-page-enter">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-black text-slate-900 dark:text-white">No habits tracked yet</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Click "Add Habit" to start building your streak today!</p>
        </div>
      ) : (
        <div className="space-y-3 animate-page-enter">
          {habits.map((habit: Habit) => {
            const completed = isCompletedToday(habit);
            return (
              <div
                key={habit.id}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all interactive-card ${
                  completed
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 shadow-2xs'
                    : 'bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
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
                    className={`btn-squishy w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      completed
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                        : 'border-2 border-purple-200 dark:border-slate-700 hover:border-purple-400 bg-purple-50/30 dark:bg-slate-800/50'
                    }`}
                  >
                    {completed && <Check className="w-5 h-5 stroke-[3]" />}
                  </button>
                  <div className="min-w-0">
                    <h4
                      className={`font-bold text-sm sm:text-base truncate ${
                        completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {habit.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/60 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {habit.category || 'Personal'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-200/60 dark:border-amber-800/60 shadow-xs">
                    <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{habit.streak || 0} days</span>
                  </div>
                  <button
                    onClick={() => deleteHabit && deleteHabit(habit.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer btn-squishy"
                    title="Delete habit"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-backdrop-fade">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-modal-enter">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">New Habit</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Habit Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Read 20 pages, 30m Workout"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={newHabitCategory}
                  onChange={e => setNewHabitCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Personal">Personal</option>
                  <option value="Work">Work</option>
                  <option value="Health">Health</option>
                  <option value="Study">Study</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-squishy px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-squishy px-5 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
