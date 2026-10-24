import React, { useState, useEffect } from 'react';
import { 
  Menu, Moon, Sun, Search, Bell, Plus, Inbox, ShoppingCart, 
  Shield, CheckSquare, DollarSign, Calendar, Target, Zap, 
  User, LogOut, ChevronDown, CheckCircle2, Globe, Sparkles, Lock, Flame, Award, Volume2, VolumeX, Bot,
  ExternalLink, AlertTriangle, FileText, Settings
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { retentionEngine, RetentionProfile } from '../lib/retentionEngine';
import { soundEngine } from '../lib/soundEngine';
import { ZenFocusOverlay } from './focus/ZenFocusOverlay';
import { apiCall } from '../lib/apiClient';
import { companionEngine, MASCOT_PROFILES } from '../lib/companionEngine';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { NotificationSettingsModal } from './notifications/NotificationSettingsModal';

export function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [showZenFocus, setShowZenFocus] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);

  const { 
    isMobileMenuOpen, toggleMobileMenu, theme, setTheme, cart, 
    setCurrentView, currentUser, logout, toggleCommand, currentView, 
    language, setLanguage, activeLanguages, notifications, markNotificationRead, 
    clearAllNotifications, inbox, removeInboxItem, subscriptionStatus, habits
  } = useAppStore();
  
  const t = useTranslation(language);
  const isVi = language === 'vi';

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
    <header className="h-14 md:h-16 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-b border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between px-3.5 sm:px-5 md:px-6 shrink-0 relative z-50 transition-colors">
      {/* Mobile Brand Logo */}
      <div className="flex md:hidden items-center gap-2 shrink-0">
        <img 
          src="/logo.png" 
          alt="LifeOS Logo" 
          className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0" 
        />
        <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">LifeOS</span>
      </div>

      {/* Desktop Quick Search Bar (Hidden on Mobile) */}
      <div className="hidden md:flex flex-1 max-w-lg min-w-0 mr-4">
        <button 
          type="button" 
          onClick={toggleCommand}
          className="w-full relative flex items-center text-left pl-9 pr-24 h-9 bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] rounded-full text-xs text-slate-500 hover:bg-white dark:hover:bg-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] hover:shadow-2xs transition-all group cursor-pointer"
        >
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
          <span className="truncate max-w-[calc(100%-1rem)] font-normal text-slate-500">{t('Tìm kiếm nhanh hoặc mở Command Center...')}</span>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-medium text-slate-500 shadow-2xs">Ctrl + K</kbd>
          </div>
        </button>
      </div>
      
      {/* Global Free Trial Active Indicator */}
      {subscriptionStatus?.isGlobalFreeMode && (
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Dùng Thử Miễn Phí Toàn Hệ Thống</span>
        </div>
      )}

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        
        {/* Mobile Search Icon Button */}
        <button
          type="button"
          onClick={toggleCommand}
          aria-label={t('Tìm kiếm')}
          className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Mobile Compact Gamification Pill */}
        <button
          type="button"
          onClick={() => setCurrentView('journey')}
          title={`Level ${realLevel} · ${realCp} CP · ${realStreak} ngày streak`}
          className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-white/[0.06] text-slate-800 dark:text-white border border-[#E2E8F0] dark:border-white/[0.08] font-semibold text-[10px] shadow-2xs shrink-0 cursor-pointer"
        >
          <span className="text-amber-600 dark:text-amber-400 font-bold">LV.{realLevel}</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-medium">{realCp > 999 ? `${(realCp/1000).toFixed(1)}k` : realCp} CP</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-rose-500 dark:text-rose-400 font-mono tabular-nums font-medium">{realStreak}d</span>
        </button>

        {/* Desktop Modern Gamification HUD Pill */}
        <button
          type="button"
          onClick={() => setCurrentView('journey')}
          title={`Level ${realLevel} · ${realCp} CP · ${realCoins} Coins · ${realStreak}d Streak`}
          className="hidden md:inline-flex items-center gap-2.5 h-9 px-3.5 rounded-full bg-slate-50/70 dark:bg-white/[0.05] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] text-xs text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
        >
          <span className="font-semibold text-slate-900 dark:text-white">
            LV.{realLevel}
          </span>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums text-[11px] font-medium">{realCp.toLocaleString()} CP</span>
          </div>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1 text-amber-500">
            <Award className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums text-[11px] font-medium">{realCoins}</span>
          </div>
          <span className="text-slate-200 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1 text-rose-500">
            <Flame className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums text-[11px] font-medium">{realStreak}d</span>
          </div>
        </button>

        {/* Desktop Primary Action Button: + Tạo mới (Hidden on mobile because it is on bottom nav) */}
        <div className="hidden md:block relative">
          <button 
            type="button" 
            onClick={() => {
              setShowCreateMenu(!showCreateMenu);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            aria-label={t('Tạo mới')}
            className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm shadow-emerald-600/25"
          >
            {!hasSubAccess ? <Lock className="w-3.5 h-3.5 text-white/80" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            <span>{t('Tạo mới')}</span>
          </button>

          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowCreateMenu(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[90] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
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
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
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
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
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
                      <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span>{t('Khoản thu / chi tiêu')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('notes');
                        setShowCreateMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>{isVi ? 'Tạo ghi chú mới' : 'New Note'}</span>
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
          className={`hidden md:inline-flex h-9 px-3 rounded-full border text-xs font-medium transition-all cursor-pointer items-center gap-1.5 shadow-2xs ${
            companionSettings.enabled && companionSettings.focusCompanionMode !== 'off'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
              : 'bg-slate-50/70 dark:bg-white/[0.05] border-[#E2E8F0] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
          }`}
          title={companionSettings.enabled && companionSettings.focusCompanionMode !== 'off'
            ? `${MASCOT_PROFILES[companionSettings.mascotId]?.name || 'AI Companion'} ${t('is active · Click to hide')}`
            : t('AI Companion is hidden · Click to open!')}
          aria-label={t('Bật/Tắt nhân vật AI')}
        >
          <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden xl:inline text-xs font-medium">
            {companionSettings.enabled && companionSettings.focusCompanionMode !== 'off' ? (isVi ? 'AI Bật' : 'AI On') : (isVi ? 'Mở AI' : 'Open AI')}
          </span>
        </button>

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-full border border-[#E2E8F0] dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.05] transition-all cursor-pointer shadow-2xs"
          title={theme === 'dark' ? t('Switch to Light Mode') : t('Switch to Dark Mode')}
          aria-label={t('Chuyển chế độ giao diện')}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
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
            className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-full border border-[#E2E8F0] dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.05] transition-all relative cursor-pointer shadow-2xs"
            aria-label={t('Thông báo')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#10B981] rounded-full ring-2 ring-white dark:ring-[#0B1120]"></span>
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[90] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('Thông báo')} ({unreadCount})</span>
                  </h3>
                  {unreadCount > 0 && (
                    <button type="button" onClick={clearAllNotifications} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                      {t('Đã đọc tất cả')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">✨ {t('Bạn đã xem hết mọi thông báo.')}</div>
                  ) : (
                    notifications.map((notif: any) => {
                      const isCritical = notif.priority === 'CRITICAL';
                      const isImportant = notif.priority === 'IMPORTANT';
                      return (
                        <div 
                          key={notif.id} 
                          className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            notif.read ? 'opacity-60' : isCritical ? 'bg-rose-50/30 dark:bg-rose-950/20' : 'bg-emerald-50/20 dark:bg-emerald-950/20'
                          }`} 
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                              notif.read 
                                ? 'bg-slate-300 dark:bg-slate-700' 
                                : isCritical 
                                ? 'bg-rose-500 ring-2 ring-rose-300 animate-pulse' 
                                : isImportant
                                ? 'bg-amber-500 ring-2 ring-amber-300'
                                : 'bg-emerald-500 ring-2 ring-emerald-300/50'
                            }`}></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(isCritical || isImportant) && (
                                  <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                    isCritical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                                  }`}>
                                    {notif.priority}
                                  </span>
                                )}
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{notif.title}</p>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-3 whitespace-pre-line leading-relaxed">
                                {notif.message || notif.content || ''}
                              </p>
                              {notif.actionUrl && (
                                <div className="mt-2">
                                  <a
                                    href={notif.actionUrl}
                                    target={notif.actionUrl.startsWith('http') ? '_blank' : '_self'}
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationRead(notif.id);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-2xs transition-colors"
                                  >
                                    <span>{notif.actionLabel || t('Xem chi tiết')}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Notification Dropdown Footer */}
                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      setIsNotificationCenterOpen(true);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors text-center"
                  >
                    {isVi ? 'Xem tất cả thông báo' : 'View All Notifications'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      setIsNotificationSettingsOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                    title={isVi ? 'Cài đặt thông báo & Gmail' : 'Notification Settings'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
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
            className="flex items-center gap-2 h-9 p-1 pl-1.5 pr-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-800 transition-colors cursor-pointer"
          >
            <img 
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=LifeOS+SuperAdmin&background=10B981&color=fff'} 
              alt="Avatar" 
              className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 object-cover" 
            />
            <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {currentUser?.name?.split(' ')[0] || t('Tài khoản')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowUserMenu(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[90] p-2.5 space-y-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                {/* Header User Info */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white truncate text-sm">{currentUser?.name || t('Người dùng')}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.email || ''}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-wider">
                      {currentUser?.role || 'USER'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      subscriptionStatus?.hasAccess 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {subscriptionStatus?.hasAccess ? (subscriptionStatus?.planName || t('Đã kích hoạt')) : t('Chưa kích hoạt gói')}
                    </span>
                  </div>
                </div>

                {/* Admin Section (if Admin) - clearly distinguished */}
                {isAdmin && (
                  <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 space-y-1">
                    <div className="px-1 text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center justify-between">
                      <span>Khu vực Quản trị Hệ thống</span>
                      <span className="text-[9px] bg-purple-200/80 dark:bg-purple-900 px-1.5 py-0.2 rounded font-bold">Admin Only</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentView('admin');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950 font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-left leading-tight">Phê duyệt Đơn hàng & Quản trị</span>
                      </div>
                      <span className="text-xs">→</span>
                    </button>
                  </div>
                )}

                {/* SaaS Subscription Checkout link */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('checkout');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 font-bold transition-colors cursor-pointer border border-emerald-200/70 dark:border-emerald-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600 shrink-0" />
                      <span>{t('Nâng cấp Gói dịch vụ của tôi')}</span>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      SaaS
                    </span>
                  </button>

                  {/* Inbox Modal Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowInboxModal(true);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                </div>

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
                      <span>{t('Nhân vật AI Companion')}</span>
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
                          <span className="text-amber-600 dark:text-amber-400">{t('Đang bật')}</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('Đang tắt')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sound FX Dopamine Toggle */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span>{t('Âm thanh Dopamine')}</span>
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
                          <span className="text-emerald-600 dark:text-emerald-400">{t('Bật')}</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t('Tắt')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Language Switcher */}
                  <div className="flex items-center justify-between px-3 py-1.5 text-slate-600 dark:text-slate-400">
                    <span>{t('Ngôn ngữ')}</span>
                    <button
                      type="button"
                      onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                      aria-label="Đổi ngôn ngữ 1 chạm"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs border border-transparent hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer text-slate-800 dark:text-slate-200 transition-all active:scale-95"
                      title={language === 'vi' ? 'Chuyển sang English' : 'Chuyển sang Tiếng Việt'}
                    >
                      <span>{language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}</span>
                      <span className="text-[10px] text-slate-400 font-normal">⮂</span>
                    </button>
                  </div>
                </div>

                {/* Account & Logout */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsNotificationSettingsOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>{isVi ? 'Cài đặt Thông báo & Gmail' : 'Notification & Gmail Settings'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Auto
                    </span>
                  </button>

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

      {/* Modern Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        onOpenSettings={() => {
          setIsNotificationCenterOpen(false);
          setIsNotificationSettingsOpen(true);
        }}
      />

      {/* Notification & Gmail Automation Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
      />
    </header>
  );
}
