import React, { useState, useMemo } from 'react';
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
  Mail
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { toast } from '../../lib/toast';

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
  const {
    notifications,
    markNotificationRead,
    clearAllNotifications,
    deleteNotification,
    deleteAllNotifications,
    setCurrentView
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'calendar' | 'task' | 'system'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  // Filtered notifications list (Hooks must run unconditionally)
  const filteredNotifications = useMemo(() => {
    let list = notifications || [];

    // Filter by tab
    if (activeFilter === 'unread') {
      list = list.filter(n => !n.read);
    } else if (activeFilter === 'calendar') {
      list = list.filter(n => n.category === 'CALENDAR' || n.title?.includes('Lịch') || n.message?.includes('sự kiện'));
    } else if (activeFilter === 'task') {
      list = list.filter(n => n.category === 'TASK' || n.title?.includes('Nhiệm vụ') || n.title?.includes('deadline'));
    } else if (activeFilter === 'system') {
      list = list.filter(n => n.category === 'SYSTEM' || n.type === 'alert' || n.priority === 'CRITICAL');
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

  const handleDeleteAll = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thông báo?')) {
      await deleteAllNotifications();
      toast.info('Đã xóa toàn bộ thông báo.', 'Dọn dẹp');
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.read) {
      markNotificationRead(notif.id);
    }

    // Smart navigation based on notification content or explicit actionUrl
    if (notif.actionUrl) {
      if (notif.actionUrl.includes('calendar')) {
        setCurrentView('calendar');
        onClose();
        return;
      }
      if (notif.actionUrl.includes('tasks')) {
        setCurrentView('tasks');
        onClose();
        return;
      }
      if (notif.actionUrl.includes('finance')) {
        setCurrentView('finance');
        onClose();
        return;
      }
    }

    // Fallback keyword navigation
    if (notif.title?.includes('Lịch') || notif.message?.includes('sự kiện') || notif.category === 'CALENDAR') {
      setCurrentView('calendar');
      onClose();
    } else if (notif.title?.includes('Nhiệm vụ') || notif.title?.includes('deadline') || notif.category === 'TASK') {
      setCurrentView('tasks');
      onClose();
    }
  };

  const getNotificationIcon = (notif: any) => {
    if (notif.priority === 'CRITICAL' || notif.type === 'alert') {
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    }
    if (notif.category === 'CALENDAR' || notif.title?.includes('Lịch')) {
      return <Calendar className="w-4 h-4 text-blue-500" />;
    }
    if (notif.category === 'TASK' || notif.title?.includes('Nhiệm vụ')) {
      return <CheckSquare className="w-4 h-4 text-emerald-500" />;
    }
    return <Sparkles className="w-4 h-4 text-purple-500" />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Trung Tâm Thông Báo
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white animate-pulse">
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cập nhật tự động thời gian thực về Lịch, Deadline và Hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cài đặt thông báo & Gmail"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm thông báo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </button>
            )}

            {(notifications || []).length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="p-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs transition-colors shrink-0 cursor-pointer"
                title="Xóa tất cả thông báo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'unread', label: `Chưa đọc (${unreadCount})` },
              { id: 'calendar', label: 'Lịch & Sự kiện' },
              { id: 'task', label: 'Nhiệm vụ & Deadline' },
              { id: 'system', label: 'Cảnh báo & Hệ thống' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
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
                  {searchTerm ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào'}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
                  Các nhắc nhở về lịch trình, công việc và tự động hóa sẽ xuất hiện tại đây khi phát sinh.
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
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all flex items-start gap-3 cursor-pointer group mb-1 ${
                    isUnread
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Status dot or icon */}
                  <div className="mt-0.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0 shadow-2xs">
                    {getNotificationIcon(notif)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-xs font-bold truncate ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    <div
                      className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: notif.message }}
                    />

                    {/* Action pill if present */}
                    {notif.actionLabel && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                        <span>{notif.actionLabel}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Actions: Mark read / Delete */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(notif.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-800"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hệ thống Tự động hóa: <strong>Đang giám sát</strong></span>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Cài đặt kênh & Gmail OAuth</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
