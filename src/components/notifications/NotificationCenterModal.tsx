import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  CheckSquare,
  Sparkles,
  Settings,
  Trash2,
  Check,
  ExternalLink,
  Search,
  Filter,
  X,
  Shield,
  Zap,
  Mail,
  Send,
  Flame,
  Users,
  Eye,
  Activity
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { toast } from '../../lib/toast';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { AdminConfirmModal } from '../admin/AdminConfirmModal';
import { GmailPreviewModal } from './GmailPreviewModal';
import { scheduleReminderScheduler } from '../../lib/scheduleReminderScheduler';
import { unifiedNotificationEngine } from '../../lib/unifiedNotificationEngine';
import { EmailCategoryType } from '../../lib/beautifulEmailTemplate';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function NotificationCenterModal({
  isOpen,
  onClose,
  onOpenSettings
}: NotificationCenterModalProps) {
  useBodyScrollLock(isOpen);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const {
    notifications,
    markNotificationRead,
    clearAllNotifications,
    deleteNotification,
    deleteAllNotifications,
    setCurrentView,
    currentUser
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'schedule' | 'security' | 'affiliate' | 'community' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // 1-Tap Gmail Preview Modal
  const [showGmailPreview, setShowGmailPreview] = useState(false);
  const [previewCategory, setPreviewCategory] = useState<EmailCategoryType>('SCHEDULE_2H');

  // Simulation Dropdown state
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSimulateMenu) setShowSimulateMenu(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showSimulateMenu]);

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    let list = notifications || [];

    // Filter by tab
    if (activeFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (activeFilter === 'schedule') {
      list = list.filter(n => 
        n.category === 'CALENDAR' || 
        n.category === 'TASK' || 
        n.category === 'SCHEDULE_2H' || 
        n.category === 'SCHEDULE_1H' || 
        n.category === 'DEADLINE_30M' || 
        n.title?.toLowerCase().includes('lịch') || 
        n.title?.toLowerCase().includes('deadline') ||
        n.title?.toLowerCase().includes('nhiệm vụ')
      );
    } else if (activeFilter === 'security') {
      list = list.filter(n => 
        n.category === 'SECURITY' || 
        n.category === 'SECURITY_LOGIN' || 
        n.category === 'ACTIVITY_REPORT' || 
        n.category === 'SYSTEM' || 
        n.title?.toLowerCase().includes('bảo mật') || 
        n.title?.toLowerCase().includes('đăng nhập') ||
        n.title?.toLowerCase().includes('báo cáo')
      );
    } else if (activeFilter === 'affiliate') {
      list = list.filter(n => 
        n.category === 'AFFILIATE' || 
        n.title?.toLowerCase().includes('hoa hồng') || 
        n.title?.toLowerCase().includes('giới thiệu') ||
        n.title?.toLowerCase().includes('rút tiền')
      );
    } else if (activeFilter === 'community') {
      list = list.filter(n => 
        n.category === 'COMMUNITY' || 
        n.title?.toLowerCase().includes('phòng học') || 
        n.title?.toLowerCase().includes('pomodoro') ||
        n.title?.toLowerCase().includes('bạn bè')
      );
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(n => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q));
    }

    return list;
  }, [notifications, activeFilter, searchTerm]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await clearAllNotifications();
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc!', 'Thông báo');
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      await deleteAllNotifications();
      toast.info('Đã xóa toàn bộ thông báo.', 'Dọn dẹp');
    } catch {
      toast.error('Không thể xóa thông báo.');
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.read) {
      markNotificationRead(notif.id);
    }

    // 1. Direct explicit link if present
    if (notif.link) {
      if (notif.link.includes('calendar')) {
        setCurrentView('calendar');
        onClose();
        return;
      }
      if (notif.link.includes('tasks')) {
        setCurrentView('tasks');
        onClose();
        return;
      }
      if (notif.link.includes('referral') || notif.link.includes('affiliate')) {
        setCurrentView('referral');
        onClose();
        return;
      }
      if (notif.link.includes('study-space') || notif.link.includes('study')) {
        setCurrentView('study-space');
        onClose();
        return;
      }
      if (notif.link.includes('account')) {
        setCurrentView('account');
        onClose();
        return;
      }
    }

    // 2. Keyword fallback routing
    const text = `${notif.title || ''} ${notif.message || ''} ${notif.category || ''}`.toLowerCase();
    if (text.includes('lịch') || text.includes('calendar') || text.includes('hẹn')) {
      setCurrentView('calendar');
      onClose();
    } else if (text.includes('deadline') || text.includes('nhiệm vụ') || text.includes('task')) {
      setCurrentView('tasks');
      onClose();
    } else if (text.includes('hoa hồng') || text.includes('cộng tác') || text.includes('giới thiệu') || text.includes('rút tiền')) {
      setCurrentView('referral');
      onClose();
    } else if (text.includes('phòng học') || text.includes('pomodoro') || text.includes('bàn học')) {
      setCurrentView('study-space');
      onClose();
    } else if (text.includes('bảo mật') || text.includes('đăng nhập') || text.includes('mật khẩu')) {
      setCurrentView('account');
      onClose();
    } else {
      setCurrentView('dashboard');
      onClose();
    }
  };

  const getNotificationIcon = (notif: any) => {
    if (notif.priority === 'CRITICAL' || notif.type === 'error' || notif.title?.includes('Khẩn cấp') || notif.title?.includes('KHẨN CẤP')) {
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
    if (notif.category === 'CALENDAR' || notif.title?.includes('Lịch') || notif.title?.includes('Sẵn Sàng') || notif.title?.includes('Nhắc Lịch')) {
      return <Calendar className="w-4 h-4 text-blue-500" />;
    }
    if (notif.category === 'TASK' || notif.title?.includes('Nhiệm vụ') || notif.title?.includes('Deadline')) {
      return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    }
    if (notif.category === 'AFFILIATE' || notif.title?.includes('Hoa Hồng') || notif.title?.includes('tiền')) {
      return <Flame className="w-4 h-4 text-amber-500" />;
    }
    if (notif.category === 'COMMUNITY' || notif.title?.includes('Phòng Học') || notif.title?.includes('Bạn Bè')) {
      return <Users className="w-4 h-4 text-indigo-500" />;
    }
    if (notif.category === 'SECURITY_LOGIN' || notif.title?.includes('Bảo Mật') || notif.title?.includes('Đăng Nhập')) {
      return <Shield className="w-4 h-4 text-purple-500" />;
    }
    return <Sparkles className="w-4 h-4 text-indigo-500" />;
  };

  // 1-Tap Simulation Triggers
  const handleSimulateMilestone = (milestone: '2h' | '1h' | '30m') => {
    setShowSimulateMenu(false);
    scheduleReminderScheduler.triggerSimulation(milestone);
    const labelMap = { '2h': 'Trước 2 Giờ (120 phút)', '1h': 'Trước 1 Giờ (60 phút)', '30m': 'Khẩn Cấp Trước 30 Phút' };
    toast.success(`⚡ Đã kích hoạt giả lập nhắc Deadline: "${labelMap[milestone]}"! Chuông đã reo & email đã bắn.`);
  };

  const handleSendLiveReport = async () => {
    await unifiedNotificationEngine.notifyActivityReport({
      streakDays: currentUser?.streakDays ?? 0,
      todayStudyMinutes: currentUser?.todayStudyMinutes ?? 0,
      badgeLevel: currentUser?.badgeLevel || 'Tân Binh'
    });
    toast.success('📊 Đã tổng hợp số liệu thật và phát hành Báo Cáo Kỷ Luật thành công!');
  };

  return (
    <>
      <div 
        onMouseDown={(e) => {
          mouseDownTargetRef.current = e.target;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[32px] sm:rounded-3xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Mobile Handle indicator */}
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

          {/* Top Header */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Trung Tâm Thông Báo
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500 text-white animate-pulse">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đồng bộ tức thì 3 kênh: Quả chuông • Web Push • Hộp thư Gmail
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cài đặt thông báo & Gmail Webhook"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUICK VERIFICATION & TESTING TOOLBAR (Nghiệm thu 1 chạm)      */}
          {/* ------------------------------------------------------------- */}
          <div className="px-4 py-2.5 sm:px-6 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-purple-50/60 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-purple-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Công Cụ Nghiệm Thu 1-Chạm:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Nút 1: Xem trước thư Gmail */}
              <button
                type="button"
                onClick={() => {
                  setPreviewCategory('SCHEDULE_2H');
                  setShowGmailPreview(true);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>👁️ Xem trước Gmail</span>
              </button>

              {/* Nút 2: Giả lập nhắc Deadline 3 mốc */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSimulateMenu(!showSimulateMenu)}
                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>⚡ Giả lập Deadline</span>
                </button>

                {showSimulateMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-20 space-y-1 animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => handleSimulateMilestone('2h')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 cursor-pointer"
                    >
                      <span>🦉</span>
                      <span>Mốc 1 (Trước 2 giờ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateMilestone('1h')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/50 text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center gap-2 cursor-pointer"
                    >
                      <span>⏰</span>
                      <span>Mốc 2 (Trước 1 giờ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulateMilestone('30m')}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                    >
                      <span>🚨</span>
                      <span>Mốc 3 (Trước 30m - Khẩn)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nút 3: Xuất báo cáo hoạt động ngay */}
              <button
                type="button"
                onClick={handleSendLiveReport}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>📊 Báo Cáo Ngay</span>
              </button>
            </div>
          </div>

          {/* Filter Pills & Search Bar */}
          <div className="p-3.5 sm:px-6 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thông báo, deadline, lịch..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  title="Đánh dấu tất cả là đã đọc"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Đã đọc hết</span>
                </button>
              )}

              {(notifications || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs transition-colors shrink-0 cursor-pointer"
                  title="Xóa tất cả thông báo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Tabs (5 Dedicated Streams) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'schedule', label: '📅 Lịch & Deadline' },
                { id: 'security', label: '🛡️ Bảo mật & Báo cáo' },
                { id: 'affiliate', label: '💰 CTV & Hoa hồng' },
                { id: 'community', label: '👥 Phòng học & Bạn bè' },
                { id: 'unread', label: `Chưa đọc (${unreadCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`min-h-[34px] px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm scale-102 font-extrabold'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-4">
            {filteredNotifications.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {searchTerm ? 'Không tìm thấy thông báo phù hợp' : 'Hộp thông báo đang trống'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Các nhắc nhở về lịch trình, hạn chót deadline (trước 2h, 1h, 30m) và cập nhật bảo mật sẽ hiển thị tại đây khi kích hoạt.
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const isUnread = !notif.read;
                const formattedDate = notif.date || notif.createdAt
                  ? new Date(notif.date || notif.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })
                  : 'Vừa xong';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 sm:p-4 rounded-2xl transition-all flex items-start gap-3.5 cursor-pointer group mb-1 ${
                      isUnread
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/25 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 ring-1 ring-emerald-500/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Status icon */}
                    <div className="mt-0.5 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-xs">
                      {getNotificationIcon(notif)}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-xs sm:text-sm font-extrabold truncate ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {notif.title}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed break-words font-medium">
                        {notif.message}
                      </div>

                      {/* Action pill if present */}
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                        <span>{notif.actionLabel || 'Mở tính năng ngay'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Actions: Mark read / Delete */}
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(notif.id);
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          title="Đánh dấu đã đọc"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Bar with Settings Shortcut */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bộ quét 3 mốc (30s/lần): <strong>Hoạt động</strong></span>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Cấu hình Cổng Gmail</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        <AdminConfirmModal
          isOpen={showDeleteAllConfirm}
          title="Xóa toàn bộ thông báo"
          message="Bạn có chắc chắn muốn xóa toàn bộ lịch sử thông báo không? Thao tác này sẽ dọn dẹp sạch hộp thư thông báo của bạn."
          confirmText="Xác nhận xóa"
          cancelText="Hủy bỏ"
          variant="danger"
          isLoading={isDeletingAll}
          onConfirm={confirmDeleteAll}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />
      </div>

      {/* 1-Tap Gmail Preview Modal */}
      <GmailPreviewModal
        isOpen={showGmailPreview}
        onClose={() => setShowGmailPreview(false)}
        defaultCategory={previewCategory}
      />
    </>
  );
}
