import React from 'react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newUser: {
    name: string;
    email: string;
    role: string;
    plan: string;
    temporaryPassword: string;
  };
  setNewUser: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    role: string;
    plan: string;
    temporaryPassword: string;
  }>>;
  isSubmitting: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newUser,
  setNewUser,
  isSubmitting
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cấp Tài Khoản Người Dùng Mới</h3>
        <form onSubmit={onSubmit} className="space-y-4">
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
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Đang khởi tạo...' : 'Khởi tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
