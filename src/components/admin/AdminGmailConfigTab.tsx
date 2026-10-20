import React, { useState, useEffect } from 'react';
import { 
  Mail, RefreshCw, Check, Send, BellRing, CheckCircle2, 
  AlertCircle, KeyRound, History, CheckCheck, Eye, EyeOff, Server, 
  ShieldCheck, RotateCw, Trash2, Clock, Inbox, AlertTriangle, Layers,
  ExternalLink, Search, Filter
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { GmailConfig } from './types';

interface AdminGmailConfigTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export interface EmailQueueItem {
  id: string;
  recipient: string;
  subject: string;
  htmlBody: string;
  eventType: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  metadata: string | null;
  createdAt: string;
  sentAt: string | null;
}

export function AdminGmailConfigTab({ onShowMessage }: AdminGmailConfigTabProps) {
  const [activeSubView, setActiveSubView] = useState<'settings' | 'queue'>('settings');

  // SMTP Settings State
  const [gmailConfig, setGmailConfig] = useState<GmailConfig>({
    enabled: false,
    serviceType: 'gmail',
    user: '',
    appPassword: '',
    fromName: 'Life OS Notification Assistant',
    fromEmail: '',
    replyTo: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    notifyTaskOverdue: true,
    notifyTaskUpcoming: true,
    notifyCalendarUpcoming: true,
    notifyBudgetThreshold: true,
    notifySubscriptionExpiry: true,
    notifyPaymentStatus: true,
    notifySecurityAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    maxRemindersPerDay: 5
  });

  const [isLoadingGmailConfig, setIsLoadingGmailConfig] = useState(false);
  const [isSavingGmailConfig, setIsSavingGmailConfig] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Outbox Queue State
  const [queueItems, setQueueItems] = useState<EmailQueueItem[]>([]);
  const [queueStats, setQueueStats] = useState({ total: 0, pending: 0, processing: 0, sent: 0, failed: 0 });
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('ALL');
  const [queueSearch, setQueueSearch] = useState<string>('');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<EmailQueueItem | null>(null);

  const fetchGmailConfig = async () => {
    try {
      setIsLoadingGmailConfig(true);
      const res = await apiCall('/api/admin/gmail/config');
      if (res && res.success && res.config) {
        setGmailConfig(res.config);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải cấu hình Gmail:', err);
    } finally {
      setIsLoadingGmailConfig(false);
    }
  };

  const fetchQueueData = async () => {
    try {
      setIsLoadingQueue(true);
      const [itemsRes, statsRes] = await Promise.all([
        apiCall(`/api/admin/email-queue?status=${queueStatusFilter}&search=${encodeURIComponent(queueSearch)}`),
        apiCall('/api/admin/email-queue/stats')
      ]);

      if (itemsRes && itemsRes.success) {
        setQueueItems(itemsRes.items || []);
      }
      if (statsRes && statsRes.success && statsRes.stats) {
        setQueueStats(statsRes.stats);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải hàng đợi email:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    fetchGmailConfig();
    fetchQueueData();
    const interval = setInterval(() => {
      fetchQueueData();
    }, 20000); // Polling every 20s
    return () => clearInterval(interval);
  }, [queueStatusFilter]);

  const handleSaveGmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gmailConfig.enabled) {
      if (gmailConfig.serviceType === 'resend') {
        const key = gmailConfig.apiKey || gmailConfig.appPassword;
        if (!key || !key.trim()) {
          onShowMessage?.({ text: 'Vui lòng nhập Resend API Key (ví dụ: re_xxxx...)', type: 'error' });
          return;
        }
      } else {
        if (!gmailConfig.user || !gmailConfig.user.includes('@')) {
          onShowMessage?.({ text: 'Vui lòng nhập địa chỉ email người gửi hợp lệ (có dấu @)', type: 'error' });
          return;
        }
        if (gmailConfig.serviceType === 'smtp') {
          if (!gmailConfig.smtpHost || !gmailConfig.smtpHost.trim()) {
            onShowMessage?.({ text: 'Vui lòng nhập địa chỉ máy chủ SMTP (SMTP Host)', type: 'error' });
            return;
          }
          const port = Number(gmailConfig.smtpPort);
          if (!port || port < 1 || port > 65535) {
            onShowMessage?.({ text: 'Cổng SMTP không hợp lệ (thường là 465 hoặc 587)', type: 'error' });
            return;
          }
        }
      }
    }

    try {
      setIsSavingGmailConfig(true);
      const res = await apiCall('/api/admin/gmail/config', 'PUT', gmailConfig);
      if (res && res.success) {
        setGmailConfig(res.config);
        onShowMessage?.({ text: 'Đã lưu cấu hình dịch vụ Email thành công!', type: 'success' });
      } else {
        throw new Error(res?.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi lưu cấu hình', type: 'error' });
    } finally {
      setIsSavingGmailConfig(false);
    }
  };

  const handleTestGmail = async () => {
    try {
      setIsTestingGmail(true);
      setTestResult(null);
      const res = await apiCall('/api/admin/email-queue/test', 'POST', {
        testEmail: testEmailAddress || undefined
      });
      if (res && res.success) {
        setTestResult({ success: true, message: res.message });
        onShowMessage?.({ text: 'Đã nạp email thử nghiệm vào hàng đợi Outbox Queue thành công!', type: 'success' });
        fetchQueueData();
      } else {
        setTestResult({ success: false, message: res?.message || 'Kiểm tra thất bại.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối' });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleRetryItem = async (id: string) => {
    try {
      setRetryingId(id);
      const res = await apiCall(`/api/admin/email-queue/${id}/retry`, 'POST');
      if (res && res.success) {
        onShowMessage?.({ text: 'Đã đưa email vào hàng đợi gửi lại ngay lập tức!', type: 'success' });
        await fetchQueueData();
      } else {
        throw new Error(res?.message || 'Không thể thử lại');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi thử gửi lại', type: 'error' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa email này khỏi hàng đợi?')) return;
    try {
      const res = await apiCall(`/api/admin/email-queue/${id}`, 'DELETE');
      if (res && res.success) {
        onShowMessage?.({ text: 'Đã xóa bản ghi email khỏi hàng đợi.', type: 'success' });
        await fetchQueueData();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi xóa', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Subview Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Hệ Thống Thông Báo Gmail & Outbox Queue Đảm Bảo 100%
              </h3>
              <p className="text-xs text-slate-500">
                Cơ chế Outbox Queue trong Database tự động thử lại (Exponential Backoff), chống rớt email khi mạng VPS lag hoặc khởi động lại.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubView('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubView === 'settings'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Cấu Hình SMTP & Provider</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubView('queue');
              fetchQueueData();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubView === 'queue'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-slate-200/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Hàng Đợi Outbox Queue</span>
            {queueStats.pending + queueStats.failed > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-600 text-white">
                {queueStats.pending + queueStats.failed}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: OUTBOX QUEUE MONITOR */}
      {activeSubView === 'queue' && (
        <div className="space-y-6">
          {/* 4 Bento Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Thông Báo</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{queueStats.total}</div>
              <p className="text-[11px] text-slate-500">Đã nạp vào hàng đợi hệ thống</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Đã Gửi Thành Công</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{queueStats.sent}</div>
              <p className="text-[11px] text-slate-500">Người nhận đã tiếp nhận thư</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Đang Chờ / Đang Thử Lại</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{queueStats.pending + queueStats.processing}</div>
              <p className="text-[11px] text-slate-500">Worker đang xử lý theo lịch</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Lỗi (Cần Thử Lại)</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{queueStats.failed}</div>
              <p className="text-[11px] text-slate-500">Vượt quá 5 lần thử</p>
            </div>
          </div>

          {/* Controls: Filter & Search */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchQueueData()}
                  placeholder="Tìm theo người nhận, tiêu đề, loại sự kiện..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <select
                value={queueStatusFilter}
                onChange={e => setQueueStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Đang chờ gửi (PENDING)</option>
                <option value="SENT">Đã gửi (SENT)</option>
                <option value="FAILED">Thất bại (FAILED)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchQueueData}
                disabled={isLoadingQueue}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                <span>Làm mới hàng đợi</span>
              </button>

              <button
                type="button"
                onClick={handleTestGmail}
                disabled={isTestingGmail}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Thử Nghiệm</span>
              </button>
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {queueItems.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hàng đợi đang trống</p>
                <p className="text-xs text-slate-400">Không có email nào đang chờ hoặc phù hợp với bộ lọc tìm kiếm.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Người nhận</th>
                      <th className="py-3 px-4">Sự kiện</th>
                      <th className="py-3 px-4">Tiêu đề email</th>
                      <th className="py-3 px-4 text-center">Thử lại</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {queueItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 shrink-0">
                          <div>{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</div>
                          <div className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {item.recipient}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                            {item.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate font-semibold text-slate-700 dark:text-slate-300">
                          <span 
                            onClick={() => setSelectedPreviewItem(item)}
                            className="cursor-pointer hover:text-rose-600 transition-colors"
                            title="Bấm để xem nội dung email"
                          >
                            {item.subject}
                          </span>
                          {item.lastError && (
                            <div className="text-[10px] text-rose-500 font-normal truncate mt-0.5" title={item.lastError}>
                              Lỗi: {item.lastError}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px]">
                          <span className={item.retryCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                            {item.retryCount}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              item.status === 'SENT'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60'
                                : item.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60'
                                : item.status === 'PROCESSING'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 animate-pulse'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60'
                            }`}
                          >
                            {item.status === 'SENT' && <CheckCheck className="w-3 h-3" />}
                            {item.status === 'PENDING' && <Clock className="w-3 h-3" />}
                            {item.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedPreviewItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Xem nội dung thư"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {(item.status === 'FAILED' || item.status === 'PENDING') && (
                              <button
                                type="button"
                                onClick={() => handleRetryItem(item.id)}
                                disabled={retryingId === item.id}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Gửi lại ngay"
                              >
                                <RotateCw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                                <span>Thử lại</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Xóa khỏi hàng đợi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: SMTP PROVIDER CONFIGURATION */}
      {activeSubView === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main SMTP Form (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <form onSubmit={handleSaveGmailConfig} className="space-y-5">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    Kích hoạt dịch vụ gửi Email thông báo
                  </span>
                  <p className="text-xs text-slate-500">
                    Bật để hệ thống tự động gửi thông báo qua Gmail/SMTP khi có sự kiện.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gmailConfig.enabled}
                    onChange={e => setGmailConfig({ ...gmailConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* Service Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Dịch vụ Email Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGmailConfig({ ...gmailConfig, serviceType: 'gmail', smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpSecure: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gmailConfig.serviceType === 'gmail'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Google Gmail
                  </button>

                  <button
                    type="button"
                    onClick={() => setGmailConfig({ ...gmailConfig, serviceType: 'resend', smtpHost: 'smtp.resend.com', smtpPort: 465, smtpSecure: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gmailConfig.serviceType === 'resend'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Resend API
                  </button>

                  <button
                    type="button"
                    onClick={() => setGmailConfig({ ...gmailConfig, serviceType: 'smtp' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gmailConfig.serviceType === 'smtp'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    SMTP Tùy Chỉnh
                  </button>
                </div>
              </div>

              {/* Sender Email & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Địa chỉ Email gửi (User)
                  </label>
                  <input
                    type="email"
                    value={gmailConfig.user}
                    onChange={e => setGmailConfig({ ...gmailConfig, user: e.target.value })}
                    placeholder="notifications@yourdomain.com"
                    required={gmailConfig.enabled}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tên hiển thị người gửi (From Name)
                  </label>
                  <input
                    type="text"
                    value={gmailConfig.fromName}
                    onChange={e => setGmailConfig({ ...gmailConfig, fromName: e.target.value })}
                    placeholder="LifeOS Assistant"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Password or API Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {gmailConfig.serviceType === 'resend' ? 'Resend API Key' : 'Mật khẩu ứng dụng Google (App Password)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={gmailConfig.appPassword}
                  onChange={e => setGmailConfig({ ...gmailConfig, appPassword: e.target.value })}
                  placeholder={gmailConfig.serviceType === 'resend' ? 're_123456789...' : 'xxxx xxxx xxxx xxxx'}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Custom SMTP host and port */}
              {gmailConfig.serviceType === 'smtp' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">SMTP Host</label>
                    <input
                      type="text"
                      value={gmailConfig.smtpHost}
                      onChange={e => setGmailConfig({ ...gmailConfig, smtpHost: e.target.value })}
                      placeholder="smtp.example.com"
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cổng (Port)</label>
                    <input
                      type="number"
                      value={gmailConfig.smtpPort}
                      onChange={e => setGmailConfig({ ...gmailConfig, smtpPort: parseInt(e.target.value, 10) || 465 })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingGmailConfig}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingGmailConfig ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Dịch Vụ Email'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Test SMTP & App Password Instructions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Test Email Box */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Kiểm tra kết nối & Gửi Email thử nghiệm
                </h4>
              </div>

              <p className="text-xs text-slate-500">
                Nhập email người nhận để gửi một thư thử nghiệm thông qua hàng đợi Outbox Queue và kiểm tra tính hợp lệ của SMTP.
              </p>

              <div className="space-y-3">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={e => setTestEmailAddress(e.target.value)}
                  placeholder="Nhập email nhận thử nghiệm (mặc định là admin)..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />

                <button
                  type="button"
                  onClick={handleTestGmail}
                  disabled={isTestingGmail || !gmailConfig.user}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BellRing className={`w-3.5 h-3.5 ${isTestingGmail ? 'animate-bounce' : ''}`} />
                  <span>{isTestingGmail ? 'Đang gửi thử nghiệm...' : 'Gửi Thử Nghiệm Ngay'}</span>
                </button>

                {testResult && (
                  <div
                    className={`p-3 rounded-2xl text-xs flex items-start gap-2 border ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong>{testResult.success ? 'Thành công:' : 'Thất bại:'}</strong> {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instruction Guide */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>Cách tạo App Password cho Gmail cá nhân:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
                <li>Truy cập <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">myaccount.google.com/security</a>.</li>
                <li>Bật <strong>Xác minh 2 bước (2-Step Verification)</strong>.</li>
                <li>Gõ vào thanh tìm kiếm từ khóa <strong>"Mật khẩu ứng dụng" (App Passwords)</strong>.</li>
                <li>Đặt tên ứng dụng (ví dụ: <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">LifeOS VPS</code>) rồi nhấn <strong>Tạo</strong>.</li>
                <li>Sao chép mã 16 ký tự và dán vào ô Mật khẩu ứng dụng bên trái.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Email Body Preview Modal */}
      {selectedPreviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {selectedPreviewItem.subject}
                </h4>
                <p className="text-xs text-slate-500">
                  Gửi tới: <strong>{selectedPreviewItem.recipient}</strong> • Sự kiện: <span className="font-mono">{selectedPreviewItem.eventType}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewItem(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950">
              <div 
                className="bg-white rounded-2xl shadow-xs overflow-hidden"
                dangerouslySetInnerHTML={{ __html: selectedPreviewItem.htmlBody }} 
              />

              {selectedPreviewItem.lastError && (
                <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <strong>Thông báo lỗi chi tiết:</strong>
                  <pre className="font-mono text-[11px] whitespace-pre-wrap">{selectedPreviewItem.lastError}</pre>
                </div>
              )}
            </div>

            <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <span className="text-xs text-slate-400">
                Lần thử: {selectedPreviewItem.retryCount}/5 • Trạng thái: {selectedPreviewItem.status}
              </span>
              <div className="flex items-center gap-2">
                {(selectedPreviewItem.status === 'FAILED' || selectedPreviewItem.status === 'PENDING') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRetryItem(selectedPreviewItem.id);
                      setSelectedPreviewItem(null);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Thử Lại Ngay
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPreviewItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
