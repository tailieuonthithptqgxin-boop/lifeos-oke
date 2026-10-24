import React, { useState } from 'react';
import { 
  LayoutDashboard, CheckSquare, Zap, Menu, Plus, X, 
  DollarSign, FileText, Calendar, Target, Sparkles 
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { ViewState } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { soundEngine } from '../lib/soundEngine';

export function BottomNav() {
  const { currentView, setCurrentView, toggleMobileMenu, tasks, language } = useAppStore();
  const isVi = language === 'vi';
  const t = useTranslation(language);

  const [showQuickActionSheet, setShowQuickActionSheet] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showQuickActionSheet) {
        setShowQuickActionSheet(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickActionSheet]);

  const pendingTaskCount = (tasks || []).filter(
    t => t.status !== 'Hoàn thành' && t.status !== 'Hủy' && t.status !== 'Completed' && t.status !== 'Cancelled'
  ).length;

  const handleTabPress = (view: ViewState) => {
    try { soundEngine.playPop(); } catch {}
    setShowQuickActionSheet(false);
    if (currentView !== view) {
      setCurrentView(view);
    }
  };

  const handleOpenAction = (view: ViewState) => {
    try { soundEngine.playPop(); } catch {}
    setShowQuickActionSheet(false);
    setCurrentView(view);
  };

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        aria-label={t('Mobile Navigation')}
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl px-3 pt-1 pb-[max(0.625rem,env(safe-area-inset-bottom))] transition-all"
      >
        <div className="flex items-center justify-between w-full max-w-md mx-auto relative">
          
          {/* 1. Hôm nay */}
          <button
            id="mobile-tab-dashboard"
            type="button"
            onClick={() => handleTabPress('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              currentView === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-semibold'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform ${currentView === 'dashboard' ? 'scale-110 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight font-bold">
              {isVi ? 'Hôm nay' : 'Today'}
            </span>
            {currentView === 'dashboard' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5" />
            )}
          </button>

          {/* 2. Công việc */}
          <button
            id="mobile-tab-tasks"
            type="button"
            onClick={() => handleTabPress('tasks')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              currentView === 'tasks'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-semibold'
            }`}
          >
            <div className="relative">
              <CheckSquare className={`w-5 h-5 transition-transform ${currentView === 'tasks' ? 'scale-110 stroke-[2.5]' : ''}`} />
              {pendingTaskCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-2xs">
                  {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight font-bold">
              {isVi ? 'Công việc' : 'Tasks'}
            </span>
            {currentView === 'tasks' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5" />
            )}
          </button>

          {/* 3. Nút + Trung tâm (Quick Action) */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <button
              id="mobile-tab-quick-action"
              type="button"
              onClick={() => {
                soundEngine.playPop();
                setShowQuickActionSheet(true);
              }}
              title="Tạo nhanh 1-chạm"
              aria-label="Tạo nhanh"
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-3 -mt-6 shadow-lg shadow-emerald-600/35 border-4 border-white dark:border-slate-900 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <Plus className="w-5 h-5 stroke-[2.8]" />
            </button>
            <span className="text-[9px] font-bold text-slate-400 mt-1">Tạo mới</span>
          </div>

          {/* 4. Tập trung */}
          <button
            id="mobile-tab-focus"
            type="button"
            onClick={() => handleTabPress('focus')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[44px] ${
              currentView === 'focus'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-semibold'
            }`}
          >
            <Zap className={`w-5 h-5 transition-transform ${currentView === 'focus' ? 'scale-110 fill-current' : ''}`} />
            <span className="text-[10px] mt-1 tracking-tight font-bold">
              {isVi ? 'Tập trung' : 'Focus'}
            </span>
            {currentView === 'focus' && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-0.5" />
            )}
          </button>

          {/* 5. Menu Drawer */}
          <button
            id="mobile-tab-menu"
            type="button"
            onClick={() => {
              try { soundEngine.playPop(); } catch {}
              setShowQuickActionSheet(false);
              toggleMobileMenu();
            }}
            className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-600 font-semibold transition-all cursor-pointer min-h-[44px]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight font-bold">{isVi ? 'Menu' : 'More'}</span>
          </button>

        </div>
      </nav>

      {/* Quick Action Mobile Bottom Sheet Modal */}
      {showQuickActionSheet && (
        <div className="fixed inset-0 z-[70] md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowQuickActionSheet(false)}
          />
          <div className="relative z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-250 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Tạo mới 1-chạm</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickActionSheet(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenAction('tasks')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Thêm công việc mới</div>
                  <div className="text-xs text-slate-500">Lên lịch deadline và mức độ ưu tiên</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAction('finance')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Ghi chép chi tiêu / Thu nhập</div>
                  <div className="text-xs text-slate-500">Cập nhật ví và hạn mức Safe-to-Spend</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAction('notes')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Tạo ghi chú mới (Second Brain)</div>
                  <div className="text-xs text-slate-500">Ý tưởng nhanh, nhật ký hoặc checklist</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAction('calendar')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Thêm sự kiện lịch biểu</div>
                  <div className="text-xs text-slate-500">Khung giờ hẹn, học tập và cuộc họp</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAction('goals')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Đặt mục tiêu mới (OKRs)</div>
                  <div className="text-xs text-slate-500">Mục tiêu tháng, quý và cột mốc lớn</div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowQuickActionSheet(false)}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
