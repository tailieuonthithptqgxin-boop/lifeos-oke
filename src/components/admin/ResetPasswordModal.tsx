import React from 'react';
import { ManagedUser } from './types';

interface ResetPasswordModalProps {
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  onClose,
  onSubmit,
  newPassword,
  setNewPassword
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đặt Lại Mật Khẩu</h3>
        <p className="text-xs text-slate-500">
          Đặt lại mật khẩu cho tài khoản <strong>{user.email}</strong>. Các phiên đăng nhập hiện tại sẽ bị hủy ngay lập tức.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={onClose}
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
  );
};
