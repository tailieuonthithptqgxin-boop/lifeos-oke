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

  const isVi = language === 'vi';
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
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
          isActive
            ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#0F172A] dark:hover:text-slate-100'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#059669] dark:text-emerald-400' : 'text-slate-400'}`} />
        <span className="truncate flex-1">{t(item.label)}</span>
        {item.id === 'subscription' && (
          <span className="text-[10px] font-normal text-slate-400">
            {subscriptionStatus?.hasAccess ? `${subscriptionStatus.remainingDays || 0}d` : 'Free'}
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
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-[240px] md:w-[240px] shrink-0 bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header with Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="LifeOS Logo" 
              className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0" 
            />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">LifeOS</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300">
                PRO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Customize Sidebar */}
            <button
              type="button"
              onClick={() => setShowCustomizer(true)}
              title={isVi ? 'Cá nhân hóa danh mục' : 'Customize Sidebar'}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label={isVi ? 'Đóng danh mục' : 'Close Menu'}
              className="md:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          
          {/* Group 1: NHỊP SỐNG HÀNG NGÀY */}
          {availableDailyItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {isVi ? 'NHỊP SỐNG HÀNG NGÀY' : 'DAILY RHYTHM'}
              </div>
              {availableDailyItems.map(renderNavButton)}
            </div>
          )}

          {/* Group 2: KHÔNG GIAN */}
          {availableSpacesItems.length > 0 && (
            <div className="space-y-0.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
              <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {isVi ? 'KHÔNG GIAN' : 'SPACES'}
              </div>
              {availableSpacesItems.map(renderNavButton)}
            </div>
          )}

          {/* Section: Custom Modules */}
          {customModules.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                      isModActive
                        ? 'bg-[#ECFDF5] dark:bg-emerald-950/40 text-[#059669] dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-[#0F172A] dark:hover:text-slate-100'
                    }`}
                  >
                    <Layers className={`w-4 h-4 shrink-0 ${isModActive ? 'text-[#059669] dark:text-emerald-400' : 'text-slate-400'}`} />
                    <span className="truncate flex-1">{mod.name}</span>
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
        <div className="px-3 py-2 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            title={isVi ? 'Giao diện' : 'Theme'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{isVi ? 'Tối' : 'Dark'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{isVi ? 'Sáng' : 'Light'}</span>
              </>
            )}
          </button>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={isVi ? 'Ngôn ngữ' : 'Language'}
            className="flex-1 py-1.5 px-2 rounded-md border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Footer profile & quick status */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <button
              type="button"
              onClick={() => {
                setCurrentView('account');
                if (isMobileMenuOpen) toggleMobileMenu();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1 mr-1.5 group"
              title={isVi ? 'Tài khoản của tôi' : 'My Account'}
            >
              <div className="relative shrink-0">
                <img
                  src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=LifeOS+SuperAdmin&background=10B981&color=fff'}
                  alt={currentUser?.name || 'LifeOS SuperAdmin'}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200 dark:border-slate-700"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                  {currentUser?.name || 'LifeOS SuperAdmin'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                  {currentUser?.plan || 'SuperAdmin'}
                </p>
              </div>
            </button>
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={logout}
              title={isVi ? 'Đăng xuất' : 'Sign Out'}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
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
