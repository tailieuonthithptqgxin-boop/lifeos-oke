import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  ShieldAlert,
  Radio,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  MessageCircle,
  Calendar,
  Smartphone,
  Trash2,
  ExternalLink,
  Loader2,
  Key,
  Globe,
  Copy,
  Check,
  Zap,
  Filter
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';

interface UserChannelStatus {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  webPushDevices: Array<{
    id: string;
    endpoint: string;
    userAgent: string | null;
    deviceType: string | null;
    createdAt: string;
  }>;
  hasCalendar: boolean;
  calendarToken: string;
  messengerConnected: boolean;
  messengerPsid: string | null;
  messengerConnectedAt: string | null;
  channels: {
    webPush: boolean;
    messenger: boolean;
    calendar: boolean;
  };
}

interface NotificationLogItem {
  id: string;
  userId?: string | null;
  channel: string;
  title: string;
  body: string;
  url?: string | null;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errorMessage?: string | null;
  targetCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  retriedAt?: string | null;
}

interface HealthCheckResult {
  service: string;
  host: string;
  status: 'ok' | 'error';
  latencyMs: number;
  error?: string;
}

export function AdminNotificationCenter() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'users' | 'logs_health'>('broadcast');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // TAB 1: BROADCAST STATE
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'PRO' | 'TEAM' | 'SINGLE'>('ALL');
  const [targetUserId, setTargetUserId] = useState('');
  const [broadcastWebPush, setBroadcastWebPush] = useState(true);
  const [broadcastMessenger, setBroadcastMessenger] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any>(null);

  // TAB 2: USERS STATUS STATE
  const [usersList, setUsersList] = useState<UserChannelStatus[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [pingingUserId, setPingingUserId] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);

  // TAB 3: LOGS & HEALTH STATE
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Facebook Config in Admin
  const [fbConfig, setFbConfig] = useState({
    pageId: '',
    pageAccessToken: '',
    appSecret: '',
    verifyToken: 'lifeos_messenger_verify_2026',
    webhookUrl: ''
  });
  const [isSavingFbConfig, setIsSavingFbConfig] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    fetchUsersStatus();
    fetchLogs();
    fetchHealthCheck();
    fetchFbConfig();
  }, []);

  const fetchUsersStatus = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await apiCall('/api/admin/notifications/users-status');
      if (res && res.success) {
        setUsersList(res.users || []);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách thiết bị user:', err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const res = await apiCall('/api/admin/notifications/logs');
      if (res && res.success) {
        setLogs(res.logs || []);
      }
    } catch (err: any) {
      console.warn('Lỗi tải logs thông báo:', err.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchHealthCheck = async () => {
    try {
      setIsLoadingHealth(true);
      const res = await apiCall('/api/admin/notifications/health-check');
      if (res && res.success) {
        setHealthResults(res.results || []);
      }
    } catch (err: any) {
      console.warn('Lỗi kiểm tra cổng 443:', err.message);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const fetchFbConfig = async () => {
    try {
      const res = await apiCall('/api/admin/notifications/fb-config');
      if (res && res.success) {
        setFbConfig({
          pageId: res.pageId || '',
          pageAccessToken: res.pageAccessToken || '',
          appSecret: res.appSecret || '',
          verifyToken: res.verifyToken || 'lifeos_messenger_verify_2026',
          webhookUrl: res.webhookUrl || ''
        });
      }
    } catch (e) {
      // ignore
    }
  };

  // Broadcast Notification
  const handleBroadcast = async (isTestSelf: boolean = false) => {
    if (!title.trim() || !body.trim()) {
      setMessage({ text: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.', type: 'error' });
      return;
    }

    if (!broadcastWebPush && !broadcastMessenger) {
      setMessage({ text: 'Vui lòng chọn ít nhất 1 kênh phát (Web Push hoặc Messenger).', type: 'error' });
      return;
    }

    try {
      if (isTestSelf) {
        setIsTestSending(true);
      } else {
        setIsBroadcasting(true);
      }

      const res = await apiCall('/api/admin/notifications/broadcast', 'POST', {
        targetAudience: isTestSelf ? 'ADMIN_SELF' : targetAudience,
        targetUserId: isTestSelf ? undefined : (targetAudience === 'SINGLE' ? targetUserId : undefined),
        channels: {
          webPush: broadcastWebPush,
          messenger: broadcastMessenger
        },
        title,
        body,
        url
      });

      if (res && res.success) {
        setBroadcastResult(res);
        setMessage({
          text: `🎉 ${isTestSelf ? 'Đã bắn thử thông báo cho Admin' : 'Đã phát sóng thông báo thành công'}! Đạt ${res.totalSuccess || 0} lượt gửi thành công qua HTTPS 443.`,
          type: 'success'
        });
        fetchLogs();
      } else {
        throw new Error(res?.message || 'Lỗi phát thông báo');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi phát thông báo: ' + err.message, type: 'error' });
    } finally {
      setIsBroadcasting(false);
      setIsTestSending(false);
    }
  };

  // Ping a specific user
  const handlePingUser = async (userId: string) => {
    try {
      setPingingUserId(userId);
      const res = await apiCall(`/api/admin/notifications/ping/${userId}`, 'POST');
      if (res && res.success) {
        setMessage({
          text: `🔔 Đã gửi tín hiệu Ping kiểm tra đến người dùng! Web Push: ${res.webPushSuccess ? 'Thành công' : 'Không có thiết bị'}; Messenger: ${res.messengerSuccess ? 'Thành công' : 'Chưa liên kết'}.`,
          type: 'success'
        });
        fetchLogs();
      } else {
        throw new Error(res?.message || 'Không thể ping user');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi ping user: ' + err.message, type: 'error' });
    } finally {
      setPingingUserId(null);
    }
  };

  // Delete dead device
  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('Xóa subscription của thiết bị này? Người dùng sẽ cần đăng ký lại nếu muốn nhận thông báo trên máy này.')) {
      return;
    }
    try {
      setDeletingDeviceId(deviceId);
      const res = await apiCall(`/api/admin/notifications/devices/${deviceId}`, 'DELETE');
      if (res && res.success) {
        setMessage({ text: 'Đã xóa thiết bị thành công!', type: 'success' });
        fetchUsersStatus();
      } else {
        throw new Error(res?.message || 'Không thể xóa');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi xóa thiết bị: ' + err.message, type: 'error' });
    } finally {
      setDeletingDeviceId(null);
    }
  };

  // Trigger manual cron sweep
  const handleRunCron = async () => {
    try {
      setIsRunningCron(true);
      const res = await apiCall('/api/admin/notifications/run-cron', 'POST');
      if (res && res.success) {
        setMessage({
          text: `⚡ Đã kích hoạt quét Cronjob thành công! Quét được: ${res.scanned?.tasks || 0} công việc, ${res.scanned?.calendarEvents || 0} sự kiện lịch, đã gửi ${res.sentCount || 0} thông báo.`,
          type: 'success'
        });
        fetchLogs();
      } else {
        throw new Error(res?.message || 'Lỗi quét cron');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi chạy quét cron: ' + err.message, type: 'error' });
    } finally {
      setIsRunningCron(false);
    }
  };

  // Retry failed log
  const handleRetryLog = async (logId: string) => {
    try {
      setRetryingLogId(logId);
      const res = await apiCall(`/api/admin/notifications/retry/${logId}`, 'POST');
      if (res && res.success) {
        setMessage({ text: 'Đã gửi lại thông báo thành công!', type: 'success' });
        fetchLogs();
      } else {
        throw new Error(res?.message || 'Lỗi gửi lại');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi gửi lại: ' + err.message, type: 'error' });
    } finally {
      setRetryingLogId(null);
    }
  };

  // Save Facebook Config
  const handleSaveFbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingFbConfig(true);
      const res = await apiCall('/api/admin/notifications/fb-config', 'PUT', fbConfig);
      if (res && res.success) {
        setMessage({ text: 'Đã cập nhật cấu hình Facebook Messenger Bot thành công!', type: 'success' });
      } else {
        throw new Error(res?.message || 'Không thể lưu cấu hình');
      }
    } catch (err: any) {
      setMessage({ text: 'Lỗi lưu cấu hình FB: ' + err.message, type: 'error' });
    } finally {
      setIsSavingFbConfig(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!fbConfig.webhookUrl) return;
    navigator.clipboard.writeText(fbConfig.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Alert message */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'broadcast'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>1. Phát Thông Báo Hàng Loạt (Broadcast)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Quản Lý Thiết Bị & Kênh User</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs_health')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs_health'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Kiểm Tra Cổng 443 & Lịch Sử Gửi</span>
        </button>
      </div>

      {/* TAB 1: BROADCAST & DIRECT PUSH */}
      {activeTab === 'broadcast' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              <span>Phát Thông Báo Đa Kênh (Web Push PWA & Facebook Messenger)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống sử dụng kết nối bảo mật HTTPS (Port 443) tới Google FCM, Apple Push Service và Facebook Graph API. Không phụ thuộc cổng SMTP.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Audience Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Đối tượng nhận thông báo (Target Audience)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ALL', label: 'Tất cả thành viên' },
                    { id: 'PRO', label: 'Chỉ gói PRO' },
                    { id: 'TEAM', label: 'Chỉ gói TEAM' },
                    { id: 'SINGLE', label: '1 User cụ thể' }
                  ].map((aud) => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTargetAudience(aud.id as any)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        targetAudience === aud.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>

              {targetAudience === 'SINGLE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chọn người dùng mục tiêu (User ID hoặc Email)
                  </label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) — Gói {u.plan} [{u.webPushDevices.length} thiết bị Web Push]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Channels checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kênh phân phối (HTTPS Port 443)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastWebPush}
                      onChange={(e) => setBroadcastWebPush(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span className="text-xs font-semibold">Web Push PWA (Màn hình khóa)</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastMessenger}
                      onChange={(e) => setBroadcastMessenger(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm"
                    />
                    <span className="text-xs font-semibold">Facebook Messenger (Graph API)</span>
                  </label>
                </div>
              </div>

              {/* Title & Body Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tiêu đề thông báo
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: ⚡ Nâng cấp tính năng mới / Nhắc nhở hạn nộp..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nội dung thông điệp
                  </label>
                  <textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Nhập nội dung ngắn gọn, kích thích hành động..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đường dẫn liên kết khi nhấn vào (Action URL)
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleBroadcast(true)}
                  disabled={isTestSending || isBroadcasting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                  <span>Bắn thử cho Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBroadcast(false)}
                  disabled={isBroadcasting || isTestSending}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                  <span>Phát Thông Báo Ngay</span>
                </button>
              </div>
            </div>

            {/* Broadcast Live Preview Box */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Xem trước thông báo (Mobile Preview)</p>
                
                {/* Mock Lock-screen Notification Box */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">L</div>
                      <span>LIFE OS</span>
                    </div>
                    <span>vừa xong</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {title || 'Tiêu đề thông báo mẫu'}
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-3">
                      {body || 'Nội dung thông báo sẽ xuất hiện trên màn hình khóa của thiết bị người dùng...'}
                    </p>
                  </div>
                </div>

                {broadcastResult && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                    <p className="font-bold">Kết quả phát gần nhất:</p>
                    <p>• Web Push: {broadcastResult.webPush?.sent || 0} thành công / {broadcastResult.webPush?.failed || 0} lỗi</p>
                    <p>• Messenger: {broadcastResult.messenger?.sent || 0} thành công / {broadcastResult.messenger?.failed || 0} lỗi</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS STATUS */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Trạng Thái Đăng Ký Kênh Của Người Dùng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi thiết bị Web Push đã lưu, trạng thái kết nối Messenger PSID và Token Lịch .ics của từng user.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên hoặc email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={fetchUsersStatus}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Tải lại"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="pb-3 pl-2">Người dùng</th>
                  <th className="pb-3">Gói</th>
                  <th className="pb-3">Web Push (Thiết bị)</th>
                  <th className="pb-3">Facebook Messenger</th>
                  <th className="pb-3">Lịch .ics</th>
                  <th className="pb-3 pr-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Đang tải danh sách thiết bị người dùng...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3">
                        {u.webPushDevices.length > 0 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <Smartphone className="w-3 h-3" />
                              <span>{u.webPushDevices.length} thiết bị</span>
                            </span>
                            {u.webPushDevices.map((d) => (
                              <div key={d.id} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <span className="truncate max-w-[120px]">{d.userAgent || 'Thiết bị'}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDevice(d.id)}
                                  className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                  title="Xóa thiết bị lỗi"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Chưa có thiết bị</span>
                        )}
                      </td>
                      <td className="py-3">
                        {u.messengerConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                            <MessageCircle className="w-3 h-3" />
                            <span>Đã kết nối PSID</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa liên kết</span>
                        )}
                      </td>
                      <td className="py-3">
                        {u.hasCalendar ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            <Calendar className="w-3 h-3" />
                            <span>Active Token</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa tạo link</span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => handlePingUser(u.id)}
                          disabled={pingingUserId === u.id}
                          className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {pingingUserId === u.id ? 'Đang ping...' : 'Ping Test'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HEALTH CHECK & LOGS & FB CONFIG */}
      {activeTab === 'logs_health' && (
        <div className="space-y-6">
          {/* HTTPS Port 443 Connectivity Diagnostic */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span>Kiểm Tra Kết Nối Cổng 443 (HTTPS Health Check)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đo lường độ trễ mạng trực tiếp từ máy chủ Railway tới các đầu mối thông báo qua cổng chuẩn 443.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunCron}
                  disabled={isRunningCron}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isRunningCron ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Chạy Quét Nhắc Việc Ngay</span>
                </button>

                <button
                  type="button"
                  onClick={fetchHealthCheck}
                  disabled={isLoadingHealth}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin' : ''}`} />
                  <span>Kiểm tra cổng 443</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {healthResults.length === 0 ? (
                <div className="col-span-3 py-4 text-center text-xs text-slate-500">
                  Nhấn "Kiểm tra cổng 443" để bắt đầu chuẩn đoán kết nối...
                </div>
              ) : (
                healthResults.map((h, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{h.service}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        h.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {h.status === 'ok' ? 'ONLINE (443)' : 'ERROR'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">{h.host}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">Độ trễ:</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{h.latencyMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Facebook Messenger Settings Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-sky-600" />
              <span>Cấu Hình Facebook Messenger Bot (Meta Graph API)</span>
            </h3>

            <form onSubmit={handleSaveFbConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Facebook Page ID
                  </label>
                  <input
                    type="text"
                    value={fbConfig.pageId}
                    onChange={(e) => setFbConfig({ ...fbConfig, pageId: e.target.value })}
                    placeholder="VD: 104829102910..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Webhook Verify Token (Tự đặt)
                  </label>
                  <input
                    type="text"
                    value={fbConfig.verifyToken}
                    onChange={(e) => setFbConfig({ ...fbConfig, verifyToken: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Page Access Token (Kéo dài vĩnh viễn từ Meta Developer)
                </label>
                <input
                  type="password"
                  value={fbConfig.pageAccessToken}
                  onChange={(e) => setFbConfig({ ...fbConfig, pageAccessToken: e.target.value })}
                  placeholder="EAA..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              {/* Webhook Callback URL display */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Webhook Callback URL (Điền vào trang Meta for Developers)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fbConfig.webhookUrl || `${window.location.origin}/api/notifications/messenger/webhook`}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingFbConfig}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingFbConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>Lưu Cấu Hình Messenger</span>
                </button>
              </div>
            </form>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span>Nhật Ký Thông Báo Gần Nhất (Notification Delivery Logs)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ kết quả truyền tải thực tế, tỷ lệ thành công và các mã lỗi từ Push Service.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLogs}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="pb-3 pl-2">Thời gian</th>
                    <th className="pb-3">Kênh</th>
                    <th className="pb-3">Tiêu đề & Nội dung</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pb-3">Tỷ lệ phát</th>
                    <th className="pb-3 pr-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                        Đang tải nhật ký...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Chưa có lịch sử thông báo nào.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 pl-2 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.channel === 'WEB_PUSH'
                              ? 'bg-emerald-100 text-emerald-700'
                              : log.channel === 'MESSENGER'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {log.channel}
                          </span>
                        </td>
                        <td className="py-3 max-w-[280px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{log.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{log.body}</div>
                          {log.errorMessage && (
                            <div className="text-[10px] text-rose-500 truncate mt-0.5">{log.errorMessage}</div>
                          )}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-700'
                              : log.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-[11px]">
                          {log.successCount}/{log.targetCount}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRetryLog(log.id)}
                            disabled={retryingLogId === log.id}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold cursor-pointer"
                          >
                            {retryingLogId === log.id ? 'Đang gửi...' : 'Gửi lại'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminNotificationCenter;
