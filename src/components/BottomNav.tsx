import React, { useState } from 'react';
import { 
  GraduationCap, 
  CheckSquare, 
  MessageSquare, 
  DollarSign, 
  LayoutGrid, 
  LayoutDashboard, 
  Zap, 
  Compass, 
  FolderKanban, 
  Target, 
  FileText, 
  BookOpen, 
  Users, 
  Gift, 
  Scale, 
  Cpu, 
  ShoppingBag, 
  User, 
  Shield, 
  LogOut, 
  Sun, 
  Moon, 
  Search, 
  Flame, 
  Sparkles,
  Video,
  FileEdit
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { ViewState } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { soundEngine } from '../lib/soundEngine';
import { MobileBottomSheet } from './common/MobileBottomSheet';

export function BottomNav() {
  const { 
    currentView, 
    setCurrentView, 
    isMobileMenuOpen, 
    toggleMobileMenu, 
    currentUser, 
    language,
    theme,
    setTheme,
    toggleCommand,
    logout,
    tasks,
    habits
  } = useAppStore();
  
  const isVi = language === 'vi';
  const t = useTranslation(language);
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);

  // Sync with global isMobileMenuOpen if triggered externally
  const isSheetOpen = isMenuSheetOpen || isMobileMenuOpen;
  const closeSheet = () => {
    setIsMenuSheetOpen(false);
    if (isMobileMenuOpen) toggleMobileMenu();
  };

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const handleTabPress = (view: ViewState) => {
    try { soundEngine.playPop(); } catch {}
    closeSheet();
    if (currentView !== view) {
      setCurrentView(view);
    }
  };

  const isHomeActive = currentView === 'dashboard';
  const isStudyActive = currentView === 'study' || currentView === 'vocab' || currentView === 'study-space' || currentView === 'classroom' || currentView === 'focus';
  const isScheduleActive = currentView === 'tasks' || currentView === 'schedule' || currentView === 'calendar';
  const isConnectActive = currentView === 'connect' || currentView === 'feed' || currentView === 'community';

  const pendingTasksCount = (tasks || []).filter((t: any) => t.status !== 'Hoàn thành' && t.status !== 'Done').length;
  const streakCount = currentUser?.streakDays || 0;

  return (
    <>
      {/* Mobile Primary Sticky Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        aria-label={t('Mobile Navigation')}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#07070C]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] px-2 h-[64px] flex items-center justify-between safe-area-pb transition-colors"
      >
        <div className="flex items-center justify-between w-full max-w-md mx-auto h-full gap-1">
          
          {/* 1. Hôm nay (Home / Dashboard) */}
          <button
            id="mobile-tab-home"
            type="button"
            onClick={() => handleTabPress('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 rounded-2xl active:scale-95 transition-all cursor-pointer min-h-[48px] ${
              isHomeActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform ${isHomeActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Hôm nay' : 'Today'}
            </span>
          </button>

          {/* 2. Học Tập (Study) */}
          <button
            id="mobile-tab-study"
            type="button"
            onClick={() => handleTabPress('study-space')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 rounded-2xl active:scale-95 transition-all cursor-pointer min-h-[48px] ${
              isStudyActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 dark:bg-indigo-500/15 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <GraduationCap className={`w-5 h-5 transition-transform ${isStudyActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Sảnh Học' : 'Study'}
            </span>
          </button>

          {/* 3. Lịch & Việc (Schedule / Tasks) */}
          <button
            id="mobile-tab-schedule"
            type="button"
            onClick={() => handleTabPress('tasks')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 rounded-2xl active:scale-95 transition-all cursor-pointer min-h-[48px] relative ${
              isScheduleActive
                ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 dark:bg-blue-500/15 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <CheckSquare className={`w-5 h-5 transition-transform ${isScheduleActive ? 'scale-110 stroke-[2.4]' : ''}`} />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[9px] font-black shadow-xs leading-none">
                  {pendingTasksCount > 99 ? '99+' : pendingTasksCount}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Lịch & Việc' : 'Tasks'}
            </span>
          </button>

          {/* 4. Cộng Đồng (Community / Connect) */}
          <button
            id="mobile-tab-connect"
            type="button"
            onClick={() => handleTabPress('connect')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 rounded-2xl active:scale-95 transition-all cursor-pointer min-h-[48px] ${
              isConnectActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 transition-transform ${isConnectActive ? 'scale-110 stroke-[2.4]' : ''}`} />
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#07070C]" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Cộng đồng' : 'Connect'}
            </span>
          </button>

          {/* 5. Menu Tổng ⋯ (More / Grid) */}
          <button
            id="mobile-tab-more"
            type="button"
            onClick={() => {
              try { soundEngine.playPop(); } catch {}
              setIsMenuSheetOpen(true);
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 rounded-2xl active:scale-95 transition-all cursor-pointer min-h-[48px] ${
              isSheetOpen
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 dark:bg-purple-500/15 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
            aria-label="Mở toàn bộ menu"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Menu ⋯' : 'Menu'}
            </span>
          </button>

        </div>
      </nav>

      {/* Comprehensive Mobile Menu Bottom Sheet */}
      <MobileBottomSheet
        isOpen={isSheetOpen}
        onClose={closeSheet}
        maxHeight="90dvh"
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="font-black text-slate-900 dark:text-white text-base">
              {isVi ? 'Danh mục LifeOS' : 'LifeOS Navigation'}
            </span>
          </div>
        }
        subtitle={
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {currentUser?.name || 'Thành viên'} · {isAdmin ? 'Quản trị viên' : `Chuỗi ${streakCount} ngày 🔥`}
          </span>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Quick Utility Action Bar */}
          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-white/[0.06]">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                try { soundEngine.playPop(); } catch {}
                setTheme(theme === 'dark' ? 'light' : 'dark');
              }}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 min-h-[44px] cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 mb-1" /> : <Moon className="w-4 h-4 text-slate-600 mb-1" />}
              <span className="text-[10px] font-bold">{theme === 'dark' ? (isVi ? 'Chế độ Sáng' : 'Light') : (isVi ? 'Chế độ Tối' : 'Dark')}</span>
            </button>

            {/* Global Search / Command */}
            <button
              type="button"
              onClick={() => {
                closeSheet();
                toggleCommand();
              }}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 min-h-[44px] cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <Search className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-[10px] font-bold">{isVi ? 'Tìm kiếm nhanh' : 'Search'}</span>
            </button>

            {/* Zen Focus Mode */}
            <button
              type="button"
              onClick={() => {
                closeSheet();
                window.dispatchEvent(new CustomEvent('lifeos:open-zen-focus'));
              }}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 min-h-[44px] cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <Zap className="w-4 h-4 text-indigo-500 mb-1" />
              <span className="text-[10px] font-bold">Zen Focus</span>
            </button>
          </div>

          {/* Quick Floating Widgets Shortcuts */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                closeSheet();
                window.dispatchEvent(new CustomEvent('lifeos:open-scratchpad'));
              }}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-left min-h-[48px] cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileEdit className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-amber-700 dark:text-amber-300">Giấy nháp 24h</div>
                <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 truncate">Tự hủy sau 24h</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                closeSheet();
                window.dispatchEvent(new CustomEvent('lifeos:open-global-chat'));
              }}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 text-left min-h-[48px] cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate text-indigo-700 dark:text-indigo-300">Chat Cộng Đồng</div>
                <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 truncate">Trực tuyến 24/7</div>
              </div>
            </button>
          </div>

          {/* Section 1: Cốt Lõi Hàng Ngày (Daily Rhythm) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {isVi ? '1. Cốt Lõi Hàng Ngày' : '1. Daily Rhythm'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTabPress('dashboard')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'dashboard'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Bảng điều khiển' : 'Dashboard'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{isVi ? 'Tổng quan ngày' : 'Today view'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('focus')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'focus'
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Pomodoro Focus</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{isVi ? 'Đồng hồ tập trung' : 'Deep work'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('journey')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border col-span-2 ${
                  currentView === 'journey'
                    ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span>{isVi ? 'Hành Trình RPG & Thử Thách' : 'Journey RPG'}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300">
                      {currentUser?.level ? `Lv.${currentUser.level}` : 'RPG'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {isVi ? 'Cột mốc tiến trình & Huân chương kỷ luật' : 'Progression milestones'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Quản Lý & Tri Thức (Spaces & Second Brain) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {isVi ? '2. Quản Lý & Không Gian' : '2. Spaces & Brain'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTabPress('projects')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'projects'
                    ? 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Kho Dự Án' : 'Projects'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">P.A.R.A Second Brain</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('habits')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'habits'
                    ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Thói Quen' : 'Habits'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{isVi ? 'Kỷ luật mỗi ngày' : 'Daily streaks'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('goals')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'goals'
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Mục Tiêu' : 'Goals'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{isVi ? 'OKRs & Tầm nhìn' : 'OKRs & Vision'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('notes')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'notes'
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Sổ Tay' : 'Notes'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{isVi ? 'Ghi chú & Vault' : 'Vault storage'}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('study-space')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border col-span-2 ${
                  currentView === 'study-space' || currentView === 'classroom'
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs truncate flex items-center gap-1.5">
                    <span>{isVi ? 'Phòng Học & Lớp Học Live' : 'Live Study Rooms'}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      LIVE
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {isVi ? 'Phòng học chung Meet & Lớp trực tuyến' : 'Co-study room'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Hệ Sinh Thái & Tiện Ích Mở Rộng */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              {isVi ? '3. Tiện Ích & Hệ Thống' : '3. Utilities & System'}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTabPress('referral')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'referral'
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Cộng Tác Viên' : 'Affiliate'}</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold truncate">Hoa hồng 20%</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('decision')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'decision'
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Bộ Quyết Định' : 'Decision'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Ma trận đánh giá</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('automation')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'automation'
                    ? 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/30 text-sky-700 dark:text-sky-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Tự Động Hóa' : 'Automations'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Automation Rules</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('marketplace')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'marketplace'
                    ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">Marketplace</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Mẫu Templates</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabPress('account')}
                className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                  currentView === 'account'
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{isVi ? 'Tài Khoản' : 'My Account'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Hồ sơ cá nhân</div>
                </div>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTabPress('admin')}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-all min-h-[48px] cursor-pointer border ${
                    currentView === 'admin'
                      ? 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">System Admin</div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold truncate">Quản trị toàn hệ thống</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* User Signout Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                closeSheet();
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer min-h-[48px] active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>{isVi ? 'Đăng xuất tài khoản an toàn' : 'Log out safely'}</span>
            </button>
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
}
