import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import {
  Search, CheckSquare, Calendar, Wallet, FolderKanban,
  FileText, Target, Repeat, Scale, Cpu, User, ShoppingBag,
  ArrowRight, Sparkles, X, Plus, Clock, Shield, BookOpen, Zap
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { ViewState } from '../lib/types';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Điều hướng' | 'Công việc' | 'Dự án' | 'Ghi chú' | 'Tài chính' | 'Mục tiêu' | 'Thói quen' | 'Quyết định' | 'Lệnh nhanh';
  icon: any;
  action: () => void;
  badge?: string;
}

export function CommandCenter() {
  const {
    isCommandOpen,
    toggleCommand,
    setCurrentView,
    currentUser,
    tasks,
    projects,
    notes,
    transactions,
    goals,
    habits,
    decisions,
    addTask,
    addTransaction,
    language
  } = useAppStore();

  const t = useTranslation(language);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
      if (e.key === 'Escape' && isCommandOpen) {
        toggleCommand();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, toggleCommand]);

  // Focus on open
  useEffect(() => {
    if (isCommandOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        setQuery('');
        setSelectedIndex(0);
      }, 50);
    }
  }, [isCommandOpen]);

  // Navigation pages list
  const navItems = useMemo(() => [
    { title: 'Bảng điều khiển Tổng quan (Dashboard)', view: 'dashboard' as ViewState, icon: Sparkles },
    { title: 'Quản lý Công việc & Nhiệm vụ (Tasks)', view: 'tasks' as ViewState, icon: CheckSquare },
    { title: 'Lịch trình & Thời gian biểu (Calendar)', view: 'calendar' as ViewState, icon: Calendar },
    { title: 'Dự án & Danh mục P.A.R.A (Projects)', view: 'projects' as ViewState, icon: FolderKanban },
    { title: 'Ghi chú & Sổ tay thông minh (Notes)', view: 'notes' as ViewState, icon: FileText },
    { title: 'Tài chính, Ví tiền & Chi tiêu (Finance)', view: 'finance' as ViewState, icon: Wallet },
    { title: 'Mục tiêu & Kế hoạch cuộc đời (Goals)', view: 'goals' as ViewState, icon: Target },
    { title: 'Theo dõi Thói quen hàng ngày (Habits)', view: 'habits' as ViewState, icon: Repeat },
    { title: 'Đồng hồ Tập trung Pomodoro (Focus)', view: 'focus' as ViewState, icon: Clock },
    { title: 'Hệ thống Quản lý Học tập (Study OS)', view: 'study' as ViewState, icon: BookOpen },
    { title: 'Động cơ Ra quyết định (Decision Engine)', view: 'decision' as ViewState, icon: Scale },
    { title: 'Quy tắc Tự động hóa (Automation Engine)', view: 'automation' as ViewState, icon: Cpu },
    { title: 'Kho Giao diện & Mẫu Templates (Marketplace)', view: 'marketplace' as ViewState, icon: ShoppingBag },
    { title: 'Gói dịch vụ & Quản lý Đội ngũ (Subscription)', view: 'subscription' as ViewState, icon: Zap },
    { title: 'Tài khoản & Thiết lập của tôi (My Account)', view: 'account' as ViewState, icon: User },
    ...(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN' ? [
      { title: 'Trung tâm Quản trị Hệ thống (Admin Portal)', view: 'admin' as ViewState, icon: Shield }
    ] : [])
  ], [currentUser?.role]);

  // Computed Search Results
  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const list: SearchResultItem[] = [];

    // Check for Slash Command mode
    if (q.startsWith('/')) {
      const parts = q.slice(1).split(' ');
      const cmd = parts[0];
      const param = parts.slice(1).join(' ').trim();

      if ('task'.startsWith(cmd)) {
        list.push({
          id: 'cmd-task',
          title: param ? `Tạo công việc: "${param}"` : 'Tạo công việc mới: /task [tên công việc]',
          subtitle: 'Nhấn Enter để thêm ngay vào danh sách việc cần làm',
          category: 'Lệnh nhanh',
          icon: CheckSquare,
          badge: 'Nhiệm vụ',
          action: () => {
            if (param) {
              addTask({
                title: param,
                status: 'Chưa làm',
                priority: 'Trung bình',
                dueDate: null,
                projectId: null,
                notes: 'Tạo từ Spotlight'
              });
              setSuccessToast(`Đã tạo công việc "${param}"`);
              setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
            }
          }
        });
      }

      if ('expense'.startsWith(cmd) || 'chi'.startsWith(cmd)) {
        list.push({
          id: 'cmd-expense',
          title: param ? `Ghi chi tiêu: ${param}` : 'Ghi chi tiêu nhanh: /expense [số tiền] [nội dung]',
          subtitle: 'VD: /expense 50000 Ăn sáng',
          category: 'Lệnh nhanh',
          icon: Wallet,
          badge: 'Chi tiêu',
          action: () => {
            const rawParts = param.split(' ');
            const amt = parseInt(rawParts[0].replace(/\D/g, '')) || 0;
            const desc = rawParts.slice(1).join(' ') || 'Chi tiêu nhanh';
            if (amt > 0) {
              addTransaction({
                amount: amt,
                type: 'Chi tiêu',
                category: 'Ăn uống / Sinh hoạt',
                date: new Date().toISOString().split('T')[0],
                description: desc
              });
              setSuccessToast(`Đã ghi chi tiêu ${formatCurrency(amt)}: "${desc}"`);
              setTimeout(() => { toggleCommand(); setSuccessToast(null); }, 600);
            }
          }
        });
      }

      return list;
    }

    // Default / General Search across everything
    if (!q) {
      // When empty: show common quick jump navigation items & shortcuts
      navItems.slice(0, 6).forEach((item) => {
        list.push({
          id: `nav-${item.view}`,
          title: item.title,
          subtitle: `Mở giao diện ${item.title.split('(')[0].trim()}`,
          category: 'Điều hướng',
          icon: item.icon,
          badge: 'Trang',
          action: () => {
            setCurrentView(item.view);
            toggleCommand();
          }
        });
      });
      return list;
    }

    // 1. Navigation items matching query
    navItems.forEach((item) => {
      if (item.title.toLowerCase().includes(q)) {
        list.push({
          id: `nav-${item.view}`,
          title: item.title,
          subtitle: 'Nhảy nhanh đến trang này',
          category: 'Điều hướng',
          icon: item.icon,
          badge: 'Trang',
          action: () => {
            setCurrentView(item.view);
            toggleCommand();
          }
        });
      }
    });

    // 2. Tasks
    (tasks || []).forEach((t: any) => {
      if (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
        list.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: `${t.status || 'Chưa làm'} • Hạn: ${t.dueDate ? formatDate(t.dueDate) : 'Không có'}`,
          category: 'Công việc',
          icon: CheckSquare,
          badge: t.priority || 'Trung bình',
          action: () => {
            setCurrentView('tasks');
            toggleCommand();
          }
        });
      }
    });

    // 3. Projects
    (projects || []).forEach((p: any) => {
      if (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) {
        list.push({
          id: `proj-${p.id}`,
          title: p.name,
          subtitle: `Tiến độ: ${Math.round(p.progress || 0)}% • Trạng thái: ${p.status || 'Đang làm'}`,
          category: 'Dự án',
          icon: FolderKanban,
          badge: 'Dự án',
          action: () => {
            setCurrentView('projects');
            toggleCommand();
          }
        });
      }
    });

    // 4. Notes
    (notes || []).forEach((n: any) => {
      if (n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)) {
        list.push({
          id: `note-${n.id}`,
          title: n.title,
          subtitle: n.content ? (n.content.slice(0, 75) + '...') : 'Ghi chú',
          category: 'Ghi chú',
          icon: FileText,
          badge: n.category || 'Ghi chú',
          action: () => {
            setCurrentView('notes');
            toggleCommand();
          }
        });
      }
    });

    // 5. Goals & Habits
    (goals || []).forEach((g: any) => {
      if (g.title?.toLowerCase().includes(q)) {
        list.push({
          id: `goal-${g.id}`,
          title: g.title,
          subtitle: `Tiến độ: ${Math.round(g.progress || 0)}% • Danh mục: ${g.category || 'Cá nhân'}`,
          category: 'Mục tiêu',
          icon: Target,
          badge: 'Mục tiêu',
          action: () => {
            setCurrentView('goals');
            toggleCommand();
          }
        });
      }
    });

    (habits || []).forEach((h: any) => {
      if (h.name?.toLowerCase().includes(q)) {
        list.push({
          id: `habit-${h.id}`,
          title: h.name,
          subtitle: `Chuỗi hiện tại: ${h.streak || 0} ngày • Mục tiêu: ${h.target || 1} ${h.unitLabel || 'lần'}`,
          category: 'Thói quen',
          icon: Repeat,
          badge: `${h.streak || 0} ngày`,
          action: () => {
            setCurrentView('habits');
            toggleCommand();
          }
        });
      }
    });

    // 6. Transactions
    (transactions || []).forEach((tr: any) => {
      const desc = tr.description || tr.category || '';
      if (desc.toLowerCase().includes(q) || String(tr.amount).includes(q)) {
        list.push({
          id: `tx-${tr.id}`,
          title: `${tr.type === 'Thu nhập' ? '+' : '-'}${formatCurrency(tr.amount)}: ${desc}`,
          subtitle: `${tr.category || 'Chung'} • ${tr.date ? formatDate(tr.date) : ''}`,
          category: 'Tài chính',
          icon: Wallet,
          badge: tr.type || 'Giao dịch',
          action: () => {
            setCurrentView('finance');
            toggleCommand();
          }
        });
      }
    });

    // 7. Decisions
    (decisions || []).forEach((d: any) => {
      if (d.title?.toLowerCase().includes(q) || d.problem?.toLowerCase().includes(q)) {
        list.push({
          id: `dec-${d.id}`,
          title: d.title,
          subtitle: `Trạng thái: ${d.status || 'Đang phân tích'} • Điểm số: ${d.score || 0}`,
          category: 'Quyết định',
          icon: Scale,
          badge: d.importance || 'Chiến lược',
          action: () => {
            setCurrentView('decision_engine');
            toggleCommand();
          }
        });
      }
    });

    return list.slice(0, 25);
  }, [query, navItems, tasks, projects, notes, goals, habits, transactions, decisions, addTask, addTransaction, setCurrentView, toggleCommand]);

  // Adjust selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  if (!isCommandOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={toggleCommand}
      />

      {/* Spotlight Window */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150 flex flex-col max-h-[75vh]">
        {/* Input Bar */}
        <div className="relative border-b border-slate-100 dark:border-slate-800 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('Tìm kiếm công việc, dự án, ghi chú, ví tiền hoặc gõ /task, /expense...')}
            className="w-full text-base sm:text-lg bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Success Toast inside modal */}
        {successToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">{t('Không có kết quả nào phù hợp.')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('Thử tìm theo tên nhiệm vụ, dự án hoặc gõ /task để tạo mới')}</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm truncate">{t(item.title)}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {t(item.badge)}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-medium hidden sm:inline-block">
                      {t(item.category)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10px] font-bold">↑↓</kbd> {t('Di chuyển')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-[10px] font-bold">↵</kbd> {t('Chọn')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuery('/task ')}
              className="hover:text-blue-600 dark:hover:text-blue-400 font-mono text-[10px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 cursor-pointer"
            >
              /task
            </button>
            <button
              type="button"
              onClick={() => setQuery('/expense ')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 font-mono text-[10px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 cursor-pointer"
            >
              /expense
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
