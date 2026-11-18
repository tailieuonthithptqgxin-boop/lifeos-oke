import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Sparkles, 
  X, 
  BookOpen, 
  Briefcase, 
  Check, 
  MapPin
} from 'lucide-react';
import { Event, Task } from '../../lib/types';
import { soundEngine } from '../../lib/soundEngine';

interface TimeBlockItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  dateStr: string;
  colorType?: 'blue' | 'amber' | 'purple' | 'emerald' | 'rose';
  location?: string;
  isTask?: boolean;
}

interface WeeklyTimeblockScheduleProps {
  events?: Event[];
  tasks?: Task[];
  onAddEvent?: (event: Partial<Event>) => void;
  language?: string;
}

export function WeeklyTimeblockSchedule({ events = [], tasks = [], onAddEvent, language = 'vi' }: WeeklyTimeblockScheduleProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newDayOffset, setNewDayOffset] = useState<number>(0);
  const [newColorType, setNewColorType] = useState<'blue' | 'amber' | 'purple' | 'emerald'>('blue');

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Compute 7 days of the week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + currentWeekOffset * 7);

    // Find Monday of this week (0: Sun, 1: Mon, ..., 6: Sat)
    const dayOfWeek = baseDate.getDay();
    const distanceToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + distanceToMonday);

    const days = [];
    const dayNamesVi = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dayShortNamesVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;

      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        dayName: dayNamesVi[i],
        shortName: dayShortNamesVi[i],
        dayOfWeek: d.getDay(),
        isToday
      });
    }

    return days;
  }, [currentWeekOffset, todayStr]);

  // Collect and sort timeblocks for each day
  const blocksByDate = useMemo(() => {
    const map: Record<string, TimeBlockItem[]> = {};

    weekDays.forEach(day => {
      const items: TimeBlockItem[] = [];

      // 1. From real events in app store
      const dayEvents = events.filter(e => e.date === day.dateStr);
      dayEvents.forEach(e => {
        items.push({
          id: e.id,
          title: e.title,
          startTime: e.startTime || '08:00',
          endTime: e.endTime || '10:00',
          dateStr: day.dateStr,
          colorType: (e.color as any) || 'blue',
          isTask: false
        });
      });

      // 2. From tasks scheduled for this day
      const dayTasks = tasks.filter(t => t.dueDate === day.dateStr && (t.status as string) !== 'Hủy');
      dayTasks.forEach(t => {
        items.push({
          id: t.id,
          title: t.title,
          startTime: '14:00',
          endTime: '16:00',
          dateStr: day.dateStr,
          colorType: ((t.priority as string) === 'Cao' || t.priority === 'High') ? 'amber' : 'purple',
          isTask: true
        });
      });

      // Sort items by start time
      items.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map[day.dateStr] = items;
    });

    return map;
  }, [weekDays, events, tasks]);

  const getColorStyles = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200/90 dark:border-amber-800/60 hover:border-amber-400';
      case 'purple':
        return 'bg-purple-50/90 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-200/90 dark:border-purple-800/60 hover:border-purple-400';
      case 'emerald':
        return 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200/90 dark:border-emerald-800/60 hover:border-emerald-400';
      case 'rose':
        return 'bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200/90 dark:border-rose-800/60 hover:border-rose-400';
      case 'blue':
      default:
        return 'bg-sky-50/90 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border-sky-200/90 dark:border-sky-800/60 hover:border-sky-400';
    }
  };

  const handleOpenAddForDay = (dateStr: string) => {
    soundEngine.playPop();
    const day = weekDays.find(d => d.dateStr === dateStr);
    if (day) {
      const idx = weekDays.indexOf(day);
      setNewDayOffset(idx);
    }
    setNewTitle('');
    setShowAddModal(true);
  };

  const handleSaveBlock = () => {
    if (!newTitle.trim()) return;
    soundEngine.playSuccess();

    const targetDay = weekDays[newDayOffset] || weekDays[0];
    if (onAddEvent) {
      onAddEvent({
        id: `ev_${Date.now()}`,
        title: newTitle.trim(),
        date: targetDay.dateStr,
        startTime: newStartTime,
        endTime: newEndTime,
        color: newColorType,
        type: 'schedule'
      });
    }

    setShowAddModal(false);
    setNewTitle('');
  };

  return (
    <div className="bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-4 sm:p-5 shadow-sm transition-all relative overflow-hidden space-y-4">
      {/* Ambient Top Rim Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent dark:via-purple-400/35" />
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-2xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Lịch Biểu Khung Giờ Tuần
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60">
                Weekly Time-Block
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {weekDays[0].dayNum}/{weekDays[0].date.getMonth() + 1} – {weekDays[6].dayNum}/{weekDays[6].date.getMonth() + 1}
            </p>
          </div>
        </div>

        {/* Navigation & Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentWeekOffset(prev => prev - 1)}
            aria-label="Tuần trước"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentWeekOffset(0)}
            className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition cursor-pointer ${
              currentWeekOffset === 0
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tuần này
          </button>

          <button
            type="button"
            onClick={() => setCurrentWeekOffset(prev => prev + 1)}
            aria-label="Tuần sau"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setShowAddModal(true);
            }}
            className="ml-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm ca</span>
          </button>
        </div>
      </div>

      {/* 7 Columns Grid (Horizontal Scrollable on Mobile) */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="grid grid-cols-7 gap-2 min-w-[700px] lg:min-w-0">
          {weekDays.map((day, idx) => {
            const dayBlocks = blocksByDate[day.dateStr] || [];

            return (
              <div 
                key={day.dateStr}
                className={`flex flex-col rounded-2xl border transition-all p-2 ${
                  day.isToday 
                    ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/30 shadow-xs' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70'
                }`}
              >
                {/* Column Header: Day & Date Number */}
                <div className="text-center pb-2 border-b border-slate-200/60 dark:border-slate-800/60 mb-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {day.shortName}
                  </div>
                  <div className={`text-base font-black mt-0.5 w-7 h-7 mx-auto rounded-full flex items-center justify-center ${
                    day.isToday 
                      ? 'bg-purple-600 text-white shadow-xs' 
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {day.dayNum}
                  </div>
                  {day.isToday && (
                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                      Hôm nay
                    </span>
                  )}
                </div>

                {/* Column Body: Time-Block Cards Stack */}
                <div className="flex-1 space-y-1.5 min-h-[160px]">
                  {dayBlocks.length > 0 ? (
                    dayBlocks.map(block => (
                      <div
                        key={block.id}
                        className={`p-2 rounded-xl border text-left transition-all hover:-translate-y-0.5 shadow-2xs ${getColorStyles(block.colorType)}`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold opacity-90 mb-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {block.startTime} - {block.endTime}
                          </span>
                        </div>
                        <div className="text-xs font-bold leading-snug line-clamp-2">
                          {block.title}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-2 text-center text-slate-300 dark:text-slate-600">
                      <span className="text-xs italic">Trống</span>
                    </div>
                  )}
                </div>

                {/* Quick Add Button at bottom of each column */}
                <button
                  type="button"
                  onClick={() => handleOpenAddForDay(day.dateStr)}
                  className="mt-2 w-full py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Time-Block Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Thêm Ca Học / Công Việc</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Tên môn học / Nhiệm vụ:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Kinh tế vi mô, Trực web..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Chọn ngày trong tuần:
                </label>
                <select
                  value={newDayOffset}
                  onChange={e => setNewDayOffset(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-semibold"
                >
                  {weekDays.map((d, i) => (
                    <option key={d.dateStr} value={i}>
                      {d.dayName} ({d.dayNum}/{d.date.getMonth() + 1}) {d.isToday ? '— Hôm nay' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Bắt đầu:
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Kết thúc:
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={e => setNewEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                  Tông màu pastel phân loại:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'blue', label: 'Xanh dương', bg: 'bg-sky-400' },
                    { id: 'amber', label: 'Vàng cam', bg: 'bg-amber-400' },
                    { id: 'purple', label: 'Tím', bg: 'bg-purple-400' },
                    { id: 'emerald', label: 'Xanh ngọc', bg: 'bg-emerald-400' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewColorType(c.id as any)}
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-all cursor-pointer ${
                        newColorType === c.id ? 'ring-3 ring-purple-600 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {newColorType === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveBlock}
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                Lưu vào lịch tuần
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
