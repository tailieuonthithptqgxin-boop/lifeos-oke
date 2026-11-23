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
    MessageSquare,
  Compass,
  CalendarDays,
  Users,
  Share2,
  Globe,
  Video,
  GraduationCap,
  Gift
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { ViewState } from '../lib/types';
import { apiCall } from '../lib/apiClient';
import { formatLocalDateKey } from '../lib/utils';
import { useSmartDismiss } from '../lib/useSmartDismiss';

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
  { id: 'focus', label: 'Phòng Tập Trung', icon: Zap },
  { id: 'journey', label: 'Journey', icon: Compass },
];

// 2. Spaces
const SPACES_ITEMS: NavItem[] = [
  { id: 'tasks', label: 'Lịch & Công việc', icon: CalendarDays },
  { id: 'projects', label: 'Kho Dự Án & Second Brain', icon: FolderKanban },
  { id: 'habits', label: 'Thói quen kỷ luật', icon: Target },
  { id: 'finance', label: 'Tài chính & Hũ Tiết Kiệm', icon: DollarSign },
  { id: 'study', label: 'Học Tập & Từ Vựng (FSRS)', icon: BookOpen },
  { id: 'study-space', label: 'Phòng & Lớp Học Live', icon: GraduationCap },
  { id: 'connect', label: 'Bảng Tin Cộng Đồng', icon: Globe },
  { id: 'notes', label: 'Sổ tay & Ghi chú (Vault)', icon: FileText },
  { id: 'goals', label: 'Mục tiêu', icon: Target },
];

// 3. Ecosystem & Tools
const SYSTEM_ITEMS: NavItem[] = [
  { id: 'marketplace', label: 'Templates Marketplace', icon: ShoppingBag },
  { id: 'referral', label: 'Cộng tác viên (Affiliate)', icon: Gift },
  { id: 'automation', label: 'Automation Rules', icon: Cpu },
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
    subscriptionStatus,
    tasks,
    habits,
    habitRecords,
    notes
  } = useAppStore();

  const isVi = language === 'vi';
  const t = useTranslation(language);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [visibleModules, setVisibleModules] = useState<string[]>(() => getVisibleNavModules());
  const [customModules, setCustomModules] = useState<Array<{ id: string; name: string; slug: string; icon: string }>>([]);

  const sidebarRef = React.useRef<HTMLElement>(null);
  useSmartDismiss({
    isOpen: isMobileMenuOpen,
    onDismiss: toggleMobileMenu,
    targetRef: sidebarRef,
    closeOnEscape: true,
  });

  const localToday = formatLocalDateKey(new Date());

  // Real-time Dynamic Badge Counters (E2E Data Flow)
  const pendingTasksCount = React.useMemo(() => {
    return (tasks || []).filter(t => {
      const isDone = t.status === 'Hoàn thành' || t.status === 'Completed' || t.status === 'Done';
      const isToday = t.dueDate && t.dueDate.startsWith(localToday);
      const isOverdue = t.dueDate && t.dueDate < localToday;
      return !isDone && (isToday || isOverdue);
    }).length;
  }, [tasks, localToday]);

  const incompleteHabitsCount = React.useMemo(() => {
    return (habits || []).filter(h => {
      const isDone = h.completedDates?.includes(localToday) || 
        (habitRecords || []).some(r => r.habitId === h.id && r.date === localToday && r.status === 'Completed');
      return !isDone;
    }).length;
  }, [habits, habitRecords, localToday]);

  const activeNotesCount = React.useMemo(() => {
    return (notes || []).filter(n => !n.inTrash && !n.archived).length;
  }, [notes]);

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

  const isVisible = (id: string) => id === 'dashboard' || id === 'connect' || id === 'admin' || id === 'study-space' || id === 'classroom' || visibleModules.includes(id);

  const availableDailyItems = DAILY_RHYTHM_ITEMS.filter(item => isVisible(item.id));
  const availableSpacesItems = SPACES_ITEMS.filter(item => isVisible(item.id));
  const availableSystemItems = SYSTEM_ITEMS.filter(item => (!item.adminOnly || isAdmin) && isVisible(item.id));

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.id || (item.id === 'connect' && currentView === 'feed');

    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        type="button"
        onClick={() => {
          setCurrentView(item.id);
          if (isMobileMenuOpen) toggleMobileMenu();
        }}
        className={`w-full relative flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer group ${
          isActive
            ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {isActive && (
          <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-emerald-500" />
        )}
        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
        <span className="truncate flex-1 md:hidden lg:inline">
          {item.id === 'referral' && (currentUser?.isAffiliate || isAdmin)
            ? '⭐ Cổng Quản Lý CTV'
            : t(item.label)}
        </span>
        {item.id === 'referral' && (currentUser?.isAffiliate || isAdmin) && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800 flex items-center gap-1 shadow-2xs">
            <span>⭐</span>
            <span>CTV</span>
          </span>
        )}
        {item.id === 'connect' && (
          <span className="text-[9px] font-black px-1 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0 ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE
          </span>
        )}
        {item.id === 'tasks' && pendingTasksCount > 0 && (
          <>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 md:hidden lg:inline">
              {pendingTasksCount}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 hidden md:block lg:hidden absolute top-2 right-2 ring-2 ring-white dark:ring-[#07070C]" />
          </>
        )}
        {item.id === 'habits' && incompleteHabitsCount > 0 && (
          <>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 md:hidden lg:inline">
              {incompleteHabitsCount}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 hidden md:block lg:hidden absolute top-2 right-2 ring-2 ring-white dark:ring-[#07070C]" />
          </>
        )}
        {item.id === 'notes' && activeNotesCount > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {activeNotesCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (md: and up). Mobile navigation is seamlessly handled by BottomNav & MobileBottomSheet */}
      <aside
        ref={sidebarRef}
        id="app-sidebar"
        className="hidden md:flex flex-col md:static inset-y-0 left-0 z-50 w-[76px] lg:w-[250px] h-screen h-[100dvh] max-h-[100dvh] shrink-0 bg-white/95 dark:bg-[#07070C]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/[0.08] shadow-2xl transition-all duration-200 ease-in-out"
      >
        {/* Brand header with Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E2E8F0] dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative p-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
              <img 
                src="/logo.png" 
                alt="LifeOS - Ứng dụng Quản lý Cuộc sống Toàn diện" 
                width="24"
                height="24"
                decoding="async"
                className="w-6 h-6 rounded-lg object-contain shrink-0" 
              />
            </div>
            <div className="flex items-center gap-1.5 md:hidden lg:flex">
              <span className="font-bold text-sm text-[#0F172A] dark:text-white tracking-tight">LifeOS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                FREE 100%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Customize Sidebar */}
            <button
              type="button"
              onClick={() => setShowCustomizer(true)}
              title={isVi ? 'Cá nhân hóa danh mục' : 'Customize Sidebar'}
              className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label={isVi ? 'Đóng danh mục' : 'Close Menu'}
              className="md:hidden w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          
          {/* Group 1: NHỊP SỐNG HÀNG NGÀY */}
          {availableDailyItems.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                {isVi ? 'NHỊP SỐNG HÀNG NGÀY' : 'DAILY RHYTHM'}
              </div>
              {availableDailyItems.map(renderNavButton)}
            </div>
          )}

          {/* Group 2: KHÔNG GIAN */}
          {availableSpacesItems.length > 0 && (
            <div className="space-y-0.5 pt-2.5 border-t border-[#E2E8F0] dark:border-white/[0.08]">
              <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                {isVi ? 'KHÔNG GIAN' : 'SPACES'}
              </div>
              {availableSpacesItems.map(renderNavButton)}
            </div>
          )}

          {/* Section: Custom Modules */}
          {customModules.length > 0 && (
            <div className="space-y-1 pt-2.5 border-t border-[#E2E8F0] dark:border-white/[0.08]">
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
                    className={`w-full relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all text-left cursor-pointer group ${
                      isModActive
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {isModActive && (
                      <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-emerald-500" />
                    )}
                    <Layers className={`w-4 h-4 shrink-0 transition-transform ${isModActive ? 'text-emerald-600 dark:text-emerald-400 scale-105 ml-1' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate flex-1">{mod.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Group 3: System & Tools */}
          {availableSystemItems.length > 0 && (
            <div className="space-y-1 pt-2.5 border-t border-[#E2E8F0] dark:border-white/[0.08]">
              <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">
                {t('System & Tools')}
              </div>
              {availableSystemItems.map(renderNavButton)}
            </div>
          )}
        </nav>

        {/* Quick Preferences: Theme & Language */}
        <div className="px-3 py-2 border-t border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#141E30] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

          <button
            type="button"
            onClick={() => {
              const nextLang = language === 'vi' ? 'en' : 'vi';
              setLanguage(nextLang);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-[#E2E8F0] dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#141E30] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-2xs"
            title={isVi ? 'Nhấp 1 chạm để đổi sang English' : 'Click 1-tap to switch to Tiếng Việt'}
            aria-label={isVi ? 'Đổi ngôn ngữ sang English' : 'Switch language to Vietnamese'}
          >
            <span className="text-sm shrink-0">{language === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
            <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
          </button>
        </div>

        {/* Footer profile & quick status */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-white/[0.08] pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] transition-all">
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
                  alt={currentUser?.name ? `Ảnh đại diện của ${currentUser.name}` : 'Ảnh đại diện người dùng LifeOS'}
                  width="32"
                  height="32"
                  loading="lazy"
                  decoding="async"
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 object-cover border border-slate-200/80 dark:border-white/[0.08] shadow-2xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#141E30]" />
              </div>
              <div className="min-w-0 md:hidden lg:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {currentUser?.name || 'LifeOS SuperAdmin'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                  {isAdmin ? 'Quản trị viên (Admin)' : 'Trải nghiệm Miễn phí (Full Access)'}
                </p>
              </div>
            </button>
            <button
              id="btn-sidebar-logout"
              type="button"
              onClick={logout}
              title={isVi ? 'Đăng xuất' : 'Sign Out'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
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
