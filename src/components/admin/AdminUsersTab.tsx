import React from 'react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Zap,
  RotateCcw,
  KeyRound
} from 'lucide-react';
import { ManagedUser } from './types';
import { CreateUserModal } from './CreateUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserDetailModal } from './UserDetailModal';
import { GrantSubscriptionModal } from './GrantSubscriptionModal';

interface AdminUsersTabProps {
  users: ManagedUser[];
  isLoadingUsers: boolean;
  userSearchTerm: string;
  setUserSearchTerm: (val: string) => void;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  userStatusFilter: string;
  setUserStatusFilter: (val: string) => void;
  userPlanFilter: string;
  setUserPlanFilter: (val: string) => void;
  saasMetrics: {
    totalUsers: number;
    activeSubscribers: number;
    unpaidUsers: number;
    pendingApprovalCount: number;
    expiredUsers: number;
    totalRevenue: number;
    mrr: number;
    conversionRatePercent: number;
  } | null;
  onRefreshUsers: () => void;
  handleStatusChange: (userId: string, status: string) => void;

  // Create User
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
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
  handleCreateUser: (e: React.FormEvent) => void;
  isSubmittingUser: boolean;

  // Reset Password
  showResetModal: ManagedUser | null;
  setShowResetModal: (user: ManagedUser | null) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  handleResetPassword: (e: React.FormEvent) => void;

  // User Detail
  selectedUserDetail: any;
  setSelectedUserDetail: (val: any) => void;
  handleOpenUserDetail: (userId: string) => void;
  adminNoteText: string;
  setAdminNoteText: (val: string) => void;
  handleSaveAdminNote: (userId: string) => void;
  isSavingAdminNote: boolean;

  // Grant Subscription
  grantModalUser: ManagedUser | null;
  setGrantModalUser: (user: ManagedUser | null) => void;
  grantPlanId: string;
  setGrantPlanId: (val: string) => void;
  grantDurationDays: number;
  setGrantDurationDays: (val: number) => void;
  grantReason: string;
  setGrantReason: (val: string) => void;
  handleGrantSubscription: (e: React.FormEvent) => void;
  isGranting: boolean;

  // Revoke Subscription
  handleRevokeSubscription: (userId: string, userName: string) => void;
  isRevoking: boolean;

  formatCurrency: (amount: number) => string;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  isLoadingUsers,
  userSearchTerm,
  setUserSearchTerm,
  roleFilter,
  setRoleFilter,
  userStatusFilter,
  setUserStatusFilter,
  userPlanFilter,
  setUserPlanFilter,
  saasMetrics,
  onRefreshUsers,
  handleStatusChange,
  showCreateModal,
  setShowCreateModal,
  newUser,
  setNewUser,
  handleCreateUser,
  isSubmittingUser,
  showResetModal,
  setShowResetModal,
  newPassword,
  setNewPassword,
  handleResetPassword,
  selectedUserDetail,
  setSelectedUserDetail,
  handleOpenUserDetail,
  adminNoteText,
  setAdminNoteText,
  handleSaveAdminNote,
  isSavingAdminNote,
  grantModalUser,
  setGrantModalUser,
  grantPlanId,
  setGrantPlanId,
  grantDurationDays,
  setGrantDurationDays,
  grantReason,
  setGrantReason,
  handleGrantSubscription,
  isGranting,
  handleRevokeSubscription,
  isRevoking,
  formatCurrency
}) => {
  return (
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
          <select
            value={userPlanFilter}
            onChange={e => setUserPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold"
          >
            <option value="All">Phân khúc gói</option>
            <option value="PAID">Đã trả phí (Paid Users)</option>
            <option value="FREE">Chưa kích hoạt (Free / Unpaid)</option>
          </select>
          <button
            type="button"
            onClick={onRefreshUsers}
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

      {/* Sub-modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        newUser={newUser}
        setNewUser={setNewUser}
        isSubmitting={isSubmittingUser}
      />

      <ResetPasswordModal
        user={showResetModal}
        onClose={() => setShowResetModal(null)}
        onSubmit={handleResetPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
      />

      <UserDetailModal
        userDetail={selectedUserDetail}
        onClose={() => setSelectedUserDetail(null)}
        adminNoteText={adminNoteText}
        setAdminNoteText={setAdminNoteText}
        onSaveAdminNote={handleSaveAdminNote}
        isSavingAdminNote={isSavingAdminNote}
        onOpenGrantModal={u => {
          setGrantModalUser(u);
          setGrantPlanId('PERSONAL_1M');
          setGrantDurationDays(30);
        }}
        onRevokeSubscription={handleRevokeSubscription}
        isRevoking={isRevoking}
        formatCurrency={formatCurrency}
      />

      <GrantSubscriptionModal
        user={grantModalUser}
        onClose={() => setGrantModalUser(null)}
        onSubmit={handleGrantSubscription}
        grantPlanId={grantPlanId}
        setGrantPlanId={setGrantPlanId}
        grantDurationDays={grantDurationDays}
        setGrantDurationDays={setGrantDurationDays}
        grantReason={grantReason}
        setGrantReason={setGrantReason}
        isGranting={isGranting}
      />
    </div>
  );
};
