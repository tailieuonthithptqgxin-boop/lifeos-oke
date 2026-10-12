import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Sparkles,
  Lock,
  Tag,
  RefreshCw,
  Clock,
  Check,
  Building2,
  Copy,
  Receipt,
  History,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';

type BillingCycle = 'monthly' | 'yearly';
type ViewTab = 'checkout' | 'my_requests';
type CheckoutStep = 'select_plan' | 'qr_transfer' | 'submitted_waiting';

interface CheckoutViewProps {
  initialPlan?: 'PERSONAL_1M' | 'PERSONAL_3M' | 'TEAM_1M' | 'PRO' | 'TEAM' | string;
  initialCycle?: BillingCycle;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CheckoutView({
  initialPlan = 'PERSONAL_1M',
  initialCycle = 'monthly',
  onSuccess,
  onCancel
}: CheckoutViewProps) {
  const { currentUser, setCurrentView, loadAllData } = useAppStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('checkout');
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan);
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('select_plan');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Checkout session & payment request state
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [transferNote, setTransferNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const receiptInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [qrDisplayMode, setQrDisplayMode] = useState<'vietqr' | 'custom'>('vietqr');

  const handleReceiptFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Kích thước ảnh chụp biên lai không được vượt quá 8MB');
      return;
    }

    try {
      setIsUploadingReceipt(true);
      setErrorMessage('');
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'receipts'
          });
          const url = res.file?.url || base64Data;
          setReceiptUrl(url);
        } catch (uploadErr: any) {
          setReceiptUrl(base64Data);
        } finally {
          setIsUploadingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingReceipt(false);
      setErrorMessage(err.message || 'Lỗi khi tải ảnh biên lai');
    }
  };

  // My requests list state
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  // Dynamic server-authoritative plans (Official 3 Plans)
  const [planDetails, setPlanDetails] = useState<Record<string, any>>({
    PERSONAL_1M: {
      name: 'Gói Cá Nhân (1 Tháng)',
      badge: 'Tiết kiệm',
      monthlyPrice: 15000,
      yearlyPrice: 15000,
      benefits: [
        'Toàn bộ tính năng Quản lý Công việc & Bộ lọc 7 tab',
        'Quản lý Tài chính, Ví tiền, Ngân sách và Báo cáo',
        'Theo dõi Thói quen, Mục tiêu cuộc sống & Pomodoro',
        'Decision Engine & Automation Rules Engine'
      ]
    },
    PERSONAL_3M: {
      name: 'Gói Cá Nhân (3 Tháng)',
      badge: 'Phổ biến nhất',
      monthlyPrice: 40000,
      yearlyPrice: 40000,
      benefits: [
        'Bao gồm toàn bộ quyền lợi của Gói Cá Nhân 1 Tháng',
        'Thời hạn sử dụng 90 ngày liên tục',
        'Tiết kiệm 5.000 VNĐ so với gia hạn từng tháng',
        'Đồng bộ dữ liệu thời gian thực và sao lưu tự động'
      ]
    },
    TEAM_1M: {
      name: 'Gói Đội Ngũ (Team 1 Tháng)',
      badge: 'Dành cho Đội ngũ',
      monthlyPrice: 50000,
      yearlyPrice: 50000,
      benefits: [
        'Mở khóa toàn bộ chức năng LifeOS cho Chủ Team',
        'Cho phép thêm tối đa 5 thành viên cùng sử dụng',
        'Tất cả thành viên hưởng quyền sử dụng đầy đủ',
        'Quản trị thêm/xóa thành viên linh hoạt'
      ]
    }
  });

  const fetchDynamicPlans = async () => {
    try {
      const res = await apiCall('/api/payments/plans');
      if (res && res.success && Array.isArray(res.plans)) {
        const nextDetails: Record<string, any> = { ...planDetails };
        for (const p of res.plans) {
          nextDetails[p.id] = {
            name: p.name,
            badge: p.badge || (p.id === 'PRO' ? 'Khuyên Dùng' : 'Nhóm & Tổ chức'),
            monthlyPrice: p.pricing?.monthly?.price ?? (p.id === 'PRO' ? 199000 : 399000),
            yearlyPrice: p.pricing?.yearly?.price ?? (p.id === 'PRO' ? 1990000 : 3990000),
            monthlyUsd: p.id === 'PRO' ? '$8' : '$16',
            yearlyUsd: p.id === 'PRO' ? '$80' : '$160',
            benefits: p.benefits && p.benefits.length > 0 ? p.benefits : (p.id === 'PRO' ? [
              'Mở khóa toàn diện Decision Engine & Mô phỏng What-if',
              'Automation Rules Engine (Tự động hóa quy trình liên module)',
              'Phân tích chỉ số năng suất cá nhân chuyên sâu',
              'Đồng bộ bảo mật thời gian thực',
              'Hỗ trợ kỹ thuật ưu tiên 24/7'
            ] : [
              'Toàn bộ tính năng cao cấp của gói Pro',
              'Hỗ trợ tối đa 5 thành viên cộng tác cùng lúc',
              'Phân quyền vai trò và nhật ký kiểm toán nhóm chi tiết',
              'Chia sẻ không gian làm việc và quản trị tài chính nhóm',
              'Tùy chỉnh thương hiệu và mẫu quy trình riêng'
            ])
          };
        }
        setPlanDetails(nextDetails);
      }
    } catch (e) {
      console.warn('Failed to fetch dynamic plans for checkout:', e);
    }
  };

  const PLAN_DETAILS = planDetails;
  const currentPlanConfig = planDetails[selectedPlan] || planDetails.PRO;
  const subtotal = cycle === 'yearly' ? currentPlanConfig.yearlyPrice : currentPlanConfig.monthlyPrice;
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discountPercent) / 100) : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Load customer's request history
  const fetchMyRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const res = await apiCall('/api/payments/my-requests');
      if (res && res.success) {
        setMyRequests(res.requests || []);
      }
    } catch (err: any) {
      console.warn('Failed to load my requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchDynamicPlans();
    fetchMyRequests();
  }, [activeTab]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Apply Coupon
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const res = await apiCall('/api/coupons/validate', 'POST', {
        code: couponCode.trim().toUpperCase()
      });
      if (res && res.discountPercent) {
        setAppliedCoupon({
          code: res.code || couponCode.toUpperCase().trim(),
          discountPercent: res.discountPercent
        });
        setCouponError('');
      } else {
        setCouponError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Mã giảm giá không hợp lệ.');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Step 1 -> Step 2: Create Checkout Session & Show QR
  const handleProceedToQR = async () => {
    setIsLoadingSession(true);
    setErrorMessage('');

    try {
      const res = await apiCall('/api/payments/checkout-session', 'POST', {
        plan: selectedPlan,
        cycle,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod: 'vietqr'
      });

      if (res && res.success && res.checkoutSession) {
        setCheckoutData(res.checkoutSession);
        setCheckoutStep('qr_transfer');
      } else {
        throw new Error(res?.message || 'Không thể tạo phiên thanh toán.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo phiên thanh toán. Vui lòng thử lại.');
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Step 2 -> Step 3: Customer clicks "Tôi đã thanh toán"
  const handleSubmitPaymentRequest = async () => {
    if (!checkoutData?.orderId) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const finalNote = receiptUrl
        ? `${transferNote ? transferNote + ' | ' : ''}Biên lai R2: ${receiptUrl}`
        : transferNote;

      const res = await apiCall('/api/payments/submit-request', 'POST', {
        orderId: checkoutData.orderId,
        note: finalNote
      });

      if (res && res.success) {
        setCheckoutStep('submitted_waiting');
        await fetchMyRequests();
        await loadAllData();
      } else {
        throw new Error(res?.message || 'Gửi yêu cầu thanh toán không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel a pending request
  const handleCancelRequest = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu thanh toán này?')) return;

    try {
      setIsCancelling(orderId);
      const res = await apiCall('/api/payments/cancel-request', 'POST', { orderId });
      if (res && res.success) {
        await fetchMyRequests();
        if (checkoutData?.orderId === orderId) {
          setCheckoutStep('select_plan');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Không thể hủy yêu cầu.');
    } finally {
      setIsCancelling(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else setCurrentView('account');
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang Tài khoản</span>
          </button>

          {/* Tab Selector */}
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('checkout')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'checkout'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Nâng cấp gói SaaS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_requests')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'my_requests'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử yêu cầu ({myRequests.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SAAS CHECKOUT & QR TRANSFER FLOW */}
        {activeTab === 'checkout' && (
          <div className="space-y-6">

            {/* STEP 1: CHỌN GÓI & XÁC NHẬN */}
            {checkoutStep === 'select_plan' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header */}
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                    Thanh toán chuyển khoản qua QR
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Chọn gói dịch vụ LifeOS trực tuyến
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Phần mềm sử dụng online, không giao hàng vật lý. Quét mã QR chuyển khoản và gửi yêu cầu để quản trị viên kiểm tra và duyệt nhanh.
                  </p>
                </div>

                {/* Billing Cycle Switcher */}
                <div className="flex justify-center">
                  <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCycle('monthly')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        cycle === 'monthly'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Thanh toán Hàng tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycle('yearly')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        cycle === 'yearly'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>Thanh toán Hàng năm</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Tiết kiệm 20%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plan Selection Grid */}
                <div className={`grid gap-4 ${Object.keys(PLAN_DETAILS).length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                  {Object.entries(PLAN_DETAILS).map(([planKey, planCfg]: [string, any]) => {
                    const isSelected = selectedPlan === planKey;
                    const isTeam = planKey.includes('TEAM') || planCfg.type === 'TEAM';
                    const planPrice = cycle === 'yearly' && planCfg.yearlyPrice && planCfg.yearlyPrice > 0
                      ? planCfg.yearlyPrice
                      : planCfg.monthlyPrice || planCfg.price || 0;
                    const durationLabel = cycle === 'yearly' && planCfg.yearlyPrice && planCfg.yearlyPrice > 0
                      ? 'năm'
                      : (planCfg.durationDays ? `${planCfg.durationDays} ngày` : 'tháng');

                    return (
                      <div
                        key={planKey}
                        onClick={() => setSelectedPlan(planKey)}
                        className={`cursor-pointer rounded-3xl p-6 border-2 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? isTeam
                              ? 'border-purple-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-purple-500/20'
                              : 'border-blue-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-base">
                                {planCfg.name}
                              </span>
                              {planCfg.badge && (
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                  isTeam
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                }`}>
                                  {planCfg.badge}
                                </span>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? isTeam ? 'border-purple-600 bg-purple-600 text-white' : 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className={`text-2xl font-black ${isTeam ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                              {formatCurrency(planPrice)}
                              <span className="text-xs font-normal text-slate-500">/{durationLabel}</span>
                            </div>
                            {planCfg.description && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                {planCfg.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {Array.isArray(planCfg.benefits) && planCfg.benefits.length > 0 && (
                          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                            {planCfg.benefits.slice(0, 5).map((b: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isTeam ? 'text-purple-500' : 'text-blue-500'}`} />
                                <span className="line-clamp-2">{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary & Coupon */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-5 shadow-xs">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Xác nhận đơn hàng trực tuyến
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block mb-1">Tài khoản nâng cấp</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-sm block truncate">
                        {currentUser?.email}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 block mb-1">Thời hạn dịch vụ</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">
                        {cycle === 'yearly' ? '1 Năm (365 Ngày)' : '1 Tháng (30 Ngày)'}
                      </span>
                    </div>
                  </div>

                  {/* Coupon section */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mã giảm giá (Coupon)
                    </label>
                    {!appliedCoupon ? (
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          placeholder="Mã coupon (ví dụ: LIFEOS20)..."
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isValidatingCoupon || !couponCode.trim()}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl cursor-pointer"
                        >
                          {isValidatingCoupon ? 'Kiểm tra...' : 'Áp dụng'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 max-w-md">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedCoupon(null)}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          Gỡ mã
                        </button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-rose-500 font-medium">{couponError}</p>}
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Gói: {currentPlanConfig.name} ({cycle === 'yearly' ? 'Gói năm' : 'Gói tháng'})</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(subtotal)}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Mã giảm giá ({appliedCoupon.code})</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Tổng tiền cần thanh toán</span>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-medium border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Action CTA */}
                  <button
                    type="button"
                    onClick={handleProceedToQR}
                    disabled={isLoadingSession}
                    className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{isLoadingSession ? 'Đang tạo mã thanh toán...' : 'Tiếp tục: Hiển thị mã QR Chuyển khoản'}</span>
                    {!isLoadingSession && <ArrowRight className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: HIỂN THỊ QR CHUYỂN KHOẢN & NÚT "TÔI ĐÃ THANH TOÁN" */}
            {checkoutStep === 'qr_transfer' && checkoutData && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
                <div className="text-center max-w-md mx-auto space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Bước 2: Quét mã QR chuyển khoản
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Thông tin thanh toán ngân hàng
                  </h2>
                  <p className="text-xs text-slate-500">
                    Vui lòng chuyển khoản đúng số tiền và nội dung chuyển khoản bên dưới để hệ thống nhận diện yêu cầu nhanh nhất.
                  </p>
                </div>

                {/* QR and Transfer Info */}
                <div className="grid md:grid-cols-2 gap-6 items-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  {/* QR Code Frame with Dynamic VietQR / Custom QR Toggle */}
                  <div className="flex flex-col items-center justify-center text-center p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    {checkoutData.bankInfo?.customQrUrl && (
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
                        <button
                          type="button"
                          onClick={() => setQrDisplayMode('vietqr')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            qrDisplayMode === 'vietqr'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          VietQR Tự Động
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrDisplayMode('custom')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            qrDisplayMode === 'custom'
                              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Ảnh QR Ngân Hàng
                        </button>
                      </div>
                    )}
                    <div className="w-52 h-52 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-100">
                      <img
                        src={
                          qrDisplayMode === 'custom' && checkoutData.bankInfo?.customQrUrl
                            ? checkoutData.bankInfo.customQrUrl
                            : (checkoutData.bankInfo?.dynamicQrUrl || checkoutData.bankInfo?.qrUrl)
                        }
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2 font-medium">
                      Mở App Ngân hàng bất kỳ để quét mã tự động
                    </span>
                  </div>

                  {/* Manual Transfer Details with Copy Buttons */}
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ngân hàng thụ hưởng</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {checkoutData.bankInfo?.bankName}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Số tài khoản</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-base select-all">
                          {checkoutData.bankInfo?.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(checkoutData.bankInfo?.accountNumber, 'acc')}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copySuccess === 'acc' ? 'Đã chép!' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Chủ tài khoản</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {checkoutData.bankInfo?.accountHolder}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Số tiền cần chuyển</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-black text-blue-600 dark:text-blue-400 text-lg">
                          {formatCurrency(checkoutData.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(checkoutData.total), 'amount')}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copySuccess === 'amount' ? 'Đã chép!' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Exact Transfer Memo */}
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                      <span className="block text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 mb-1">
                        Nội dung chuyển khoản chính xác:
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-sm select-all tracking-wide text-blue-700 dark:text-blue-300">
                          {checkoutData.txReference}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(checkoutData.txReference, 'memo')}
                          className="px-2.5 py-1 bg-amber-200 dark:bg-amber-900/80 hover:bg-amber-300 text-amber-900 dark:text-amber-100 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copySuccess === 'memo' ? 'Đã chép!' : 'Sao chép nội dung'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Customer Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ghi chú thêm (Tên người gửi / Mã tham chiếu giao dịch ngân hàng nếu có)
                  </label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={e => setTransferNote(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A chuyển từ Techcombank..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Cloudflare R2 Payment Receipt Attachment */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ảnh chụp màn hình chuyển khoản (Lưu trữ R2)</span>
                    </span>

                    <input
                      type="file"
                      ref={receiptInputRef}
                      accept="image/*"
                      onChange={handleReceiptFileSelect}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      disabled={isUploadingReceipt}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingReceipt ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" />
                          <span>{receiptUrl ? 'Đổi ảnh biên lai' : 'Tải ảnh biên lai'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {receiptUrl ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={receiptUrl}
                          alt="Receipt Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="truncate">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300 block truncate">
                            ✓ Đã đính kèm ảnh biên lai lên Cloudflare R2
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate block">
                            {receiptUrl}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptUrl('')}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        title="Gỡ ảnh"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Đính kèm ảnh chụp bill chuyển khoản giúp Quản trị viên đối soát và kích hoạt gói nhanh gấp đôi.
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-xs font-medium border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Mandatory CTA button: "Tôi đã thanh toán" */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitPaymentRequest}
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isSubmitting ? 'Đang gửi yêu cầu xác nhận...' : 'Tôi đã thanh toán'}</span>
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('select_plan')}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                    >
                      ← Đổi gói hoặc thời hạn khác
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancelRequest(checkoutData.orderId)}
                      className="text-rose-500 hover:underline font-medium"
                    >
                      Hủy đơn hàng này
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SUBMITTED & WAITING FOR ADMIN APPROVAL */}
            {checkoutStep === 'submitted_waiting' && checkoutData && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-lg text-center space-y-6 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Đang chờ duyệt
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Yêu cầu đã được gửi thành công!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Vui lòng chờ quản trị viên xác nhận thanh toán. Hệ thống sẽ kiểm tra giao dịch và tự động kích hoạt gói ngay khi được phê duyệt.
                  </p>
                </div>

                {/* Status Ticket Card */}
                <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-left space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Mã giao dịch</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{checkoutData.txReference}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gói yêu cầu</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{checkoutData.planName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Số tiền</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(checkoutData.total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Trạng thái</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      PENDING — Chờ xác nhận
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my_requests')}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>Xem lịch sử yêu cầu của tôi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSuccess) onSuccess();
                      else setCurrentView('dashboard');
                    }}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Về Bảng điều khiển
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MY PAYMENT REQUESTS HISTORY */}
        {activeTab === 'my_requests' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  Lịch sử yêu cầu thanh toán & Nâng cấp
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi trạng thái duyệt của các khoản thanh toán chuyển khoản của bạn
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchMyRequests}
                  disabled={isLoadingRequests}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                  <span>Làm mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('checkout');
                    setCheckoutStep('select_plan');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-700 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" />
                  <span>Tạo yêu cầu mới</span>
                </button>
              </div>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Chưa có yêu cầu thanh toán nào</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Bạn chưa gửi yêu cầu nâng cấp gói nào. Hãy chọn gói dịch vụ để quét mã chuyển khoản và kích hoạt quyền sử dụng.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('checkout');
                    setCheckoutStep('select_plan');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                >
                  Nâng cấp gói ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Gói yêu cầu</th>
                      <th className="py-3 px-4">Số tiền</th>
                      <th className="py-3 px-4">Mã giao dịch</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {myRequests.map((req) => {
                      const isPending = req.status === 'PENDING' || req.status === 'Pending';
                      const isApproved = req.status === 'APPROVED' || req.status === 'Paid';
                      const isRejected = req.status === 'REJECTED';
                      const isCancelled = req.status === 'CANCELLED';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {req.planRequested}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {req.billingCycle === 'yearly' ? 'Gói năm' : 'Gói tháng'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {formatCurrency(req.amount)}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium select-all">
                            {req.txReference || req.orderId}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(req.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4">
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                PENDING — Chờ xác nhận
                              </span>
                            )}
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                APPROVED — Đã duyệt
                              </span>
                            )}
                            {isRejected && (
                              <div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  REJECTED — Từ chối
                                </span>
                                {req.rejectedReason && (
                                  <span className="block text-[10px] text-rose-600 mt-1 italic">
                                    Lý do: {req.rejectedReason}
                                  </span>
                                )}
                              </div>
                            )}
                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                CANCELLED — Đã hủy
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(req.orderId)}
                                disabled={isCancelling === req.orderId}
                                className="text-rose-600 hover:underline font-semibold"
                              >
                                {isCancelling === req.orderId ? 'Đang hủy...' : 'Hủy yêu cầu'}
                              </button>
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
    </div>
  );
}
