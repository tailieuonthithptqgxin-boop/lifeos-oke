import React, { useState, useEffect } from 'react';
import {
  Shield,
  Receipt,
  Package,
  Languages,
  Users,
  QrCode,
  Cloud,
  Layers,
  Mail,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  CreditCard,
  X
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { useAppStore } from '../lib/store';
import { CloudflareR2View } from './CloudflareR2View';
import { AdminCustomModulesTab } from './AdminCustomModulesTab';
import type {
  AdminTab,
  ManagedUser,
  PaymentRequest,
  BankConfig,
  ServicePlan,
  LanguageItem,
  PlanAuditLog,
  GmailConfig
} from './admin/types';
import { AdminRequestsTab } from './admin/AdminRequestsTab';
import { AdminSubscriptionsTab } from './admin/AdminSubscriptionsTab';
import { AdminPlansTab } from './admin/AdminPlansTab';
import { AdminLanguagesTab } from './admin/AdminLanguagesTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminBankConfigTab } from './admin/AdminBankConfigTab';
import { AdminGmailConfigTab } from './admin/AdminGmailConfigTab';
import { AdminReferralsTab } from './admin/AdminReferralsTab';
import { AdminFeedbackTab } from './admin/AdminFeedbackTab';

export type { ServicePlan, LanguageItem };

export function AdminView() {
  const { refreshLanguages } = useAppStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // -------------------------------------------------------------
  // TAB 1: PAYMENT REQUESTS STATE
  // -------------------------------------------------------------
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<PaymentRequest | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectModalTarget, setRejectModalTarget] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 2: SERVICE PLANS STATE
  // -------------------------------------------------------------
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isResettingPlans, setIsResettingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [planAuditLogs, setPlanAuditLogs] = useState<PlanAuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: LANGUAGES STATE
  // -------------------------------------------------------------
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ code: '', name: '', flag: '🌐' });

  // -------------------------------------------------------------
  // TAB 4: USERS STATE
  // -------------------------------------------------------------
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [userPlanFilter, setUserPlanFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showResetModal, setShowResetModal] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saasMetrics, setSaasMetrics] = useState<{
    totalUsers: number;
    activeSubscribers: number;
    unpaidUsers: number;
    pendingApprovalCount: number;
    expiredUsers: number;
    totalRevenue: number;
    mrr: number;
    conversionRatePercent: number;
  } | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [grantModalUser, setGrantModalUser] = useState<ManagedUser | null>(null);
  const [grantPlanId, setGrantPlanId] = useState('PERSONAL_1M');
  const [grantDurationDays, setGrantDurationDays] = useState(30);
  const [grantReason, setGrantReason] = useState('Kích hoạt bởi Admin');
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [isSavingAdminNote, setIsSavingAdminNote] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'USER',
    plan: 'FREE',
    temporaryPassword: 'Password123!'
  });

  // -------------------------------------------------------------
  // TAB 5: BANK CONFIG STATE
  // -------------------------------------------------------------
  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '888899998888',
    accountHolder: 'CONG TY CONG NGHE LIFEOS',
    transferPrefix: 'NANGCAP',
    bankCode: 'MB'
  });
  const [isSavingBankConfig, setIsSavingBankConfig] = useState(false);

  // -------------------------------------------------------------
  // TAB 8: GMAIL STATE
  // -------------------------------------------------------------
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

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (planFilter !== 'ALL') params.append('plan', planFilter);
      if (requestSearch.trim()) params.append('search', requestSearch.trim());

      const res = await apiCall(`/api/admin/payments/requests?${params.toString()}`);
      if (res && res.success) {
        setRequests(res.requests || []);
        if (res.counts) setRequestCounts(res.counts);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách yêu cầu thanh toán:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const res = await apiCall('/api/admin/plans');
      if (res && res.success) setPlans(res.plans || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải danh sách gói dịch vụ', type: 'error' });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchPlanAuditLogs = async () => {
    try {
      const res = await apiCall('/api/admin/plans/audit-history');
      if (res && res.success) setPlanAuditLogs(res.logs || []);
    } catch (err: any) {
      console.warn('Lỗi khi tải lịch sử kiểm toán gói:', err);
    }
  };

  const fetchLanguages = async () => {
    try {
      setIsLoadingLanguages(true);
      const res = await apiCall('/api/admin/languages');
      if (res && res.success) setLanguages(res.languages || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải danh sách ngôn ngữ', type: 'error' });
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const params = new URLSearchParams();
      if (userSearchTerm) params.append('search', userSearchTerm);
      if (roleFilter !== 'All') params.append('role', roleFilter);
      if (userStatusFilter !== 'All') params.append('status', userStatusFilter);
      if (userPlanFilter !== 'All') params.append('plan', userPlanFilter);

      const res = await apiCall(`/api/admin/users?${params.toString()}`);
      let list = res.data || [];
      if (userPlanFilter === 'PAID') {
        list = list.filter((u: any) => u.plan && u.plan !== 'FREE');
      } else if (userPlanFilter === 'FREE') {
        list = list.filter((u: any) => !u.plan || u.plan === 'FREE');
      }
      setUsers(list);
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải danh sách người dùng', type: 'error' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchSaasMetrics = async () => {
    try {
      const res = await apiCall('/api/admin/saas-metrics');
      if (res && res.success && res.metrics) setSaasMetrics(res.metrics);
    } catch (e) {
      console.warn('Lỗi khi tải SaaS metrics:', e);
    }
  };

  const handleOpenUserDetail = async (userId: string) => {
    try {
      const res = await apiCall(`/api/admin/users/${userId}/detail`);
      if (res && res.success) {
        setSelectedUserDetail(res);
        setAdminNoteText(res.adminNote || '');
      } else {
        setMessage({ text: res.message || 'Không thể tải chi tiết khách hàng', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải chi tiết khách hàng', type: 'error' });
    }
  };

  const handleSaveAdminNote = async (userId: string) => {
    try {
      setIsSavingAdminNote(true);
      const res = await apiCall(`/api/admin/users/${userId}/admin-notes`, 'PUT', { note: adminNoteText });
      if (res && res.success) {
        setMessage({ text: 'Đã lưu ghi chú vận hành nội bộ thành công!', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi lưu ghi chú', type: 'error' });
    } finally {
      setIsSavingAdminNote(false);
    }
  };

  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalUser) return;
    try {
      setIsGranting(true);
      const res = await apiCall(`/api/admin/users/${grantModalUser.id}/grant-subscription`, 'POST', {
        planId: grantPlanId,
        durationDays: grantDurationDays,
        reason: grantReason
      });

      if (res && res.success) {
        setMessage({ text: res.message || 'Cấp gói thành công!', type: 'success' });
        setGrantModalUser(null);
        await fetchUsers();
        await fetchSaasMetrics();
        if (selectedUserDetail?.user?.id === grantModalUser.id) {
          await handleOpenUserDetail(grantModalUser.id);
        }
      } else {
        setMessage({ text: res.message || 'Không thể cấp gói', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi cấp gói', type: 'error' });
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeSubscription = async (userId: string, userName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn thu hồi toàn bộ quyền sử dụng gói trả phí của khách hàng "${userName}"? Khách hàng sẽ bị khóa các tính năng chỉnh sửa ngay lập tức.`)) {
      return;
    }

    try {
      setIsRevoking(true);
      const res = await apiCall(`/api/admin/users/${userId}/revoke-subscription`, 'POST', {
        reason: 'Thu hồi bởi Quản trị viên'
      });

      if (res && res.success) {
        setMessage({ text: 'Đã thu hồi gói dịch vụ của khách hàng thành công!', type: 'success' });
        await fetchUsers();
        await fetchSaasMetrics();
        if (selectedUserDetail?.user?.id === userId) {
          await handleOpenUserDetail(userId);
        }
      } else {
        setMessage({ text: res.message || 'Không thể thu hồi gói', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi thu hồi gói', type: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  const fetchBankConfig = async () => {
    try {
      const res = await apiCall('/api/payments/bank-config');
      if (res && res.success && res.config) setBankConfig(res.config);
    } catch (err: any) {
      console.warn('Lỗi khi tải cấu hình ngân hàng:', err);
    }
  };

  const fetchGmailConfig = async () => {
    try {
      setIsLoadingGmailConfig(true);
      const res = await apiCall('/api/admin/gmail/config');
      if (res && res.success && res.config) setGmailConfig(res.config);
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
      if (res && res.success && res.logs) setGmailLogs(res.logs);
    } catch (err: any) {
      console.warn('Lỗi khi tải nhật ký email:', err);
    } finally {
      setIsLoadingGmailLogs(false);
    }
  };

  const handleSaveGmailConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingGmailConfig(true);
      const res = await apiCall('/api/admin/gmail/config', 'PUT', gmailConfig);
      if (res && res.success) {
        setMessage({ text: 'Lưu cấu hình Gmail thành công!', type: 'success' });
        if (res.config) setGmailConfig(res.config);
      } else {
        setMessage({ text: res.message || 'Không thể lưu cấu hình Gmail', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi lưu cấu hình Gmail', type: 'error' });
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
          setMessage({ text: res.message, type: 'success' });
          fetchGmailLogs();
        } else {
          setMessage({ text: res.message, type: 'error' });
        }
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối' });
      setMessage({ text: err.message || 'Lỗi kiểm tra kết nối', type: 'error' });
    } finally {
      setIsTestingGmail(false);
    }
  };

  // Initial load & Tab triggers
  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'plans') {
      fetchPlans();
      fetchPlanAuditLogs();
    } else if (activeTab === 'languages') {
      fetchLanguages();
    } else if (activeTab === 'users') {
      fetchUsers();
      fetchSaasMetrics();
    } else if (activeTab === 'bank_config') {
      fetchBankConfig();
    } else if (activeTab === 'gmail_config') {
      fetchGmailConfig();
      fetchGmailLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [statusFilter, planFilter, requestSearch]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [userSearchTerm, roleFilter, userStatusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (requests.length === 0) {
      alert('Không có dữ liệu giao dịch để xuất.');
      return;
    }
    const headers = ['Mã Đơn', 'Mã Giao Dịch', 'Email Khách Hàng', 'Tên Khách Hàng', 'Gói', 'Chu Kỳ', 'Số Tiền (VND)', 'Trạng Thái', 'Thời Gian Tạo', 'Người Duyệt', 'Thời Gian Duyệt', 'Ghi Chú'];
    const rows = requests.map(r => [
      r.orderId,
      r.txReference,
      r.customerEmail,
      r.user?.name || '',
      r.planRequested,
      r.billingCycle,
      r.amount,
      r.status,
      new Date(r.createdAt).toISOString(),
      r.approvedBy || '',
      r.approvedAt ? new Date(r.approvedAt).toISOString() : '',
      `"${(r.note || r.rejectedReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lifeos_payment_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApprovePayment = async () => {
    if (!approveConfirmTarget) return;
    try {
      setIsApproving(true);
      const res = await apiCall(`/api/admin/payments/${approveConfirmTarget.id}/approve`, 'POST');
      if (res && res.success) {
        setMessage({
          text: `Đã duyệt thanh toán thành công cho ${approveConfirmTarget.customerEmail}! Gói ${approveConfirmTarget.planRequested} đã được kích hoạt.`,
          type: 'success'
        });
        setApproveConfirmTarget(null);
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể duyệt thanh toán.');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi duyệt thanh toán', type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTarget || !rejectReason.trim()) return;
    try {
      setIsRejecting(true);
      const res = await apiCall(`/api/admin/payments/${rejectModalTarget.id}/reject`, 'POST', {
        reason: rejectReason.trim()
      });
      if (res && res.success) {
        setMessage({
          text: `Đã từ chối yêu cầu thanh toán ${rejectModalTarget.txReference}. Khách hàng đã được thông báo kèm lý do.`,
          type: 'success'
        });
        setRejectModalTarget(null);
        setRejectReason('');
        await fetchRequests();
      } else {
        throw new Error(res?.message || 'Không thể từ chối yêu cầu.');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi từ chối yêu cầu', type: 'error' });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      setIsSavingPlan(true);
      const res = await apiCall(`/api/admin/plans/${editingPlan.id}`, 'PUT', {
        name: editingPlan.name,
        badge: editingPlan.badge,
        description: editingPlan.description,
        monthlyPrice: Number(editingPlan.monthlyPrice),
        yearlyPrice: Number(editingPlan.yearlyPrice),
        billingCycle: editingPlan.billingCycle,
        status: editingPlan.status,
        order: Number(editingPlan.order),
        features: editingPlan.features,
        quota: editingPlan.quota
      });
      if (res && res.success) {
        setMessage({
          text: `Cập nhật gói "${editingPlan.name}" thành công! Giá mới sẽ áp dụng an toàn cho các đơn hàng tạo sau thời điểm này.`,
          type: 'success'
        });
        setEditingPlan(null);
        await fetchPlans();
        await fetchPlanAuditLogs();
      } else {
        throw new Error(res?.message || 'Không thể cập nhật gói');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi lưu gói', type: 'error' });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleResetPlans = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục và đồng bộ danh sách gói dịch vụ trong quản trị về cấu hình chính thức (Cá nhân 1T, Cá nhân 3T, Team 1T)?')) {
      return;
    }
    try {
      setIsResettingPlans(true);
      const res = await apiCall('/api/admin/plans/reset-defaults', 'POST');
      if (res && res.success) {
        setMessage({
          text: 'Đã đồng bộ và cập nhật danh sách gói dịch vụ về chuẩn chính thức thành công!',
          type: 'success'
        });
        await fetchPlans();
        await fetchPlanAuditLogs();
      } else {
        throw new Error(res?.message || 'Không thể khôi phục gói');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi khôi phục gói', type: 'error' });
    } finally {
      setIsResettingPlans(false);
    }
  };

  const handleToggleLanguageStatus = async (code: string) => {
    const updated = languages.map(lang => {
      if (lang.code === code) {
        return { ...lang, status: (lang.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE' };
      }
      return lang;
    });

    if (!updated.some(l => l.status === 'ACTIVE')) {
      setMessage({ text: 'Bắt buộc phải có ít nhất 1 ngôn ngữ hoạt động.', type: 'error' });
      return;
    }

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        setMessage({ text: 'Cập nhật trạng thái ngôn ngữ thành công!', type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi cập nhật ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleSetDefaultLanguage = async (code: string) => {
    const updated = languages.map(lang => ({
      ...lang,
      isDefault: lang.code === code,
      status: (lang.code === code ? 'ACTIVE' : lang.status) as 'ACTIVE' | 'INACTIVE'
    }));

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        setMessage({ text: `Đã đặt ngôn ngữ mặc định thành công!`, type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi cập nhật ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLanguage.code.trim() || !newLanguage.name.trim()) return;
    const cleanCode = newLanguage.code.toLowerCase().trim();
    if (languages.some(l => l.code === cleanCode)) {
      setMessage({ text: 'Mã ngôn ngữ này đã tồn tại trong danh sách.', type: 'error' });
      return;
    }

    const updated: LanguageItem[] = [
      ...languages,
      {
        code: cleanCode,
        name: newLanguage.name.trim(),
        flag: newLanguage.flag.trim() || '🌐',
        status: 'ACTIVE',
        isDefault: false
      }
    ];

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        setShowAddLanguageModal(false);
        setNewLanguage({ code: '', name: '', flag: '🌐' });
        setMessage({ text: `Đã thêm ngôn ngữ ${newLanguage.name} thành công!`, type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi thêm ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleDeleteLanguage = async (code: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ngôn ngữ "${name}" (${code}) khỏi hệ thống?`)) return;
    try {
      setIsSavingLanguages(true);
      const res = await apiCall(`/api/admin/languages/${code}`, 'DELETE');
      if (res && res.success) {
        setLanguages(res.languages || languages.filter(l => l.code !== code));
        setMessage({ text: `Đã xóa ngôn ngữ "${name}" thành công!`, type: 'success' });
        refreshLanguages?.();
      } else {
        throw new Error(res?.message || 'Không thể xóa ngôn ngữ');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi xóa ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingBankConfig(true);
      const res = await apiCall('/api/admin/payments/bank-config', 'PUT', bankConfig);
      if (res && res.success) {
        setMessage({ text: 'Cập nhật cấu hình thông tin ngân hàng thành công!', type: 'success' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        throw new Error(res?.message || 'Không thể lưu cấu hình ngân hàng');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi lưu cấu hình', type: 'error' });
    } finally {
      setIsSavingBankConfig(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);
    try {
      await apiCall('/api/admin/users', 'POST', newUser);
      setMessage({ text: `Đã khởi tạo tài khoản cho ${newUser.name}`, type: 'success' });
      setShowCreateModal(false);
      setNewUser({
        name: '',
        email: '',
        role: 'USER',
        plan: 'FREE',
        temporaryPassword: 'Password123!'
      });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể tạo tài khoản', type: 'error' });
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await apiCall(`/api/admin/users/${userId}/status`, 'PUT', { status, reason: 'Admin dashboard change' });
      setMessage({ text: 'Cập nhật trạng thái thành công', type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể thay đổi trạng thái', type: 'error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal || !newPassword) return;
    try {
      await apiCall(`/api/admin/users/${showResetModal.id}/reset-password`, 'PUT', {
        newPassword,
        reason: 'Admin reset password'
      });
      setMessage({ text: `Đã đặt lại mật khẩu cho ${showResetModal.name}`, type: 'success' });
      setShowResetModal(null);
      setNewPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể đặt lại mật khẩu', type: 'error' });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Title & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-blue-600" />
            <span>Trung Tâm Quản Trị Hệ Thống</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Duyệt thanh toán QR, quản lý gói dịch vụ, ngôn ngữ hệ thống, người dùng và thông tin ngân hàng
          </p>
        </div>

        {/* Global Tabs */}
        <div className="flex flex-wrap items-center bg-purple-50/70 dark:bg-slate-800/80 p-1.5 rounded-2xl self-start lg:self-auto gap-1 border border-purple-100/70 dark:border-purple-950/40 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Yêu cầu thanh toán</span>
            {requestCounts.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                {requestCounts.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Quản lý Subscription</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Gói dịch vụ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('languages')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'languages'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Ngôn ngữ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Người dùng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank_config')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bank_config'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Cấu hình QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Lưu trữ R2</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_modules')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'custom_modules'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Module Động</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gmail_config')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gmail_config'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs ring-1 ring-rose-100 dark:ring-rose-950'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cấu hình Gmail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'referrals'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Chương Trình Giới Thiệu (20%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-100 dark:ring-purple-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Quản Lý Góp Ý</span>
          </button>
        </div>
      </div>

      {/* Admin Action Center: Pending items alert */}
      {requestCounts.pending > 0 && activeTab !== 'requests' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-white text-base">⚠️</span>
            <div>
              <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                Có {requestCounts.pending} đơn thanh toán đang chờ duyệt kích hoạt gói
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Khách hàng đã chuyển khoản và đang đợi xác nhận để bắt đầu sử dụng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all shadow-sm shrink-0 cursor-pointer"
          >
            Duyệt ngay ⚡
          </button>
        </div>
      )}

      {/* Global Status Message Toast */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-150 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span className="flex-1">{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Requests */}
      {activeTab === 'requests' && (
        <AdminRequestsTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 1b: Subscriptions Management */}
      {activeTab === 'subscriptions' && (
        <AdminSubscriptionsTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 2: Plans */}
      {activeTab === 'plans' && (
        <AdminPlansTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 3: Languages */}
      {activeTab === 'languages' && (
        <AdminLanguagesTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 4: Users */}
      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          isLoadingUsers={isLoadingUsers}
          userSearchTerm={userSearchTerm}
          setUserSearchTerm={setUserSearchTerm}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          userStatusFilter={userStatusFilter}
          setUserStatusFilter={setUserStatusFilter}
          userPlanFilter={userPlanFilter}
          setUserPlanFilter={setUserPlanFilter}
          saasMetrics={saasMetrics}
          onRefreshUsers={() => {
            fetchUsers();
            fetchSaasMetrics();
          }}
          handleStatusChange={handleStatusChange}
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
          newUser={newUser}
          setNewUser={setNewUser}
          handleCreateUser={handleCreateUser}
          isSubmittingUser={isSubmittingUser}
          showResetModal={showResetModal}
          setShowResetModal={setShowResetModal}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          handleResetPassword={handleResetPassword}
          selectedUserDetail={selectedUserDetail}
          setSelectedUserDetail={setSelectedUserDetail}
          handleOpenUserDetail={handleOpenUserDetail}
          adminNoteText={adminNoteText}
          setAdminNoteText={setAdminNoteText}
          handleSaveAdminNote={handleSaveAdminNote}
          isSavingAdminNote={isSavingAdminNote}
          grantModalUser={grantModalUser}
          setGrantModalUser={setGrantModalUser}
          grantPlanId={grantPlanId}
          setGrantPlanId={setGrantPlanId}
          grantDurationDays={grantDurationDays}
          setGrantDurationDays={setGrantDurationDays}
          grantReason={grantReason}
          setGrantReason={setGrantReason}
          handleGrantSubscription={handleGrantSubscription}
          isGranting={isGranting}
          handleRevokeSubscription={handleRevokeSubscription}
          isRevoking={isRevoking}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Tab 5: Bank Config */}
      {activeTab === 'bank_config' && (
        <AdminBankConfigTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 6: Storage */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <CloudflareR2View />
        </div>
      )}

      {/* Tab 7: Custom Modules */}
      {activeTab === 'custom_modules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <AdminCustomModulesTab />
        </div>
      )}

      {/* Tab 8: Gmail Config */}
      {activeTab === 'gmail_config' && (
        <AdminGmailConfigTab
          onShowMessage={setMessage}
        />
      )}

      {/* Tab 9: Referrals Program */}
      {activeTab === 'referrals' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <AdminReferralsTab />
        </div>
      )}

      {/* Tab 10: Feedback Management */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <AdminFeedbackTab />
        </div>
      )}
    </div>
  );
}
