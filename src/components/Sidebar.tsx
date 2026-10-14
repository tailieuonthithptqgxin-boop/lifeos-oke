import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  DollarSign,
  Zap,
  FolderKanban,
  BookOpen,
  Target,
  FileText,
  Activity,
  GitBranch,
  Cpu,
  User,
  ShoppingBag,
  Shield,
  LogOut,
  X,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  CreditCard,
  Layers,
  Gift,
  MessageSquare,
  Compass
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { ViewState } from '../lib/types';
import { apiCall } from '../lib/apiClient';

import { SidebarCustomizerModal, getVisibleNavModules } from './SidebarCustomizerModal';

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  description?: string;
}

// 1. Daily Rhythm
const DAILY_RHYTHM_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { id: 'focus', label: 'Focus', icon: Zap },
  { id: 'journey', label: 'Journey', icon: Compass },
];

// 2. Spaces
const SPACES_ITEMS: NavItem[] = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'projects', label: 'Projects (P.A.R.A)', icon: FolderKanban },
  { id: 'habits', label: 'Habits', icon: Target },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'study', label: 'Study & Vocab', icon: BookOpen },
  { id: 'notes', label: 'Journal & Notes', icon: FileText },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

// 3. Ecosystem & Tools
const SYSTEM_ITEMS: NavItem[] = [
  { id: 'marketplace', label: 'Templates Marketplace', icon: ShoppingBag },
  { id: 'automation', label: 'Automation Rules', icon: Cpu },
  { id: 'decision', label: 'Decision Engine', icon: GitBranch },
  { id: 'subscription', label: 'Plans & Team', icon: CreditCard },
  { id: 'referral', label: 'Referral 20%', icon: Gift },
  { id: 'feedback', label: 'Feedback & Support', icon: MessageSquare },
  { id: 'admin', label: 'System Admin', icon: Shield, adminOnly: true }
];

export function Sidebar() {
  const {
    currentView,
    setCurrentView,
    currentUser,
    logout,
    isMobileMenuOpen,
    toggleMobileMenu,
    theme,
    setTheme,
    language,
    setLanguage,
    activeLanguages,
    subscriptionStatus
  } = useAppStore();

  const t = useTranslation(language);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [visibleModules, setVisibleModules] = useState<string[]>(() => getVisibleNavModules());
  const [customModules, setCustomModules] = useState<Array<{ id: string; name: string; slug: string; icon: string }>>([]);

  React.useEffect(() => {
    apiCall<{ success: boolean; modules: any[] }>('/api/custom-modules')
      .then(res => {
        if (res && res.success && res.modules) {
          setCustomModules(res.modules);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  const isVisible = (id: string) => id === 'dashboard' || visibleModules.includes(id);

  const availableDailyItems = DAILY_RHYTHM_ITEMS.filter(item => isVisible(item.id));
  const availableSpacesItems = SPACES_ITEMS.filter(item => isVisible(item.id));
  const availableSystemItems = SYSTEM_ITEMS.filter(item => (!item.adminOnly || isAdmin) && isVisible(item.id));

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;

    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        type="button"
        onClick={() => {
          setCurrentView(item.id);
          if (isMobileMenuOpen) toggleMobileMenu();
        }}
        className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left cursor-pointer ${
          isActive
            ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 scale-[1.01]'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${
          isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400'
        }`}>
          <Icon className="w-4 h-4 shrink-0" />
        </div>
        <span className="truncate flex-1">{t(item.label)}</span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 shrink-0" />
        )}
        {item.id === 'subscription' && (
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
              subscriptionStatus?.hasAccess
                ? (isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60')
                : (isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/60')
            }`}
          >
            {subscriptionStatus?.hasAccess
              ? `${subscriptionStatus.remainingDays || 0} ${t('ngày')}`
              : (subscriptionStatus?.status === 'EXPIRED' ? t('Hết hạn') : t('Chưa mua'))}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 md:w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header with Fresh Green Unisex Logo */}
        <div className="h-16 flex items-center justify-between px-5 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-slate-900 dark:text-white tracking-tight leading-none text-base">
                  Life<span className="text-emerald-500">OS</span>
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Gen-Z
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Personal Life OS</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Customize Sidebar */}
            <button
              type="button"
              onClick={() => setShowCustomizer(true)}
              title={t('Cá nhân hóa danh mục')}
              className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label={t('Đóng danh mục')}
              className="md:hidden p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          
          {/* Group 1: Nhịp sống hàng ngày (DAILY RHYTHM) */}
          {availableDailyItems.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>{t('Daily Rhythm')}</span>
                <span className="text-[9px] text-emerald-500 font-bold lowercase">{t('today')}</span>
              </div>
              {availableDailyItems.map(renderNavButton)}
            </div>
          )}

          {/* Group 2: Spaces */}
          {availableSpacesItems.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t('Spaces')} ({availableSpacesItems.length})
              </div>
              {availableSpacesItems.map(renderNavButton)}
            </div>
          )}

          {/* Section: Custom Modules */}
          {customModules.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-purple-100/60 dark:border-purple-900/30">
              <div className="px-3 pb-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>{t('Custom Modules')}</span>
              </div>
              {customModules.map(mod => {
                const modView = `custom_module_${mod.slug}`;
                const isModActive = currentView === modView;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setCurrentView(modView as ViewState);
                      if (isMobileMenuOpen) toggleMobileMenu();
                    }}
                    className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 text-left btn-squishy ${
                      isModActive
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    <div className={`p-1 rounded-xl transition-all ${
                      isModActive ? 'bg-white/20 text-white' : 'text-teal-500 group-hover:scale-110'
                    }`}>
                      <Layers className="w-4 h-4 shrink-0" />
                    </div>
                    <span className="truncate flex-1 font-bold">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Group 3: System & Tools */}
          {availableSystemItems.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="px-3 pb-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {t('System & Tools')}
              </div>
              {availableSystemItems.map(renderNavButton)}
            </div>
          )}
        </nav>

        {/* Quick Preferences: Theme & Language */}
        <div className="px-3.5 pt-2.5 pb-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50/80 dark:bg-slate-800/80 hover:bg-emerald-100 dark:hover:bg-slate-700/80 font-bold transition-all text-emerald-800 dark:text-emerald-300 cursor-pointer text-xs btn-squishy border border-emerald-200/50"
            title={t('Giao diện')}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('Tối')}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{t('Sáng')}</span>
              </>
            )}
          </button>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('Ngôn ngữ')}
            className="px-2.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 font-bold text-xs border border-slate-200 dark:border-slate-700 outline-none cursor-pointer text-slate-700 dark:text-slate-300 transition-all btn-squishy"
          >
            {(activeLanguages && activeLanguages.length > 0 ? activeLanguages : [
              { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
              { code: 'en', name: 'English', flag: '🇬🇧' }
            ]).map(l => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Footer profile & quick status */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-slate-500/10 border border-emerald-200/40 dark:border-emerald-800/30 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setCurrentView('account');
                if (isMobileMenuOpen) toggleMobileMenu();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left transition-opacity cursor-pointer flex-1 mr-2 group"
              title={t('Tài khoản của tôi')}
            >
              <div className="relative shrink-0">
                <img
                  src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'}
                  alt={currentUser?.name || 'User'}
                  className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-700 object-cover ring-2 ring-emerald-500/40 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-700 transition-colors">
                  {currentUser?.name || t('Người dùng')}
                </p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold truncate">
                  {currentUser?.plan || 'Free'}
                </p>
              </div>
            </button>
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={logout}
              title={t('Đăng xuất')}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 btn-squishy"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Customizer Modal */}
      <SidebarCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSaved={(mods) => setVisibleModules(mods)}
      />
    </>
  );
}
