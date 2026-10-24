import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../lib/store';
import { Flame, Trophy, Calendar, Sparkles } from 'lucide-react';

interface DayData {
  dateStr: string; // YYYY-MM-DD
  count: number;
  tasksCount: number;
  vocabCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function ContributionHeatmap365() {
  const { tasks = [], habits = [] } = useAppStore();
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Generate 52 weeks (364 days) data mapped to completions
  const { weeks, totalContributions, currentStreak, bestStreak } = useMemo(() => {
    const today = new Date();
    const dayMap = new Map<string, { tasksCount: number; vocabCount: number }>();

    // Aggregate completed tasks by date
    tasks.forEach(t => {
      const isDone = t.status === 'Hoàn thành' || t.status === 'Done';
      if (isDone) {
        const dateKey = (t.updatedAt || t.dueDate || t.createdAt || '').slice(0, 10);
        if (dateKey && dateKey.length === 10) {
          const current = dayMap.get(dateKey) || { tasksCount: 0, vocabCount: 0 };
          current.tasksCount += 1;
          dayMap.set(dateKey, current);
        }
      }
    });

    // Aggregate habit / vocab progress if available
    try {
      const fsrsStored = JSON.parse(localStorage.getItem('lifeos_fsrs_progress') || '{}');
      Object.values(fsrsStored).forEach((item: any) => {
        if (item.nextReviewDate) {
          const dateKey = item.nextReviewDate.slice(0, 10);
          const current = dayMap.get(dateKey) || { tasksCount: 0, vocabCount: 0 };
          current.vocabCount += 1;
          dayMap.set(dateKey, current);
        }
      });
    } catch {}

    // Build 52 weeks of 7 days
    const totalDays = 52 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1);

    const weekList: DayData[][] = [];
    let currentWeek: DayData[] = [];
    let sumContributions = 0;
    let streak = 0;
    let maxStreak = 0;
    let currentStreakCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const counts = dayMap.get(dateStr) || { tasksCount: 0, vocabCount: 0 };
      const count = counts.tasksCount + counts.vocabCount;
      sumContributions += count;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 8) level = 4;
      else if (count >= 5) level = 3;
      else if (count >= 3) level = 2;
      else if (count >= 1) level = 1;

      if (count > 0) {
        streak += 1;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }

      // Check current streak from today backwards
      if (i === totalDays - 1) {
        currentStreakCount = streak;
      }

      currentWeek.push({
        dateStr,
        count,
        tasksCount: counts.tasksCount,
        vocabCount: counts.vocabCount,
        level
      });

      if (currentWeek.length === 7) {
        weekList.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weekList.push(currentWeek);
    }

    return {
      weeks: weekList,
      totalContributions: sumContributions,
      currentStreak: Math.max(1, currentStreakCount),
      bestStreak: Math.max(1, maxStreak)
    };
  }, [tasks]);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-500/30 border-emerald-500/40';
      case 2:
        return 'bg-emerald-500/60 border-emerald-500/70';
      case 3:
        return 'bg-emerald-500 border-emerald-400';
      case 4:
        return 'bg-emerald-400 border-emerald-300 shadow-xs shadow-emerald-500/30';
      default:
        return 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-800';
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              365-Day Contribution Heatmap
            </h4>
            <p className="text-[10px] text-slate-400">
              Tổng hợp tác vụ hoàn thành & từ vựng đã ôn luyện theo phong cách GitHub
            </p>
          </div>
        </div>

        {/* Quick Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{currentStreak} ngày streak</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20">
            <Trophy className="w-3.5 h-3.5" />
            <span>{totalContributions} đóng góp</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid (Scrollable horizontally) */}
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="inline-flex gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map(day => (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs border transition-transform hover:scale-130 cursor-pointer ${getCellColor(
                    day.level
                  )}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info & Legend */}
      <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400">
        <div>
          {hoveredDay ? (
            <span className="font-medium text-slate-700 dark:text-slate-200">
              📅 {hoveredDay.dateStr}: <strong>{hoveredDay.count} hoạt động</strong> (
              {hoveredDay.tasksCount} việc, {hoveredDay.vocabCount} từ)
            </span>
          ) : (
            <span>Rê chuột lên ô để xem chi tiết hoạt động trong ngày</span>
          )}
        </div>

        <div className="flex items-center gap-1 font-mono">
          <span>Ít</span>
          <span className="w-2 h-2 rounded-xs bg-slate-100 dark:bg-slate-800" />
          <span className="w-2 h-2 rounded-xs bg-emerald-500/30" />
          <span className="w-2 h-2 rounded-xs bg-emerald-500/60" />
          <span className="w-2 h-2 rounded-xs bg-emerald-500" />
          <span className="w-2 h-2 rounded-xs bg-emerald-400" />
          <span>Nhiều</span>
        </div>
      </div>
    </div>
  );
}
