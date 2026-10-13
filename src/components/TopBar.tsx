import React, { useState, useEffect } from 'react';
import { 
  Menu, Moon, Sun, Search, Bell, Plus, Inbox, ShoppingCart, 
  Shield, CheckSquare, DollarSign, Calendar, Target, Zap, 
  User, LogOut, ChevronDown, CheckCircle2, Globe, Sparkles, Lock, Flame, Award, Volume2, VolumeX, Bot
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { retentionEngine, RetentionProfile } from '../lib/retentionEngine';
import { soundEngine } from '../lib/soundEngine';
import { ZenFocusOverlay } from './focus/ZenFocusOverlay';
import { apiCall } from '../lib/apiClient';
import { companionEngine, MASCOT_PROFILES } from '../lib/companionEngine';

export function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showZenFocus, setShowZenFocus] = useState(false);

  const { 
    isMobileMenuOpen, toggleMobileMenu, theme, setTheme, cart, 
    setCurrentView, currentUser, logout, toggleCommand, currentView, 
    language, setLanguage, activeLanguages, notifications, markNotificationRead, 
    clearAllNotifications, inbox, removeInboxItem, subscriptionStatus, habits
  } = useAppStore();
  
  const t = useTranslation(language);

  // Global Shift + F shortcut for Zen Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setShowZenFocus(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [retentionProfile, setRetentionProfile] = useState<RetentionProfile>(() =>
    retentionEngine.getProfile(currentUser?.id)
  );
  const [progressionData, setProgressionData] = useState<any>(null);
  const [companionSettings, setCompanionSettings] = useState(() => 
    companionEngine.getSettings(currentUser?.id)
  );

  useEffect(() => {
    const handleCompanionUpdate = () => {
      setCompanionSettings(companionEngine.getSettings(currentUser?.id));
    };
    handleCompanionUpdate();
    window.addEventListener('lifeos-companion-settings-updated', handleCompanionUpdate);
    return () => window.removeEventListener('lifeos-companion-settings-updated', handleCompanionUpdate);
  }, [currentUser?.id]);

  useEffect(() => {
    let isMounted = true;
    const loadProg = async () => {
      try {
        const res = await apiCall('/api/progression');
        if (res && res.data && isMounted) {
          setProgressionData(res.data);
          const synced = retentionEngine.syncWithServer(res.data, currentUser?.id);
          if (synced) setRetentionProfile(synced);
        }
      } catch (e) {}
    };

    loadProg();

    const handleProgUpdate = (e: any) => {
      if (!isMounted) return;
      if (e?.detail) {
        setProgressionData(e.detail);
        const synced = retentionEngine.syncWithServer(e.detail, currentUser?.id);
        if (synced) setRetentionProfile(synced);
      } else {
        loadProg();
      }
    };

    window.addEventListener('lifeos-progression-updated', handleProgUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('lifeos-progression-updated', handleProgUpdate);
    };
  }, [currentUser?.id, currentView]);

  const maxHabitStreak = (habits || []).reduce((max: number, h: any) => Math.max(max, h.streak || 0), 0);
  const realStreak = progressionData?.currentStreak !== undefined
    ? progressionData.currentStreak
    : (maxHabitStreak > 0 ? maxHabitStreak : (retentionProfile?.streak ?? 0));
  const realLevel = progressionData?.level ?? (retentionProfile?.level || 1);
  const realXp = progressionData?.totalXp ?? (retentionProfile?.xp || 0);
  const realCoins = progressionData?.coins ?? (retentionProfile?.coins || Math.floor(realLevel * 40 + 50));
  const realCp = Math.floor(realLevel * 35 + realStreak * 20 + realXp);

  const cartItemCount = (cart || []).reduce((sum, item) => sum + item.quantity, 0);
  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const hasSubAccess = isAdmin || (subscriptionStatus?.hasAccess ?? ((currentUser?.plan || 'FREE').toUpperCase() !== 'FREE'));
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const inboxCount = inbox?.length || 0;

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-3.5 sm:px-5 md:px-6 shrink-0 z-30 transition-colors">
      {/* Mobile Menu Toggle */}
      <button 
        type="button" 
        onClick={toggleMobileMenu} 
        aria-label="Mở danh mục điều hướng"
        className="md:hidden p-2.5 mr-2 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl transition-all shrink-0 btn-squishy"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Quick Search Bar */}
      <div className="flex-1 max-w-lg min-w-0 mr-3 sm:mr-6">
        <button 
          type="button" 
          onClick={toggleCommand}
          className="w-full relative flex items-center text-left pl-9 sm:pl-10 pr-24 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-xs transition-all group btn-squishy"
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
          <span className="truncate max-w-[calc(100%-1rem)] font-medium">{t('Tìm kiếm nhanh hoặc mở Command Center...')}</span>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-80 pointer-events-none">
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-emerald-800 dark:text-emerald-300 shadow-2xs">Ctrl</kbd>
            <span className="text-slate-400 text-xs font-bold">+</span>
            <kbd className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-emerald-800 dark:text-emerald-300 shadow-2xs">K</kbd>
          </div>
        </button>
      </div>
      
      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Modern RPG Game HUD Pill */}
        <button
          type="button"
          onClick={() => setCurrentView('journey')}
          title={`Hồ sơ Anh Hùng: Level ${realLevel} · ${realStreak} ngày streak · Nhấn để xem bản đồ chiến đấu RPG`}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white border border-slate-700/80 hover:border-emerald-500/80 font-black text-xs shadow-md shadow-slate-950/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        >
          <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
            LV.{realLevel}
          </span>
          <div className="flex items-center gap-1 text-emerald-400">
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span className="font-mono text-[11px]">{realCp.toLocaleString()} CP</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300 border-l border-slate-700/80 pl-2">
            <span className="text-[11px]">🪙</span>
            <span className="font-mono text-[11px]">{realCoins}</span>
          </div>
          <div className="flex items-center gap-0.5 text-rose-400 border-l border-slate-700/80 pl-2">
            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
            <span className="font-mono text-[11px]">{realStreak}d</span>
          </div>
        </button>

        {/* Zen Focus Mode Button */}
        <button
          type="button"
          onClick={() => setShowZenFocus(true)}
          title="Chế độ Zen Focus (Shift + F)"
          className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 animate-pulse" />
          <span className="hidden md:inline text-xs font-black">Zen Focus</span>
          <kbd className="hidden lg:inline text-[9px] font-mono font-bold opacity-75 bg-emerald-500/15 px-1 rounded">⇧F</kbd>
        </button>

        {/* Primary Action Button: + Tạo mới */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => {
              setShowCreateMenu(!showCreateMenu);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md shadow-emerald-500/20 cursor-pointer btn-squishy"
          >
            {!hasSubAccess ? <Lock className="w-3.5 h-3.5 text-amber-200" /> : <Plus className="w-4 h-4 stroke-[2.5]" />}
            <span className="hidden sm:inline">{t('Tạo mới')}</span>
          </button>

          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {!hasSubAccess ? (
                  <div className="p-3 text-center space-y-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {t('Tính năng đang khóa')}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {t('Kích hoạt gói dịch vụ để tạo mới công việc, giao dịch tài chính, lịch và mục tiêu.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('subscription');
                        setShowCreateMenu(false);
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {t('Mở khóa bản quyền')}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('tasks');
                        setShowCreateMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <span>{t('Công việc mới')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('finance');
                        setShowCreateMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span>{t('Khoản thu / chi tiêu')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('calendar');
                        setShowCreateMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span>{t('Sự kiện lịch')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('goals');
                        setShowCreateMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                        <Target className="w-4 h-4" />
                      </div>
                      <span>{t('Mục tiêu mới')}</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* AI Companion Quick Toggle Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            const nextEnabled = !companionSettings.enabled;
            const updated = companionEngine.saveSettings({ 
              enabled: nextEnabled,
              focusCompanionMode: nextEnabled ? 'normal' : 'off'
            }, currentUser?.id);
            setCompanionSettings(updated);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('lifeos-companion-settings-updated', { detail: updated }));
            }
          }}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer btn-squishy flex items-center gap-1.5 ${
            companionSettings.enabled && companionSettings.focusCompanionMode !== 'off'
              ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 ring-1 ring-amber-500/30 shadow-xs'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={companionSettings.enabled && companionSettings.focusCompanionMode !== 'off'
            ? `Bé ${MASCOT_PROFILES[companionSettings.mascotId]?.name || 'Lumi'} đang bật · Bấm để tắt nhân vật`
            : 'Nhân vật AI đang tắt · Bấm để mở lại Bé AI Companion ngay!'}
          aria-label="Bật/Tắt nhân vật AI"
        >
          <span className="text-base select-none">
            {MASCOT_PROFILES[companionSettings.mascotId]?.avatar || '🌟'}
          </span>
          <span className="hidden xl:inline text-xs font-bold">
            {companionSettings.enabled && companionSettings.focusCompanionMode !== 'off' ? 'AI Bật' : 'Mở AI'}
          </span>
        </button>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-purple-950/40 rounded-2xl transition-all cursor-pointer btn-squishy"
          title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          aria-label="Chuyển chế độ giao diện"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-pulse-soft" />
          ) : (
            <Moon className="w-5 h-5 text-violet-600" />
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => { 
              setShowNotifications(!showNotifications); 
              setShowCreateMenu(false); 
              setShowUserMenu(false);
            }} 
            className="p-2.5 text-slate-500 hover:text-pink-600 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/40 rounded-2xl transition-all relative btn-squishy"
            aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-100 dark:border-purple-900/50 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100/60 dark:border-purple-900/40 bg-gradient-to-r from-violet-500/10 to-pink-500/10">
                  <h3 className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🔔</span>
                    <span>{t('Thông báo')} ({unreadCount})</span>
                  </h3>
                  {unreadCount > 0 && (
                    <button type="button" onClick={clearAllNotifications} className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold">
                      {t('Đã đọc tất cả')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-purple-50 dark:divide-purple-900/30">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">✨ {t('Bạn đã xem hết mọi thông báo.')}</div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`p-3.5 hover:bg-pink-50/50 dark:hover:bg-purple-950/30 cursor-pointer transition-colors ${notif.read ? 'opacity-60' : 'bg-pink-50/20'}`} 
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${notif.read ? 'bg-slate-300' : 'bg-pink-500 ring-2 ring-pink-300/50'}`}></div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{notif.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{notif.message || notif.content || ''}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Unified User & Settings Menu */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
              setShowCreateMenu(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-3 rounded-full hover:bg-violet-50 dark:hover:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 transition-all btn-squishy"
          >
            <img 
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'} 
              alt="Avatar" 
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 object-cover ring-2 ring-pink-400/40" 
            />
            <span className="hidden sm:inline text-xs font-black text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {currentUser?.name?.split(' ')[0] || t('Tài khoản')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-xs">
                {/* Header User Info */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || t('Người dùng')}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.email || ''}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                      {currentUser?.role || 'USER'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      {subscriptionStatus?.hasAccess ? (subscriptionStatus?.planName || t('Đã kích hoạt')) : t('Chưa kích hoạt gói')}
                    </span>
                  </div>
                </div>

                {/* Admin Quick Switch (if Admin) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('admin');
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-semibold transition-colors ${
                      currentView === 'admin' 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' 
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span>{t('Bảng điều khiển Quản trị')}</span>
                    </div>
                  </button>
                )}

                {/* Inbox Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowInboxModal(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-slate-500" />
                    <span>{t('Hộp thư nhanh')}</span>
                  </div>
                  {inboxCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold rounded text-[10px]">
                      {inboxCount}
                    </span>
                  )}
                </button>

                {/* SaaS Subscription Checkout link */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('checkout');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 fill-blue-600" />
                    <span>{t('Nâng cấp Gói dịch vụ')}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    SaaS
                  </span>
                </button>

                {/* Cart link */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('cart');
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-slate-500" />
                    <span>{t('Giỏ hàng & Đơn hàng')}</span>
                  </div>
                  {cartItemCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold rounded text-[10px]">
                      {cartItemCount}
                    </span>
                  )}
                </button>

                {/* Preferences Divider */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  {/* Theme Switcher Toggle */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span>{t('Giao diện')}</span>
                    <button
                      type="button"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('Tối')}</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-3.5 h-3.5 text-slate-600" />
                          <span>{t('Sáng')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Study Companion Toggle */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span>{MASCOT_PROFILES[companionSettings.mascotId]?.avatar || '🌟'}</span>
                      <span>Nhân vật AI Companion</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPop();
                        const nextEnabled = !companionSettings.enabled;
                        const updated = companionEngine.saveSettings({ 
                          enabled: nextEnabled,
                          focusCompanionMode: nextEnabled ? 'normal' : 'off'
                        }, currentUser?.id);
                        setCompanionSettings(updated);
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(new CustomEvent('lifeos-companion-settings-updated', { detail: updated }));
                        }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      {companionSettings.enabled && companionSettings.focusCompanionMode !== 'off' ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400">Đang bật</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-slate-400" />
                          <span>Đang tắt</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sound FX Dopamine Toggle */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span>Âm thanh Dopamine</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.toggle();
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
                    >
                      {soundEngine.isEnabled() ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Bật</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                          <span>Tắt</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span>{t('Ngôn ngữ')}</span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      aria-label="Chọn ngôn ngữ giao diện"
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none cursor-pointer text-slate-800 dark:text-slate-200 transition-colors"
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
                </div>

                {/* Account & Logout */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('account');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>{t('Tài khoản của tôi')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('Đăng xuất')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Quick Inbox Modal */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-5 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                {t('Hộp thư nhanh')} ({inbox?.length || 0})
              </h3>
              <button 
                type="button" 
                onClick={() => setShowInboxModal(false)} 
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
              >
                {t('Đóng')}
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 my-3">
              {!inbox || inbox.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">{t('Chưa có thư mới')}</div>
              ) : (
                inbox.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 group">
                    <div>
                      <p className="text-xs text-slate-800 dark:text-slate-200">{item.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeInboxItem(item.id)} 
                      className="text-slate-400 hover:text-emerald-600 p-1"
                      title={t('Hoàn thành')}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Immersive Zen Focus Overlay */}
      <ZenFocusOverlay
        isOpen={showZenFocus}
        onClose={() => setShowZenFocus(false)}
      />
    </header>
  );
}
