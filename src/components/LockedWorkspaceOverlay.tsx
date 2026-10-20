import React from 'react';
import {
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { formatCurrency } from '../lib/utils';

interface LockedWorkspaceOverlayProps {
  featureName?: string;
}

export function LockedWorkspaceOverlay({ featureName }: LockedWorkspaceOverlayProps) {
  const { subscriptionStatus, setCurrentView, language } = useAppStore();
  const t = useTranslation(language);

  const status = subscriptionStatus?.lifecycleStatus || (subscriptionStatus?.status === 'EXPIRED' ? 'EXPIRED' : 'UNPAID');
  const isPending = status === 'PENDING' || !!subscriptionStatus?.activePending;
  const isExpired = status === 'EXPIRED';

  const pendingOrder = subscriptionStatus?.activePending;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md transition-all animate-in fade-in duration-300 pointer-events-auto">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-2xl text-center relative overflow-hidden">
        {/* Subtle decorative glowing background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* State Icon Badge */}
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md relative">
          {isPending ? (
            <div className="w-full h-full rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
              <Clock className="w-7 h-7 animate-pulse" />
            </div>
          ) : isExpired ? (
            <div className="w-full h-full rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Lock className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {isPending
            ? t('Đang Chờ Quản Trị Viên Xác Nhận')
            : subscriptionStatus?.isTrialExpired
            ? t('Thời Gian Dùng Thử 7 Ngày Đã Kết Thúc')
            : isExpired
            ? t('Gói Dịch Vụ Đã Hết Hạn')
            : t('Không Gian Làm Việc Đang Khóa')}
        </h2>

        {/* Subtitle / Explanation */}
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-md mx-auto">
          {isPending ? (
            <span>
              Yêu cầu thanh toán của bạn cho đơn hàng{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{pendingOrder?.txReference || pendingOrder?.orderId || 'đang xử lý'}</strong>{' '}
              đã được ghi nhận. Vui lòng chờ quản trị viên đối soát ngân hàng và kích hoạt.
            </span>
          ) : subscriptionStatus?.isTrialExpired ? (
            <span>
              Bạn đã hoàn thành 7 ngày trải nghiệm miễn phí toàn bộ tính năng cao cấp của LifeOS. Toàn bộ dữ liệu của bạn vẫn được bảo toàn nguyên vẹn 100%. Vui lòng kích hoạt gói dịch vụ để tiếp tục sử dụng.
            </span>
          ) : isExpired ? (
            <span>
              Thời hạn sử dụng gói của bạn đã kết thúc. Toàn bộ dữ liệu của bạn vẫn được lưu trữ an toàn và bảo mật. Vui lòng gia hạn gói để tiếp tục chỉnh sửa và làm việc.
            </span>
          ) : (
            <span>
              Tài khoản của bạn đang ở chế độ xem trước (Preview). Kích hoạt gói dịch vụ chính thức để mở khóa toàn bộ quyền tạo, lưu và đồng bộ dữ liệu.
            </span>
          )}
        </p>

        {/* Feature Highlights Grid */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800/80 text-left space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Quyền lợi khi kích hoạt bản quyền:
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Quản lý 10 phân hệ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Đồng bộ thời gian thực</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Sao lưu tự động</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Hỗ trợ ưu tiên 24/7</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setCurrentView('subscription')}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {isPending
                ? t('Xem Chi Tiết Thanh Toán & Trạng Thái')
                : isExpired
                ? t('Gia Hạn Gói Dịch Vụ Ngay')
                : t('Chọn Gói Dịch Vụ & Kích Hoạt')}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Thanh toán an toàn qua VietQR chuyển khoản ngân hàng tự động 24/7
          </p>
        </div>
      </div>
    </div>
  );
}
