import React from 'react';
import { Zap } from 'lucide-react';
import { ManagedUser } from './types';

interface GrantSubscriptionModalProps {
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  grantPlanId: string;
  setGrantPlanId: (val: string) => void;
  grantDurationDays: number;
  setGrantDurationDays: (val: number) => void;
  grantReason: string;
  setGrantReason: (val: string) => void;
  isGranting: boolean;
}

export const GrantSubscriptionModal: React.FC<GrantSubscriptionModalProps> = ({
  user,
  onClose,
  onSubmit,
  grantPlanId,
  setGrantPlanId,
  grantDurationDays,
  setGrantDurationDays,
  grantReason,
  setGrantReason,
  isGranting
}) => {
  if (!user) return null;

  return (
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
            Cấp quyền trực tiếp cho khách hàng <strong>{user.name}</strong> ({user.email}).
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
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
              placeholder="Ví dụ: Đã nhận tiền qua ngân hàng, Tặng tri ấn khách hàng..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
};
