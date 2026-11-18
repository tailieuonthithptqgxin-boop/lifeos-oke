import React, { useState, useRef } from 'react';
import { 
  GraduationCap, 
  MessageSquare, 
  Gift, 
  Shield, 
  User, 
  Menu, 
  X, 
  Sparkles, 
  CheckSquare, 
  DollarSign, 
  LayoutDashboard, 
  Zap, 
  Calendar, 
  Target 
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { ViewState } from '../lib/types';
import { useTranslation } from '../lib/i18n';
import { soundEngine } from '../lib/soundEngine';
import { useSmartDismiss } from '../lib/useSmartDismiss';

export function BottomNav() {
  const { currentView, setCurrentView, toggleMobileMenu, currentUser, language } = useAppStore();
  const isVi = language === 'vi';
  const t = useTranslation(language);

  const [showQuickActionSheet, setShowQuickActionSheet] = useState(false);
  const actionSheetRef = useRef<HTMLDivElement>(null);

  useSmartDismiss({
    isOpen: showQuickActionSheet,
    onDismiss: () => setShowQuickActionSheet(false),
    targetRef: actionSheetRef,
    closeOnEscape: true,
  });

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const handleTabPress = (view: ViewState) => {
    try { soundEngine.playPop(); } catch {}
    setShowQuickActionSheet(false);
    if (currentView !== view) {
      setCurrentView(view);
    }
  };

  const isStudyActive = currentView === 'study';
  const isConnectActive = currentView === 'connect' || currentView === 'feed' || currentView === 'study-space' || currentView === 'classroom';
  const isReferralActive = currentView === 'referral';
  const isProfileActive = isAdmin ? currentView === 'admin' : currentView === 'account';

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        aria-label={t('Mobile Navigation')}
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/[0.08] shadow-2xl px-2 h-[64px] flex items-center justify-between safe-area-pb transition-all"
      >
        <div className="flex items-center justify-between w-full max-w-md mx-auto h-full">
          
          {/* 1. Học Tập */}
          <button
            id="mobile-tab-study"
            type="button"
            onClick={() => handleTabPress('study')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl active:scale-90 transition-transform cursor-pointer min-h-[48px] ${
              isStudyActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 dark:bg-indigo-500/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <GraduationCap className={`w-5 h-5 transition-transform ${isStudyActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Học Tập' : 'Study'}
            </span>
          </button>

          {/* 2. Cộng Đồng */}
          <button
            id="mobile-tab-connect"
            type="button"
            onClick={() => handleTabPress('connect')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl active:scale-90 transition-transform cursor-pointer min-h-[48px] ${
              isConnectActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <MessageSquare className={`w-5 h-5 transition-transform ${isConnectActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Cộng Đồng' : 'Community'}
            </span>
          </button>

          {/* 3. Cộng Tác Viên */}
          <button
            id="mobile-tab-referral"
            type="button"
            onClick={() => handleTabPress('referral')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl active:scale-90 transition-transform cursor-pointer min-h-[48px] relative ${
              isReferralActive
                ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 dark:bg-amber-500/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Gift className={`w-5 h-5 transition-transform ${isReferralActive ? 'scale-110 stroke-[2.4]' : ''}`} />
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[8px] font-black shadow-xs leading-none">
                20%
              </span>
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Cộng Tác Viên' : 'Affiliate'}
            </span>
          </button>

          {/* 4. Cá Nhân / Admin */}
          <button
            id="mobile-tab-profile"
            type="button"
            onClick={() => handleTabPress(isAdmin ? 'admin' : 'account')}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl active:scale-90 transition-transform cursor-pointer min-h-[48px] ${
              isProfileActive
                ? 'text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 dark:bg-purple-500/15'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {isAdmin ? (
              <Shield className={`w-5 h-5 transition-transform ${isProfileActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            ) : (
              <User className={`w-5 h-5 transition-transform ${isProfileActive ? 'scale-110 stroke-[2.4]' : ''}`} />
            )}
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isAdmin ? 'Admin' : (isVi ? 'Cá Nhân' : 'Profile')}
            </span>
          </button>

          {/* 5. Menu Drawer */}
          <button
            id="mobile-tab-menu"
            type="button"
            onClick={() => {
              try { soundEngine.playPop(); } catch {}
              setShowQuickActionSheet(true);
            }}
            className="flex-1 flex flex-col items-center justify-center h-full py-1 px-0.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium active:scale-90 transition-transform cursor-pointer min-h-[48px]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight font-bold whitespace-nowrap">
              {isVi ? 'Thêm' : 'More'}
            </span>
          </button>

        </div>
      </nav>

      {/* Quick Action Mobile Bottom Sheet Modal */}
      {showQuickActionSheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setShowQuickActionSheet(false)}
          />
          <div 
            ref={actionSheetRef} 
            className="relative z-50 max-h-[85dvh] overflow-y-auto bg-white dark:bg-[#141E30] border-t border-slate-200 dark:border-white/[0.08] rounded-t-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-bottom-sheet pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Menu Chức Năng Nhanh</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickActionSheet(false)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  handleTabPress('dashboard');
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Bảng điều khiển</div>
                  <div className="text-[10px] text-slate-500">Tổng quan ngày</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabPress('tasks');
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Lịch & Việc</div>
                  <div className="text-[10px] text-slate-500">Quản lý nhiệm vụ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabPress('finance');
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Tài chính</div>
                  <div className="text-[10px] text-slate-500">Thu chi & Ngân sách</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabPress('focus');
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Pomodoro Focus</div>
                  <div className="text-[10px] text-slate-500">Tập trung sâu</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabPress('goals');
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Mục tiêu</div>
                  <div className="text-[10px] text-slate-500">OKRs & Kế hoạch</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowQuickActionSheet(false);
                  toggleMobileMenu();
                }}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-left transition-colors min-h-[48px] cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">Tất cả danh mục</div>
                  <div className="text-[10px] text-slate-500">Mở toàn bộ menu</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
