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
  MessageSquare
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { ViewState } from '../lib/types';
import { apiCall } from '../lib/apiClient';

interface NavItem {
  id: ViewState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  description?: string;
}

const DAILY_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'tasks', label: 'Công việc', icon: CheckSquare },
  { id: 'calendar', label: 'Lịch biểu', icon: Calendar },
  { id: 'finance', label: 'Tài chính', icon: DollarSign },
  { id: 'notes', label: 'Ghi chú', icon: FileText },
];

const GROWTH_ITEMS: NavItem[] = [
  { id: 'goals', label: 'Mục tiêu', icon: Target },
  { id: 'habits', label: 'Thói quen', icon: Activity },
  { id: 'focus', label: 'Tập trung', icon: Zap },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'study', label: 'Học tập', icon: BookOpen },
];

const ADVANCED_ITEMS: NavItem[] = [
  { id: 'subscription', label: 'Gói cước & Đội ngũ', icon: CreditCard },
  { id: 'referral', label: 'Giới thiệu nhận 30%', icon: Gift },
  { id: 'feedback', label: 'Góp ý & Báo lỗi', icon: MessageSquare },
  { id: 'marketplace', label: 'Thư viện mẫu', icon: ShoppingBag },
  { id: 'decision', label: 'Hỗ trợ ra quyết định', icon: GitBranch },
  { id: 'automation', label: 'Quy tắc tự động', icon: Cpu },
  { id: 'admin', label: 'Quản trị hệ thống', icon: Shield, adminOnly: true }
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

  // Filter advanced items
  const availableAdvancedItems = ADVANCED_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const isCurrentInAdvanced = availableAdvancedItems.some(item => item.id === currentView);

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
        className={`w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 text-left btn-squishy ${
          isActive
            ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
            : 'text-slate-600 dark:text-slate-400 hover:bg-violet-50/70 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${
          isActive ? 'bg-white/20 text-white' : 'text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:scale-110'
        }`}>
          <Icon className="w-4 h-4 shrink-0" />
        </div>
        <span className="truncate flex-1 font-bold">{t(item.label)}</span>
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
        )}
        {item.id === 'subscription' && (
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
              subscriptionStatus?.hasAccess
                ? (isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60')
                : (isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/60')
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
          className="fixed inset-0 z-40 bg-purple-950/40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 md:w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-purple-100/60 dark:border-purple-900/30 transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header with Cute Gen Z Logo */}
        <div className="h-18 flex items-center justify-between px-5 sm:px-6 border-b border-purple-100/50 dark:border-purple-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-300 p-0.5 shadow-md shadow-pink-500/20 animate-pulse-soft">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-slate-900 dark:text-white tracking-tight leading-none text-lg">
                  Life<span className="bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">OS</span>
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300">
                  Cute ✨
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{t('Không gian làm việc')}</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={t('Đóng danh mục')}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-pink-50 dark:hover:bg-slate-800 transition-colors btn-squishy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
          
          {/* Section 1: Hàng ngày */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>🌸</span>
              <span>{t('Hàng ngày')}</span>
            </div>
            {DAILY_ITEMS.map(renderNavButton)}
          </div>

          {/* Section 2: Kế hoạch & Phát triển */}
          <div className="space-y-1 pt-2 border-t border-purple-100/60 dark:border-purple-900/30">
            <div className="px-3 pb-1 text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>🎯</span>
              <span>{t('Kế hoạch & Mục tiêu')}</span>
            </div>
            {GROWTH_ITEMS.map(renderNavButton)}
          </div>

          {/* Section: Lĩnh vực mở rộng (Custom Modules) */}
          {customModules.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-purple-100/60 dark:border-purple-900/30">
              <div className="px-3 pb-1 text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>{t('Lĩnh vực mở rộng')}</span>
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
                        ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-violet-50/70 dark:hover:bg-purple-950/30 hover:text-purple-700 dark:hover:text-purple-300'
                    }`}
                  >
                    <div className={`p-1 rounded-xl transition-all ${
                      isModActive ? 'bg-white/20 text-white' : 'text-indigo-400 group-hover:scale-110'
                    }`}>
                      <Layers className="w-4 h-4 shrink-0" />
                    </div>
                    <span className="truncate flex-1 font-bold">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section 3: Công cụ Nâng cao (Thu gọn / Mở rộng) */}
          <div className="pt-2 border-t border-purple-100/60 dark:border-purple-900/30">
            <button
              type="button"
              onClick={() => setShowAdvanced(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-1.5 uppercase text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500">
                <Sliders className="w-3 h-3" />
                {t('Công cụ nâng cao')} ({availableAdvancedItems.length})
              </span>
              {showAdvanced || isCurrentInAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {(showAdvanced || isCurrentInAdvanced) && (
              <div className="mt-1 space-y-1 pl-1 animate-in fade-in duration-150">
                {availableAdvancedItems.map(renderNavButton)}
              </div>
            )}
          </div>
        </nav>

        {/* Quick Preferences: Theme & Language */}
        <div className="px-3.5 pt-2.5 pb-2.5 border-t border-purple-100/60 dark:border-purple-900/30 flex items-center justify-between text-xs gap-2">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-violet-50/80 dark:bg-slate-800/80 hover:bg-violet-100 dark:hover:bg-slate-700/80 font-bold transition-all text-violet-700 dark:text-violet-300 cursor-pointer text-xs btn-squishy border border-violet-150/40"
            title={t('Giao diện')}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('Tối')} ✨</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>{t('Sáng')} ☀️</span>
              </>
            )}
          </button>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('Ngôn ngữ')}
            className="px-2.5 py-2 rounded-2xl bg-pink-50/80 dark:bg-slate-800/80 hover:bg-pink-100 dark:hover:bg-slate-700/80 font-bold text-xs border border-pink-150/40 outline-none cursor-pointer text-pink-700 dark:text-pink-300 transition-all btn-squishy"
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
        <div className="p-3 border-t border-purple-100/60 dark:border-purple-900/30 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-amber-500/10 border border-purple-200/50 dark:border-purple-800/40 shadow-xs">
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
                  className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-700 object-cover ring-2 ring-pink-400/50 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-purple-600 transition-colors">
                  {currentUser?.name || t('Người dùng')}
                </p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold truncate">
                  {currentUser?.plan || 'Free'} · Level 1
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
    </>
  );
}
