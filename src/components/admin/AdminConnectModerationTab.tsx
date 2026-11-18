import React, { useState, useEffect } from 'react';
import { 
  Building, Video, HardDrive, Trash2, ShieldAlert, 
  ExternalLink, Users, MessageSquare, CheckCircle, RefreshCw 
} from 'lucide-react';
import { connectApi } from '../../lib/connectApiClient';
import { formatBytes } from '../../lib/imageCompressor';
import { toast } from '../../lib/toast';

export function AdminConnectModerationTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalCommunities: number;
    totalPosts: number;
    totalMeets: number;
    totalStorageBytes: number;
    communities: any[];
    activeMeets: any[];
  } | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await connectApi.getAdminStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi tải dữ liệu kiểm duyệt', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDeleteCommunity = async (id: string, name: string) => {
    if (!window.confirm(`Hành động NGUY HIỂM: Bạn có chắc chắn muốn xóa nhóm "${name}" và toàn bộ dữ liệu (bài viết, tin nhắn, meet) không?`)) {
      return;
    }
    try {
      const res = await connectApi.adminDeleteCommunity(id);
      if (res.success) {
        toast.show('Đã xóa nhóm thành công', 'success');
        fetchStats();
      }
    } catch (err: any) {
      toast.show(err.message || 'Lỗi xóa nhóm', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
            <Building className="w-4 h-4" />
            <span>Tổng Nhóm & Không Gian</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalCommunities ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Tổng Bài Đăng</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalPosts ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold mb-1">
            <Video className="w-4 h-4" />
            <span>Phòng Meet Trực Tuyến</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {stats?.totalMeets ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold mb-1">
            <HardDrive className="w-4 h-4" />
            <span>Dung Lượng Ảnh & Tệp</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatBytes(stats?.totalStorageBytes ?? 0)}
          </div>
        </div>
      </div>

      {/* Active Meets Section */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Phòng Meet Đang Hoạt Động (Live Meets)
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {(!stats?.activeMeets || stats.activeMeets.length === 0) ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            Hiện không có phòng Meet nào đang diễn ra trực tiếp.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.activeMeets.map(m => (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{m.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black">
                      ROOM: {m.roomCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Chủ trì: {m.host?.name || 'Vô danh'} • Nhóm: {m.community?.name || 'Chung'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold">
                    {Array.isArray(m.activeParticipants) ? m.activeParticipants.length : 0} người tham gia
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Communities Management Table */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-500" />
          <span>Danh Sách Nhóm & Không Gian Học</span>
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center">Đang tải dữ liệu kiểm duyệt...</p>
        ) : (!stats?.communities || stats.communities.length === 0) ? (
          <p className="text-xs text-slate-400 py-6 text-center">Chưa có nhóm nào được tạo trong hệ thống.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-2">Tên Nhóm</th>
                  <th className="pb-3 px-2">Quyền Riêng Tư</th>
                  <th className="pb-3 px-2">Chủ Sở Hữu</th>
                  <th className="pb-3 px-2">Thành Viên</th>
                  <th className="pb-3 px-2">Bài Đăng</th>
                  <th className="pb-3 px-2">Dung Lượng</th>
                  <th className="pb-3 px-2 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.communities.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-6 h-6 rounded-lg object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-[10px]">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.isPrivate 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {c.isPrivate ? '🔒 Nhóm Kín' : '🔓 Công Khai'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400">
                      {c.owner?.name || c.owner?.email || 'N/A'}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold">
                      {c._count?.members || 0}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold">
                      {c._count?.posts || 0}
                    </td>
                    <td className="py-3 px-2 font-mono text-slate-500">
                      {formatBytes(Number(c.storageBytes || 0))}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteCommunity(c.id, c.name)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Xóa nhóm vi phạm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
