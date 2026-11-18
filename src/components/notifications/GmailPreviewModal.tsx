import React, { useState, useMemo } from 'react';
import {
  X,
  Mail,
  Smartphone,
  Monitor,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Shield,
  Loader2,
  ExternalLink
} from 'lucide-react';
import {
  buildBeautifulGmailHTML,
  SAMPLE_EMAIL_PREVIEWS,
  EmailCategoryType,
  BeautifulEmailData
} from '../../lib/beautifulEmailTemplate';
import { useAppStore } from '../../lib/store';
import { unifiedNotificationEngine } from '../../lib/unifiedNotificationEngine';
import { toast } from '../../lib/toast';

interface GmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: EmailCategoryType;
}

const TEMPLATE_TABS: Array<{
  id: EmailCategoryType;
  label: string;
  badge: string;
  icon: string;
  color: string;
}> = [
  { id: 'SCHEDULE_2H', label: 'Trước 2 Giờ', badge: 'Mốc 1', icon: '🦉', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { id: 'SCHEDULE_1H', label: 'Trước 1 Giờ', badge: 'Mốc 2', icon: '⏰', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  { id: 'DEADLINE_30M', label: 'Khẩn Cấp 30m', badge: 'Mốc 3', icon: '🚨', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
  { id: 'SECURITY_LOGIN', label: 'Bảo Mật & Login', badge: 'Auth', icon: '🛡️', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { id: 'ACTIVITY_REPORT', label: 'Báo Cáo Kỷ Luật', badge: 'Report', icon: '📊', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { id: 'AFFILIATE', label: 'Hoa Hồng CTV', badge: 'Affiliate', icon: '💰', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200' }
];

export function GmailPreviewModal({
  isOpen,
  onClose,
  defaultCategory = 'SCHEDULE_2H'
}: GmailPreviewModalProps) {
  const { currentUser } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<EmailCategoryType>(defaultCategory);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('mobile');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Compute live user stats for 100% authentic email preview
  const liveStats = useMemo(() => ({
    streakDays: currentUser?.streakDays ?? 0,
    todayStudyMinutes: currentUser?.todayStudyMinutes ?? 0,
    badgeLevel: currentUser?.badgeLevel || 'Tân Binh'
  }), [currentUser]);

  // Generate rendered HTML with inline-CSS
  const emailHtml = useMemo(() => {
    const generator = SAMPLE_EMAIL_PREVIEWS[activeCategory] || SAMPLE_EMAIL_PREVIEWS.SCHEDULE_2H;
    const data: BeautifulEmailData = generator(liveStats);
    data.recipientName = currentUser?.name || currentUser?.displayName || 'Bạn';
    data.recipientEmail = currentUser?.email || 'user@example.com';
    return buildBeautifulGmailHTML(data);
  }, [activeCategory, liveStats, currentUser]);

  if (!isOpen) return null;

  const handleSendTestLive = async () => {
    setIsSendingTest(true);
    try {
      const generator = SAMPLE_EMAIL_PREVIEWS[activeCategory] || SAMPLE_EMAIL_PREVIEWS.SCHEDULE_2H;
      const data = generator(liveStats);
      data.recipientName = currentUser?.name || currentUser?.displayName || 'Bạn';
      data.recipientEmail = currentUser?.email || 'user@example.com';

      const result = await unifiedNotificationEngine.sendEmailNotification({
        category: activeCategory,
        title: data.title,
        message: data.notes || data.message || data.headline,
        priority: activeCategory === 'DEADLINE_30M' ? 'CRITICAL' : 'NORMAL',
        emailData: data
      });

      if (result.success) {
        toast.success(`🎉 Đã đưa email thử nghiệm "${TEMPLATE_TABS.find(t => t.id === activeCategory)?.label}" vào hàng đợi gửi đến ${currentUser?.email}!`);
      } else {
        toast.warning(result.error || 'Chưa gửi được email. Vui lòng cấu hình Webhook hoặc SMTP trong mục Cài đặt.');
      }
    } catch (e: any) {
      toast.error('Lỗi khi gửi email thử nghiệm: ' + (e.message || String(e)));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Trung Tâm Xem Trước Thư Gmail 1-Chạm</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Inline-CSS Chuẩn 100%
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị chính xác diện mạo email người dùng sẽ nhận được trong hộp thư đến Gmail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport switch: Mobile vs Desktop */}
            <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  deviceMode === 'mobile'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Xem giao diện App Gmail trên Điện thoại"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Điện thoại</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  deviceMode === 'desktop'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Xem giao diện Gmail trên Máy tính"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Máy tính</span>
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Template Tabs Bar (Horizontal Scrollable) */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {TEMPLATE_TABS.map((tab) => {
            const isSelected = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? `${tab.color} shadow-xs scale-102 font-extrabold ring-1 ring-blue-500/20`
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sandboxed iframe Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex items-center justify-center min-h-[380px]">
          <div
            className={`transition-all duration-200 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 ${
              deviceMode === 'mobile' ? 'w-full max-w-[420px]' : 'w-full max-w-[620px]'
            }`}
          >
            {/* Fake Gmail Top Bar */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium select-none">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span className="font-bold text-slate-800 truncate ml-1">
                  Gmail • {TEMPLATE_TABS.find(t => t.id === activeCategory)?.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {deviceMode === 'mobile' ? 'Mobile View' : 'Desktop View'}
              </span>
            </div>

            {/* Sandboxed iframe rendering pure HTML with inline CSS */}
            <iframe
              title="Gmail Preview"
              srcDoc={emailHtml}
              className="w-full h-[540px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Người nhận thử nghiệm: <strong>{currentUser?.email || 'Tài khoản hiện tại'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng xem trước
            </button>

            <button
              type="button"
              onClick={handleSendTestLive}
              disabled={isSendingTest}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi thư thật...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>⚡ Bắn thử mẫu này về Gmail ngay</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
