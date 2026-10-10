import React from 'react';
import { X, Edit, Zap, RotateCcw } from 'lucide-react';
import { ManagedUser } from './types';

interface UserDetailModalProps {
  userDetail: any | null;
  onClose: () => void;
  adminNoteText: string;
  setAdminNoteText: (val: string) => void;
  onSaveAdminNote: (userId: string) => void;
  isSavingAdminNote: boolean;
  onOpenGrantModal: (user: ManagedUser) => void;
  onRevokeSubscription: (userId: string, userName: string) => void;
  isRevoking: boolean;
  formatCurrency: (amount: number) => string;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userDetail,
  onClose,
  adminNoteText,
  setAdminNoteText,
  onSaveAdminNote,
  isSavingAdminNote,
  onOpenGrantModal,
  onRevokeSubscription,
  isRevoking,
  formatCurrency
}) => {
  if (!userDetail) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src={userDetail.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetail.user.name)}`}
              alt=""
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 object-cover"
            />
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {userDetail.user.name}
              </h3>
              <div className="text-xs text-slate-400">
                {userDetail.user.email} • ID: <span className="font-mono">{userDetail.user.id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
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
                {userDetail.subscriptionStatus?.planName || userDetail.user.plan}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Hạn sử dụng</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {userDetail.subscriptionStatus?.endDate
                  ? new Date(userDetail.subscriptionStatus.endDate).toLocaleDateString('vi-VN')
                  : 'Chưa có'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Số ngày còn lại</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {userDetail.subscriptionStatus?.remainingDays || 0} ngày
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Trạng thái tài khoản</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {userDetail.user.status}
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
                onClick={() => onSaveAdminNote(userDetail.user.id)}
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
              Lịch sử đăng ký & gia hạn gói ({userDetail.subscriptions?.length || 0})
            </h4>
            {userDetail.subscriptions?.length === 0 ? (
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
                    {userDetail.subscriptions.map((s: any) => (
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
              Lịch sử thanh toán & chuyển khoản ({userDetail.payments?.length || 0})
            </h4>
            {userDetail.payments?.length === 0 ? (
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
                    {userDetail.payments.map((p: any) => (
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
              onClick={() => onOpenGrantModal(userDetail.user)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Cấp / Gia hạn gói</span>
            </button>

            {userDetail.user.plan !== 'FREE' && (
              <button
                type="button"
                onClick={() => onRevokeSubscription(userDetail.user.id, userDetail.user.name)}
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
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
