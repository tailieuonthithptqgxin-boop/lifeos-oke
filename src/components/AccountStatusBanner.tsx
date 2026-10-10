import React from 'react';
import {
  AlertTriangle,
  Clock,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
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
  const isExpired = subscriptionStatus?.lifecycleStatus === 'EXPIRED' || subscriptionStatus?.status === 'EXPIRED';
  const remainingDays = subscriptionStatus?.remainingDays || 0;
  const isExpiringSoon = hasAccess && remainingDays > 0 && remainingDays <= 7;
  const isUnpaid = !hasAccess && !isPending && !isExpired;

  // Nothing to show if active and not expiring soon
  if (hasAccess && !isExpiringSoon) {
    return null;
  }

  return (
    <div
      role="status"
      className={`w-full py-2 px-4 sm:px-6 text-xs font-medium flex items-center justify-between gap-3 border-b transition-colors z-20 ${
        isPending
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
          : isExpiringSoon
          ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
          : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-900 dark:text-indigo-200'
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        {isPending ? (
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        ) : isExpired ? (
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : isExpiringSoon ? (
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        ) : (
          <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        )}

        <span className="truncate">
          {isPending ? (
            <span>
              <strong>{t('Thanh toán đang chờ duyệt')}:</strong> {t('Đơn hàng của bạn đang được quản trị viên xử lý.')}
            </span>
          ) : isExpired ? (
            <span>
              <strong>{t('Gói dịch vụ đã hết hạn')}:</strong> {t('Vui lòng gia hạn để tiếp tục sử dụng đầy đủ các phân hệ.')}
            </span>
          ) : isExpiringSoon ? (
            <span>
              <strong>{t('Sắp hết hạn')}:</strong> {t('Gói dịch vụ của bạn còn')} {remainingDays} {t('ngày.')}
            </span>
          ) : (
            <span>
              <strong>{t('Chế độ xem trước (Preview)')}:</strong> {t('Tài khoản chưa kích hoạt gói dịch vụ. Kích hoạt chỉ từ 15.000 ₫/tháng.')}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setCurrentView('subscription')}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer ${
            isPending
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : isExpired
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : isExpiringSoon
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <span>{isPending ? t('Xem trạng thái') : t('Nâng cấp ngay')}</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        {isExpiringSoon && (
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Đóng thông báo"
            className="p-1 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
