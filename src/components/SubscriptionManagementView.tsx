import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  Users,
  Clock,
  Calendar,
  CreditCard,
  UserPlus,
  Trash2,
  Check,
  RefreshCw,
  QrCode,
  Copy,
  Receipt,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  UserMinus,
  Edit2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { UserSubscriptionStatus } from '../lib/types';

export function SubscriptionManagementView() {
  const {
    currentUser,
    setCurrentView,
    subscriptionStatus,
    fetchSubscriptionStatus
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'plans' | 'team' | 'history'>('plans');
  const [subStatus, setSubStatus] = useState<UserSubscriptionStatus | null>(subscriptionStatus || null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Team state
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [isSavingTeamName, setIsSavingTeamName] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);

  // Payment & Checkout Modal state
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<any>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Fetch full subscription info
  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const res = await apiCall('/api/payments/subscription');
      if (res && res.success) {
        setSubStatus(res);
      }
    } catch (err: any) {
      console.warn('Failed to load subscription:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch team info
  const loadTeam = async () => {
    try {
      setIsLoadingTeam(true);
      const res = await apiCall('/api/team/my-team');
      if (res && res.success) {
        setTeamData(res);
        if (res.team?.name) {
          setTeamNameInput(res.team.name);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load team:', err);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  // Dynamic Plans state from single source of truth
  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const loadPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const res = await apiCall('/api/payments/plans');
      if (res && res.success && Array.isArray(res.plans)) {
        setDynamicPlans(res.plans);
      }
    } catch (err) {
      console.warn('Failed to load dynamic plans:', err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    loadSubscription();
    loadTeam();
    loadPlans();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Initiate QR checkout session
  const handleStartCheckout = async (planId: string) => {
    try {
      setSelectedPlanForCheckout(planId);
      setIsCreatingCheckout(true);
      setStatusMessage(null);

      const res = await apiCall('/api/payments/checkout-session', 'POST', {
        plan: planId,
        cycle: 'monthly'
      });

      if (res && res.success && res.checkoutSession) {
        setCheckoutSession(res.checkoutSession);
      } else {
        setStatusMessage({ text: res.message || 'Không thể tạo phiên thanh toán', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi khởi tạo thanh toán', type: 'error' });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  // Submit payment request
  const handleSubmitPayment = async () => {
    if (!checkoutSession) return;
    try {
      setIsSubmittingPayment(true);
      const res = await apiCall('/api/payments/submit-request', 'POST', {
        orderId: checkoutSession.orderId,
        note: transferNote || 'Khách hàng báo đã hoàn tất chuyển khoản'
      });

      if (res && res.success) {
        setStatusMessage({
          text: 'Yêu cầu thanh toán đã được ghi nhận thành công! Vui lòng chờ quản trị viên duyệt để kích hoạt gói.',
          type: 'success'
        });
        setCheckoutSession(null);
        setSelectedPlanForCheckout(null);
        await loadSubscription();
      } else {
        setStatusMessage({ text: res.message || 'Không thể gửi xác nhận', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi gửi xác nhận thanh toán', type: 'error' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Team: Update team name
  const handleSaveTeamName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamNameInput.trim()) return;
    try {
      setIsSavingTeamName(true);
      const res = await apiCall('/api/team/name', 'PUT', { name: teamNameInput.trim() });
      if (res && res.success) {
        setStatusMessage({ text: 'Đã cập nhật tên nhóm thành công', type: 'success' });
        await loadTeam();
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi đổi tên nhóm', type: 'error' });
    } finally {
      setIsSavingTeamName(false);
    }
  };

  // Team: Add member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    try {
      setIsAddingMember(true);
      setStatusMessage(null);
      const res = await apiCall('/api/team/members', 'POST', { email: newMemberEmail.trim() });
      if (res && res.success) {
        setStatusMessage({ text: res.message || 'Đã thêm thành viên thành công', type: 'success' });
        setNewMemberEmail('');
        await loadTeam();
      }
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Không thể thêm thành viên. Vui lòng kiểm tra lại.',
        type: 'error'
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  // Team: Remove member
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thành viên "${memberName}" khỏi nhóm? Người dùng này sẽ lập tức mất quyền truy cập trả phí.`)) {
      return;
    }
    try {
      setIsRemovingMember(memberUserId);
      const res = await apiCall(`/api/team/members/${memberUserId}`, 'DELETE');
      if (res && res.success) {
        setStatusMessage({ text: res.message || 'Đã xóa thành viên khỏi nhóm', type: 'success' });
        await loadTeam();
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi xóa thành viên', type: 'error' });
    } finally {
      setIsRemovingMember(null);
    }
  };

  // Team: Join existing team via Invite Code
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    try {
      setIsJoiningTeam(true);
      setStatusMessage(null);
      const res = await apiCall('/api/team/join', 'POST', { code: joinCodeInput.trim() });
      if (res && res.success) {
        setStatusMessage({ text: res.message || 'Tham gia nhóm thành công! Toàn bộ tính năng LifeOS đã được mở khóa.', type: 'success' });
        setJoinCodeInput('');
        await loadTeam();
        await loadSubscription();
        await fetchSubscriptionStatus();
      } else {
        throw new Error(res?.message || 'Không thể tham gia nhóm.');
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi tham gia nhóm', type: 'error' });
    } finally {
      setIsJoiningTeam(false);
    }
  };

  // Team: Leave current team
  const handleLeaveTeam = async () => {
    if (!currentUser?.id) return;
    if (!window.confirm('Bạn có chắc chắn muốn rời khỏi nhóm này? Quyền sử dụng các tính năng trả phí của bạn sẽ kết thúc.')) {
      return;
    }
    try {
      setIsRemovingMember(currentUser.id);
      const res = await apiCall(`/api/team/members/${currentUser.id}`, 'DELETE');
      if (res && res.success) {
        setStatusMessage({ text: res.message || 'Đã rời khỏi nhóm thành công.', type: 'success' });
        await loadTeam();
        await loadSubscription();
        await fetchSubscriptionStatus();
      } else {
        throw new Error(res?.message || 'Không thể rời nhóm.');
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Lỗi khi rời khỏi nhóm', type: 'error' });
    } finally {
      setIsRemovingMember(null);
    }
  };

  const isAccessActive = subStatus?.hasAccess;
  const isTeamOwner = subStatus?.isTeamOwner || teamData?.role === 'OWNER';
  const isTeamMember = subStatus?.isTeamMember || teamData?.role === 'MEMBER';

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      
      {/* Top Banner / Hero Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Zap className="w-3.5 h-3.5 fill-blue-600" />
              Mô hình Đăng ký Dịch vụ LifeOS
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Quản lý Gói Dịch vụ & Đội ngũ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Tất cả chức năng LifeOS đều yêu cầu gói trả phí đang hoạt động. Bạn có thể chọn gói cá nhân linh hoạt hoặc gói đội ngũ để cùng cộng tác.
            </p>
          </div>

          {/* Current Status Pill */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-4 shrink-0 shadow-xs">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Trạng thái tài khoản
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isAccessActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAccessActive ? 'Đang hoạt động' : (subStatus?.status === 'EXPIRED' ? 'Đã hết hạn' : 'Chưa mua gói')}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {subStatus?.planName || 'Chưa kích hoạt'} 
                {isAccessActive && subStatus?.remainingDays !== undefined && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">
                    (Còn {subStatus.remainingDays} ngày)
                  </span>
                )}
              </span>
            </div>

            {isAccessActive ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-6 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'plans'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Bảng giá & Các Gói Dịch Vụ
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Quản lý Đội ngũ
            {(isTeamOwner || isTeamMember) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                {isTeamOwner ? 'Chủ nhóm' : 'Thành viên'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Lịch sử Đơn hàng
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-medium border flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
              {statusMessage.type === 'info' && <Zap className="w-5 h-5 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* TAB 1: PLANS PRICING & SELECTION */}
        {activeTab === 'plans' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Quick Status Detail Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Thông tin Gói hiện tại
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chi tiết thời hạn và quyền sử dụng được xác thực bởi máy chủ LifeOS
                  </p>
                </div>
                {isAccessActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> Toàn quyền sử dụng
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-4 h-4" /> Chưa kích hoạt gói
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium block">Tên gói</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {subStatus?.planName || 'Chưa mua gói'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium block">Ngày kích hoạt</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {subStatus?.startDate ? new Date(subStatus.startDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium block">Ngày hết hạn</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">
                    {subStatus?.planExpiresAt ? new Date(subStatus.planExpiresAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium block">Thời gian còn lại</span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1 block">
                    {isAccessActive ? `${subStatus?.remainingDays || 0} ngày` : '0 ngày'}
                  </span>
                </div>
              </div>

              {isTeamMember && (
                <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                  <span>Bạn đang sử dụng quyền lợi Gói Team theo nhóm <b>"{subStatus?.teamName}"</b> của Chủ nhóm <b>{subStatus?.teamOwnerEmail}</b>.</span>
                </div>
              )}
            </div>

            {/* Pricing Cards Grid - Dynamic from Database Single Source of Truth */}
            <div>
              <div className="text-center max-w-xl mx-auto mb-6">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Chọn Gói Dịch Vụ Phù Hợp
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Mở khóa 100% chức năng: Quản lý Công việc, Lịch biểu, Tài chính, Thói quen, Decision Engine và Tự động hóa.
                </p>
              </div>

              {isLoadingPlans && dynamicPlans.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs">Đang đồng bộ danh sách gói dịch vụ...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(dynamicPlans.length > 0 ? dynamicPlans : [
                    {
                      id: 'PERSONAL_1M',
                      name: 'Gói Cá Nhân (1 Tháng)',
                      badge: 'Tiết kiệm',
                      description: 'Trải nghiệm đầy đủ hệ thống quản trị cá nhân LifeOS trong 30 ngày.',
                      price: 15000,
                      durationDays: 30,
                      billingCycle: '1 tháng (30 ngày)',
                      benefits: [
                        'Toàn bộ tính năng Quản lý Công việc & Bộ lọc 7 tab',
                        'Quản lý Tài chính, Ví tiền & Báo cáo thu chi',
                        'Theo dõi Thói quen, Mục tiêu & Focus Pomodoro',
                        'Decision Engine & Automation Rules Engine'
                      ]
                    },
                    {
                      id: 'PERSONAL_3M',
                      name: 'Gói Cá Nhân (3 Tháng)',
                      badge: 'Phổ biến nhất',
                      description: 'Sử dụng 90 ngày liên tục với chi phí ưu đãi nhất cho cá nhân.',
                      price: 40000,
                      durationDays: 90,
                      billingCycle: '3 tháng (90 ngày)',
                      benefits: [
                        'Bao gồm toàn bộ quyền lợi của gói Cá Nhân 1 Tháng',
                        'Thời hạn 90 ngày liên tục',
                        'Tiết kiệm 5.000 VNĐ so với gia hạn từng tháng',
                        'Đồng bộ dữ liệu thời gian thực và sao lưu tự động'
                      ]
                    },
                    {
                      id: 'TEAM_1M',
                      name: 'Gói Đội Ngũ (Team 1 Tháng)',
                      badge: 'Tối đa 5 người dùng',
                      description: 'Dành cho nhóm làm việc. Chủ team được thêm tối đa 5 người dùng cùng dùng đầy đủ tính năng.',
                      price: 50000,
                      durationDays: 30,
                      billingCycle: '1 tháng (30 ngày)',
                      benefits: [
                        'Chủ nhóm được thêm tối đa 5 thành viên',
                        'Mọi thành viên được hưởng trọn quyền tính năng trả phí',
                        'Bảng quản trị thêm/xóa thành viên linh hoạt',
                        'Tự động khóa quyền an toàn khi gói hết hạn'
                      ]
                    }
                  ]).map((p: any) => {
                    const isPopular = p.id === 'PERSONAL_3M' || p.badge?.includes('Phổ biến');
                    const isTeam = p.id.includes('TEAM') || p.type === 'TEAM';
                    const isCurrentActive = (subStatus?.planId === p.id || (isTeam && subStatus?.planType === 'TEAM')) && isAccessActive;
                    const benefitsList = p.benefits || p.features || [];

                    return (
                      <div
                        key={p.id}
                        className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden ${
                          isPopular
                            ? 'border-2 border-blue-600 shadow-xl'
                            : isTeam
                            ? 'border border-purple-200 dark:border-purple-900/60 hover:border-purple-300 dark:hover:border-purple-800'
                            : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            {p.badge || 'Phổ biến nhất'}
                          </div>
                        )}

                        <div>
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 ${
                            isPopular
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : isTeam
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {p.badge || (isTeam ? 'Dành cho Đội ngũ' : 'Tiết kiệm')}
                          </div>

                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                            {p.description || 'Mở khóa toàn bộ chức năng LifeOS.'}
                          </p>

                          <div className="my-6">
                            <span className={`text-3xl sm:text-4xl font-black ${
                              isPopular
                                ? 'text-blue-600 dark:text-blue-400'
                                : isTeam
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-slate-900 dark:text-white'
                            }`}>
                              {p.pricing?.monthly?.displayPrice || `${Number(p.price || 0).toLocaleString('vi-VN')} ₫`}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5">
                              / {p.billingCycle || `${p.durationDays || 30} ngày`}
                            </span>
                          </div>

                          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-600 dark:text-slate-300">
                            {benefitsList.map((feature: string, fIdx: number) => (
                              <div key={fIdx} className="flex items-start gap-2.5">
                                <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  isPopular ? 'text-blue-500' : isTeam ? 'text-purple-500' : 'text-emerald-500'
                                }`} />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-8">
                          <button
                            type="button"
                            onClick={() => handleStartCheckout(p.id)}
                            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isPopular
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                : isTeam
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                            }`}
                          >
                            {isTeam ? <Users className="w-4 h-4" /> : isPopular ? <Sparkles className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                            {isCurrentActive
                              ? `Gia hạn ${p.name}`
                              : `Mua ${p.name} (${Number(p.price || 0).toLocaleString('vi-VN')} ₫)`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEAM MANAGEMENT */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {isLoadingTeam ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs">Đang tải dữ liệu đội ngũ...</p>
              </div>
            ) : !isTeamOwner && !isTeamMember ? (
              /* User has no team and is not a member */
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Option 1: Buy Team Plan */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                      <Users className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Tạo Đội Ngũ Mới
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Trở thành Chủ nhóm và mời tối đa 5 thành viên cùng sử dụng đầy đủ chức năng LifeOS với <b>Gói Đội Ngũ (50.000 ₫/tháng)</b>.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('plans');
                        handleStartCheckout('TEAM_1M');
                      }}
                      className="w-full py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      Đăng ký Gói Đội Ngũ (50.000 ₫)
                    </button>
                  </div>
                </div>

                {/* Option 2: Join Existing Team via Code */}
                <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                      Tham Gia Nhóm Bằng Mã Mời
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed text-center">
                      Nếu đồng nghiệp hoặc chủ nhóm đã gửi cho bạn mã mời tham gia, hãy nhập mã vào đây để nhận quyền sử dụng gói Team ngay lập tức.
                    </p>
                  </div>

                  <form onSubmit={handleJoinTeam} className="space-y-3 pt-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Nhập mã mời (ví dụ: TEAM-A1B2C3D4)..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono uppercase text-slate-900 dark:text-white outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isJoiningTeam || !joinCodeInput.trim()}
                      className="w-full py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {isJoiningTeam ? 'Đang xác thực mã...' : 'Tham Gia Nhóm Ngay'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* User is Team Owner or Team Member */
              <div className="space-y-6">

                {/* Team Status Banner */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          {teamData?.team?.name || 'Nhóm làm việc'}
                        </h2>
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          teamData?.role === 'OWNER'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        }`}>
                          {teamData?.role === 'OWNER' ? 'Chủ nhóm (Quản trị viên)' : 'Thành viên nhóm'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Chủ nhóm: <b>{teamData?.team?.owner?.name}</b> ({teamData?.team?.owner?.email})
                      </p>
                    </div>

                    {/* Expiration and Member Slots */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-400 block">Số lượng thành viên</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {teamData?.team?.currentMemberCount || 0} / {teamData?.team?.maxMembers || 5} người
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm">
                        {Math.max(0, (teamData?.team?.maxMembers || 5) - (teamData?.team?.currentMemberCount || 0))} chỗ
                      </div>

                      {/* If Member: Leave Team button */}
                      {!isTeamOwner && isTeamMember && (
                        <button
                          type="button"
                          onClick={handleLeaveTeam}
                          className="ml-2 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Rời nhóm</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warning if Team subscription is expired */}
                  {!teamData?.team?.isSubscriptionActive && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <b>Gói Team đã hết hạn.</b> Toàn bộ thành viên và chủ team hiện bị tạm khóa quyền sử dụng các tính năng trả phí. Vui lòng gia hạn gói Team để tiếp tục sử dụng.
                      </div>
                    </div>
                  )}

                  {/* Team Owner: Edit Team Name */}
                  {isTeamOwner && (
                    <form onSubmit={handleSaveTeamName} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <div className="flex-1 w-full relative">
                        <input
                          type="text"
                          value={teamNameInput}
                          onChange={(e) => setTeamNameInput(e.target.value)}
                          placeholder="Nhập tên nhóm làm việc của bạn..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-600 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSavingTeamName || !teamNameInput.trim()}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingTeamName ? 'Đang lưu...' : 'Lưu tên nhóm'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Team Owner: Invite Members & Share Invite Code */}
                {isTeamOwner && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-purple-600" />
                          Mời Thành Viên Vào Nhóm
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tối đa 5 người dùng. Thành viên được thêm sẽ lập tức được kích hoạt toàn bộ tính năng trả phí theo gói Team.
                        </p>
                      </div>

                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        (teamData?.team?.remainingSlots || 0) > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        Còn {teamData?.team?.remainingSlots || 0} chỗ trống
                      </span>
                    </div>

                    {/* Method 1: Invite by Email */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Cách 1: Thêm trực tiếp bằng địa chỉ email
                      </span>
                      <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex-1 w-full">
                          <input
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="Nhập địa chỉ email của thành viên (ví dụ: member@lifeos.com)..."
                            disabled={!teamData?.team?.canAddMembers || isAddingMember}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-colors disabled:opacity-50"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!teamData?.team?.canAddMembers || isAddingMember || !newMemberEmail.trim()}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <UserPlus className="w-4 h-4" />
                          {isAddingMember ? 'Đang thêm...' : 'Thêm thành viên'}
                        </button>
                      </form>
                    </div>

                    {/* Method 2: Share Invite Code & Link */}
                    {teamData?.team?.inviteCode && (
                      <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Cách 2: Gửi mã mời hoặc liên kết để thành viên tự tham gia
                        </span>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <div className="flex-1 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30">
                            <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300 select-all">
                              {teamData.team.inviteCode}
                            </span>
                            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                              Mã mời tham gia nhóm
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(teamData.team.inviteCode, 'team_code')}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copySuccess === 'team_code' ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {(teamData?.team?.remainingSlots || 0) <= 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ Nhóm đã đạt tối đa 5 thành viên theo quy định gói Team. Vui lòng xóa bớt thành viên cũ nếu muốn thêm người mới.
                      </p>
                    )}
                  </div>
                )}

                {/* Team Members List Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Danh Sách Thành Viên ({teamData?.team?.members?.length || 0})
                  </h3>

                  {(!teamData?.team?.members || teamData.team.members.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Chưa có thành viên nào trong nhóm. Nhập email hoặc gửi mã mời ở trên để thêm thành viên đầu tiên.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="py-3 px-4">Thành viên</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Vai trò</th>
                            <th className="py-3 px-4">Ngày thêm</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                          {teamData.team.members.map((m: any) => (
                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3.5 px-4 flex items-center gap-3">
                                <img
                                  src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                                  alt={m.name}
                                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover"
                                />
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {m.name} {m.userId === currentUser?.id ? '(Bạn)' : ''}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">{m.email}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                  {m.role}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400">
                                {m.addedAt ? new Date(m.addedAt).toLocaleDateString('vi-VN') : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {isTeamOwner ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(m.userId, m.name)}
                                    disabled={isRemovingMember === m.userId}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-all cursor-pointer"
                                    title="Xóa thành viên khỏi nhóm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : m.userId === currentUser?.id ? (
                                  <button
                                    type="button"
                                    onClick={handleLeaveTeam}
                                    className="px-2.5 py-1 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 font-semibold text-xs transition-all cursor-pointer"
                                  >
                                    Rời nhóm
                                  </button>
                                ) : null}
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
          </div>
        )}

        {/* TAB 3: BILLING & PAYMENT HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Lịch Sử Đơn Hàng & Giao Dịch
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách các yêu cầu thanh toán và hóa đơn đăng ký gói dịch vụ LifeOS
              </p>
            </div>

            {(!subStatus?.history || subStatus.history.length === 0) ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Chưa có lịch sử giao dịch nào được ghi nhận.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Mã đơn hàng</th>
                      <th className="py-3 px-4">Gói dịch vụ</th>
                      <th className="py-3 px-4">Số tiền</th>
                      <th className="py-3 px-4">Hình thức</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {subStatus.history.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {h.orderId || h.txReference || h.id}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {h.planRequested || 'Gói dịch vụ'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {h.amount ? `${h.amount.toLocaleString('vi-VN')} ₫` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {h.method || 'VietQR'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            h.status === 'APPROVED' || h.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : h.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {h.status === 'APPROVED' ? 'Đã duyệt' : (h.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* CHECKOUT MODAL: VIETQR TRANSFER & PAYMENT PROOF SUBMISSION */}
      {checkoutSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Thanh Toán Nâng Cấp Gói
                </h3>
                <p className="text-xs text-slate-500">
                  {checkoutSession.planName} ({checkoutSession.durationText})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR Code and Bank Details */}
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <img
                  src={checkoutSession.bankInfo?.qrUrl}
                  alt="VietQR Code"
                  className="w-48 h-48 rounded-xl object-contain bg-white p-2 shadow-xs"
                />
                <span className="text-[11px] text-slate-400 mt-2 font-medium">
                  Quét mã QR bằng ứng dụng ngân hàng bất kỳ để thanh toán nhanh
                </span>
              </div>

              {/* Bank Transfer Specs */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{checkoutSession.bankInfo?.bankName}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{checkoutSession.bankInfo?.accountNumber}</span>
                    <button
                      onClick={() => handleCopy(checkoutSession.bankInfo?.accountNumber, 'acc')}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{checkoutSession.bankInfo?.accountHolder}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-slate-500">Số tiền:</span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {checkoutSession.total?.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                  <span className="font-bold">Nội dung chuyển khoản (bắt buộc):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black">{checkoutSession.txReference}</span>
                    <button
                      onClick={() => handleCopy(checkoutSession.txReference, 'memo')}
                      className="p-1 text-amber-700 hover:bg-amber-100 rounded cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Note / Transaction input */}
              <div className="space-y-1 text-xs">
                <label className="text-slate-500 font-medium">Ghi chú xác nhận (tùy chọn):</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Ví dụ: Đã chuyển khoản từ Techcombank Nguyen Van A..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmitPayment}
                disabled={isSubmittingPayment}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSubmittingPayment ? 'Đang gửi yêu cầu xác nhận...' : 'Tôi đã chuyển khoản - Gửi xác nhận'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
