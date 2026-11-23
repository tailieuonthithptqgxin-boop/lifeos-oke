import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Megaphone, Search, Plus, RefreshCw, Send, Calendar, Clock,
  CheckCircle2, AlertTriangle, AlertCircle, Eye, Trash2, Edit3,
  X, Mail, Globe, Users, ShieldAlert, Sparkles, Filter, ExternalLink,
  ChevronRight, ArrowRight, Check, Info, FileText, Image as ImageIcon,
  Pin, MousePointerClick, RefreshCcw, Smartphone, Monitor, Share2,
  HardDrive, Link2, Settings
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';
import { formatLocalDateKey } from '../../lib/utils';
import { compressAndUploadImage, formatBytes, validateImageFile } from '../../lib/imageCompressor';
import { toast } from '../../lib/toast';
import { AdminGmailPreviewModal } from './AdminGmailPreviewModal';
import { AdminReadReceiptsModal } from './AdminReadReceiptsModal';

interface AdminAnnouncementsTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  targetAudience: string;
  targetUserIds?: string | null;
  channels: string;
  status: string;
  scheduledFor?: string | null;
  expiresAt?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  imageUrl?: string | null;
  isPinned?: boolean;
  showLoginModal?: boolean;
  autoSendGmail?: boolean;
  clickCount?: number;
  readBy?: string | null;
  createdById: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  deliveries?: any[];
  _count?: {
    deliveries: number;
  };
}

const CATEGORY_LEVELS = [
  { 
    value: 'CRITICAL', 
    label: '🚨 Khẩn cấp / Quan trọng', 
    desc: 'Màu Đỏ · Bắt buộc hiện Popup khi đăng nhập',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dot: 'bg-rose-500'
  },
  { 
    value: 'FEATURE', 
    label: '🎉 Sự kiện / Cập nhật tính năng mới', 
    desc: 'Màu Tím · Nổi bật trên Bảng tin & Email',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    dot: 'bg-purple-500'
  },
  { 
    value: 'AFFILIATE', 
    label: '💸 Thông báo dành cho Cộng tác viên', 
    desc: 'Màu Vàng Kim · Chính sách & Hoa hồng CTV',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    dot: 'bg-amber-500'
  },
  { 
    value: 'STUDY', 
    label: '📚 Nhắc nhở học tập / Thi đua', 
    desc: 'Màu Xanh Lá · Kỷ luật Pomodoro & Tháp từ vựng',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-500'
  },
];

const TARGET_AUDIENCES = [
  { value: 'ALL', label: '🌐 Tất cả người dùng trên hệ thống', desc: 'Toàn bộ thành viên đã đăng ký LifeOS' },
  { value: 'ACTIVE', label: '🟢 Người dùng đang hoạt động tích cực', desc: 'Các tài khoản có hoạt động gần đây' },
  { value: 'INACTIVE', label: '🟡 Người dùng lâu chưa đăng nhập', desc: 'Gửi email và thông báo kéo người dùng quay lại web' },
  { value: 'AFFILIATE', label: '💸 Chỉ gửi cho Cộng tác viên (Affiliate)', desc: 'Chỉ các tài khoản đăng ký làm CTV' },
  { value: 'SELECTED_USERS', label: '👤 Chọn gửi riêng cho một hoặc nhiều tài khoản cụ thể', desc: 'Nhập ID hoặc chọn tài khoản cụ thể' },
];

const CTA_PRESETS = [
  { label: 'Không gắn nút', url: '', actionLabel: '' },
  { label: 'Trang chủ (Dashboard)', url: '/?tab=dashboard', actionLabel: '🚀 Khám phá ngay' },
  { label: 'Phòng Tập Trung Pomodoro', url: '/?tab=focus', actionLabel: '⚡ Vào học ngay' },
  { label: 'Học Tập & Từ Vựng (FSRS)', url: '/?tab=study', actionLabel: '📚 Ôn tập từ vựng' },
  { label: 'Cộng Đồng & Phòng Meet', url: '/?tab=connect', actionLabel: '🌐 Vào không gian cộng đồng' },
  { label: 'Cổng CTV & Hoa Hồng', url: '/?tab=referral', actionLabel: '💸 Xem chính sách CTV' },
  { label: 'Đường dẫn tùy chọn', url: 'CUSTOM', actionLabel: 'Xem chi tiết' },
];

export function AdminAnnouncementsTab({ onShowMessage }: AdminAnnouncementsTabProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Broadcast Composer State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('FEATURE');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // CTA
  const [ctaPreset, setCtaPreset] = useState('/?tab=dashboard');
  const [customActionUrl, setCustomActionUrl] = useState('');
  const [actionLabel, setActionLabel] = useState('🚀 Khám phá ngay');

  // Real Toggles
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [autoSendGmail, setAutoSendGmail] = useState(true);
  const [isPinned, setIsPinned] = useState(false);

  // Broadcast execution & progress
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<number | null>(null);

  // Modals & Drawers
  const [previewGmailHtml, setPreviewGmailHtml] = useState<string | null>(null);
  const [receiptsAnnouncement, setReceiptsAnnouncement] = useState<{ id: string; title: string } | null>(null);

  // WordPress Bridge
  const [showWpConfig, setShowWpConfig] = useState(false);
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpAppPass, setWpAppPass] = useState('');
  const [wpTesting, setWpTesting] = useState(false);
  const [wpStatus, setWpStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
    loadWordPressConfig();
  }, []);

  const loadWordPressConfig = async () => {
    try {
      const res = await apiCall<{ success: boolean; config: any }>('/api/admin/wordpress/config');
      if (res && res.success && res.config) {
        setWpUrl(res.config.apiUrl || '');
        setWpUser(res.config.username || '');
        setWpAppPass(res.config.appPassword || '');
      }
    } catch {}
  };

  const handleSaveWordPressConfig = async () => {
    try {
      const res = await apiCall<{ success: boolean; message: string }>('/api/admin/wordpress/config', {
        method: 'POST',
        body: JSON.stringify({
          enabled: !!wpUrl.trim(),
          apiUrl: wpUrl.trim(),
          username: wpUser.trim(),
          appPassword: wpAppPass.trim()
        })
      });
      if (res && res.success) {
        toast.show(res.message || 'Đã lưu cấu hình WordPress!', 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi lưu cấu hình WordPress', 'error');
    }
  };

  const handleTestWordPress = async () => {
    try {
      setWpTesting(true);
      setWpStatus(null);
      const res = await apiCall<{ success: boolean; message: string }>('/api/admin/wordpress/test', {
        method: 'POST',
        body: JSON.stringify({
          apiUrl: wpUrl.trim(),
          username: wpUser.trim(),
          appPassword: wpAppPass.trim()
        })
      });
      if (res && res.success) {
        setWpStatus(`✅ ${res.message}`);
        toast.show(res.message, 'success');
      } else {
        setWpStatus(`❌ ${res?.message || 'Không thể kết nối'}`);
        toast.show(res?.message || 'Lỗi kết nối WordPress', 'error');
      }
    } catch (err: any) {
      setWpStatus(`❌ ${err.message || 'Lỗi kết nối'}`);
      toast.show(err.message || 'Lỗi kết nối', 'error');
    } finally {
      setWpTesting(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await apiCall<{ success: boolean; announcements: AnnouncementItem[] }>('/api/admin/announcements');
      if (res && res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch {
      toast.show('Không thể tải lịch sử thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Image Upload (<60KB Canvas Compression)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const val = validateImageFile(file);
    if (!val.valid) {
      toast.show(val.error || 'Ảnh không hợp lệ', 'error');
      return;
    }
    try {
      setIsCompressingImg(true);
      const res = await compressAndUploadImage(file, 'announcement', { maxDimension: 1200, targetMaxKB: 60 });
      setImageUrl(res.url);
      toast.show(`Ảnh đã nén còn ${formatBytes(res.compressedSize)} (giảm ${res.reductionPercent}%)`, 'success');
    } catch {
      toast.show('Lỗi nén ảnh qua canvas', 'error');
    } finally {
      setIsCompressingImg(false);
      e.target.value = '';
    }
  };

  const resolveFinalActionUrl = () => {
    if (ctaPreset === 'CUSTOM') return customActionUrl.trim() || null;
    return ctaPreset || null;
  };

  // Broadcast Handler (Smart Batch Queue)
  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.show('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!', 'warning');
      return;
    }

    try {
      setIsBroadcasting(true);
      setBroadcastProgress(15);
      soundEngine?.playNotification?.();

      const finalActionUrl = resolveFinalActionUrl();
      const priority = type === 'CRITICAL' ? 'CRITICAL' : 'NORMAL';

      const payload = {
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        targetAudience,
        targetUserIds: targetAudience === 'SELECTED_USERS' ? selectedUserIds : undefined,
        channels: autoSendGmail ? 'BOTH' : 'WEB',
        actionLabel: finalActionUrl ? (actionLabel.trim() || 'Xem chi tiết') : null,
        actionUrl: finalActionUrl,
        imageUrl,
        isPinned,
        showLoginModal,
        autoSendGmail
      };

      setBroadcastProgress(45);

      const res = await apiCall<{
        success: boolean;
        message: string;
        targetedCount: number;
        webDelivered: number;
        emailEnqueued: number;
      }>('/api/admin/announcements/broadcast-now', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setBroadcastProgress(100);

      if (res && res.success) {
        toast.show(
          `🚀 Đã phát sóng thông báo thành công đến ${res.targetedCount} người dùng! (Web: ${res.webDelivered}, Gmail: ${res.emailEnqueued})`,
          'success'
        );
        // Reset Form
        setTitle('');
        setMessage('');
        setImageUrl(null);
        setIsPinned(false);
        fetchAnnouncements();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi khi phát sóng thông báo', 'error');
    } finally {
      setTimeout(() => {
        setIsBroadcasting(false);
        setBroadcastProgress(null);
      }, 600);
    }
  };

  // Preview Email Modal
  const handlePreviewGmail = async () => {
    if (!title.trim() && !message.trim()) {
      toast.show('Vui lòng nhập tiêu đề hoặc nội dung để xem trước', 'warning');
      return;
    }
    try {
      const finalActionUrl = resolveFinalActionUrl();
      const res = await apiCall<{ success: boolean; html: string }>('/api/admin/announcements/preview-email', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || 'Tiêu đề thông báo mẫu',
          message: message.trim() || 'Nội dung thông báo chi tiết từ Ban Quản trị...',
          type,
          priority: type === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
          imageUrl,
          actionLabel: finalActionUrl ? (actionLabel.trim() || 'Xem chi tiết') : null,
          actionUrl: finalActionUrl || 'https://quanlicanhan.online'
        })
      });
      if (res && res.success) {
        setPreviewGmailHtml(res.html);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải mẫu thư xem trước', 'error');
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id: string) => {
    try {
      const res = await apiCall<{ success: boolean; isPinned: boolean }>(`/api/admin/announcements/${id}/toggle-pin`, {
        method: 'POST'
      });
      if (res && res.success) {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: res.isPinned } : a));
        toast.show(res.isPinned ? 'Đã ghim dải băng đầu trang!' : 'Đã bỏ ghim dải băng đầu trang', 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi ghim thông báo', 'error');
    }
  };

  // Remind Unread
  const handleRemindUnread = async (id: string) => {
    if (!window.confirm('Bạn có muốn gửi lời nhắc lại cho tất cả người dùng chưa mở xem thông báo này?')) return;
    try {
      const res = await apiCall<{ success: boolean; remindedCount: number; message: string }>(`/api/admin/announcements/${id}/remind-unread`, {
        method: 'POST'
      });
      if (res && res.success) {
        toast.show(res.message, 'success');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi gửi nhắc lại', 'error');
    }
  };

  // Delete / Revoke
  const handleDeleteAnnouncement = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn THU HỒI thông báo "${name}" không? Khi thu hồi, thông báo sẽ lập tức biến mất khỏi màn hình người dùng.`)) return;
    try {
      const res = await apiCall<{ success: boolean; message: string }>(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
      });
      if (res && res.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        toast.show('Đã thu hồi và xóa thông báo thành công!', 'info');
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi xóa thông báo', 'error');
    }
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a => {
      if (filterType !== 'ALL' && a.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [announcements, filterType, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
                <Megaphone className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Trung Tâm Phát Sóng Thông Báo & Auto-Gmail
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl leading-relaxed">
              Phát sóng thông báo toàn cục xuất hiện tức thì khi đăng nhập vào Web, dải băng ghim đầu trang và tự động gửi thư HTML qua Gmail hàng loạt (hỗ trợ WordPress REST API & Cloudflare).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowWpConfig(!showWpConfig)}
            className="self-start sm:self-center px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Kết nối WordPress</span>
          </button>
        </div>
      </div>

      {/* WordPress Config Drawer (Expandable) */}
      {showWpConfig && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cấu Hình Cổng WordPress REST API & SMTP wp_mail()
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowWpConfig(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Hỗ trợ nhúng và gửi email broadcast thông qua WordPress. Nếu website của bạn chạy WordPress với plugin WP Mail SMTP, LifeOS sẽ tự động tận dụng hạ tầng SMTP của WordPress.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">WordPress Site URL / API</label>
              <input
                type="text"
                value={wpUrl}
                onChange={e => setWpUrl(e.target.value)}
                placeholder="https://myblog.com"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">WP Username (Tùy chọn)</label>
              <input
                type="text"
                value={wpUser}
                onChange={e => setWpUser(e.target.value)}
                placeholder="admin"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Application Password (Tùy chọn)</label>
              <input
                type="password"
                value={wpAppPass}
                onChange={e => setWpAppPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>
          </div>

          {wpStatus && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-semibold">
              {wpStatus}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              type="button"
              disabled={wpTesting || !wpUrl.trim()}
              onClick={handleTestWordPress}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {wpTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
            <button
              type="button"
              onClick={handleSaveWordPressConfig}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              Lưu cấu hình WordPress
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: SOẠN & PHÁT SÓNG THÔNG BÁO (MOBILE-FIRST) */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
              Soạn & Phát Sóng Thông Báo Ngay
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Tự động đồng bộ Popup khi đăng nhập & Gmail
          </span>
        </div>

        {/* 1. Tiêu đề */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Tiêu Đề Thông Báo <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ví dụ: 🎉 Ra mắt tính năng Phòng Học Trực Tuyến & Thưởng Kỷ Luật Tuần Mới!"
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 2. Loại / Mức độ thông báo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Mức Độ & Định Dạng Thông Báo (Tự đổi màu giao diện & Banner Gmail)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {CATEGORY_LEVELS.map(cat => {
              const isSelected = type === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setType(cat.value)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? `${cat.badge} font-bold ring-2 ring-emerald-500/40 shadow-xs`
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-black">
                    <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                    <span>{cat.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {cat.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Đối tượng nhận thông báo (Smart Targeting) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Đối Tượng Nhận Thông Báo (Smart Targeting)
          </label>
          <select
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden"
          >
            {TARGET_AUDIENCES.map(aud => (
              <option key={aud.value} value={aud.value}>
                {aud.label} — ({aud.desc})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Nội dung chi tiết */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Nội Dung Chi Tiết <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Nhập nội dung thông báo... Bạn có thể xuống dòng, dùng emoji để tạo cảm hứng và truyền tải đầy đủ thông điệp đến người nhận."
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
          />
        </div>

        {/* 5. Đính kèm ảnh (Tự nén <60KB qua canvas) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Hình Ảnh Đính Kèm (Tự động nén Canvas dưới 60KB)
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              disabled={isCompressingImg}
              onClick={() => imageInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>{isCompressingImg ? 'Đang nén ảnh...' : imageUrl ? 'Đổi ảnh khác' : 'Tải ảnh từ thiết bị'}</span>
            </button>

            {imageUrl && (
              <div className="flex items-center gap-2">
                <img src={imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs"
                >
                  Xóa ảnh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 6. Nút Hành Động Đi Kèm (CTA Button) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Nút Hành Động Đi Kèm (Call to Action Button)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Trang đích khi bấm vào:</span>
              <select
                value={ctaPreset}
                onChange={e => {
                  setCtaPreset(e.target.value);
                  const selected = CTA_PRESETS.find(p => p.url === e.target.value);
                  if (selected && selected.actionLabel) setActionLabel(selected.actionLabel);
                }}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden"
              >
                {CTA_PRESETS.map(p => (
                  <option key={p.url} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {ctaPreset !== '' && (
              <div>
                <span className="text-[11px] text-slate-400 block mb-1 font-medium">Chữ hiển thị trên nút:</span>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={e => setActionLabel(e.target.value)}
                  placeholder="Ví dụ: 🚀 Khám phá ngay"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {ctaPreset === 'CUSTOM' && (
            <div>
              <span className="text-[11px] text-slate-400 block mb-1 font-medium">Đường dẫn URL đích:</span>
              <input
                type="text"
                value={customActionUrl}
                onChange={e => setCustomActionUrl(e.target.value)}
                placeholder="https://example.com hoặc /?tab=focus"
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* 7. Hai công tắc kích hoạt kênh thật */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={showLoginModal}
              onChange={e => setShowLoginModal(e.target.checked)}
              className="w-4 h-4 rounded-sm text-emerald-500 focus:ring-emerald-500"
            />
            <span>Hiện Popup khi Đăng nhập</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={autoSendGmail}
              onChange={e => setAutoSendGmail(e.target.checked)}
              className="w-4 h-4 rounded-sm text-emerald-500 focus:ring-emerald-500"
            />
            <span>Tự động gửi thư qua Gmail</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={e => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded-sm text-amber-500 focus:ring-amber-500"
            />
            <span>Ghim Dải Băng Đầu Trang</span>
          </label>
        </div>

        {/* Progress Bar during Broadcast */}
        {broadcastProgress !== null && (
          <div className="space-y-1.5 animate-in fade-in">
            <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Đang phát sóng thông báo và điều phối Gmail...</span>
              <span>{broadcastProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${broadcastProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePreviewGmail}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-rose-500" />
              <span>Xem trước mẫu thư Gmail</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isBroadcasting}
            onClick={handleBroadcast}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer ml-auto"
          >
            <Send className="w-4 h-4" />
            <span>{isBroadcasting ? 'Đang phát sóng...' : 'Phát Sóng Thông Báo Ngay'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: BẢNG QUẢN LÝ LỊCH SỬ & THỐNG KÊ "AI ĐÃ ĐỌC" */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Lịch Sử Thông Báo Đã Phát & Thống Kê Thực Tế
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
              {announcements.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm thông báo..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={fetchAnnouncements}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* History Cards List */}
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Đang tải lịch sử thông báo...</p>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Chưa có thông báo nào được phát sóng.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map(ann => {
              let readCount = 0;
              try {
                if (ann.readBy) readCount = JSON.parse(ann.readBy).length;
              } catch {}

              const deliveryCount = ann._count?.deliveries || ann.deliveries?.length || readCount;
              const readPct = deliveryCount > 0 ? Math.round((readCount / deliveryCount) * 100) : 0;

              return (
                <div
                  key={ann.id}
                  className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-4 ${
                    ann.isPinned
                      ? 'border-amber-400/60 dark:border-amber-500/40 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Top Meta Line */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ann.isPinned && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black flex items-center gap-1 border border-amber-500/20">
                            <Pin className="w-3 h-3 fill-amber-500" />
                            ĐANG GHIM ĐẦU TRANG
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                          {ann.type}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {ann.title}
                      </h4>
                    </div>

                    {/* Quick Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(ann.id)}
                        className={`p-1.5 rounded-xl transition-colors ${
                          ann.isPinned
                            ? 'text-amber-500 bg-amber-500/15'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={ann.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu trang'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemindUnread(ann.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title="Gửi nhắc lại cho người chưa đọc"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Thu hồi / Xóa thông báo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {ann.message}
                  </p>

                  {/* 4 Stat Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Tổng người nhận</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                        {deliveryCount} người
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReceiptsAnnouncement({ id: ann.id, title: ann.title })}
                      className="p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-colors cursor-pointer group"
                    >
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold flex items-center justify-between">
                        <span>👁️ Đã xem</span>
                        <span className="text-[10px] underline group-hover:text-emerald-500">Xem ai đã đọc</span>
                      </span>
                      <span className="font-mono font-black text-emerald-700 dark:text-emerald-300">
                        {readCount} ({readPct}%)
                      </span>
                    </button>

                    <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block font-bold">
                        🖱️ Lượt click CTA
                      </span>
                      <span className="font-mono font-black">
                        {ann.clickCount || 0} lượt
                      </span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Trạng thái Gmail</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã gửi
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gmail Preview Modal */}
      {previewGmailHtml && (
        <AdminGmailPreviewModal
          title={title}
          htmlContent={previewGmailHtml}
          onClose={() => setPreviewGmailHtml(null)}
        />
      )}

      {/* Read Receipts Modal */}
      {receiptsAnnouncement && (
        <AdminReadReceiptsModal
          announcementId={receiptsAnnouncement.id}
          announcementTitle={receiptsAnnouncement.title}
          onClose={() => setReceiptsAnnouncement(null)}
        />
      )}
    </div>
  );
}
