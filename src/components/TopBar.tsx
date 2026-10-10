import React, { useState } from 'react';
import { 
  Menu, Moon, Sun, Search, Bell, Plus, Inbox, ShoppingCart, 
  Shield, CheckSquare, DollarSign, Calendar, Target, Zap, 
  User, LogOut, ChevronDown, CheckCircle2, Globe, Sparkles, Lock 
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

export function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);

  const { 
    isMobileMenuOpen, toggleMobileMenu, theme, setTheme, cart, 
    setCurrentView, currentUser, logout, toggleCommand, currentView, 
    language, setLanguage, activeLanguages, notifications, markNotificationRead, 
    clearAllNotifications, inbox, removeInboxItem, subscriptionStatus
  } = useAppStore();
  
  const t = useTranslation(language);

  const cartItemCount = (cart || []).reduce((sum, item) => sum + item.quantity, 0);
  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const hasSubAccess = isAdmin || (subscriptionStatus?.hasAccess ?? ((currentUser?.plan || 'FREE').toUpperCase() !== 'FREE'));
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const inboxCount = inbox?.length || 0;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-5 md:px-6 shrink-0 z-[100] transition-colors">
      {/* Mobile Menu Toggle */}
      <button 
        type="button" 
        onClick={toggleMobileMenu} 
        aria-label="Mở danh mục điều hướng"
        className="md:hidden p-2 mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Quick Search Bar */}
      <div className="flex-1 max-w-lg min-w-0 mr-3 sm:mr-6">
        <button 
          type="button" 
          onClick={toggleCommand}
          className="w-full relative flex items-center text-left pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-full text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 transition-all group"
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
          <span className="truncate">{t('Tìm kiếm nhanh hoặc mở Command Center (Ctrl+K)...')}</span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-70">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-semibold text-slate-500">Ctrl</kbd>
            <span className="text-slate-400 text-xs">+</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-semibold text-slate-500">K</kbd>
          </div>
        </button>
      </div>
      
      {/* Right Action Cluster */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Primary Action Button: + Tạo mới */}
        <div className="relative">
          <button 
            type="button" 
            onClick={() => {
              setShowCreateMenu(!showCreateMenu);
              setShowNotifications(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
          >
            {!hasSubAccess ? <Lock className="w-3.5 h-3.5 text-amber-300" /> : <Plus className="w-4 h-4" />}
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

        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          aria-label="Chuyển chế độ giao diện"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
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
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors relative"
            aria-label="Thông báo"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
              <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{t('Thông báo')} ({unreadCount})</h3>
                  {unreadCount > 0 && (
                    <button type="button" onClick={clearAllNotifications} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      {t('Đã đọc tất cả')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {!notifications || notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">{t('Bạn đã xem hết mọi thông báo.')}</div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div 
                        key={notif.id} 
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${notif.read ? 'opacity-60' : 'bg-blue-50/20'}`} 
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.read ? 'bg-slate-300' : 'bg-blue-500'}`}></div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{notif.title}</p>
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
            className="flex items-center gap-2 p-1 pl-1.5 sm:pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <img 
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'} 
              alt="Avatar" 
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 object-cover" 
            />
            <span className="hidden sm:inline text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
              {currentUser?.name?.split(' ')[0] || t('Tài khoản')}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
    </header>
  );
}
