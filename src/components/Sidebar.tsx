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
  Layers
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
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left ${
          isActive
            ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate flex-1">{t(item.label)}</span>
        {item.id === 'subscription' && (
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              subscriptionStatus?.hasAccess
                ? (isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300')
                : (isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300')
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
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-xs transition-opacity"
          onClick={toggleMobileMenu}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 sm:px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs shadow-blue-500/30">
              L
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base">
                LifeOS
              </h1>
              <p className="text-[11px] text-slate-400 font-normal mt-0.5">{t('Không gian làm việc')}</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={t('Đóng danh mục')}
            className="md:hidden p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          
          {/* Section 1: Hàng ngày */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Hàng ngày')}
            </div>
            {DAILY_ITEMS.map(renderNavButton)}
          </div>

          {/* Section 2: Kế hoạch & Phát triển */}
          <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('Kế hoạch & Mục tiêu')}
            </div>
            {GROWTH_ITEMS.map(renderNavButton)}
          </div>

          {/* Section: Lĩnh vực mở rộng (Custom Modules) */}
          {customModules.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left cursor-pointer ${
                      isModActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs shadow-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span className="truncate flex-1">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Section 3: Công cụ Nâng cao (Thu gọn / Mở rộng) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
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
        <div className="px-3 pt-2 pb-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
            title={t('Giao diện')}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('Tối')}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>{t('Sáng')}</span>
              </>
            )}
          </button>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label={t('Ngôn ngữ')}
            className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none cursor-pointer text-slate-800 dark:text-slate-200 transition-colors"
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
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => {
                setCurrentView('account');
                if (isMobileMenuOpen) toggleMobileMenu();
              }}
              className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer flex-1 mr-2"
              title={t('Tài khoản của tôi')}
            >
              <img
                src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'}
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser?.name || t('Người dùng')}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email || ''}
                </p>
              </div>
            </button>
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={logout}
              title={t('Đăng xuất')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
