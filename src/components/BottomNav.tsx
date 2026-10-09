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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] transition-colors"
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
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.id === 'tasks' && pendingTaskCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                    {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
                {t(tab.label)}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}

        {/* Menu button to open sidebar with other 10+ modules */}
        <button
          id="mobile-tab-menu"
          type="button"
          onClick={toggleMobileMenu}
          className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">{t('Thêm')}</span>
        </button>
      </div>
    </nav>
  );
}
