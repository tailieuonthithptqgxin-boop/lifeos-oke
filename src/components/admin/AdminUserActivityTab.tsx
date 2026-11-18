import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Shield,
  Zap,
  Activity,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { soundEngine } from '../../lib/soundEngine';
import { UserXRayModal } from './UserXRayModal';

export interface UserActivityItem {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  plan: string;
  status: string;
  isAffiliate: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  activityStatus: 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE';
  activityLabel: string;
  activityDotColor: string;
  topFeatureName: string;
  topFeatureUses: number;
  referrerName: string | null;
  referralCode: string | null;
}

export function AdminUserActivityTab() {
  const [users, setUsers] = useState<UserActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    totalPages: 1,
    totalCount: 0
  });

  const [selectedXRayUserId, setSelectedXRayUserId] = useState<string | null>(null);

  const fetchUsers = async (page = currentPage, filter = activeFilter, search = searchTerm) => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '25',
        filter: filter,
        search: search.trim()
      });

      const res = await apiCall<{
        success: boolean;
        users: UserActivityItem[];
        pagination: any;
      }>(`/api/analytics/admin/users?${q.toString()}`);

      if (res && res.success) {
        setUsers(res.users || []);
        if (res.pagination) setPagination(res.pagination);
      } else {
        toast.error('Không thể tải danh sách người dùng.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, activeFilter, searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, activeFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    soundEngine.playPop();
    setCurrentPage(newPage);
    fetchUsers(newPage, activeFilter, searchTerm);
  };

  const handleFilterClick = (filter: 'ALL' | 'ONLINE' | 'ACTIVE_3D' | 'AT_RISK' | 'INACTIVE') => {
    soundEngine.playPop();
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const openXRay = (userId: string) => {
    soundEngine.playPop();
    setSelectedXRayUserId(userId);
  };

  return (
    <div className="space-y-5">
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-transparent p-4 sm:p-5 rounded-3xl border border-purple-100 dark:border-purple-950/60">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Quản Lý Người Dùng & Trạng Thái Hoạt Động</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi trạng thái online, hành vi sử dụng và mở hồ sơ X-Quang chi tiết từng cá nhân
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playPop();
            fetchUsers(currentPage, activeFilter, searchTerm);
          }}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Search Input & 1-Tap Filter Chips */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Tên, Email, Tên tài khoản hoặc Mã giới thiệu CTV..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-xs"
          />
        </div>

        {/* 1-Tap Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ONLINE', label: '🟢 Đang Online (15p)' },
            { id: 'ACTIVE_3D', label: '🔵 Hoạt động tích cực (3 ngày)' },
            { id: 'AT_RISK', label: '🟡 Nguy cơ bỏ web (7 - 14 ngày)' },
            { id: 'INACTIVE', label: '⚫ Không hoạt động (>15 ngày)' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleFilterClick(f.id as any)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition cursor-pointer active:scale-95 min-h-[40px] ${
                activeFilter === f.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Count & Pagination Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>
          Tìm thấy <span className="font-extrabold text-slate-900 dark:text-white">{pagination.totalCount}</span> người dùng
        </span>
        <span>
          Trang {pagination.page} / {pagination.totalPages}
        </span>
      </div>

      {/* Mobile-First User Cards List */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách người dùng...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
          Không tìm thấy người dùng phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-300 dark:hover:border-purple-700 transition"
            >
              {/* Card Header: Avatar, Name, Email, Status & Plan */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      u.name[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {u.name}
                      </span>
                      {u.isAffiliate && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 uppercase">
                          ⭐ CTV
                        </span>
                      )}
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 uppercase">
                        {u.plan}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {u.email}
                    </p>
                  </div>
                </div>

                {/* Activity Dot & Status Label */}
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className={`w-2 h-2 rounded-full ${u.activityDotColor}`} />
                    <span>{u.activityLabel}</span>
                  </span>
                </div>
              </div>

              {/* Behavior & Referrer Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Chức năng dùng nhiều nhất */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <span className="text-base shrink-0">⭐</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Chức năng ưa thích nhất</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {u.topFeatureName} ({u.topFeatureUses} lượt)
                    </span>
                  </div>
                </div>

                {/* Nguồn giới thiệu CTV */}
                <div className="p-2.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase block">
                      Cộng tác viên mời
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {u.referrerName ? `${u.referrerName} (Mã: ${u.referralCode})` : 'Đăng ký tự nhiên'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Open X-Ray Profile */}
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => openXRay(u.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-purple-600/20 min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Xem Hồ Sơ X-Quang Người Dùng ↗</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trang trước</span>
          </button>

          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            Trang {pagination.page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer disabled:opacity-40 min-h-[44px]"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User X-Ray Modal */}
      {selectedXRayUserId && (
        <UserXRayModal
          userId={selectedXRayUserId}
          onClose={() => setSelectedXRayUserId(null)}
          onUserUpdated={() => fetchUsers(currentPage, activeFilter, searchTerm)}
        />
      )}
    </div>
  );
}
