import React from 'react';
import {
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Gift,
  Lock,
  X
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

export function AccountStatusBanner() {
  const { currentUser, subscriptionStatus, setCurrentView, language } = useAppStore();
  const t = useTranslation(language);
  const [isDismissed, setIsDismissed] = React.useState(false);

  const userRole = (currentUser?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  // Admins never see a warning banner
  if (isAdmin || isDismissed) {
    return null;
  }

  const hasAccess = subscriptionStatus?.hasAccess ?? false;
  const isPending = !!subscriptionStatus?.activePending || subscriptionStatus?.lifecycleStatus === 'PENDING';
  const isTrial = Boolean(subscriptionStatus?.isTrial);
  const isTrialActive = Boolean(subscriptionStatus?.isTrialActive);
  const isTrialExpired = Boolean(subscriptionStatus?.isTrialExpired);
  const remainingDays = subscriptionStatus?.remainingDays || 0;
  const trialEndsFormatted = subscriptionStatus?.trialEndsAt
    ? new Date(subscriptionStatus.trialEndsAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const isGlobalFree = Boolean(subscriptionStatus?.isGlobalFreeMode);
  const isExpired = !hasAccess && !isGlobalFree && (isTrialExpired || subscriptionStatus?.lifecycleStatus === 'EXPIRED' || subscriptionStatus?.status === 'EXPIRED');
  const isExpiringSoon = !isGlobalFree && hasAccess && remainingDays > 0 && remainingDays <= 2;

  // Active paid subscription with plenty of days left -> no banner needed
  if (!isGlobalFree && hasAccess && !isTrial && !isExpiringSoon) {
    return null;
  }

  // Active trial or global free with user dismiss -> respect
  if ((isTrialActive || isGlobalFree) && !isExpiringSoon && isDismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className={`w-full py-2.5 px-4 sm:px-6 text-xs font-medium flex items-center justify-between gap-3 border-b transition-colors z-20 ${
        isGlobalFree
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-2xs'
          : isPending
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
          : isTrialActive && isExpiringSoon
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-100'
          : isTrialActive
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-950 dark:text-emerald-200'
          : isExpiringSoon
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        {isGlobalFree ? (
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 animate-pulse" />
        ) : isPending ? (
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        ) : isExpired ? (
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : isTrialActive && isExpiringSoon ? (
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
        ) : isTrialActive ? (
          <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : isExpiringSoon ? (
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        ) : (
          <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        )}

        <span className="truncate">
          {isGlobalFree ? (
            <span>
              <strong>{t('Dùng thử miễn phí toàn hệ thống')}:</strong> {t('Quản trị viên đang mở quyền truy cập 100% tính năng Premium không giới hạn.')}
            </span>
          ) : isPending ? (
            <span>
              <strong>{t('Thanh toán đang chờ duyệt')}:</strong> {t('Đơn hàng của bạn đang được quản trị viên xử lý đối soát.')}
            </span>
          ) : isTrialExpired ? (
            <span>
              <strong>{t('Dùng thử 7 ngày đã kết thúc')}:</strong> {t('Thời hạn dùng thử miễn phí của bạn đã kết thúc lúc')} {trialEndsFormatted}. {t('Vui lòng kích hoạt gói trả phí để tiếp tục sử dụng các phân hệ Premium.')}
            </span>
          ) : isExpired ? (
            <span>
              <strong>{t('Gói dịch vụ đã hết hạn')}:</strong> {t('Vui lòng gia hạn để tiếp tục sử dụng đầy đủ các phân hệ.')}
            </span>
          ) : isTrialActive && isExpiringSoon ? (
            <span>
              <strong>{t('Sắp hết hạn dùng thử miễn phí')}:</strong> {t('Bạn chỉ còn')} <strong>{remainingDays} {t('ngày')}</strong> {t('dùng thử (kết thúc lúc')} {trialEndsFormatted}). {t('Hãy nâng cấp gói để không bị gián đoạn công việc.')}
            </span>
          ) : isTrialActive ? (
            <span>
              <strong>{t('Đang dùng thử 7 ngày miễn phí')}:</strong> {t('Còn lại')} <strong>{remainingDays} {t('ngày')}</strong> {t('(đến')} {trialEndsFormatted}). {t('Bạn đang có toàn quyền truy cập các tính năng Premium.')}
            </span>
          ) : isExpiringSoon ? (
            <span>
              <strong>{t('Sắp hết hạn')}:</strong> {t('Gói dịch vụ của bạn còn')} {remainingDays} {t('ngày.')}
            </span>
          ) : (
            <span>
              <strong>{t('Chế độ xem trước (Preview)')}:</strong> {t('Tài khoản chưa kích hoạt gói dịch vụ. Kích hoạt chỉ từ 29.000 ₫/tháng.')}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setCurrentView('subscription')}
          className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95 ${
            isPending
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : isExpired
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : isTrialActive && isExpiringSoon
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : isTrialActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : isExpiringSoon
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <span>
            {isPending
              ? t('Xem trạng thái')
              : isTrialExpired || isExpired
              ? t('Mua gói ngay')
              : isTrialActive && !isExpiringSoon
              ? t('Xem các gói')
              : t('Nâng cấp ngay')}
          </span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {(isTrialActive || isExpiringSoon) && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Đóng thông báo"
            className="p-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
