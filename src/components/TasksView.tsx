import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { 
  Check, Clock, AlertTriangle, Play, Square, Plus, Edit3,
  Calendar as CalendarIcon, Tag, FolderKanban, LayoutGrid, List as ListIcon, X, Trash2, Search, Target,
  Paperclip, Upload, Download, FileText, File, Loader2,
  CalendarCheck, Flame, Layers, MoreVertical
} from 'lucide-react';
import { Task, TaskStatus, Priority } from '../lib/types';
import { formatCurrency, formatDate } from '../lib/utils';
import { apiCall } from '../lib/apiClient';

export type NormalizedTaskStatus = 'Chưa làm' | 'Đang làm' | 'Đang chờ' | 'Hoàn thành' | 'Hủy';

export function normalizeTaskStatus(status?: string | null): NormalizedTaskStatus {
  if (!status) return 'Chưa làm';
  const s = String(status).trim().toLowerCase();
  if (['hoàn thành', 'done', 'completed', 'đã xong'].includes(s)) return 'Hoàn thành';
  if (['đang làm', 'in progress', 'in_progress', 'doing'].includes(s)) return 'Đang làm';
  if (['đang chờ', 'blocked', 'đã hoãn', 'deferred', 'kế hoạch', 'waiting', 'chờ', 'pending'].includes(s)) return 'Đang chờ';
  if (['hủy', 'cancelled', 'canceled'].includes(s)) return 'Hủy';
  return 'Chưa làm';
}

export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskForToday(t: any, localTodayStr: string, utcTodayStr: string): boolean {
  if (t.dueDate) {
    const d = String(t.dueDate).slice(0, 10);
    if (d === localTodayStr || d === utcTodayStr) return true;
    try {
      const dt = new Date(t.dueDate);
      if (!isNaN(dt.getTime())) {
        const dtLocal = getLocalDateString(dt);
        if (dtLocal === localTodayStr || dtLocal === utcTodayStr) return true;
      }
    } catch {}
  }
  if (t.startDate) {
    const s = String(t.startDate).slice(0, 10);
    if (s === localTodayStr || s === utcTodayStr) return true;
    try {
      const dt = new Date(t.startDate);
      if (!isNaN(dt.getTime())) {
        const dtLocal = getLocalDateString(dt);
        if (dtLocal === localTodayStr || dtLocal === utcTodayStr) return true;
      }
    } catch {}
  }
  return false;
}

export function isTaskOverdue(t: any, localTodayStr: string, utcTodayStr: string): boolean {
  if (!t.dueDate) return false;
  const status = normalizeTaskStatus(t.status);
  if (status === 'Hoàn thành' || status === 'Hủy') return false;
  const d = String(t.dueDate).slice(0, 10);
  if (d < localTodayStr && d < utcTodayStr) return true;
  try {
    const dt = new Date(t.dueDate);
    if (!isNaN(dt.getTime())) {
      const dtLocal = getLocalDateString(dt);
      if (dtLocal < localTodayStr && dtLocal < utcTodayStr) return true;
    }
  } catch {}
  return false;
}

export function isTaskHighRisk(t: any, localTodayStr: string, utcTodayStr: string): boolean {
  const status = normalizeTaskStatus(t.status);
  if (status === 'Hoàn thành' || status === 'Hủy') return false;
  if (isTaskOverdue(t, localTodayStr, utcTodayStr)) return true;
  const isDueToday = isTaskForToday(t, localTodayStr, utcTodayStr);
  if (isDueToday && (t.priority === 'Cao' || t.priority === 'High' || t.priority === 'Nghiêm trọng' || t.priority === 'Critical')) return true;
  if (isDueToday && (t.estimatedHours || 0) > 3) return true;
  return false;
}

export function TasksView() {
  const { tasks, projects, goals, addTask, updateTask, deleteTask, language } = useAppStore();
  const t = useTranslation(language);
  const isVi = language === 'vi';
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('Trung bình');
  const [quickDueDate, setQuickDueDate] = useState<string>('');
  
  // Timer state
  const [activeTimerTask, setActiveTimerTask] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (activeTimerTask) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask]);

  const toggleTimer = (taskId: string) => {
    if (activeTimerTask === taskId) {
      const task = (tasks || []).find(t => t.id === taskId);
      if (task) {
        const hoursToAdd = Number((timerSeconds / 3600).toFixed(2));
        updateTask(taskId, { actualHours: (task.actualHours || 0) + hoursToAdd });
      }
      setActiveTimerTask(null);
      setTimerSeconds(0);
    } else {
      if (activeTimerTask) {
        const prevTask = (tasks || []).find(t => t.id === activeTimerTask);
        if (prevTask) {
          const hoursToAdd = Number((timerSeconds / 3600).toFixed(2));
          updateTask(activeTimerTask, { actualHours: (prevTask.actualHours || 0) + hoursToAdd });
        }
      }
      setActiveTimerTask(taskId);
      setTimerSeconds(0);
    }
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const localToday = useMemo(() => getLocalDateString(), []);
  const utcToday = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Comprehensive Counts for all filter tabs & stat cards
  const counts = useMemo(() => {
    const list = tasks || [];
    const todayCount = list.filter(t => isTaskForToday(t, localToday, utcToday)).length;
    const completedTodayCount = list.filter(t => isTaskForToday(t, localToday, utcToday) && normalizeTaskStatus(t.status) === 'Hoàn thành').length;
    return {
      all: list.length,
      today: todayCount,
      completedToday: completedTodayCount,
      todo: list.filter(t => normalizeTaskStatus(t.status) === 'Chưa làm').length,
      inProgress: list.filter(t => normalizeTaskStatus(t.status) === 'Đang làm').length,
      completed: list.filter(t => normalizeTaskStatus(t.status) === 'Hoàn thành').length,
      waiting: list.filter(t => normalizeTaskStatus(t.status) === 'Đang chờ').length,
      overdue: list.filter(t => isTaskOverdue(t, localToday, utcToday)).length,
      highRisk: list.filter(t => isTaskHighRisk(t, localToday, utcToday)).length,
      activeTotal: list.filter(t => {
        const s = normalizeTaskStatus(t.status);
        return s !== 'Hoàn thành' && s !== 'Hủy';
      }).length
    };
  }, [tasks, localToday, utcToday]);

  // Collect distinct tags for quick access chips
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    (tasks || []).forEach(t => {
      if (Array.isArray(t.tags)) {
        t.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) tagSet.add(tag.trim());
        });
      } else if (typeof t.tags === 'string' && (t.tags as string).trim()) {
        try {
          const parsed = JSON.parse(t.tags);
          if (Array.isArray(parsed)) {
            parsed.forEach((tag: string) => { if (typeof tag === 'string' && tag.trim()) tagSet.add(tag.trim()); });
          }
        } catch {
          (t.tags as string).split(',').forEach(tag => {
            if (tag.trim()) tagSet.add(tag.trim());
          });
        }
      }
    });
    return Array.from(tagSet);
  }, [tasks]);

  // Task filtering with quick search by title or tags
  const filteredTasks = useMemo(() => {
    let result = [...(tasks || [])];

    if (filterStatus === 'Today') {
      result = result.filter(t => isTaskForToday(t, localToday, utcToday));
    } else if (filterStatus === 'Overdue') {
      result = result.filter(t => isTaskOverdue(t, localToday, utcToday));
    } else if (filterStatus === 'HighRisk') {
      result = result.filter(t => isTaskHighRisk(t, localToday, utcToday));
    } else if (filterStatus === 'Chưa làm') {
      result = result.filter(t => normalizeTaskStatus(t.status) === 'Chưa làm');
    } else if (filterStatus === 'Đang làm') {
      result = result.filter(t => normalizeTaskStatus(t.status) === 'Đang làm');
    } else if (filterStatus === 'Hoàn thành') {
      result = result.filter(t => normalizeTaskStatus(t.status) === 'Hoàn thành');
    } else if (filterStatus === 'Đang chờ') {
      result = result.filter(t => normalizeTaskStatus(t.status) === 'Đang chờ');
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const cleanQ = q.startsWith('#') ? q.slice(1).trim() : q;
      result = result.filter(t => {
        const titleMatch = (t.title || '').toLowerCase().includes(q) || (t.title || '').toLowerCase().includes(cleanQ);
        let tagMatch = false;
        if (Array.isArray(t.tags)) {
          tagMatch = t.tags.some(tag => 
            typeof tag === 'string' && (tag.toLowerCase().includes(q) || tag.toLowerCase().includes(cleanQ))
          );
        } else if (typeof t.tags === 'string') {
          tagMatch = t.tags.toLowerCase().includes(q) || t.tags.toLowerCase().includes(cleanQ);
        }
        const descMatch = (t.description || '').toLowerCase().includes(q);
        return titleMatch || tagMatch || descMatch;
      });
    }
    return result;
  }, [tasks, filterStatus, searchQuery, localToday, utcToday]);

  const handleSelectFilter = (targetStatus: string) => {
    setFilterStatus(targetStatus);
    // If user clicks a specific single status and is in kanban mode, switch to list mode so they can see all those tasks clearly
    if (['Chưa làm', 'Đang làm', 'Hoàn thành', 'Đang chờ'].includes(targetStatus) && viewMode === 'kanban') {
      setViewMode('list');
    }
  };

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;

    await addTask({
      title,
      status: 'Chưa làm',
      priority: quickPriority || 'Trung bình',
      dueDate: quickDueDate || localToday,
      estimatedHours: 1,
      actualHours: 0,
      tags: []
    });
    setQuickTitle('');
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">{t('Quản lý Công việc')}</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium break-words">{t('Lập kế hoạch, theo dõi tiến độ và tối ưu thời gian thực hiện tác vụ')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button 
            type="button"
            onClick={openNewTask}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('Thêm công việc')}</span>
          </button>
        </div>
      </div>

      {/* 4 Bento Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatCard 
          title={t('Hôm nay')} 
          value={`${counts.completedToday}/${counts.today}`} 
          desc={t('Đã hoàn thành hôm nay')} 
          icon={CalendarCheck}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100/80 dark:bg-emerald-950/60"
          active={filterStatus === 'Today'}
          onClick={() => setFilterStatus(filterStatus === 'Today' ? 'All' : 'Today')}
        />
        <StatCard 
          title={t('Quá hạn')} 
          value={counts.overdue} 
          desc={t('Cần xử lý khẩn cấp')} 
          icon={AlertTriangle}
          iconColor="text-rose-600 dark:text-rose-400"
          iconBg="bg-rose-100/80 dark:bg-rose-950/60"
          active={filterStatus === 'Overdue'}
          onClick={() => setFilterStatus(filterStatus === 'Overdue' ? 'All' : 'Overdue')}
        />
        <StatCard 
          title={t('Rủi ro cao')} 
          value={counts.highRisk} 
          desc={t('Hạn chót gấp / Tải lớn')} 
          icon={Flame}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100/80 dark:bg-amber-950/60"
          active={filterStatus === 'HighRisk'}
          onClick={() => setFilterStatus(filterStatus === 'HighRisk' ? 'All' : 'HighRisk')}
        />
        <StatCard 
          title={t('Tổng công việc')} 
          value={counts.activeTotal} 
          desc={t('Đang chờ xử lý')} 
          icon={Layers}
          iconColor="text-slate-700 dark:text-slate-300"
          iconBg="bg-slate-100 dark:bg-slate-800"
          active={filterStatus === 'All'}
          onClick={() => setFilterStatus('All')}
        />
      </div>

      {/* Unified Compact Toolbar: Filter Tabs + Search + View Switcher */}
      <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 shadow-xs">
        {/* Left: Filter Tabs with Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 lg:mx-0 lg:px-0">
          <FilterButton active={filterStatus === 'All'} count={counts.all} onClick={() => handleSelectFilter('All')}>
            {t('Tất cả')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Today'} count={counts.today} onClick={() => handleSelectFilter('Today')}>
            {t('Hôm nay')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Chưa làm'} count={counts.todo} onClick={() => handleSelectFilter('Chưa làm')}>
            {t('Chưa làm')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Đang làm'} count={counts.inProgress} onClick={() => handleSelectFilter('Đang làm')}>
            {t('Đang làm')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Hoàn thành'} count={counts.completed} onClick={() => handleSelectFilter('Hoàn thành')}>
            {t('Hoàn thành')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Đang chờ'} count={counts.waiting} onClick={() => handleSelectFilter('Đang chờ')}>
            {t('Đang chờ')}
          </FilterButton>
          <FilterButton active={filterStatus === 'Overdue'} count={counts.overdue} alert={counts.overdue > 0} onClick={() => handleSelectFilter('Overdue')}>
            {t('Quá hạn')}
          </FilterButton>
        </div>

        {/* Right: Search Input + View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 lg:w-64 xl:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="task-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Tìm kiếm công việc...')}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                id="clear-task-search-btn"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                title={t('Xóa tìm kiếm')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-700/50">
            <button 
              type="button" 
              id="tasks-view-list-btn"
              onClick={() => setViewMode('list')} 
              title={t('Dạng danh sách')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-900 shadow-xs text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              id="tasks-view-kanban-btn"
              onClick={() => setViewMode('kanban')} 
              title={t('Dạng Kanban')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-slate-900 shadow-xs text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Tag Chips (if any) */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs text-slate-500 -mt-1 px-1">
          <span className="flex items-center gap-1 text-slate-400 shrink-0 text-[11px]"><Tag className="w-3 h-3" /> {t('Thẻ:')}</span>
          {allTags.slice(0, 8).map(tag => {
            const isSelected = searchQuery.toLowerCase() === tag.toLowerCase() || searchQuery.toLowerCase() === `#${tag.toLowerCase()}`;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(isSelected ? '' : tag)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-2xs' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Search feedback banner */}
      {searchQuery && (
        <div className="flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 px-3 py-1.5 rounded-xl text-xs border border-emerald-200/60 dark:border-emerald-800/40">
          <span>
            {t('Kết quả tìm kiếm cho:')} <strong>"{searchQuery}"</strong> ({filteredTasks.length} {t('công việc tìm thấy')})
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-emerald-700 dark:text-emerald-300 hover:underline font-bold ml-2 cursor-pointer"
          >
            {t('Xóa tìm kiếm')}
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'list' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col">
            {/* Linear Style Quick Add Task Input */}
            <form onSubmit={handleQuickCreate} className="p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1" />
                <input
                  type="text"
                  value={quickTitle}
                  onChange={e => setQuickTitle(e.target.value)}
                  placeholder={t('Thêm nhanh công việc mới... (Nhấn Enter để lưu)')}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Quick Metadata Selectors */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end shrink-0">
                <input
                  type="date"
                  value={quickDueDate}
                  onChange={e => setQuickDueDate(e.target.value)}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  title={t('Hạn chót')}
                />
                <select
                  value={quickPriority}
                  onChange={e => setQuickPriority(e.target.value as Priority)}
                  className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  title={t('Độ ưu tiên')}
                >
                  <option value="Thấp">{t('Thấp')}</option>
                  <option value="Trung bình">{t('Trung bình')}</option>
                  <option value="Cao">{t('Cao')}</option>
                  <option value="Nghiêm trọng">{t('Nghiêm trọng')}</option>
                </select>
                {quickTitle.trim() && (
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {t('Thêm ↵')}
                  </button>
                )}
              </div>
            </form>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1">
              {filteredTasks.length === 0 && (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">
                    {searchQuery 
                      ? `${t('Không tìm thấy công việc nào khớp với từ khóa')} "${searchQuery}"`
                      : filterStatus !== 'All'
                      ? `${t('Không có công việc nào thuộc danh mục lọc')} "${t(filterStatus === 'Today' ? 'Hôm nay' : filterStatus === 'Overdue' ? 'Quá hạn' : filterStatus)}"`
                      : t('Chưa có công việc nào. Hãy thêm công việc đầu tiên ở ô trên!')}
                  </p>
                  {(searchQuery || filterStatus !== 'All') && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setFilterStatus('All'); }}
                      className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {t('Xóa bộ lọc')}
                    </button>
                  )}
                </div>
              )}
              {filteredTasks.map(task => (
                <TaskRow 
                  key={task.id}
                  task={task} 
                  onEdit={() => openEditTask(task)}
                  onDelete={() => deleteTask(task.id)}
                  onToggleStatus={() => {
                    const isDone = task.status === 'Hoàn thành' || task.status === 'Done';
                    updateTask(task.id, { 
                      status: isDone ? 'Chưa làm' : 'Hoàn thành' 
                    });
                  }}
                  timerActive={activeTimerTask === task.id}
                  timerSeconds={timerSeconds}
                  onToggleTimer={() => toggleTimer(task.id)}
                  formatTimer={formatTimer}
                  projectName={(projects || []).find(p => p.id === task.projectId)?.name}
                  goalTitle={(goals || []).find(g => g.id === task.linkedGoalId)?.title}
                  onTagClick={(tag: string) => setSearchQuery(tag)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {filterStatus !== 'All' && (
              <div className="mb-3 px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 shrink-0">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>{t('Đang lọc bảng Kanban theo:')} <strong>{filterStatus === 'Today' ? t('Hôm nay') : filterStatus === 'Overdue' ? t('Quá hạn') : t(filterStatus)}</strong> ({filteredTasks.length} {t('công việc')})</span>
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setViewMode('list')}
                    className="hover:underline font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    {t('Xem dạng danh sách')}
                  </button>
                  <span>•</span>
                  <button 
                    type="button" 
                    onClick={() => setFilterStatus('All')}
                    className="hover:underline font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    {t('Hiển thị tất cả')}
                  </button>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-x-auto flex gap-4 pb-4 w-full min-w-0 max-w-full">
              <KanbanColumn 
                title={t('Chưa làm')} 
                status="Chưa làm" 
                tasks={filteredTasks} 
                onEdit={openEditTask} 
                onDropTask={(id: string, status: any) => updateTask(id, { status })} 
                onTagClick={(tag: string) => setSearchQuery(tag)}
                onDelete={(id: string) => deleteTask(id)}
              />
              <KanbanColumn 
                title={t('Đang làm')} 
                status="Đang làm" 
                tasks={filteredTasks} 
                onEdit={openEditTask} 
                onDropTask={(id: string, status: any) => updateTask(id, { status })} 
                onTagClick={(tag: string) => setSearchQuery(tag)}
                onDelete={(id: string) => deleteTask(id)}
              />
              <KanbanColumn 
                title={t('Đang chờ')} 
                status="Đang chờ" 
                tasks={filteredTasks} 
                onEdit={openEditTask} 
                onDropTask={(id: string, status: any) => updateTask(id, { status })} 
                onTagClick={(tag: string) => setSearchQuery(tag)}
                onDelete={(id: string) => deleteTask(id)}
              />
              <KanbanColumn 
                title={t('Hoàn thành')} 
                status="Hoàn thành" 
                tasks={filteredTasks} 
                onEdit={openEditTask} 
                onDropTask={(id: string, status: any) => updateTask(id, { status })} 
                onTagClick={(tag: string) => setSearchQuery(tag)}
                onDelete={(id: string) => deleteTask(id)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal 
          task={editingTask} 
          onClose={() => setShowTaskModal(false)}
          onSave={async (t: any) => {
            const targetId = editingTask?.id || t?.id;
            if (editingTask && targetId) {
              await updateTask(targetId, t);
            } else {
              await addTask(t);
            }
            setShowTaskModal(false);
          }}
          onDelete={async (id: string) => {
            await deleteTask(id);
            setShowTaskModal(false);
          }}
          projects={projects}
          goals={goals}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, desc, icon: Icon, iconColor, iconBg, active, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer bg-white dark:bg-slate-900 border ${
        active 
          ? 'ring-2 ring-emerald-500/50 border-emerald-500 shadow-sm bg-emerald-50/30 dark:bg-emerald-950/20' 
          : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
        {value}
      </div>
      <p className="text-[11px] mt-0.5 text-slate-400 dark:text-slate-500 font-medium truncate">
        {desc}
      </p>
    </button>
  );
}

function FilterButton({ active, count, alert, children, onClick }: any) {
  return (
    <button 
      type="button" 
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5
        ${active 
          ? 'bg-emerald-500 text-slate-950 font-black shadow-2xs' 
          : alert
          ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/40'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'}`}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black transition-colors ${
          active 
            ? 'bg-slate-950/20 text-slate-950' 
            : alert
            ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function getPriorityBadge(priority: string, t: any) {
  switch (priority) {
    case 'Nghiêm trọng':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/60">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
          {t('Nghiêm trọng')}
        </span>
      );
    case 'Cao':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
          {t('Cao')}
        </span>
      );
    case 'Trung bình':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
          {t('Trung bình')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
          {t(priority || 'Thấp')}
        </span>
      );
  }
}

function TaskRow({ task, onEdit, onDelete, onToggleStatus, timerActive, timerSeconds, onToggleTimer, formatTimer, projectName, goalTitle, onTagClick }: any) {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const isCompleted = task.status === 'Hoàn thành' || task.status === 'Done';
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate && task.dueDate < todayStr && !isCompleted;
  
  return (
    <div 
      onClick={onEdit}
      className={`p-3 sm:p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
        isCompleted ? 'bg-slate-50/40 dark:bg-slate-900/40 opacity-70' : ''
      }`}
    >
      {/* Round emerald checkbox */}
      <button 
        type="button"
        onClick={(e) => { 
          e.stopPropagation(); 
          onToggleStatus(); 
        }}
        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all shrink-0 cursor-pointer ${
          isCompleted 
            ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-xs' 
            : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
        }`}
        title={isCompleted ? t('Đánh dấu chưa hoàn thành') : t('Đánh dấu hoàn thành')}
      >
        <Check className="w-3 h-3 stroke-[3]" />
      </button>
      
      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
            {t(task.title)}
          </p>
          {task.priority === 'Nghiêm trọng' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-wiggle" />}
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs">
          {projectName && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium border border-slate-200/50 dark:border-slate-700/50">
              <FolderKanban className="w-3 h-3 text-emerald-500" /> {t(projectName)}
            </span>
          )}
          {goalTitle && (
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium border border-slate-200/50 dark:border-slate-700/50">
              <Target className="w-3 h-3 text-emerald-500" /> {t(goalTitle)}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 font-medium ${
              isOverdue 
                ? 'text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50' 
                : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50'
            }`}>
              <CalendarIcon className="w-3 h-3" /> {formatDate(task.dueDate, language)}
            </span>
          )}
          
          {getPriorityBadge(task.priority, t)}

          {Boolean((task.estimatedHours && Number(task.estimatedHours) > 0) || (task.actualHours && Number(task.actualHours) > 0)) && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium border border-slate-200/50 dark:border-slate-700/50">
              <Clock className="w-3 h-3 text-slate-400" /> {task.actualHours || 0}h / {task.estimatedHours || 1}h
            </span>
          )}
          
          {/* Render task tags */}
          {Array.isArray(task.tags) && task.tags.length > 0 && task.tags.map((tag: string, i: number) => (
            <span 
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(tag);
              }}
              className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors border border-slate-200/50 dark:border-slate-700/50"
              title={`${t('Lọc theo thẻ')} #${tag}`}
            >
              <Tag className="w-2.5 h-2.5 text-slate-400" /> #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Gamification XP badge */}
      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 shrink-0">
        ⚡ +15 XP
      </span>

      {/* Action buttons on row */}
      <div className="flex items-center gap-1 sm:gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        {!isCompleted && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleTimer(); }}
            className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
              timerActive 
                ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-200 animate-pulse' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={t('Đo thời gian làm việc')}
          >
            {timerActive ? (
              <><Square className="w-3 h-3 fill-current" /> {formatTimer(timerSeconds)}</>
            ) : (
              <><Play className="w-3 h-3 fill-current" /> <span className="hidden lg:inline">{t('Bắt đầu')}</span></>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
          title={t('Chỉnh sửa chi tiết')}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
          title={t('Xóa công việc')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({ title, status, tasks, onEdit, onDropTask, onTagClick, onDelete }: any) {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const colTasks = tasks.filter((t: any) => normalizeTaskStatus(t.status) === status);
  
  return (
    <div 
      className={`flex-1 min-w-[280px] flex flex-col rounded-2xl border transition-all overflow-hidden ${
        isDragOver 
          ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500 border-dashed ring-2 ring-emerald-400/40" 
          : "bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md border-slate-200/80 dark:border-slate-800 shadow-xs"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId && onDropTask) onDropTask(taskId, status);
      }}
    >
      <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
          <span>{title}</span>
          <span className="bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.2 rounded-full text-xs font-black">
            {colTasks.length}
          </span>
        </h3>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
        {colTasks.length === 0 && (
          <div className="py-10 text-center text-xs text-slate-400 font-medium">
            ✨ {t('Kéo thả hoặc thêm việc vào đây')}
          </div>
        )}
        {colTasks.map((task: any) => (
          <div 
            key={task.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)} 
            onClick={() => onEdit(task)}
            className="bg-white dark:bg-slate-900 p-3.5 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-800 cursor-grab active:cursor-grabbing hover:border-emerald-500/50 transition-all group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className={`text-sm font-semibold leading-snug ${
                task.status === 'Hoàn thành' || task.status === 'Done' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'
              }`}>
                {t(task.title)}
              </h4>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-all hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title={t('Xóa nhanh')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
              {getPriorityBadge(task.priority, t)}

              {task.dueDate && (
                <span className="text-[10px] font-medium flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
                  <CalendarIcon className="w-3 h-3 text-slate-400" /> {formatDate(task.dueDate, language)}
                </span>
              )}
            </div>

            {/* Tags in Kanban card */}
            {Array.isArray(task.tags) && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {task.tags.map((tag: string, i: number) => (
                  <span 
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTagClick) onTagClick(tag);
                    }}
                    className="text-[10px] inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-1.5 py-0.2 rounded-md font-medium cursor-pointer transition-colors"
                    title={`${t('Lọc theo thẻ')} #${tag}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskModal({ task, onClose, onSave, onDelete, projects, goals }: any) {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [formData, setFormData] = useState<any>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'Chưa làm',
    priority: task?.priority || 'Trung bình',
    dueDate: task?.dueDate || '',
    projectId: task?.projectId || '',
    linkedGoalId: task?.linkedGoalId || '',
    estimatedHours: task?.estimatedHours ?? '',
    actualHours: task?.actualHours ?? 0,
    recurrence: task?.recurrence || task?.recurring || 'none',
    tags: Array.isArray(task?.tags) ? task.tags.join(', ') : (task?.tags || ''),
    notes: task?.notes || '',
  });

  // Attachments State (Cloudflare R2)
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = async (taskId: string) => {
    try {
      setIsLoadingAttachments(true);
      const res = await apiCall(`/api/tasks/${taskId}/attachments`);
      if (res && res.success) {
        setAttachments(res.attachments || []);
      }
    } catch (e) {
      console.warn('Failed to load attachments:', e);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (task?.id) {
      loadAttachments(task.id);
    }
  }, [task?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task?.id) return;

    if (file.size > 20 * 1024 * 1024) {
      alert(t('Kích thước tệp không được vượt quá 20MB'));
      return;
    }

    try {
      setIsUploadingAttachment(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          // 1. Upload to Cloudflare R2
          const uploadRes = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            folder: `tasks/${task.id}`
          });

          const fileUrl = uploadRes.file?.url || base64Data;

          // 2. Save attachment record in PostgreSQL
          await apiCall(`/api/tasks/${task.id}/attachments`, 'POST', {
            fileName: file.name,
            fileUrl,
            fileSize: file.size
          });

          await loadAttachments(task.id);
        } catch (uploadErr: any) {
          alert(t('Không thể tải tệp lên:') + ' ' + uploadErr.message);
        } finally {
          setIsUploadingAttachment(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingAttachment(false);
      alert(t('Lỗi khi đọc tệp:') + ' ' + err.message);
    }
    e.target.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task?.id || !window.confirm(t('Bạn có chắc chắn muốn xóa tệp này?'))) return;
    try {
      await apiCall(`/api/tasks/${task.id}/attachments/${attachmentId}`, 'DELETE');
      await loadAttachments(task.id);
    } catch (err: any) {
      alert(t('Lỗi khi xóa tệp:') + ' ' + err.message);
    }
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const parsedTags = typeof formData.tags === 'string'
      ? formData.tags.split(',').map((t: string) => t.trim().replace(/^#/, '')).filter(Boolean)
      : (Array.isArray(formData.tags) ? formData.tags : []);

    const rawDesc = (formData.description || '').trim();
    const rawNotes = (formData.notes || '').trim();
    const mergedDescription = rawNotes && !rawDesc.includes(rawNotes)
      ? (rawDesc ? `${rawDesc}\n\n[Ghi chú]: ${rawNotes}` : rawNotes)
      : rawDesc;

    onSave({
      ...(task || {}),
      title: formData.title.trim(),
      description: mergedDescription,
      status: formData.status,
      priority: formData.priority,
      dueDate: formData.dueDate || null,
      projectId: formData.projectId || null,
      linkedGoalId: formData.linkedGoalId || null,
      estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : 0,
      actualHours: formData.actualHours ? Number(formData.actualHours) : 0,
      recurrence: formData.recurrence,
      tags: parsedTags
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{task ? t('Chỉnh sửa Công việc') : t('Thêm Công việc Mới')}</h3>
          <div className="flex items-center gap-2">
            {task && (
              <button 
                type="button" 
                onClick={() => onDelete(task.id)} 
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                title={t('Xóa công việc')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label={t('Đóng')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form id="task-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('Tên công việc')} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" required autoFocus
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-medium"
                placeholder={t('VD: Soạn thảo đề xuất kế hoạch quý 4...')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Trạng thái')}</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                >
                  <option value="Chưa làm">{t('Chưa làm')}</option>
                  <option value="Đang làm">{t('Đang làm')}</option>
                  <option value="Đang chờ">{t('Đang chờ')}</option>
                  <option value="Hoàn thành">{t('Hoàn thành')}</option>
                  <option value="Đã hoãn">{t('Đã hoãn')}</option>
                  <option value="Hủy">{t('Hủy')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Độ ưu tiên')}</label>
                <select 
                  value={formData.priority} 
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                >
                  <option value="Thấp">{t('Thấp')}</option>
                  <option value="Trung bình">{t('Trung bình')}</option>
                  <option value="Cao">{t('Cao')}</option>
                  <option value="Nghiêm trọng">{t('Nghiêm trọng')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Hạn chót')}</label>
                <input 
                  type="date" 
                  value={formData.dueDate} 
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Dự án liên kết')}</label>
                <select 
                  value={formData.projectId} 
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                >
                  <option value="">{t('Không thuộc dự án nào')}</option>
                  {(projects || []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Mục tiêu liên kết')}</label>
                <select 
                  value={formData.linkedGoalId} 
                  onChange={e => setFormData({ ...formData, linkedGoalId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                >
                  <option value="">{t('Không liên kết mục tiêu')}</option>
                  {(goals || []).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Thời gian dự kiến')} ({t('Giờ')})</label>
                <input 
                  type="number" step="0.5" min="0"
                  value={formData.estimatedHours} 
                  onChange={e => setFormData({ ...formData, estimatedHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                  placeholder="VD: 2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Lặp lại')}</label>
                <select 
                  value={formData.recurrence} 
                  onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                >
                  <option value="none">{t('Không lặp lại')}</option>
                  <option value="daily">{t('Hàng ngày')}</option>
                  <option value="weekly">{t('Hàng tuần')}</option>
                  <option value="monthly">{t('Hàng tháng')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Thẻ phân loại')}</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="text" 
                    value={formData.tags} 
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white text-sm"
                    placeholder="VD: uutien, baocao, frontend"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{t('Phân cách các thẻ bằng dấu phẩy (,)')}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{t('Mô tả & Ghi chú chi tiết')}</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[90px] text-slate-900 dark:text-white text-sm"
                placeholder={t('Nội dung chi tiết, tài liệu tham khảo, tiêu chí hoàn thành...')}
              ></textarea>
            </div>

            {/* CLOUDFLARE R2 ATTACHMENTS */}
            {task ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('Tệp đính kèm')} (Cloudflare R2)</span>
                    <span className="text-[10px] text-slate-400">({attachments.length})</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAttachment}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAttachment ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{t('Đang tải lên...')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>{t('Thêm tệp đính kèm')}</span>
                      </>
                    )}
                  </button>
                </div>

                {isLoadingAttachments ? (
                  <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('Đang tải tệp...')}</span>
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-1">
                    {t('Chưa có tệp nào được đính kèm. Bạn có thể tải lên tài liệu, hình ảnh, PDF để lưu trữ không giới hạn trên R2.')}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                            {att.fileName}
                          </span>
                          {att.fileSize > 0 && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(att.fileSize / 1024).toFixed(0)} KB)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title={t('Tải về / Mở tệp')}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                            title={t('Xóa tệp')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                💡 {t('Lưu ý: Bạn có thể đính kèm tập tin và hình ảnh (Cloudflare R2) sau khi lưu công việc này.')}
              </p>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-sm"
            >
              {t('Hủy')}
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-xs cursor-pointer text-sm"
            >
              {t('Lưu Công việc')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
