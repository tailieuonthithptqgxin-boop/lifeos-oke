import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  Flame,
  Award,
  Shield,
  Zap,
  Lock,
  Unlock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Sparkles
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { soundEngine } from '../../lib/soundEngine';

interface UserXRayModalProps {
  userId: string | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function UserXRayModal({ userId, onClose, onUserUpdated }: UserXRayModalProps) {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(Boolean(userId));

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setIsLoading(true);

    apiCall<{ success: boolean; profile: any }>(`/api/analytics/admin/users/${userId}/xray`)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.profile) {
          setProfileData(res.profile);
          setAdminNotes(res.profile.user.adminNotes || '');
          setSelectedPlan(res.profile.user.plan || 'FREE');
        } else {
          toast.error('Không thể tải hồ sơ X-Quang người dùng.');
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error(err.message || 'Lỗi kết nối máy chủ.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleSaveNotes = async () => {
    if (!userId) return;
    try {
      setIsSavingNotes(true);
      const res = await apiCall(`/api/analytics/admin/users/${userId}/notes`, 'PUT', {
        notes: adminNotes.trim()
      });
      if (res && res.success) {
        soundEngine.playSuccess();
        toast.success('Đã lưu ghi chú quản trị thành công!');
        onUserUpdated?.();
      } else {
        throw new Error(res?.message || 'Không thể lưu ghi chú.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu ghi chú.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleUpdatePlan = async (newPlan: string) => {
    if (!userId || newPlan === profileData?.user?.plan) return;
    try {
      setIsUpdatingPlan(true);
      const res = await apiCall(`/api/analytics/admin/users/${userId}/plan`, 'PUT', {
        plan: newPlan
      });
      if (res && res.success) {
        soundEngine.playSuccess();
        toast.success(`Đã nâng/hạ cấp gói thành công: ${newPlan}`);
        setSelectedPlan(newPlan);
        setProfileData((prev: any) => ({
          ...prev,
          user: { ...prev.user, plan: newPlan }
        }));
        onUserUpdated?.();
      } else {
        throw new Error(res?.message || 'Không thể cập nhật gói.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi cập nhật gói.');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!userId || !profileData?.user) return;
    const currentStatus = profileData.user.status;
    const targetStatus = currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED';
    const confirmMsg =
      targetStatus === 'BANNED'
        ? `Bạn có chắc chắn muốn KHÓA tài khoản ${profileData.user.name}? Người này sẽ không thể đăng nhập.`
        : `Mở khóa hoạt động lại cho tài khoản ${profileData.user.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsUpdatingStatus(true);
      const res = await apiCall(`/api/analytics/admin/users/${userId}/status`, 'PUT', {
        status: targetStatus
      });
      if (res && res.success) {
        soundEngine.playSuccess();
        toast.success(targetStatus === 'BANNED' ? 'Đã khóa tài khoản!' : 'Đã mở khóa tài khoản!');
        setProfileData((prev: any) => ({
          ...prev,
          user: { ...prev.user, status: targetStatus }
        }));
        onUserUpdated?.();
      } else {
        throw new Error(res?.message || 'Không thể đổi trạng thái.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi thao tác.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (!userId) return null;

  const user = profileData?.user;
  const referrer = profileData?.referrer;
  const features: any[] = profileData?.features || [];
  const maxUses = features.length > 0 ? Math.max(...features.map((f: any) => f.useCount || 1)) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-bottom-sheet sm:animate-in sm:zoom-in-95 duration-200"
      >
        {/* Mobile Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden mt-2.5 -mb-1" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                  {user?.name || 'Hồ Sơ X-Quang Người Dùng'}
                </h3>
                {user?.isAffiliate && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900 uppercase">
                    ⭐ CTV
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    user?.status === 'BANNED'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {user?.status === 'BANNED' ? 'Đã khóa' : 'Hoạt động'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email} • ID: <span className="font-mono">{user?.id?.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang trích xuất dữ liệu X-Quang chi tiết...</p>
            </div>
          ) : !user ? (
            <div className="py-12 text-center text-slate-400 font-medium">
              Không tìm thấy hồ sơ người dùng này.
            </div>
          ) : (
            <>
              {/* KHỐI 1: Thông tin cơ bản & Nguồn giới thiệu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ngày đăng ký
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white mt-1 block">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Số ngày hoạt động
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>{user.activeDays || 1} ngày</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Online gần nhất
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
                    {user.lastActiveAt
                      ? new Date(user.lastActiveAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
                        ' ' +
                        new Date(user.lastActiveAt).toLocaleDateString('vi-VN')
                      : 'Chưa ghi nhận'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gói dịch vụ
                  </span>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400 mt-1 block">
                    {user.plan}
                  </span>
                </div>
              </div>

              {/* Thẻ Cộng Tác Viên mời (Referrer Card) */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Award className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                      Nguồn giới thiệu (Affiliate Partner)
                    </span>
                    {referrer ? (
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                        {referrer.name} ({referrer.email}) • Mã:{' '}
                        <span className="font-mono text-purple-600 dark:text-purple-400">{referrer.referralCode}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tự đăng ký trực tiếp (Không qua mã giới thiệu CTV)
                      </p>
                    )}
                  </div>
                </div>
                {referrer && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-purple-200/80 dark:bg-purple-900 text-purple-900 dark:text-purple-200 shrink-0">
                    Đã gán CTV
                  </span>
                )}
              </div>

              {/* KHỐI 2: Phân tích chi tiết "Người này dùng chức năng nào, dùng ra sao" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Hành vi & Tần suất sử dụng chức năng</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tổng: {user.totalFeatureUses} lượt ({user.totalTimeMinutes} phút)
                  </span>
                </div>

                {features.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400">
                    Người dùng này chưa có dữ liệu thao tác các chức năng.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {features.map((f: any, idx: number) => {
                      const pct = Math.min(100, Math.round((f.useCount / maxUses) * 100));
                      return (
                        <div
                          key={f.featureKey}
                          className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {f.featureName}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 text-right">
                              <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs">
                                {f.useCount} lượt
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {f.durationMinutes}p
                              </span>
                            </div>
                          </div>

                          {/* Progress bar mức độ ưa thích */}
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Lần cuối dùng: {new Date(f.lastUsedAt).toLocaleString('vi-VN')}</span>
                            <span>Ưa thích: {pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* KHỐI 3: Thao tác Quản trị nhanh của Admin */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-3.5">
                <h4 className="font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Khu Vực Thao Tác Quản Trị Nhanh</span>
                </h4>

                {/* Đổi gói dịch vụ nhanh */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Cấp / Đổi Gói Dịch Vụ
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Nâng cấp VIP hoặc chuyển đổi phân hạng người dùng
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['FREE', 'PRO', 'PREMIUM', 'LIFETIME'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleUpdatePlan(p)}
                        disabled={isUpdatingPlan || selectedPlan === p}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 ${
                          selectedPlan === p
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-purple-950'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Khóa / Mở khóa tài khoản */}
                <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Trạng thái hoạt động
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {user.status === 'BANNED' ? 'Tài khoản đang bị khóa truy cập' : 'Tài khoản đang hoạt động bình thường'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isUpdatingStatus}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      user.status === 'BANNED'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                    }`}
                  >
                    {user.status === 'BANNED' ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Mở khóa tài khoản</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Khóa tài khoản</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Ghi chú riêng của Admin về khách này */}
                <div className="space-y-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ghi chú riêng của Admin về khách này</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isSavingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Ghi chú sở thích khách hàng, phản hồi đặc biệt, lịch hẹn CSKH..."
                    className="w-full p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
