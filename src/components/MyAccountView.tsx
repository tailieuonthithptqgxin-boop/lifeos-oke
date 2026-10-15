import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Key,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Check,
  ArrowRight,
  RotateCcw,
  Receipt,
  Clock,
  Calendar,
  CreditCard,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  X,
  Upload,
  Download,
  Laptop,
  Smartphone,
  LogOut,
  FileJson,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { StudyCompanionWidget } from './companion/StudyCompanionWidget';

interface PaymentHistoryItem {
  id: string;
  orderId: string;
  amount: number;
  planRequested: string;
  method: string;
  status: string;
  txReference: string;
  createdAt: string;
}

interface ActiveSessionItem {
  id: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SubscriptionData {
  currentPlan: string;
  planExpiresAt: string | null;
  isPlanActive: boolean;
  status: string;
  subscription: any;
  history: PaymentHistoryItem[];
}

export function MyAccountView() {
  const {
    currentUser,
    updateProfile,
    upgradePlan,
    logout,
    clearWorkspace,
    resetOnboarding,
    setCurrentView,
    subscriptionStatus
  } = useAppStore();

  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Subscription & Invoices State
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingRenew, setIsCancellingRenew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentHistoryItem | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Cloudflare R2 Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Active Sessions State
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  // Workspace Backup & Restore State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const backupInputRef = useRef<HTMLInputElement>(null);

  const fetchSubscription = async () => {
    try {
      setIsLoadingSub(true);
      const [res, pendingRes] = await Promise.all([
        apiCall('/api/payments/subscription'),
        apiCall('/api/payments/active-pending-request').catch(() => null)
      ]);
      if (res && res.success) {
        setSubData(res);
      }
      if (pendingRes && pendingRes.success) {
        setPendingRequest(pendingRes.activePending);
      }
    } catch (err: any) {
      console.warn('Could not load subscription details:', err.message);
    } finally {
      setIsLoadingSub(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const res = await apiCall('/api/auth/sessions');
      if (res && res.success) {
        setSessions(res.sessions || []);
      }
    } catch (e) {
      console.warn('Could not load sessions:', e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Dynamic Service Plans from single source of truth
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const res = await apiCall('/api/payments/plans');
      if (res && res.success && Array.isArray(res.plans)) {
        setPlans(res.plans);
      }
    } catch (e) {
      console.warn('Could not load plans in MyAccountView:', e);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchSessions();
    fetchPlans();
  }, [currentUser?.plan, currentUser?.planExpiresAt]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ text: 'Kích thước ảnh đại diện không được vượt quá 5MB', type: 'error' });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'avatars'
          });

          const newAvatarUrl = res.file?.url || base64Data;
          setAvatar(newAvatarUrl);
          await updateProfile({ name, avatar: newAvatarUrl });
          setStatusMsg({ text: 'Đã tải ảnh đại diện lên Cloudflare R2 thành công!', type: 'success' });
          setTimeout(() => setStatusMsg(null), 3500);
        } catch (uploadErr: any) {
          // Fallback to direct base64 if R2 credentials not configured
          setAvatar(base64Data);
          await updateProfile({ name, avatar: base64Data });
          setStatusMsg({ text: 'Đã lưu ảnh đại diện (Chế độ lưu trực tiếp)', type: 'success' });
          setTimeout(() => setStatusMsg(null), 3500);
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingAvatar(false);
      setStatusMsg({ text: err.message || 'Lỗi khi tải ảnh đại diện', type: 'error' });
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tất cả các thiết bị khác?')) return;
    try {
      setIsRevokingSessions(true);
      const res = await apiCall('/api/auth/sessions/revoke-others', 'POST');
      if (res && res.success) {
        setStatusMsg({ text: res.message || 'Đã đăng xuất khỏi các thiết bị khác', type: 'success' });
        await fetchSessions();
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Không thể đăng xuất các phiên khác', type: 'error' });
    } finally {
      setIsRevokingSessions(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExportingBackup(true);
      const res = await apiCall('/api/workspace/backup/export');
      if (res && res.success && res.backup) {
        const jsonStr = JSON.stringify(res.backup, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `lifeos-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatusMsg({ text: 'Đã xuất tệp sao lưu dữ liệu toàn diện thành công!', type: 'success' });
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi khi tải bản sao lưu: ' + err.message, type: 'error' });
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.data || typeof parsed.data !== 'object') {
          throw new Error('Tệp không đúng định dạng sao lưu của LifeOS.');
        }
        setImportPreview(parsed);
        setShowImportModal(true);
      } catch (err: any) {
        setStatusMsg({ text: 'Tệp JSON không hợp lệ: ' + err.message, type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteImportBackup = async () => {
    if (!importPreview?.data) return;
    try {
      setIsImportingBackup(true);
      const res = await apiCall('/api/workspace/backup/import', 'POST', {
        data: importPreview.data,
        mode: importMode
      });
      if (res && res.success) {
        setStatusMsg({ text: 'Phục hồi dữ liệu thành công! Đang tải lại không gian làm việc...', type: 'success' });
        setShowImportModal(false);
        setImportPreview(null);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setStatusMsg({ text: 'Lỗi khi phục hồi: ' + err.message, type: 'error' });
    } finally {
      setIsImportingBackup(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateProfile({ name, avatar });
      setStatusMsg({ text: 'Cập nhật thông tin thành công', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Lỗi khi cập nhật hồ sơ', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDowngradeFree = async () => {
    try {
      setIsUpdatingPlan(true);
      await upgradePlan('FREE');
      await fetchSubscription();
      setStatusMsg({ text: 'Đã chuyển tài khoản về gói FREE', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Lỗi khi cập nhật gói dịch vụ', type: 'error' });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    try {
      setIsCancellingRenew(true);
      const res = await apiCall('/api/payments/subscription/cancel-auto-renew', 'POST');
      setStatusMsg({
        text: res.message || 'Đã hủy tự động gia hạn thành công. Bạn vẫn giữ trọn quyền sử dụng gói dịch vụ đến hết chu kỳ.',
        type: 'success'
      });
      setShowCancelModal(false);
      await fetchSubscription();
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Không thể hủy gia hạn', type: 'error' });
    } finally {
      setIsCancellingRenew(false);
    }
  };

  const handleResumeAutoRenew = async () => {
    try {
      setIsUpdatingPlan(true);
      const res = await apiCall('/api/payments/subscription/resume-auto-renew', 'POST');
      setStatusMsg({ text: res.message || 'Đã khôi phục tự động gia hạn.', type: 'success' });
      await fetchSubscription();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Không thể khôi phục gia hạn', type: 'error' });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const currentPlan = (currentUser?.plan || 'FREE').toUpperCase();
  const planExpiryDate = currentUser?.planExpiresAt
    ? new Date(currentUser.planExpiresAt).toLocaleDateString('vi-VN')
    : null;

  const isCancelledAutoRenew = subData?.subscription?.status === 'Cancelled';

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 font-sans overflow-x-hidden">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">Tài khoản & Dịch vụ của tôi</h2>
        <p className="text-xs sm:text-sm text-slate-500 break-words">
          Quản lý thông tin định danh, gói đăng ký SaaS trực tuyến và lịch sử thanh toán
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-150 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* User Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'}
              alt={currentUser?.name || 'User'}
              className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover"
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser?.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{currentUser?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  Vai trò: {currentUser?.role}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  currentPlan === 'FREE'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                }`}>
                  Gói: {currentUser?.plan || 'FREE'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="self-start sm:self-center px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            Đăng xuất
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và Tên
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ảnh đại diện (Cloudflare R2 Storage)
                </label>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải lên R2...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh từ máy</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Hỗ trợ chọn ảnh từ máy tính/điện thoại tải trực tiếp lên Cloudflare R2 hoặc dán liên kết URL.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </form>
      </div>

      {/* Pending Payment Request Notification Banner */}
      {pendingRequest && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block text-amber-950 dark:text-amber-100">
                Đang có 1 yêu cầu nâng cấp gói {pendingRequest.planRequested} chờ Admin duyệt
              </span>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                Mã giao dịch: {pendingRequest.txReference} ({formatCurrency(pendingRequest.amount)})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('checkout')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs cursor-pointer"
          >
            <span>Xem chi tiết / Theo dõi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subscription & Plan Status (Requirement 6) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Gói Dịch Vụ & Đăng Ký</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                currentPlan === 'FREE'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}>
                {currentPlan === 'FREE' ? 'Miễn phí' : isCancelledAutoRenew ? 'Đã hủy tự động gia hạn' : 'Đang kích hoạt'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phần mềm trực tuyến LifeOS - Kích hoạt quyền sử dụng công cụ trực tuyến
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('subscription')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Quản lý Gói & Đội Ngũ</span>
          </button>
        </div>

        {/* Current Active Plan Overview Card */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Gói dịch vụ hiện tại</span>
              <span className="font-black text-slate-900 dark:text-white text-base">
                {subscriptionStatus?.planName || (subscriptionStatus?.hasAccess ? 'Gói Đang Hoạt Động' : 'Chưa kích hoạt')}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {subscriptionStatus?.hasAccess ? 'Mở khóa toàn bộ chức năng LifeOS' : 'Cần kích hoạt gói để sử dụng'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Thời hạn gói</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {subscriptionStatus?.endDate ? new Date(subscriptionStatus.endDate).toLocaleDateString('vi-VN') : 'Chưa kích hoạt'}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {subscriptionStatus?.hasAccess ? `Còn lại ${subscriptionStatus.remainingDays || 0} ngày sử dụng` : 'Hết hạn truy cập'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Trạng thái quyền truy cập</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  subscriptionStatus?.hasAccess ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {subscriptionStatus?.hasAccess ? 'Đang hoạt động (Đầy đủ chức năng)' : 'Tạm khóa (Cần gia hạn)'}
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                {subscriptionStatus?.hasAccess ? 'Mọi chức năng hệ thống đều khả dụng' : 'Vui lòng kích hoạt gói để tiếp tục'}
              </span>
            </div>
          </div>
        </div>

        {/* Official Service Plans Overview Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Các Gói Dịch Vụ Hệ Thống (Mở Khóa Toàn Bộ Chức Năng)
              </h4>
              <p className="text-xs text-slate-500">
                Tất cả các chức năng đều như nhau khi có gói dịch vụ còn hạn. Không giới hạn chức năng riêng lẻ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('subscription')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              Xem Chi Tiết & Mua Gói
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {(plans && plans.length > 0 ? plans : [
              {
                id: 'PERSONAL_1M',
                name: 'Cá Nhân (1 Tháng)',
                price: 29000,
                durationDays: 30,
                billingCycle: '1 tháng (30 ngày)',
                description: 'Toàn bộ chức năng quản lý cá nhân, tài chính, công việc, mục tiêu.'
              },
              {
                id: 'PERSONAL_3M',
                name: 'Cá Nhân (3 Tháng)',
                price: 79000,
                durationDays: 90,
                badge: 'Tiết kiệm',
                billingCycle: '3 tháng (90 ngày)',
                description: 'Mở khóa toàn bộ chức năng trong 3 tháng liên tục, tiết kiệm chi phí.'
              },
              {
                id: 'TEAM_1M',
                name: 'Gói Đội Ngũ (Team 1 Tháng)',
                price: 99000,
                durationDays: 30,
                badge: 'Tối đa 5 người',
                billingCycle: '1 tháng (30 ngày)',
                description: 'Chủ team thêm tối đa 5 người. Tất cả thành viên dùng đầy đủ mọi chức năng.'
              }
            ]).map((p: any) => {
              const isTeam = p.id?.includes('TEAM') || p.type === 'TEAM';
              const is3M = p.durationDays === 90 || p.id === 'PERSONAL_3M';
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border space-y-2 ${
                    isTeam
                      ? 'border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20'
                      : is3M
                      ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                    <span>{p.name}</span>
                    {p.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isTeam
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      }`}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-lg font-black ${isTeam ? 'text-purple-600' : 'text-blue-600'}`}>
                    {formatCurrency(p.price || p.monthlyPrice || 0)}{' '}
                    <span className="text-xs text-slate-400 font-normal">
                      / {p.durationDays ? `${p.durationDays} ngày` : p.billingCycle || '30 ngày'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice & Payment History Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Lịch sử Hóa đơn & Giao dịch
              </h4>
              <p className="text-xs text-slate-500">
                Các biên lai thanh toán bản quyền SaaS trực tuyến
              </p>
            </div>
            <button
              type="button"
              onClick={fetchSubscription}
              disabled={isLoadingSub}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSub ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {subData?.history && subData.history.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Mã đơn hàng</th>
                    <th className="py-3 px-4">Gói dịch vụ</th>
                    <th className="py-3 px-4">Ngày giao dịch</th>
                    <th className="py-3 px-4">Số tiền</th>
                    <th className="py-3 px-4">Phương thức</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Biên lai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {subData.history.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium">{inv.orderId}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{inv.planRequested}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(inv.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="py-3 px-4 font-bold">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.method}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : inv.status === 'Failed'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {inv.status === 'Paid' ? 'Thành công' : inv.status === 'Failed' ? 'Thất bại' : 'Đang xử lý'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              Chưa có lịch sử giao dịch thanh toán nào được ghi nhận.
            </div>
          )}
        </div>
      </div>

      {/* Workspace Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <h4 className="font-bold text-slate-900 dark:text-white text-base">Quản lý Không gian làm việc</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Mỗi tài khoản lưu trữ dữ liệu hoàn toàn độc lập và riêng biệt trên cơ sở dữ liệu PostgreSQL. Bạn có thể làm lại khảo sát cá nhân hóa (Onboarding) hoặc làm sạch không gian làm việc của riêng bạn.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={resetOnboarding}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-blue-600" /> Làm lại khảo sát cá nhân hóa (Onboarding)
          </button>
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn làm sạch toàn bộ dữ liệu trong workspace của tài khoản này?')) {
                clearWorkspace();
              }
            }}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Làm sạch Workspace của tôi
          </button>
        </div>
      </div>

      {/* AI STUDY COMPANION PERSONALIZATION SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Nhân Vật Đồng Hành Học Tập (AI Study Companion)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Bạn đồng hành thông minh hỗ trợ trong Focus Mode và Học từ vựng, tự động phản hồi theo thành tựu và không làm bạn phân tâm.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <StudyCompanionWidget
            userId={currentUser?.id}
            mode="embedded"
            customMessage="Mình luôn sẵn sàng đồng hành cùng bạn trên mọi chặng đường học tập!"
          />
        </div>
      </div>

      {/* DATA BACKUP & RESTORE (PORTABILITY) */}
      <div className="card-cute bg-white/90 dark:bg-slate-900/90 border border-purple-150/70 dark:border-purple-900/40 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                <FileJson className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span>Sao lưu & Khôi phục Dữ liệu Cá nhân (1-Click .lifeos) ✨</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Xuất toàn bộ công việc, dự án, ghi chú, giao dịch tài chính, thói quen và mục tiêu ra file sao lưu tiêu chuẩn để bảo toàn dữ liệu trọn đời hoặc chuyển đổi thiết bị nhanh chóng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExportingBackup}
              className="btn-squishy px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-500 to-rose-400 hover:from-violet-500 hover:to-pink-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-pink-500/20 cursor-pointer"
            >
              {isExportingBackup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất file...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Xuất Bản Sao Lưu (.lifeos)</span>
                </>
              )}
            </button>

            <input
              type="file"
              ref={backupInputRef}
              accept=".json,.lifeos,application/json"
              onChange={handleSelectBackupFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="btn-squishy px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-purple-200/60 dark:border-purple-800/60 hover:bg-violet-50/70 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Phục Hồi Dữ Liệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE SESSIONS & DEVICE SECURITY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Phiên Đăng Nhập & Bảo Mật Thiết Bị</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Danh sách các phiên làm việc và thiết bị đang đăng nhập tài khoản của bạn.
            </p>
          </div>

          {sessions.filter(s => !s.isCurrent).length > 0 && (
            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={isRevokingSessions}
              className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isRevokingSessions ? 'Đang xử lý...' : 'Đăng xuất khỏi thiết bị khác'}</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {isLoadingSessions ? (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Đang tải danh sách thiết bị...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              Chưa có phiên làm việc nào được ghi nhận.
            </div>
          ) : (
            sessions.map((s, idx) => (
              <div
                key={s.id || idx}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    s.isCurrent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {s.isCurrent ? 'Trình duyệt hiện tại' : 'Thiết bị đăng nhập'}
                      </span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          Phiên hiện tại
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bắt đầu: {new Date(s.createdAt).toLocaleString('vi-VN')} • Hết hạn: {new Date(s.expiresAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Đang hoạt động</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* IMPORT BACKUP CONFIRMATION MODAL */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Xác nhận Phục hồi Dữ liệu</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Hệ thống đã phân tích tệp sao lưu (Phiên bản: {importPreview.version || '1.0'}, xuất ngày: {importPreview.exportedAt ? new Date(importPreview.exportedAt).toLocaleString('vi-VN') : 'Gần đây'}).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Công việc:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.tasks?.length || 0}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Dự án:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.projects?.length || 0}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Ghi chú:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.notes?.length || 0}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Thói quen:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.habits?.length || 0}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Mục tiêu:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.goals?.length || 0}</span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                <span className="text-slate-400 text-[11px] block">Ví & Tài chính:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{importPreview.data?.financeAccounts?.length || 0}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Chọn phương thức phục hồi:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`p-3 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                  importMode === 'merge' ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100' : 'border-slate-200 dark:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block">Gộp thêm (Merge)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Giữ dữ liệu cũ, thêm mới các mục từ tệp.</span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                  importMode === 'replace' ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100' : 'border-slate-200 dark:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block">Thay thế (Replace)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Làm sạch dữ liệu hiện tại trước khi nạp tệp.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteImportBackup}
                disabled={isImportingBackup}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isImportingBackup ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang nạp dữ liệu...</span>
                  </>
                ) : (
                  <span>Tiến hành Khôi phục</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL AUTO-RENEW CONFIRMATION MODAL (Strict distinction from Account Deletion) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Xác nhận hủy tự động gia hạn?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đây KHÔNG PHẢI là thao tác xóa tài khoản hay xóa dữ liệu của bạn.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Bạn vẫn được sử dụng <strong>toàn bộ quyền lợi gói {currentPlan}</strong> cho đến hết ngày <strong>{planExpiryDate || 'kết thúc chu kỳ'}</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Sau ngày này, tài khoản sẽ tự động chuyển về gói Miễn phí (FREE) mà <strong>không bị mất bất kỳ dữ liệu nào</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Hệ thống sẽ không thực hiện trừ tiền vào chu kỳ tiếp theo.</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Giữ gói dịch vụ
              </button>
              <button
                type="button"
                onClick={handleCancelAutoRenew}
                disabled={isCancellingRenew}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCancellingRenew ? 'Đang xử lý...' : 'Xác nhận hủy gia hạn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELECTRONIC INVOICE DETAIL MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Hóa đơn điện tử SaaS</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedInvoice.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mã tham chiếu thanh toán:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{selectedInvoice.txReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gói bản quyền:</span>
                <span className="font-bold text-blue-600">{selectedInvoice.planRequested}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày phát hành:</span>
                <span>{new Date(selectedInvoice.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phương thức:</span>
                <span>{selectedInvoice.method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-sm">
                <span>Tổng tiền:</span>
                <span className="text-blue-600">{formatCurrency(selectedInvoice.amount)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300">
              ✓ Đơn hàng kỹ thuật số trực tuyến đã thanh toán & kích hoạt giấy phép thành công trên hệ thống LifeOS.
            </div>

            <button
              type="button"
              onClick={() => setSelectedInvoice(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
