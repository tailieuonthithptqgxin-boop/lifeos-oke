import React from 'react';
import { LayoutDashboard, CheckSquare, Calendar, DollarSign, Menu } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { ViewState } from '../lib/types';
import { useTranslation } from '../lib/i18n';

interface TabItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'finance', label: 'Finance', icon: DollarSign },
];

export function BottomNav() {
  const { currentView, setCurrentView, toggleMobileMenu, tasks, language } = useAppStore();
  const t = useTranslation(language);

  const pendingTaskCount = (tasks || []).filter(
    t => t.status !== 'Hoàn thành' && t.status !== 'Hủy'
  ).length;

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label={t('Thanh điều hướng di động')}
      className="md:hidden fixed bottom-2.5 left-3 right-3 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-purple-100/70 dark:border-purple-900/40 rounded-3xl shadow-2xl px-2 py-1.5 transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {PRIMARY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              id={`mobile-tab-${tab.id}`}
              type="button"
              onClick={() => setCurrentView(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all relative btn-squishy ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500/15 via-purple-500/15 to-pink-500/15 text-purple-600 dark:text-purple-300 font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-115 text-purple-600 dark:text-purple-300' : ''}`} />
                {tab.id === 'tasks' && pendingTaskCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-2xs">
                    {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px] font-bold">
                {t(tab.label)}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Menu button to open sidebar with other 10+ modules */}
        <button
          id="mobile-tab-menu"
          type="button"
          onClick={toggleMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 font-semibold transition-all btn-squishy"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight font-bold">{t('Thêm')} ✨</span>
        </button>
      </div>
    </nav>
  );
}
