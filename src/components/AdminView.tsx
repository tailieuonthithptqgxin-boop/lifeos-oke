import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Ban,
  KeyRound,
  Receipt,
  Clock,
  Check,
  X,
  QrCode,
  Building2,
  Copy,
  Tag,
  Filter,
  Eye,
  AlertTriangle,
  ArrowRight,
  Settings,
  CreditCard,
  Zap,
  ChevronRight,
  Download,
  Languages,
  Package,
  History,
  Edit,
  Trash2,
  Globe,
  RotateCcw,
  Cloud,
  Layers
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { useAppStore } from '../lib/store';
import { CloudflareR2View } from './CloudflareR2View';
import { AdminCustomModulesTab } from './AdminCustomModulesTab';

type AdminTab = 'requests' | 'plans' | 'languages' | 'users' | 'bank_config' | 'storage' | 'custom_modules';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  avatar?: string;
  createdAt: string;
}

interface PaymentRequest {
  id: string;
  userId: string;
  customerEmail: string;
  orderId: string;
  planRequested: string;
  amount: number;
  method: string;
  status: string; // PENDING | APPROVED | REJECTED | CANCELLED
  txReference: string;
  billingCycle: string;
  note?: string | null;
  rejectedReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    avatar?: string;
  };
}

interface BankConfig {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferPrefix: string;
  bankCode: string;
}

export interface ServicePlan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingCycle: string;
  status: 'ACTIVE' | 'INACTIVE';
  order: number;
  features: string[];
  quota?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface LanguageItem {
  code: string;
  name: string;
  flag: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
}

interface PlanAuditLog {
  id: string;
  adminId: string;
  action: string;
  beforeState: string | null;
  afterState: string | null;
  timestamp: string;
}

export function AdminView() {
  const { refreshLanguages } = useAppStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // -------------------------------------------------------------
  // TAB 1: PAYMENT & UPGRADE REQUESTS STATE
  // -------------------------------------------------------------
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');

  // Approve / Reject action modals
  const [approveConfirmTarget, setApproveConfirmTarget] = useState<PaymentRequest | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const [rejectModalTarget, setRejectModalTarget] = useState<PaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 2: SERVICE PLANS MANAGEMENT STATE
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
  // TAB 3: LANGUAGES MANAGEMENT STATE
  // -------------------------------------------------------------
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ code: '', name: '', flag: '🌐' });

  // -------------------------------------------------------------
  // TAB 4: MANAGED USERS STATE
  // -------------------------------------------------------------
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
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
  const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);
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
  // TAB 5: BANK & VIETQR CONFIGURATION STATE
  // -------------------------------------------------------------
  const [bankConfig, setBankConfig] = useState<BankConfig>({
    bankName: 'MBBank (Ngân hàng TMCP Quân Đội)',
    accountNumber: '888899998888',
    accountHolder: 'CONG TY CONG NGHE LIFEOS',
    transferPrefix: 'NANGCAP',
    bankCode: 'MB'
  });
  const [isLoadingBankConfig, setIsLoadingBankConfig] = useState(false);
  const [isSavingBankConfig, setIsSavingBankConfig] = useState(false);

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
        if (res.counts) {
          setRequestCounts(res.counts);
        }
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
      if (res && res.success) {
        setPlans(res.plans || []);
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải danh sách gói dịch vụ', type: 'error' });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchPlanAuditLogs = async () => {
    try {
      const res = await apiCall('/api/admin/plans/audit-history');
      if (res && res.success) {
        setPlanAuditLogs(res.logs || []);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải lịch sử kiểm toán gói:', err);
    }
  };

  const fetchLanguages = async () => {
    try {
      setIsLoadingLanguages(true);
      const res = await apiCall('/api/admin/languages');
      if (res && res.success) {
        setLanguages(res.languages || []);
      }
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

      const res = await apiCall(`/api/admin/users?${params.toString()}`);
      setUsers(res.data || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải danh sách người dùng', type: 'error' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchSaasMetrics = async () => {
    try {
      const res = await apiCall('/api/admin/saas-metrics');
      if (res && res.success && res.metrics) {
        setSaasMetrics(res.metrics);
      }
    } catch (e) {
      console.warn('Lỗi khi tải SaaS metrics:', e);
    }
  };

  const handleOpenUserDetail = async (userId: string) => {
    try {
      setIsLoadingUserDetail(true);
      const res = await apiCall(`/api/admin/users/${userId}/detail`);
      if (res && res.success) {
        setSelectedUserDetail(res);
        setAdminNoteText(res.adminNote || '');
      } else {
        setMessage({ text: res.message || 'Không thể tải chi tiết khách hàng', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi tải chi tiết khách hàng', type: 'error' });
    } finally {
      setIsLoadingUserDetail(false);
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
      setIsLoadingBankConfig(true);
      const res = await apiCall('/api/payments/bank-config');
      if (res && res.success && res.config) {
        setBankConfig(res.config);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải cấu hình ngân hàng:', err);
    } finally {
      setIsLoadingBankConfig(false);
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
    } else if (activeTab === 'bank_config') {
      fetchBankConfig();
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

  // Export CSV for financial reconciliation
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

  // -------------------------------------------------------------
  // APPROVE PAYMENT HANDLER
  // -------------------------------------------------------------
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
      setMessage({
        text: err.message || 'Lỗi khi duyệt thanh toán',
        type: 'error'
      });
    } finally {
      setIsApproving(false);
    }
  };

  // -------------------------------------------------------------
  // REJECT PAYMENT HANDLER
  // -------------------------------------------------------------
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
      setMessage({
        text: err.message || 'Lỗi khi từ chối yêu cầu',
        type: 'error'
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // -------------------------------------------------------------
  // PLANS MANAGEMENT HANDLERS
  // -------------------------------------------------------------
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

  const handleAddFeature = () => {
    if (!newFeatureInput.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeatureInput.trim()]
    });
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, idx) => idx !== index)
    });
  };

  // -------------------------------------------------------------
  // LANGUAGES MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleToggleLanguageStatus = async (code: string) => {
    const updated = languages.map(lang => {
      if (lang.code === code) {
        return {
          ...lang,
          status: lang.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        };
      }
      return lang;
    });

    // Prevent turning off all languages
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
      status: lang.code === code ? 'ACTIVE' : lang.status
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

  // -------------------------------------------------------------
  // BANK CONFIG UPDATE HANDLER
  // -------------------------------------------------------------
  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingBankConfig(true);
      const res = await apiCall('/api/admin/payments/bank-config', 'PUT', bankConfig);

      if (res && res.success) {
        setMessage({
          text: 'Cập nhật cấu hình thông tin ngân hàng thành công!',
          type: 'success'
        });
        setTimeout(() => setMessage(null), 4000);
      } else {
        throw new Error(res?.message || 'Không thể lưu cấu hình ngân hàng');
      }
    } catch (err: any) {
      setMessage({
        text: err.message || 'Lỗi khi lưu cấu hình',
        type: 'error'
      });
    } finally {
      setIsSavingBankConfig(false);
    }
  };

  // -------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // -------------------------------------------------------------
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

  const handlePlanChange = async (userId: string, plan: string) => {
    try {
      await apiCall(`/api/admin/users/${userId}/plan`, 'PUT', { plan, reason: 'Admin plan change' });
      setMessage({ text: 'Cập nhật gói thành công', type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể thay đổi gói', type: 'error' });
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
        <div className="flex flex-wrap items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl self-start lg:self-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
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
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
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
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
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
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
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
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
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
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
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
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Module Động</span>
          </button>
        </div>
      </div>

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
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 1: YÊU CẦU NÂNG CẤP / THANH TOÁN QUẢN TRỊ                 */}
      {/* ============================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-xs font-bold uppercase tracking-wider">Chờ Duyệt (Pending)</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300">
                {requestCounts.pending}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Cần kiểm tra giao dịch & kích hoạt</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                <span className="text-xs font-bold uppercase tracking-wider">Đã Duyệt (Approved)</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">
                {requestCounts.approved}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Đã nâng cấp quyền cho tài khoản</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
                <span className="text-xs font-bold uppercase tracking-wider">Từ Chối (Rejected)</span>
                <Ban className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-800 dark:text-rose-300">
                {requestCounts.rejected}
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">Không khớp giao dịch hoặc sai cú pháp</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1">
              <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Đơn Hàng</span>
                <Receipt className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-800 dark:text-blue-300">
                {requestCounts.all}
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400">Toàn bộ yêu cầu qua chuyển khoản</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo Email, Tên khách, Mã giao dịch (NANGCAP-ORD_...)..."
                value={requestSearch}
                onChange={e => setRequestSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt (PENDING)</option>
                <option value="APPROVED">Đã duyệt (APPROVED)</option>
                <option value="REJECTED">Từ chối (REJECTED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>

              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">Tất cả gói</option>
                <option value="PERSONAL_1M">Cá Nhân (1 Tháng)</option>
                <option value="PERSONAL_3M">Cá Nhân (3 Tháng)</option>
                <option value="TEAM_1M">Team (1 Tháng)</option>
                <option value="PRO">Gói PRO (Cũ)</option>
                <option value="TEAM">Gói TEAM (Cũ)</option>
              </select>

              <button
                type="button"
                onClick={handleExportCSV}
                title="Xuất danh sách ra tệp CSV"
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </button>

              <button
                type="button"
                onClick={fetchRequests}
                disabled={isLoadingRequests}
                title="Làm mới danh sách"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            {requests.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  Không có yêu cầu thanh toán nào
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {statusFilter !== 'ALL' || planFilter !== 'ALL' || requestSearch
                    ? 'Không có kết quả khớp với bộ lọc hiện tại. Thử đổi tiêu chí tìm kiếm.'
                    : 'Hiện chưa có khách hàng nào gửi yêu cầu chuyển khoản thanh toán gói SaaS.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Khách hàng</th>
                      <th className="py-3.5 px-4">Gói & Thời hạn</th>
                      <th className="py-3.5 px-4">Số tiền cần chuyển</th>
                      <th className="py-3.5 px-4">Nội dung CK / Mã GD</th>
                      <th className="py-3.5 px-4">Thời gian</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Xử lý duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {requests.map((req) => {
                      const isPending = req.status === 'PENDING' || req.status === 'Pending';
                      const isApproved = req.status === 'APPROVED' || req.status === 'Paid';
                      const isRejected = req.status === 'REJECTED';
                      const isCancelled = req.status === 'CANCELLED';

                      return (
                        <tr
                          key={req.id}
                          className={`transition-colors ${
                            isPending
                              ? 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {/* User info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={req.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user?.name || req.customerEmail)}`}
                                alt="avatar"
                                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                                  {req.user?.name || 'Khách hàng'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
                                  {req.customerEmail}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  Gói hiện tại: {req.user?.plan || 'FREE'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Plan requested */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                req.planRequested === 'TEAM'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {req.planRequested}
                              </span>
                              <span className="text-slate-500 text-[11px]">
                                ({req.billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'})
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {formatCurrency(req.amount)}
                            </span>
                          </td>

                          {/* Transfer Memo */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 select-all text-xs">
                                {req.txReference || req.orderId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(req.txReference || req.orderId, req.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
                                title="Sao chép mã giao dịch"
                              >
                                {copySuccess === req.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {req.note && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5 max-w-[200px] truncate" title={req.note}>
                                Note: {req.note}
                              </p>
                            )}
                          </td>

                          {/* Created at */}
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(req.createdAt).toLocaleString('vi-VN')}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isPending && (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Chờ Duyệt</span>
                              </div>
                            )}

                            {isApproved && (
                              <div>
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Đã Duyệt</span>
                                </div>
                                {req.approvedBy && (
                                  <span className="block text-[10px] text-slate-400 mt-0.5">
                                    Bởi: {req.approvedBy.split('@')[0]}
                                  </span>
                                )}
                              </div>
                            )}

                            {isRejected && (
                              <div>
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <X className="w-3 h-3" />
                                  <span>Từ Chối</span>
                                </div>
                                {req.rejectedReason && (
                                  <span className="block text-[10px] text-rose-600 dark:text-rose-400 italic mt-0.5 max-w-[140px] truncate" title={req.rejectedReason}>
                                    {req.rejectedReason}
                                  </span>
                                )}
                              </div>
                            )}

                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Đã Hủy
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setApproveConfirmTarget(req)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Duyệt & Nâng cấp</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModalTarget(req);
                                    setRejectReason('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            ) : isApproved ? (
                              <span className="text-[11px] text-emerald-600 font-semibold">
                                ✓ Hoàn tất
                              </span>
                            ) : isRejected ? (
                              <span className="text-[11px] text-rose-500 font-semibold">
                                Đã từ chối
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Không khả dụng
                              </span>
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
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: QUẢN LÝ GÓI DỊCH VỤ (SERVICE PLANS MANAGEMENT)         */}
      {/* ============================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Danh Sách Gói Dịch Vụ</h3>
              <p className="text-xs text-slate-500">
                Chỉnh sửa giá gói, chu kỳ, tính năng và trạng thái. Thay đổi giá chỉ áp dụng cho đơn hàng mới, đơn hàng cũ giữ nguyên snapshot.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetPlans}
                disabled={isResettingPlans || isLoadingPlans}
                className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer"
                title="Đồng bộ danh sách gói về gói chính thức (Cá nhân 1T, Cá nhân 3T, Team 1T)"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingPlans ? 'animate-spin' : ''}`} />
                <span>{isResettingPlans ? 'Đang khôi phục...' : 'Khôi phục gói chính thức'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuditLogs(!showAuditLogs)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>{showAuditLogs ? 'Ẩn Lịch sử đổi giá' : 'Lịch sử đổi giá'}</span>
              </button>

              <button
                type="button"
                onClick={fetchPlans}
                disabled={isLoadingPlans}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingPlans ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Clean Plans Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6">Gói</th>
                    <th className="py-4 px-6 text-right">Giá</th>
                    <th className="py-4 px-6">Chu kỳ</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {plan.name}
                          </span>
                          {plan.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                          {plan.description}
                        </p>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          {plan.monthlyPrice === 0 ? '0 ₫' : formatCurrency(plan.monthlyPrice)}
                          <span className="text-[10px] font-normal text-slate-400">/{plan.billingCycle || 'chu kỳ'}</span>
                        </div>
                        {plan.yearlyPrice > 0 && (
                          <div className="text-[11px] text-slate-400">
                            {formatCurrency(plan.yearlyPrice)}/năm
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 font-medium">
                        {plan.billingCycle}
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          plan.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${plan.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          <span>{plan.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingPlan(plan)}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit History Log Accordion */}
          {showAuditLogs && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs animate-in fade-in duration-150">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Nhật Ký Kiểm Toán Thay Đổi Gói & Giá</span>
              </h4>

              {planAuditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Chưa có thay đổi giá nào được ghi nhận gần đây.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3">Người thay đổi</th>
                        <th className="py-2.5 px-3">Gói</th>
                        <th className="py-2.5 px-3">Giá cũ → Giá mới</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {planAuditLogs.map((log) => {
                        let before: any = {};
                        let after: any = {};
                        try { before = JSON.parse(log.beforeState || '{}'); } catch(e){}
                        try { after = JSON.parse(log.afterState || '{}'); } catch(e){}

                        return (
                          <tr key={log.id}>
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {after.updatedBy || log.adminId}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-blue-600">
                              {after.name || after.planId}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="line-through text-slate-400 mr-2">
                                {before.monthlyPrice ? formatCurrency(before.monthlyPrice) : '—'}
                              </span>
                              <span className="font-bold text-emerald-600">
                                {after.monthlyPrice ? formatCurrency(after.monthlyPrice) : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                                {after.status || 'ACTIVE'}
                              </span>
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
      )}

      {/* ============================================================= */}
      {/* TAB 3: QUẢN LÝ NGÔN NGỮ (LANGUAGES MANAGEMENT)                */}
      {/* ============================================================= */}
      {activeTab === 'languages' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Cấu Hình Ngôn Ngữ Hệ Thống</h3>
              <p className="text-xs text-slate-500">
                Kích hoạt, tắt hoặc đặt ngôn ngữ mặc định. Người dùng có thể chuyển đổi giữa các ngôn ngữ đang hoạt động.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddLanguageModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ngôn ngữ</span>
            </button>
          </div>

          {/* Simple, Modern Languages Card List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Danh sách ngôn ngữ ({languages.filter(l => l.status === 'ACTIVE').length} đang hoạt động)
              </h4>
              <button
                type="button"
                onClick={fetchLanguages}
                disabled={isLoadingLanguages}
                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLanguages ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoadingLanguages && languages.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                Đang tải cấu hình ngôn ngữ...
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {languages.map((lang) => {
                  const isActive = lang.status === 'ACTIVE';

                  return (
                    <div
                      key={lang.code}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-2xl select-none" role="img" aria-label={lang.name}>
                          {lang.flag}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {lang.name}
                            </span>
                            <span className="text-xs font-mono text-slate-400 uppercase">
                              ({lang.code})
                            </span>
                            {lang.isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span className={`text-xs font-semibold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {isActive ? 'Đang hoạt động' : 'Tắt'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {!lang.isDefault && isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultLanguage(lang.code)}
                            disabled={isSavingLanguages}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Đặt làm mặc định
                          </button>
                        )}

                        {!lang.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleToggleLanguageStatus(lang.code)}
                            disabled={isSavingLanguages}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            {isActive ? 'Tắt' : 'Kích hoạt'}
                          </button>
                        )}

                        {!lang.isDefault && lang.code !== 'vi' && lang.code !== 'en' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLanguage(lang.code, lang.name)}
                            disabled={isSavingLanguages}
                            title="Xóa ngôn ngữ"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: KHÁCH HÀNG & VẬN HÀNH SAAS (USER & CUSTOMER OPS)        */}
      {/* ============================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Vận Hành & Quản Trị Khách Hàng SaaS</h3>
              <p className="text-xs text-slate-500">Giám sát vòng đời tài khoản, cấp/thu hồi gói và ghi chú khách hàng</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Cấp Tài Khoản Mới
            </button>
          </div>

          {/* SaaS KPI Metrics Overview Cards */}
          {saasMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng khách hàng</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {saasMetrics.totalUsers}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Đang hoạt động</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {saasMetrics.activeSubscribers}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chưa trả phí</span>
                <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
                  {saasMetrics.unpaidUsers}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-amber-500/20 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Chờ duyệt</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {saasMetrics.pendingApprovalCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-blue-500/20 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">MRR (Doanh thu tháng)</span>
                <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-1 truncate">
                  {formatCurrency(saasMetrics.mrr)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-purple-500/20 rounded-2xl p-3.5 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Tỷ lệ chuyển đổi</span>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {saasMetrics.conversionRatePercent}%
                </div>
              </div>
            </div>
          )}

          {/* Filter and Search */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="All">Tất cả vai trò</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERADMIN">SuperAdmin</option>
              </select>
              <select
                value={userStatusFilter}
                onChange={e => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DISABLED">Disabled</option>
              </select>
              <button
                type="button"
                onClick={() => { fetchUsers(); fetchSaasMetrics(); }}
                disabled={isLoadingUsers}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 cursor-pointer"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Khách hàng</th>
                    <th className="px-4 py-3.5">Vai trò</th>
                    <th className="px-4 py-3.5">Gói hiện tại</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right">Vận hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map(u => {
                    const isPaidPlan = u.plan && u.plan !== 'FREE';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`}
                              alt={u.name}
                              className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white truncate">{u.name}</div>
                              <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                              u.role === 'SUPERADMIN'
                                ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                                : u.role === 'ADMIN'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            isPaidPlan
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaidPlan ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{u.plan === 'FREE' ? 'Chưa kích hoạt' : u.plan}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={u.status}
                            onChange={e => handleStatusChange(u.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                                : u.status === 'SUSPENDED'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetail(u.id)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                              title="Xem chi tiết & lịch sử"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setGrantModalUser(u);
                                setGrantPlanId('PERSONAL_1M');
                                setGrantDurationDays(30);
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                              title="Cấp / Gia hạn gói nhanh"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>

                            {isPaidPlan && (
                              <button
                                type="button"
                                onClick={() => handleRevokeSubscription(u.id, u.name)}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Thu hồi quyền gói trả phí"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setShowResetModal(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: CẤU HÌNH THÔNG TIN NGÂN HÀNG & VIETQR                  */}
      {/* ============================================================= */}
      {activeTab === 'bank_config' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Cấu Hình Ngân Hàng & Mã QR</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cấu hình tài khoản nhận tiền chuyển khoản của khách hàng khi nâng cấp gói trực tuyến. Không cần hardcode trong mã nguồn.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form configuration */}
            <form onSubmit={handleSaveBankConfig} className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Ngân Hàng Thụ Hưởng *
                </label>
                <input
                  type="text"
                  required
                  value={bankConfig.bankName}
                  onChange={e => setBankConfig({ ...bankConfig, bankName: e.target.value })}
                  placeholder="Ví dụ: MBBank (Ngân hàng TMCP Quân Đội)"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mã Ngân Hàng VietQR (Bank Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankConfig.bankCode}
                    onChange={e => setBankConfig({ ...bankConfig, bankCode: e.target.value.toUpperCase().trim() })}
                    placeholder="MB, VCB, TCB, ACB, BIDV, VPB..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Mã chuẩn VietQR (ví dụ: MB, VCB, TCB, ACB, BIDV, VPB, TPB, STB, VIB)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Số Tài Khoản Nhận Tiền *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankConfig.accountNumber}
                    onChange={e => setBankConfig({ ...bankConfig, accountNumber: e.target.value.trim() })}
                    placeholder="Số tài khoản ngân hàng..."
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Chủ Tài Khoản (In hoa không dấu) *
                </label>
                <input
                  type="text"
                  required
                  value={bankConfig.accountHolder}
                  onChange={e => setBankConfig({ ...bankConfig, accountHolder: e.target.value.toUpperCase() })}
                  placeholder="CONG TY CONG NGHE LIFEOS"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 uppercase text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tiền Tố Nội Dung Chuyển Khoản *
                </label>
                <input
                  type="text"
                  required
                  value={bankConfig.transferPrefix}
                  onChange={e => setBankConfig({ ...bankConfig, transferPrefix: e.target.value.toUpperCase().trim() })}
                  placeholder="NANGCAP"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono uppercase text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Cú pháp nội dung chuyển khoản: [TIỀN TỐ]-[MÃ ĐƠN HÀNG], ví dụ: {bankConfig.transferPrefix || 'NANGCAP'}-ORD_172778...
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingBankConfig}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingBankConfig ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Ngân Hàng'}</span>
                </button>
              </div>
            </form>

            {/* Live VietQR Preview */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs flex flex-col items-center text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bản xem trước trực tiếp (Live VietQR Preview)
              </span>

              <div className="w-56 h-56 bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center shadow-xs">
                <img
                  src={`https://img.vietqr.io/image/${bankConfig.bankCode || 'MB'}-${bankConfig.accountNumber}-compact2.png?amount=15000&addInfo=${encodeURIComponent(`${bankConfig.transferPrefix || 'NANGCAP'}-ORD8899`)}&accountName=${encodeURIComponent(bankConfig.accountHolder)}`}
                  alt="VietQR Preview"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div><strong>Ngân hàng:</strong> {bankConfig.bankName}</div>
                <div><strong>Số TK:</strong> {bankConfig.accountNumber}</div>
                <div><strong>Chủ TK:</strong> {bankConfig.accountHolder}</div>
                <div><strong>Nội dung mẫu:</strong> <code className="text-blue-600 font-mono">{bankConfig.transferPrefix || 'NANGCAP'}-ORD8899</code></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: LƯU TRỮ TẬP TIN CLOUDFLARE R2 (R2 STORAGE TAB)        */}
      {/* ============================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <CloudflareR2View />
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 7: LĨNH VỰC & MODULE ĐỘNG (CUSTOM MODULES TAB)           */}
      {/* ============================================================= */}
      {activeTab === 'custom_modules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <AdminCustomModulesTab />
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CHỈNH SỬA GÓI DỊCH VỤ (SERVICE PLAN EDIT MODAL)        */}
      {/* ============================================================= */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Chỉnh Sửa Gói {editingPlan.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên gói *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Huy hiệu (Badge)
                  </label>
                  <input
                    type="text"
                    value={editingPlan.badge || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    placeholder="Khuyên Dùng, Phổ biến..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả gói *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingPlan.description}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                <div>
                  <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                    Giá Gói / Chu kỳ (VND) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingPlan.monthlyPrice}
                    onChange={e => setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                    {formatCurrency(editingPlan.monthlyPrice)} / {editingPlan.billingCycle || 'chu kỳ'}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                    Giá Hàng Năm (VND, tùy chọn)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editingPlan.yearlyPrice || 0}
                    onChange={e => setEditingPlan({ ...editingPlan, yearlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                    {editingPlan.yearlyPrice > 0 ? `${formatCurrency(editingPlan.yearlyPrice)} / năm` : '0 ₫ (Không áp dụng)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chu kỳ thanh toán *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.billingCycle}
                    onChange={e => setEditingPlan({ ...editingPlan, billingCycle: e.target.value })}
                    placeholder="30 ngày / 365 ngày"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái bán *
                  </label>
                  <select
                    value={editingPlan.status}
                    onChange={e => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="ACTIVE">Đang hoạt động (Đang bán)</option>
                    <option value="INACTIVE">Tạm ngưng (Ẩn khỏi checkout)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Giới hạn sử dụng / Quota
                </label>
                <input
                  type="text"
                  value={editingPlan.quota || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, quota: e.target.value })}
                  placeholder="Ví dụ: Tối đa 5 thành viên, không giới hạn..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Features List Editing */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Danh sách tính năng ({editingPlan.features.length})
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={e => setNewFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                    placeholder="Nhập tính năng mới..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {editingPlan.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1 hover:text-rose-500 text-slate-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>An toàn giá:</strong> Giá mới sẽ áp dụng cho tất cả lượt mua sau thời điểm này. Các đơn hàng/yêu cầu chuyển khoản đã tạo trước đó vẫn giữ nguyên mức giá cũ.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  disabled={isSavingPlan}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingPlan ? 'Đang lưu...' : 'Lưu Thay Đổi Gói'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: THÊM NGÔN NGỮ MỚI (ADD LANGUAGE MODAL)                 */}
      {/* ============================================================= */}
      {showAddLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Thêm Ngôn Ngữ Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Language Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                Gợi ý ngôn ngữ phổ biến:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'ja', name: '日本語', flag: '🇯🇵' },
                  { code: 'ko', name: '한국어', flag: '🇰🇷' },
                  { code: 'zh', name: '中文', flag: '🇨🇳' },
                  { code: 'fr', name: 'Français', flag: '🇫🇷' },
                  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                  { code: 'es', name: 'Español', flag: '🇪🇸' }
                ].map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => setNewLanguage({ code: preset.code, name: preset.name, flag: preset.flag })}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {preset.flag} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddLanguage} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã ngôn ngữ (ISO Code, ví dụ: fr, de, es, zh) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newLanguage.code}
                  onChange={e => setNewLanguage({ ...newLanguage, code: e.target.value.toLowerCase() })}
                  placeholder="fr, de, es..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên ngôn ngữ *
                </label>
                <input
                  type="text"
                  required
                  value={newLanguage.name}
                  onChange={e => setNewLanguage({ ...newLanguage, name: e.target.value })}
                  placeholder="Français, Deutsch, Español..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Biểu tượng cờ quốc gia (Emoji) *
                </label>
                <input
                  type="text"
                  required
                  value={newLanguage.flag}
                  onChange={e => setNewLanguage({ ...newLanguage, flag: e.target.value })}
                  placeholder="🇫🇷, 🇩🇪, 🇪🇸..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLanguageModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingLanguages}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {isSavingLanguages ? 'Đang thêm...' : 'Thêm Ngôn Ngữ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: DUYỆT THANH TOÁN & NÂNG CẤP XÁC NHẬN AN TOÀN           */}
      {/* ============================================================= */}
      {approveConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Xác nhận Duyệt Thanh Toán
              </h3>
              <p className="text-xs text-slate-500">
                Gói bản quyền và thời hạn sử dụng sẽ được tự động kích hoạt cho khách hàng ngay lập tức.
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Khách hàng:</span>
                <span className="font-bold text-slate-900 dark:text-white">{approveConfirmTarget.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gói nâng cấp:</span>
                <span className="font-black text-blue-600 dark:text-blue-400">
                  {approveConfirmTarget.planRequested} ({approveConfirmTarget.billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền:</span>
                <span className="font-black text-slate-900 dark:text-white">{formatCurrency(approveConfirmTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mã giao dịch:</span>
                <span className="font-mono font-bold text-blue-600">{approveConfirmTarget.txReference}</span>
              </div>
              {approveConfirmTarget.note && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                  <span className="text-slate-400 block mb-0.5">Ghi chú của khách:</span>
                  <span className="text-slate-700 dark:text-slate-300 italic">{approveConfirmTarget.note}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveConfirmTarget(null)}
                disabled={isApproving}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApprovePayment}
                disabled={isApproving}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isApproving ? 'Đang duyệt...' : 'Xác nhận & Kích hoạt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: TỪ CHỐI THANH TOÁN                                    */}
      {/* ============================================================= */}
      {rejectModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Ban className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Từ Chối Yêu Cầu Thanh Toán
              </h3>
              <p className="text-xs text-slate-500">
                Vui lòng cung cấp lý do từ chối để khách hàng nắm rõ và có thể thử lại hoặc bổ sung giao dịch.
              </p>
            </div>

            <form onSubmit={handleRejectPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lý do từ chối *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Chưa nhận được tiền trong tài khoản, số tiền chuyển khoản không đủ, hoặc nội dung chuyển khoản không khớp..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Quick Preset Reasons */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Gợi ý lý do nhanh:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Chưa nhận được tiền trong tài khoản ngân hàng',
                    'Số tiền chuyển khoản không khớp với đơn hàng',
                    'Nội dung chuyển khoản không đúng cú pháp'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectReason(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  disabled={isRejecting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isRejecting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CẤP TÀI KHOẢN NGƯỜI DÙNG MỚI                          */}
      {/* ============================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cấp Tài Khoản Người Dùng Mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vai trò</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gói dịch vụ</label>
                  <select
                    value={newUser.plan}
                    onChange={e => setNewUser({ ...newUser, plan: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="FREE">Chưa kích hoạt gói</option>
                    <option value="PERSONAL_1M">Gói Cá Nhân (1 Tháng - 15.000 ₫)</option>
                    <option value="PERSONAL_3M">Gói Cá Nhân (3 Tháng - 40.000 ₫)</option>
                    <option value="TEAM_1M">Gói Team (1 Tháng - 50.000 ₫)</option>
                    <option value="PRO">PRO</option>
                    <option value="TEAM">TEAM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu ban đầu</label>
                <input
                  type="text"
                  required
                  value={newUser.temporaryPassword}
                  onChange={e => setNewUser({ ...newUser, temporaryPassword: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingUser ? 'Đang khởi tạo...' : 'Khởi tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ĐẶT LẠI MẬT KHẨU                                       */}
      {/* ============================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đặt Lại Mật Khẩu</h3>
            <p className="text-xs text-slate-500">
              Đặt lại mật khẩu cho tài khoản <strong>{showResetModal.email}</strong>. Các phiên đăng nhập hiện tại sẽ bị hủy ngay lập tức.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                >
                  Xác nhận đặt lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CHI TIẾT KHÁCH HÀNG & LỊCH SỬ VẬN HÀNH                  */}
      {/* ============================================================= */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedUserDetail.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUserDetail.user.name)}`}
                  alt=""
                  className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 object-cover"
                />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {selectedUserDetail.user.name}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {selectedUserDetail.user.email} • ID: <span className="font-mono">{selectedUserDetail.user.id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Status Overview Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Gói hiện tại</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {selectedUserDetail.subscriptionStatus?.planName || selectedUserDetail.user.plan}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Hạn sử dụng</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {selectedUserDetail.subscriptionStatus?.endDate
                      ? new Date(selectedUserDetail.subscriptionStatus.endDate).toLocaleDateString('vi-VN')
                      : 'Chưa có'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Số ngày còn lại</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {selectedUserDetail.subscriptionStatus?.remainingDays || 0} ngày
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Trạng thái tài khoản</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {selectedUserDetail.user.status}
                  </span>
                </div>
              </div>

              {/* Internal Admin Operational Notes */}
              <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Edit className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ghi chú vận hành nội bộ (Internal Notes)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSaveAdminNote(selectedUserDetail.user.id)}
                    disabled={isSavingAdminNote}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {isSavingAdminNote ? 'Đang lưu...' : 'Lưu ghi chú'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={adminNoteText}
                  onChange={e => setAdminNoteText(e.target.value)}
                  placeholder="Nhập ghi chú hỗ trợ, ưu đãi đặc biệt hoặc thông tin liên hệ của khách hàng..."
                  className="w-full p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Subscriptions History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Lịch sử đăng ký & gia hạn gói ({selectedUserDetail.subscriptions?.length || 0})
                </h4>
                {selectedUserDetail.subscriptions?.length === 0 ? (
                  <p className="text-slate-400 py-2">Khách hàng chưa có lịch sử gói dịch vụ.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Gói</th>
                          <th className="py-2 px-3">Trạng thái</th>
                          <th className="py-2 px-3">Thời hạn</th>
                          <th className="py-2 px-3">Số tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {selectedUserDetail.subscriptions.map((s: any) => (
                          <tr key={s.id}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{s.planName}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(s.startDate).toLocaleDateString('vi-VN')} → {new Date(s.endDate).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-2 px-3 font-mono">{formatCurrency(s.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments History */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Lịch sử thanh toán & chuyển khoản ({selectedUserDetail.payments?.length || 0})
                </h4>
                {selectedUserDetail.payments?.length === 0 ? (
                  <p className="text-slate-400 py-2">Chưa có giao dịch chuyển khoản nào.</p>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Mã GD</th>
                          <th className="py-2 px-3">Gói</th>
                          <th className="py-2 px-3">Số tiền</th>
                          <th className="py-2 px-3">Trạng thái</th>
                          <th className="py-2 px-3">Thời gian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                        {selectedUserDetail.payments.map((p: any) => (
                          <tr key={p.id}>
                            <td className="py-2 px-3 font-mono text-blue-600">{p.txReference || p.orderId}</td>
                            <td className="py-2 px-3">{p.planRequested}</td>
                            <td className="py-2 px-3 font-mono font-bold">{formatCurrency(p.amount)}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{new Date(p.createdAt).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGrantModalUser(selectedUserDetail.user);
                    setGrantPlanId('PERSONAL_1M');
                    setGrantDurationDays(30);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Cấp / Gia hạn gói</span>
                </button>

                {selectedUserDetail.user.plan !== 'FREE' && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSubscription(selectedUserDetail.user.id, selectedUserDetail.user.name)}
                    disabled={isRevoking}
                    className="px-3.5 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRevoking ? 'Đang thu hồi...' : 'Thu hồi gói'}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: CẤP / GIA HẠN GÓI THỦ CÔNG                              */}
      {/* ============================================================= */}
      {grantModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <Zap className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Cấp Quyền / Gia Hạn Gói Dịch Vụ
              </h3>
              <p className="text-xs text-slate-500">
                Cấp quyền trực tiếp cho khách hàng <strong>{grantModalUser.name}</strong> ({grantModalUser.email}).
              </p>
            </div>

            <form onSubmit={handleGrantSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn gói dịch vụ *
                </label>
                <select
                  value={grantPlanId}
                  onChange={e => setGrantPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="PERSONAL_1M">Gói Cá Nhân (1 Tháng - 15.000 ₫)</option>
                  <option value="PERSONAL_3M">Gói Cá Nhân (3 Tháng - 40.000 ₫)</option>
                  <option value="TEAM_1M">Gói Đội Ngũ (Team 1 Tháng - 50.000 ₫, 5 thành viên)</option>
                  <option value="PRO">Gói Pro (199.000 ₫)</option>
                  <option value="TEAM">Gói Team (499.000 ₫)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thời hạn cấp thêm (Số ngày) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 90, 365].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setGrantDurationDays(days)}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        grantDurationDays === days
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {days === 365 ? '1 Năm (365 ngày)' : `${days} ngày`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lý do cấp quyền / Ghi chú *
                </label>
                <input
                  type="text"
                  required
                  value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  placeholder="Ví dụ: Đã nhận tiền qua ngân hàng, Tặng tri ân khách hàng..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantModalUser(null)}
                  disabled={isGranting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isGranting}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isGranting ? 'Đang kích hoạt...' : 'Xác nhận Cấp gói'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
