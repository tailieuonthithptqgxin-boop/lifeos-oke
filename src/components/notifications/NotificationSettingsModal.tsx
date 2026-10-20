import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Shield,
  Clock,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Send,
  Sliders,
  Moon,
  Globe,
  History,
  Check,
  AlertCircle,
  RefreshCw,
  LogOut,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const { currentUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'gmail' | 'general' | 'rules' | 'history'>('gmail');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // General & Preferences State
  const [preferences, setPreferences] = useState({
    enabled: true,
    inAppEnabled: true,
    emailEnabled: true,
    timezone: 'Asia/Ho_Chi_Minh',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    quietHoursBypassCritical: true,
    recipientEmail: ''
  });

  // Gmail OAuth Integration State
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean;
    connectedEmail?: string;
    hasRefreshToken?: boolean;
    expiresAt?: string;
    status?: string;
    scope?: string;
    oauthConfigured?: boolean;
  }>({ connected: false });

  // Test Email State
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [systemRules, setSystemRules] = useState<any[]>([]);

  // Delivery History Logs State
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);

  // Fetch current settings on modal open
  useEffect(() => {
    if (!isOpen) return;

    loadSettings();

    // Listen for OAuth completion message from popup window
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_OAUTH_SUCCESS') {
        toast.success(`Kết nối Gmail thành công: ${event.data.email || ''}`, 'Google OAuth 2.0');
        loadSettings();
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiCall<{
        success: boolean;
        preference: any;
        rules: any[];
        gmailStatus: any;
        systemRules: any[];
      }>('/api/notifications/settings', 'GET');

      if (res && res.success) {
        if (res.preference) {
          setPreferences({
            enabled: res.preference.enabled ?? true,
            inAppEnabled: res.preference.inAppEnabled ?? true,
            emailEnabled: res.preference.emailEnabled ?? true,
            timezone: res.preference.timezone || 'Asia/Ho_Chi_Minh',
            quietHoursEnabled: res.preference.quietHoursEnabled ?? false,
            quietHoursStart: res.preference.quietHoursStart || '22:00',
            quietHoursEnd: res.preference.quietHoursEnd || '07:00',
            quietHoursBypassCritical: res.preference.quietHoursBypassCritical ?? true,
            recipientEmail: res.preference.recipientEmail || ''
          });
          setTestTargetEmail(res.preference.recipientEmail || currentUser?.email || '');
        } else {
          setTestTargetEmail(currentUser?.email || '');
        }

        if (res.gmailStatus) {
          setGmailStatus(res.gmailStatus);
        }

        if (res.rules) {
          setRules(res.rules);
        }

        if (res.systemRules) {
          setSystemRules(res.systemRules);
        }
      }
    } catch (err: any) {
      console.error('Failed to load notification settings:', err);
      toast.error('Không thể tải cấu hình thông báo: ' + (err.message || ''), 'Lỗi');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeliveries = async () => {
    setIsLoadingDeliveries(true);
    try {
      const res = await apiCall<{ success: boolean; deliveries: any[] }>('/api/notifications/deliveries', 'GET');
      if (res && res.success) {
        setDeliveries(res.deliveries || []);
      }
    } catch (err: any) {
      toast.error('Không thể tải lịch sử gửi thông báo: ' + (err.message || ''), 'Lỗi');
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  // Connect Gmail via Google OAuth 2.0 Popup
  const handleConnectGmail = async () => {
    try {
      const res = await apiCall<{ success: boolean; url?: string; message?: string }>(
        '/api/notifications/gmail/auth-url',
        'GET'
      );

      if (res && res.success && res.url) {
        const width = 520;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          res.url,
          'google_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
        );

        if (!popup) {
          toast.warn('Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up và thử lại!', 'Cảnh báo');
          window.location.href = res.url;
        } else {
          toast.info('Đang mở cửa sổ đăng nhập Google...', 'Google OAuth 2.0');
        }
      } else {
        toast.error(res.message || 'Chưa cấu hình GOOGLE_CLIENT_ID trên server.', 'Lỗi xác thực');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo phiên kết nối Google.', 'Lỗi');
    }
  };

  // Disconnect Gmail
  const handleDisconnectGmail = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn ngắt kết nối tài khoản Gmail này khỏi LifeOS?')) {
      return;
    }
    try {
      const res = await apiCall<{ success: boolean; message: string }>(
        '/api/notifications/gmail/disconnect',
        'POST'
      );
      if (res && res.success) {
        toast.success('Đã ngắt kết nối Gmail thành công.', 'Thông báo');
        loadSettings();
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể ngắt kết nối Gmail.', 'Lỗi');
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const res = await apiCall<{ success: boolean; message: string; details?: any }>(
        '/api/notifications/test-email',
        'POST',
        { targetEmail: testTargetEmail.trim() || undefined }
      );
      if (res && res.success) {
        toast.success(res.message || 'Email thử nghiệm đã được gửi thành công!', 'Gửi Email');
      } else {
        toast.error(res.message || 'Không thể gửi email thử nghiệm.', 'Lỗi gửi mail');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi email thử nghiệm. Vui lòng kiểm tra cấu hình.', 'Lỗi');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Save General Preferences
  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const res = await apiCall<{ success: boolean; message: string; preference: any }>(
        '/api/notifications/settings',
        'PUT',
        preferences
      );
      if (res && res.success) {
        toast.success('Đã lưu cấu hình thông báo thành công!', 'Cài đặt');
      } else {
        toast.error(res.message || 'Không thể lưu cài đặt.', 'Lỗi');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu cấu hình.', 'Lỗi');
    } finally {
      setIsSaving(false);
    }
  };

  // Update Single Rule
  const handleUpdateRule = async (eventType: string, updates: Partial<any>) => {
    const existingRule = rules.find(r => r.eventType === eventType);
    const systemDefault = systemRules.find(r => r.eventType === eventType);

    const newRule = {
      eventType,
      enabled: updates.enabled !== undefined ? updates.enabled : (existingRule?.enabled ?? systemDefault?.enabled ?? true),
      timingOffsetMinutes: updates.timingOffsetMinutes !== undefined ? updates.timingOffsetMinutes : (existingRule?.timingOffsetMinutes ?? systemDefault?.timingOffsetMinutes ?? 15),
      priority: updates.priority || existingRule?.priority || systemDefault?.priority || 'NORMAL',
      channels: updates.channels || existingRule?.channels || systemDefault?.channels || ['IN_APP', 'EMAIL']
    };

    // Optimistic UI update
    setRules(prev => {
      const filtered = prev.filter(r => r.eventType !== eventType);
      return [...filtered, newRule];
    });

    try {
      const res = await apiCall<{ success: boolean; rule: any }>(
        '/api/notifications/rules',
        'PUT',
        newRule
      );
      if (res && res.success) {
        toast.success(`Đã cập nhật quy tắc: ${systemDefault?.name || eventType}`, 'Quy tắc thông báo');
      }
    } catch (err: any) {
      toast.error('Không thể lưu quy tắc: ' + (err.message || ''), 'Lỗi');
      loadSettings(); // revert
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Cài Đặt Hệ Thống Thông Báo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                  Automation Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cấu hình kết nối Gmail, thời gian biểu thông báo tự động và giờ yên tĩnh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSettings}
              disabled={isLoading}
              title="Làm mới cài đặt"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gmail')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'gmail'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Kênh Email & Gmail OAuth</span>
            {gmailStatus.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Chung & Giờ Yên Tĩnh</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'rules'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Quy Tắc Sự Kiện (14 Sự Kiện)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadDeliveries();
            }}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch Sử Gửi (Logs)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: GMAIL & EMAIL INTEGRATION */}
          {activeTab === 'gmail' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* OAuth Connection Status Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs shrink-0">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          Tích hợp Hộp thư Google (Gmail OAuth 2.0)
                        </h3>
                        {gmailStatus.connected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                            Đã liên kết
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Chưa kết nối
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {gmailStatus.connected
                          ? `Hệ thống tự động sử dụng tài khoản ${gmailStatus.connectedEmail} để gửi email nhắc việc và lịch trình.`
                          : 'Kết nối tài khoản cá nhân thông qua chuẩn OAuth 2.0 bảo mật. Tuyệt đối không cần nhập mật khẩu hay lo lộ thông tin.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {gmailStatus.connected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectGmail}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Ngắt kết nối</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                        </svg>
                        <span>Kết nối với Google</span>
                      </button>
                    )}
                  </div>
                </div>

                {gmailStatus.connected && (
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Hộp thư gửi</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                        {gmailStatus.connectedEmail}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Trạng thái Token</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tự động làm mới (Active)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block font-medium">Quyền hạn (Scope)</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 block mt-0.5 truncate" title={gmailStatus.scope}>
                        gmail.send, userinfo.email
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Email Section */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Kiểm Tra & Gửi Thử Nghiệm Email
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nhập địa chỉ email để hệ thống gửi ngay 1 mẫu email thông báo LifeOS (Bento HTML design responsive). 
                  Nếu bạn chưa kết nối Gmail cá nhân, hệ thống sẽ sử dụng mailer dự phòng của máy chủ (nếu đã cấu hình SMTP).
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={testTargetEmail}
                      onChange={(e) => setTestTargetEmail(e.target.value)}
                      placeholder="vd: tenban@gmail.com"
                      className="w-full h-10 pl-9 pr-3.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="h-10 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isSendingTest ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi Mail Test Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Information Note */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold block">Chính sách bảo mật & phân quyền:</span>
                  <p>
                    Hệ thống chỉ yêu cầu quyền <code className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">https://www.googleapis.com/auth/gmail.send</code> để gửi thông báo nhắc lịch và deadline. LifeOS tuyệt đối không có quyền đọc email, xóa thư hay xem bất kỳ nội dung cá nhân nào trong hộp thư của bạn.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL & QUIET HOURS */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* Channel Master Toggles */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Kênh Nhận Thông Báo Chính</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.enabled}
                      onChange={(e) => setPreferences(p => ({ ...p, enabled: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Bật Hệ Thống (Master)
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Cho phép hệ thống tự động quét và kích hoạt thông báo
                      </span>
                    </div>
                  </label>

                  <label className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.inAppEnabled}
                      onChange={(e) => setPreferences(p => ({ ...p, inAppEnabled: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Thông Báo Trong Web
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Hiển thị tại thanh chuông TopBar & Trung tâm Thông báo
                      </span>
                    </div>
                  </label>

                  <label className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 cursor-pointer hover:border-emerald-500/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.emailEnabled}
                      onChange={(e) => setPreferences(p => ({ ...p, emailEnabled: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Thông Báo Qua Email / Gmail
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Gửi email tự động khi có sự kiện hoặc deadline quan trọng
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Timezone & Recipient Email */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Múi Giờ Của Bạn (Timezone)</span>
                  </label>
                  <select
                    value={preferences.timezone}
                    onChange={(e) => setPreferences(p => ({ ...p, timezone: e.target.value }))}
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Asia/Ho_Chi_Minh">Việt Nam / Bangkok / Jakarta (GMT+7)</option>
                    <option value="Asia/Tokyo">Nhật Bản / Hàn Quốc (GMT+9)</option>
                    <option value="Asia/Singapore">Singapore / Malaysia (GMT+8)</option>
                    <option value="Europe/London">London / GMT (GMT+0 / BST)</option>
                    <option value="America/New_York">New York / Eastern Time (GMT-5 / EDT)</option>
                    <option value="America/Los_Angeles">San Francisco / Pacific (GMT-8 / PDT)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                  </select>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Dùng để tính toán chính xác giờ yên tĩnh và thời điểm gửi email
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Người Nhận (Tùy chọn ghi đè)</span>
                  </label>
                  <input
                    type="email"
                    value={preferences.recipientEmail}
                    onChange={(e) => setPreferences(p => ({ ...p, recipientEmail: e.target.value }))}
                    placeholder={currentUser?.email || 'Mặc định dùng email đăng nhập'}
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Để trống nếu muốn gửi về tài khoản đăng nhập của bạn ({currentUser?.email})
                  </span>
                </div>
              </div>

              {/* Quiet Hours Section */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Giờ Yên Tĩnh (Quiet Hours / Do Not Disturb)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tạm dừng gửi email trong khung giờ ngủ hoặc nghỉ ngơi để tránh làm phiền
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) => setPreferences(p => ({ ...p, quietHoursEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Bắt đầu từ (Start)
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHoursStart}
                          onChange={(e) => setPreferences(p => ({ ...p, quietHoursStart: e.target.value }))}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Kết thúc lúc (End)
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHoursEnd}
                          onChange={(e) => setPreferences(p => ({ ...p, quietHoursEnd: e.target.value }))}
                          className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.quietHoursBypassCritical}
                        onChange={(e) => setPreferences(p => ({ ...p, quietHoursBypassCritical: e.target.checked }))}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Vẫn cho phép gửi thông báo <strong>KHẨN CẤP (Critical)</strong> ngay trong giờ yên tĩnh (sự kiện lịch sắp diễn ra, quá hạn quan trọng)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Save Preferences Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu Cài Đặt Chung</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATION RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Ma Trận Quy Tắc Thông Báo Tự Động
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tùy chỉnh thời điểm kích hoạt, mức độ ưu tiên và kênh gửi cho từng loại sự kiện
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {systemRules.map((sRule) => {
                  const userRule = rules.find(r => r.eventType === sRule.eventType);
                  const isEnabled = userRule ? userRule.enabled : sRule.enabled;
                  const offset = userRule ? userRule.timingOffsetMinutes : sRule.timingOffsetMinutes;
                  const priority = userRule ? userRule.priority : sRule.priority;

                  return (
                    <div
                      key={sRule.eventType}
                      className={`p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isEnabled ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/70 dark:bg-slate-900/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleUpdateRule(sRule.eventType, { enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {sRule.name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                              priority === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                              priority === 'IMPORTANT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {sRule.eventType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {sRule.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                        {/* Timing Offset Dropdown (only if event supports timing) */}
                        {sRule.eventType.includes('UPCOMING') || sRule.eventType.includes('APPROACHING') ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <select
                              value={offset}
                              onChange={(e) => handleUpdateRule(sRule.eventType, { timingOffsetMinutes: parseInt(e.target.value) })}
                              className="h-8 px-2 text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                            >
                              <option value="5">Trước 5 phút</option>
                              <option value="10">Trước 10 phút</option>
                              <option value="15">Trước 15 phút</option>
                              <option value="30">Trước 30 phút</option>
                              <option value="60">Trước 1 giờ</option>
                              <option value="120">Trước 2 giờ</option>
                              <option value="1440">Trước 1 ngày</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                            Ngay lập tức
                          </span>
                        )}

                        {/* Priority Selector */}
                        <select
                          value={priority}
                          onChange={(e) => handleUpdateRule(sRule.eventType, { priority: e.target.value })}
                          className="h-8 px-2 text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                        >
                          <option value="LOW">Thấp (Low)</option>
                          <option value="NORMAL">Bình thường</option>
                          <option value="IMPORTANT">Quan trọng</option>
                          <option value="CRITICAL">Khẩn cấp (Critical)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DELIVERY HISTORY LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Nhật Ký & Lịch Sử Gửi Thông Báo (Delivery Logs)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Theo dõi trạng thái gửi qua từng kênh (Web In-App & Email/Gmail) và mã Idempotency chống trùng lặp
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDeliveries}
                  disabled={isLoadingDeliveries}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeliveries ? 'animate-spin' : ''}`} />
                  <span>Làm mới logs</span>
                </button>
              </div>

              {deliveries.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Chưa có lịch sử gửi thông báo tự động nào được ghi nhận.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Sự Kiện & Tiêu Đề</th>
                        <th className="p-3">Kênh</th>
                        <th className="p-3">Trạng Thái</th>
                        <th className="p-3">Thời Điểm</th>
                        <th className="p-3">Chi Tiết / Lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {deliveries.map((del) => {
                        return (
                          <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {del.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {del.eventType}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                del.channel === 'EMAIL'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}>
                                {del.channel === 'EMAIL' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                                {del.channel}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                del.status === 'SENT'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : del.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : del.status === 'RETRYING'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {del.status === 'SENT' && <CheckCircle2 className="w-3 h-3" />}
                                {del.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                {del.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                                {del.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                              {del.sentAt ? new Date(del.sentAt).toLocaleString('vi-VN') : new Date(del.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate" title={del.lastError || del.idempotencyKey}>
                              {del.lastError ? (
                                <span className="text-rose-500 font-semibold">{del.lastError}</span>
                              ) : (
                                <span className="text-slate-400 font-mono text-[10px]">{del.idempotencyKey}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đồng bộ theo thời gian thực (60s tick) & Cơ chế Idempotency chống gửi lặp</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
