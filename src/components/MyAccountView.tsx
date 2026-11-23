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
  Loader2,
  Bell,
  Mail,
  Flame,
  Trophy,
  Users
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { compressAndUploadImage, formatBytes, validateImageFile } from '../lib/imageCompressor';
import { apiCall } from '../lib/apiClient';
import { formatCurrency, formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { StudyCompanionWidget } from './companion/StudyCompanionWidget';
import { NotificationSettingsModal } from './notifications/NotificationSettingsModal';
import { notifyAuthSecurity } from '../lib/unifiedNotificationEngine';
import { soundEngine } from '../lib/soundEngine';
import { 
  checkForAppUpdates, 
  applyPwaUpdate, 
  CURRENT_CLIENT_VERSION, 
  CURRENT_BUILD_ID 
} from '../lib/pwa';

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

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

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

  // System Version & Update Lifecycle State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    checked: boolean;
    hasUpdate: boolean;
    latestVersion?: string;
    changelog?: string[];
    message?: string;
  } | null>(null);

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const res = await checkForAppUpdates(true);
      if (res.hasUpdate) {
        setUpdateInfo({
          checked: true,
          hasUpdate: true,
          latestVersion: res.latestVersion,
          changelog: res.changelog,
          message: `Đã có phiên bản mới v${res.latestVersion}! Bạn có thể cập nhật ngay bây giờ.`
        });
      } else {
        setUpdateInfo({
          checked: true,
          hasUpdate: false,
          latestVersion: res.currentVersion,
          message: `Ứng dụng đang chạy phiên bản mới nhất (v${res.currentVersion}).`
        });
      }
    } catch (err: any) {
      setUpdateInfo({
        checked: true,
        hasUpdate: false,
        message: err.message || 'Không thể kiểm tra cập nhật vào lúc này.'
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdateFromAccount = async () => {
    setIsApplyingUpdate(true);
    try {
      await applyPwaUpdate();
    } catch (err: any) {
      setStatusMsg({
        text: err.message || 'Không thể áp dụng bản cập nhật.',
        type: 'error'
      });
      setIsApplyingUpdate(false);
    }
  };

  // Workspace Backup & Restore State
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Full-Stack Account Deletion & GDPR Data Portability State (Nghị định 13/2023/NĐ-CP)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmationPhrase, setDeleteConfirmationPhrase] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExportingGdpr, setIsExportingGdpr] = useState(false);

  // Custom confirmation modals
  const [confirmRevokeModal, setConfirmRevokeModal] = useState(false);
  const [confirmClearWorkspaceModal, setConfirmClearWorkspaceModal] = useState(false);

  const statusMsgTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showStatus = (text: string, type: 'success' | 'error') => {
    if (statusMsgTimerRef.current) clearTimeout(statusMsgTimerRef.current);
    setStatusMsg({ text, type });
    statusMsgTimerRef.current = setTimeout(() => {
      setStatusMsg(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (statusMsgTimerRef.current) clearTimeout(statusMsgTimerRef.current);
    };
  }, []);

  useBodyScrollLock(
    showImportModal || 
    showCancelModal || 
    !!selectedInvoice || 
    showDeleteAccountModal || 
    showNotificationSettings ||
    confirmRevokeModal ||
    confirmClearWorkspaceModal
  );

  const handleExportGdprData = async () => {
    try {
      setIsExportingGdpr(true);
      const res = await fetch('/api/auth/export-data', { credentials: 'include' });
      if (!res.ok) throw new Error('Không thể tải tệp xuất dữ liệu từ máy chủ.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos_personal_data_export_${formatLocalDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('Đã xuất toàn bộ dữ liệu cá nhân theo Nghị định 13 & GDPR thành công!', 'success');
      soundEngine.playSuccess();
    } catch (err: any) {
      showStatus('Lỗi khi xuất dữ liệu: ' + err.message, 'error');
      soundEngine.playPop();
    } finally {
      setIsExportingGdpr(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationPhrase.trim() !== 'XÓA VĨNH VIỄN') {
      setDeleteError('Vui lòng gõ chính xác cụm từ "XÓA VĨNH VIỄN" (chữ hoa) để xác nhận.');
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await apiCall('/api/auth/account', 'DELETE', {
        confirmation: deleteConfirmationPhrase.trim(),
        password: deletePassword || undefined
      });
      if (res && (res.success || res.status === 200)) {
        showStatus('Tài khoản và toàn bộ dữ liệu cá nhân của bạn đã được xóa sạch vĩnh viễn khỏi hệ thống.', 'success');
        soundEngine.playSuccess();
        setTimeout(() => {
          logout();
          window.location.href = '/';
        }, 1200);
      } else {
        setDeleteError(res?.message || 'Không thể xóa tài khoản. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi hệ thống khi xóa tài khoản.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showImportModal) setShowImportModal(false);
        if (showCancelModal) setShowCancelModal(false);
        if (selectedInvoice) setSelectedInvoice(null);
        if (showDeleteAccountModal && !isDeletingAccount) setShowDeleteAccountModal(false);
        if (confirmRevokeModal && !isRevokingSessions) setConfirmRevokeModal(false);
        if (confirmClearWorkspaceModal) setConfirmClearWorkspaceModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImportModal, showCancelModal, selectedInvoice, showDeleteAccountModal, isDeletingAccount, confirmRevokeModal, isRevokingSessions, confirmClearWorkspaceModal]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setStatusMsg({ text: validation.error || 'Ảnh không hợp lệ', type: 'error' });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setStatusMsg(null);

      // Compress client-side directly into 200x200 square WebP (~10-15KB)
      const result = await compressAndUploadImage(file, 'avatar', 'avatars');
      const newAvatarUrl = result.url;

      setAvatar(newAvatarUrl);
      await updateProfile({ name, avatar: newAvatarUrl });

      const statMsg = `✅ Đã tối ưu nhẹ avatar: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)} (-${result.reductionPercent}%)`;
      setStatusMsg({ 
        text: `Cập nhật ảnh đại diện thành công! (${statMsg})`, 
        type: 'success' 
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Avatar update failed:', err);
      setIsUploadingAvatar(false);
      setStatusMsg({ text: err.message || 'Lỗi khi tải và nén ảnh đại diện', type: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRevokeOtherSessions = () => {
    setConfirmRevokeModal(true);
  };

  const executeRevokeOtherSessions = async () => {
    try {
      setIsRevokingSessions(true);
      const res = await apiCall('/api/auth/sessions/revoke-others', 'POST');
      if (res && res.success) {
        showStatus(res.message || 'Đã đăng xuất khỏi các thiết bị khác', 'success');
        await fetchSessions();
        soundEngine.playSuccess();
      }
    } catch (err: any) {
      showStatus(err.message || 'Không thể đăng xuất các phiên khác', 'error');
      soundEngine.playPop();
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
      notifyAuthSecurity('PROFILE_UPDATED', { email: currentUser?.email }, name).catch(() => {});
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
    <div className="w-full min-w-0 max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 font-sans pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 overflow-x-hidden">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">Tài khoản & Dịch vụ của tôi</h2>
        <p className="text-xs sm:text-sm text-slate-500 break-words">
          Quản lý thông tin định danh, gói đăng ký SaaS trực tuyến và lịch sử thanh toán
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-150 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (statusMsgTimerRef.current) clearTimeout(statusMsgTimerRef.current);
              setStatusMsg(null);
            }}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Information Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'}
              alt={currentUser?.name || 'Ảnh đại diện người dùng'}
              loading="lazy"
              decoding="async"
              width="64"
              height="64"
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

        {/* Unified Real Stats Card (Zero Mock) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Chỉ Số Cá Nhân Đồng Bộ (Single Source of Truth)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Streak Days */}
            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Chuỗi kỷ luật</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-300 mt-1">
                {currentUser?.streakDays ?? 0} ngày 🔥
              </div>
            </div>

            {/* Total Study Minutes */}
            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tổng giờ học</span>
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-300 mt-1">
                {Math.floor((currentUser?.totalStudyMinutes ?? 0) / 60)}h {(currentUser?.totalStudyMinutes ?? 0) % 60}p
              </div>
            </div>

            {/* Rank / Badge */}
            <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-400">
                <Trophy className="w-3.5 h-3.5 text-purple-500" />
                <span>Danh hiệu</span>
              </div>
              <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-300 mt-1 truncate">
                {currentUser?.badgeLevel || 'Tân Binh'}
              </div>
            </div>

            {/* Referral / Affiliate */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>Giới thiệu</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-300 mt-1">
                {currentUser?.referredCount ?? 0} bạn
              </div>
            </div>
          </div>
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
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Ảnh đại diện cá nhân (Tự động nén siêu nhẹ ~10KB)
              </label>
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/png, image/jpeg, image/webp, image/gif, image/heic, image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Ảnh đại diện chỉnh sửa"
                      loading="lazy"
                      decoding="async"
                      width="48"
                      height="48"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                      {name.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Đang tối ưu ảnh...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>📷 Tải ảnh từ máy</span>
                      </>
                    )}
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Tự động cắt chuẩn 200x200px, nén siêu nhẹ dưới 15KB để tối ưu tốc độ tải và bảo vệ bộ nhớ.
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </form>
      </div>

      {/* Subscription & Plan Status (100% Free Mode) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Gói Dịch Vụ & Bản Quyền</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Miễn phí 100% (Full Access)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống LifeOS đang mở toàn bộ phân hệ nâng cao miễn phí cho tất cả người dùng
            </p>
          </div>
        </div>

        {/* Current Active Plan Overview Card */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Gói dịch vụ hiện tại</span>
              <span className="font-black text-slate-900 dark:text-white text-base">
                Trải nghiệm Miễn phí (Full Access)
              </span>
              <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                Mở khóa 100% tất cả các tính năng cao cấp của LifeOS
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Thời hạn hiệu lực</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Vô thời hạn
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Không giới hạn thời gian sử dụng
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Trạng thái quyền truy cập</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Đang hoạt động (Toàn quyền)
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Mọi chức năng hệ thống đều khả dụng
              </span>
            </div>
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
            type="button"
            onClick={() => setConfirmClearWorkspaceModal(true)}
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
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                <FileJson className="w-4 h-4 stroke-[2]" />
              </div>
              <span>Sao lưu & Khôi phục Dữ liệu Cá nhân (.lifeos)</span>
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
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {isExportingBackup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất file...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2]" />
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
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2]" />
              <span>Phục Hồi Dữ Liệu</span>
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATION CENTER & GMAIL AUTOMATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Trung Tâm Thông Báo & Tự Động Hóa Gmail</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Engine
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Tích hợp Google OAuth 2.0 cá nhân, tùy chỉnh nhắc việc, deadline, sự kiện lịch và giờ yên tĩnh (Quiet Hours).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNotificationSettings(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span>Cài Đặt & Kết Nối Gmail</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Kênh gửi</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              Gmail OAuth 2.0 & In-App Web
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Tự động phát hiện</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              14 loại sự kiện (Lịch, Task, Thói quen)
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Bảo mật</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Idempotency chống trùng & Token băm
            </span>
          </div>
        </div>
      </div>

      {/* SYSTEM VERSION & PWA UPDATE LIFECYCLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <RefreshCw className={`w-5 h-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>Phiên Bản & Cập Nhật Hệ Thống</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  v{CURRENT_CLIENT_VERSION}
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý vòng đời cập nhật ứng dụng, kiểm tra tính toàn vẹn bản phát hành và đồng bộ Service Worker ngoại tuyến.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-account-check-update"
            onClick={handleManualCheckUpdate}
            disabled={isCheckingUpdate || isApplyingUpdate}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra bản cập nhật'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Bản phát hành hiện tại</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5 font-mono">
              v{CURRENT_CLIENT_VERSION} ({CURRENT_BUILD_ID})
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Trạng thái Service Worker</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Đang hoạt động (Active & Offline Cache)
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Bảo toàn biểu mẫu & Dữ liệu</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Tự động lưu nháp & Hoãn 24h
            </span>
          </div>
        </div>

        {updateInfo && (
          <div className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-200 ${
            updateInfo.hasUpdate 
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-100'
              : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold text-sm flex items-center gap-1.5">
                  {updateInfo.hasUpdate ? <Zap className="w-4 h-4 text-blue-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  <span>{updateInfo.hasUpdate ? `Bản cập nhật v${updateInfo.latestVersion} sẵn sàng!` : 'Hệ thống đã là bản mới nhất'}</span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {updateInfo.message}
                </p>

                {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/40">
                    <span className="font-semibold block mb-1">Các điểm nâng cấp chính:</span>
                    <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
                      {updateInfo.changelog.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {updateInfo.hasUpdate && (
                <button
                  type="button"
                  id="btn-account-apply-update"
                  onClick={handleApplyUpdateFromAccount}
                  disabled={isApplyingUpdate}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isApplyingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isApplyingUpdate ? 'Đang cập nhật...' : 'Cập nhật ngay'}</span>
                </button>
              )}
            </div>
          </div>
        )}
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

      {/* QUYỀN RIÊNG TƯ & BẢO VỆ DỮ LIỆU CÁ NHÂN (NGHỊ ĐỊNH 13/2023/NĐ-CP & GDPR) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Quyền Riêng Tư & Bảo Vệ Dữ Liệu Cá Nhân
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tuân thủ Nghị định 13/2023/NĐ-CP và Tiêu chuẩn quốc tế GDPR / CCPA
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Action 1: Export Personal Data */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                <FileJson className="w-4 h-4 text-emerald-500" />
                <span>Quyền Xuất Dữ Liệu (Data Portability)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Tải xuống toàn bộ hồ sơ cá nhân, danh mục tài chính, nhiệm vụ, dự án và ghi chú của bạn dưới định dạng tệp JSON mở.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportGdprData}
              disabled={isExportingGdpr}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isExportingGdpr ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang trích xuất dữ liệu...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất dữ liệu cá nhân (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* Action 2: View Policies */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Minh Bạch Chính Sách & Đơn Vị Vận Hành</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Xem chi tiết danh mục dữ liệu được thu thập, mục đích sử dụng, hỗ trợ kỹ thuật (adminteamdaniel@gmail.com) và chính sách hoàn tiền cho sự cố kỹ thuật website.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
              >
                Chính sách bảo mật
              </a>
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
              >
                Điều khoản dịch vụ
              </a>
              <a
                href="/refund-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold transition-colors"
              >
                Chính sách hoàn tiền
              </a>
            </div>
          </div>
        </div>

        {/* DANGER ZONE: Permanent Account & Data Deletion */}
        <div className="mt-4 pt-4 border-t border-rose-200/60 dark:border-rose-950/80 p-4 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Vùng Nguy Hiểm: Quyền Yêu Cầu Xóa Dữ Liệu (Right to Erasure)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Xóa sạch vĩnh viễn tài khoản và toàn bộ bản ghi nhiệm vụ, tài chính, từ vựng, phiên làm việc khỏi cơ sở dữ liệu. Thao tác này <strong>không thể hoàn tác</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationPhrase('');
              setDeletePassword('');
              setDeleteError(null);
              setShowDeleteAccountModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tài khoản & dữ liệu</span>
          </button>
        </div>
      </div>

      {/* IMPORT BACKUP CONFIRMATION MODAL */}
      {showImportModal && importPreview && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              setShowImportModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              setShowCancelModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              setSelectedInvoice(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
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

{/* MODAL XÁC NHẬN XÓA TÀI KHOẢN VĨNH VIỄN (NGHỊ ĐỊNH 13 & GDPR RIGHT TO ERASURE) */}
      {showDeleteAccountModal && (
        <div 
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget && !isDeletingAccount) {
              setShowDeleteAccountModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/70 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa vĩnh viễn tài khoản?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                  Thao tác này là không thể hoàn tác theo Điều 9 Nghị định 13/2023/NĐ-CP
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
              <p className="font-bold">Khi bạn nhấn xác nhận, hệ thống sẽ tự động:</p>
              <ul className="space-y-1 list-disc list-inside text-rose-800 dark:text-rose-300">
                <li>Xóa toàn bộ nhiệm vụ, dự án P.A.R.A và mục tiêu cá nhân.</li>
                <li>Xóa sạch toàn bộ bản ghi tài chính, thu chi, tài khoản ví và ngân sách.</li>
                <li>Xóa toàn bộ lịch sử phiên Pomodoro, từ vựng flashcard và tiến độ học tập.</li>
                <li>Hủy bỏ toàn bộ phiên đăng nhập, cookie và mã token thiết bị.</li>
                <li>Xóa vĩnh viễn hồ sơ người dùng khỏi cơ sở dữ liệu LifeOS.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Để xác nhận, vui lòng gõ chính xác cụm từ <span className="font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">XÓA VĨNH VIỄN</span>:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationPhrase}
                  onChange={(e) => setDeleteConfirmationPhrase(e.target.value)}
                  placeholder="XÓA VĨNH VIỄN"
                  className="w-full h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm text-slate-900 dark:text-white font-mono focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu tài khoản (nếu đăng ký bằng mật khẩu):
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-base sm:text-sm text-slate-900 dark:text-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAccount || deleteConfirmationPhrase.trim() !== 'XÓA VĨNH VIỄN'}
                onClick={handleConfirmDeleteAccount}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa toàn bộ dữ liệu...</span>
                  </>
                ) : (
                  <span>Xác nhận xóa vĩnh viễn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* CONFIRM REVOKE SESSIONS MODAL */}
      {confirmRevokeModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-backdrop-fade cursor-default"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget && !isRevokingSessions) {
              setConfirmRevokeModal(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-modal-enter"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-900/50">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Đăng xuất khỏi tất cả các thiết bị khác?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tất cả các phiên làm việc đang mở trên điện thoại hoặc máy tính khác sẽ bị vô hiệu hóa ngay lập tức. Phiên hiện tại của bạn vẫn được giữ nguyên.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={() => setConfirmRevokeModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isRevokingSessions}
                onClick={async () => {
                  setConfirmRevokeModal(false);
                  await executeRevokeOtherSessions();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isRevokingSessions ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận đăng xuất</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR WORKSPACE MODAL */}
      {confirmClearWorkspaceModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-backdrop-fade cursor-default"
          onMouseDown={(e) => { mouseDownTargetRef.current = e.target; }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              setConfirmClearWorkspaceModal(false);
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-modal-enter"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Làm sạch Workspace của bạn?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                  Lưu ý: Dữ liệu công việc, dự án, mục tiêu và thói quen trong workspace sẽ được xóa sạch.
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tài khoản đăng nhập và gói dịch vụ của bạn vẫn được giữ nguyên. Bạn nên xuất file sao lưu (Export Backup) trước khi thực hiện.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmClearWorkspaceModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmClearWorkspaceModal(false);
                  await clearWorkspace();
                  showStatus('Đã làm sạch không gian làm việc của bạn', 'success');
                  soundEngine.playPop();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Xác nhận làm sạch</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
