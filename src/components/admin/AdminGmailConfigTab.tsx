import React, { useState, useEffect } from 'react';
import { 
  Mail, RefreshCw, Check, Send, BellRing, CheckCircle2, 
  AlertCircle, KeyRound, History, CheckCheck 
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { GmailConfig } from './types';

interface AdminGmailConfigTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminGmailConfigTab({ onShowMessage }: AdminGmailConfigTabProps) {
  const [gmailConfig, setGmailConfig] = useState<GmailConfig>({
    enabled: false,
    serviceType: 'gmail',
    user: '',
    appPassword: '',
    fromName: 'Life OS Notification Assistant',
    fromEmail: '',
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
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [gmailLogs, setGmailLogs] = useState<any[]>([]);
  const [isLoadingGmailLogs, setIsLoadingGmailLogs] = useState(false);

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

  const fetchGmailLogs = async () => {
    try {
      setIsLoadingGmailLogs(true);
      const res = await apiCall('/api/admin/gmail/logs');
      if (res && res.success && res.logs) {
        setGmailLogs(res.logs);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải nhật ký email:', err);
    } finally {
      setIsLoadingGmailLogs(false);
    }
  };

  useEffect(() => {
    fetchGmailConfig();
    fetchGmailLogs();
  }, []);

  const handleSaveGmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingGmailConfig(true);
      const res = await apiCall('/api/admin/gmail/config', 'PUT', gmailConfig);
      if (res && res.success) {
        onShowMessage?.({ text: 'Lưu cấu hình Gmail thành công!', type: 'success' });
        if (res.config) setGmailConfig(res.config);
      } else {
        onShowMessage?.({ text: res.message || 'Không thể lưu cấu hình Gmail', type: 'error' });
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi lưu cấu hình Gmail', type: 'error' });
    } finally {
      setIsSavingGmailConfig(false);
    }
  };

  const handleTestGmail = async () => {
    try {
      setIsTestingGmail(true);
      setTestResult(null);
      const res = await apiCall('/api/admin/gmail/test', 'POST', {
        testEmail: testEmailAddress.trim() || undefined
      });
      if (res) {
        setTestResult(res);
        if (res.success) {
          onShowMessage?.({ text: res.message, type: 'success' });
          fetchGmailLogs();
        } else {
          onShowMessage?.({ text: res.message, type: 'error' });
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối' });
      onShowMessage?.({ text: err.message || 'Lỗi kiểm tra kết nối', type: 'error' });
    } finally {
      setIsTestingGmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Info */}
      <div className="bg-linear-to-r from-rose-500/10 via-amber-500/10 to-blue-500/10 p-6 rounded-3xl border border-rose-200/50 dark:border-rose-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Cấu hình Gmail & Hệ thống Thông báo Tự động
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            Tự động gửi email qua Gmail SMTP khi nhiệm vụ quá hạn, cảnh báo vượt ngân sách tài chính, duyệt/từ chối đơn thanh toán, và khi gói dịch vụ hết hạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { fetchGmailConfig(); fetchGmailLogs(); }}
            disabled={isLoadingGmailConfig}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGmailConfig ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Settings (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <form onSubmit={handleSaveGmailConfig} className="space-y-5">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Bật gửi email thông báo qua Gmail
                </span>
                <span className="text-xs text-slate-500">
                  Khi bật, worker hệ thống và các luồng sự kiện sẽ gửi email trực tiếp qua Gmail.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gmailConfig.enabled}
                  onChange={e => setGmailConfig({ ...gmailConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Sender credentials */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Thông tin tài khoản gửi Gmail SMTP
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tài khoản Gmail (Email người gửi) *
                  </label>
                  <input
                    type="email"
                    required
                    value={gmailConfig.user}
                    onChange={e => setGmailConfig({ ...gmailConfig, user: e.target.value, fromEmail: e.target.value })}
                    placeholder="your-bot@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mật khẩu ứng dụng (App Password 16 ký tự) *
                  </label>
                  <input
                    type="password"
                    value={gmailConfig.appPassword || ''}
                    onChange={e => setGmailConfig({ ...gmailConfig, appPassword: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên người gửi hiển thị (From Name)
                  </label>
                  <input
                    type="text"
                    value={gmailConfig.fromName}
                    onChange={e => setGmailConfig({ ...gmailConfig, fromName: e.target.value })}
                    placeholder="Life OS Notification Assistant"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Hình thức kết nối
                  </label>
                  <select
                    value={gmailConfig.serviceType}
                    onChange={e => setGmailConfig({ ...gmailConfig, serviceType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="gmail">Gmail Trực tiếp (Cổng 465 SSL)</option>
                    <option value="smtp">Custom SMTP Server</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Category Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Các danh mục sự kiện tự động gửi email
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifyTaskOverdue}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifyTaskOverdue: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">⏰ Nhiệm vụ quá hạn (Task Overdue)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifyBudgetThreshold}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifyBudgetThreshold: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">💰 Cảnh báo vượt ngân sách</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifyPaymentStatus}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifyPaymentStatus: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">💳 Duyệt/Từ chối thanh toán</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifySubscriptionExpiry}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifySubscriptionExpiry: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">⏳ Hết hạn gói dịch vụ</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifyCalendarUpcoming}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifyCalendarUpcoming: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">📅 Sự kiện lịch biểu sắp tới</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={gmailConfig.notifySecurityAlerts}
                    onChange={e => setGmailConfig({ ...gmailConfig, notifySecurityAlerts: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">🛡️ Cảnh báo bảo mật tài khoản</span>
                </label>
              </div>
            </div>

            {/* Smart Throttling & Quiet Hours */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                    Cơ chế chống spam & Khung giờ yên tĩnh (Quiet Hours)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tránh làm phiền người dùng vào ban đêm với các thông báo không khẩn cấp.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gmailConfig.quietHoursEnabled}
                    onChange={e => setGmailConfig({ ...gmailConfig, quietHoursEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              {gmailConfig.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Bắt đầu yên tĩnh</label>
                    <input
                      type="time"
                      value={gmailConfig.quietHoursStart}
                      onChange={e => setGmailConfig({ ...gmailConfig, quietHoursStart: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Kết thúc yên tĩnh</label>
                    <input
                      type="time"
                      value={gmailConfig.quietHoursEnd}
                      onChange={e => setGmailConfig({ ...gmailConfig, quietHoursEnd: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingGmailConfig}
                className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSavingGmailConfig ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Gmail'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Test Connection & Instruction Guide (5 cols) */}
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
              Nhập địa chỉ email nhận để kiểm tra xem Gmail SMTP đã xác thực và gửi thư thành công chưa.
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                placeholder="Nhập email nhận thử nghiệm (mặc định là email admin)..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />

              <button
                type="button"
                onClick={handleTestGmail}
                disabled={isTestingGmail || !gmailConfig.user}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing className={`w-3.5 h-3.5 ${isTestingGmail ? 'animate-bounce' : ''}`} />
                <span>{isTestingGmail ? 'Đang kết nối SMTP & Gửi...' : 'Gửi Thử Nghiệm Ngay'}</span>
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

          {/* Instructions Guide */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Cách lấy App Password (Mật khẩu ứng dụng) từ Google:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Truy cập <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">myaccount.google.com/security</a>.</li>
              <li>Bật tính năng <strong>Xác minh 2 bước (2-Step Verification)</strong>.</li>
              <li>Tìm kiếm <strong>"Mật khẩu ứng dụng" (App Passwords)</strong>.</li>
              <li>Đặt tên ứng dụng (ví dụ: <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">LifeOS</code>) rồi nhấn <strong>Tạo</strong>.</li>
              <li>Sao chép mã 16 ký tự vừa tạo và dán vào ô <em>Mật khẩu ứng dụng</em> ở bên trái.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Email Notification Logs Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Nhật Ký Thông Báo Gần Đây (Live Mail Monitor)
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {gmailLogs.length} sự kiện
          </span>
        </div>

        {gmailLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chưa có nhật ký gửi email nào trong phiên hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Người nhận</th>
                  <th className="py-2.5 px-3">Danh mục</th>
                  <th className="py-2.5 px-3">Tiêu đề email</th>
                  <th className="py-2.5 px-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gmailLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {log.recipientEmail} {log.recipientName ? `(${log.recipientName})` : ''}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-semibold max-w-xs truncate">
                      {log.subject}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          log.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : log.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            : log.status === 'SKIPPED'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {log.status === 'SENT' && <CheckCheck className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
