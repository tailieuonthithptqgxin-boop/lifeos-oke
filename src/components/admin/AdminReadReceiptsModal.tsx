import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Clock, MousePointerClick, Users, RefreshCw } from 'lucide-react';
import { apiCall } from '../../lib/apiClient';

interface ReceiptUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  readAt: string;
  clickedAt?: string | null;
}

interface AdminReadReceiptsModalProps {
  announcementId: string;
  announcementTitle: string;
  onClose: () => void;
}

export function AdminReadReceiptsModal({ announcementId, announcementTitle, onClose }: AdminReadReceiptsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalRecipients: number;
    totalRead: number;
    clickCount: number;
    receipts: ReceiptUser[];
  } | null>(null);
  const [search, setSearch] = useState('');

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await apiCall<{
        success: boolean;
        totalRecipients: number;
        totalRead: number;
        clickCount: number;
        receipts: ReceiptUser[];
      }>(`/api/admin/announcements/${announcementId}/receipts`);
      if (res && res.success) {
        setData(res);
      }
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [announcementId]);

  const filteredReceipts = (data?.receipts || []).filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.name && r.name.toLowerCase().includes(q)) || (r.email && r.email.toLowerCase().includes(q));
  });

  const readPercent = data && data.totalRecipients > 0 ? Math.round((data.totalRead / data.totalRecipients) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
              <span>Thống Kê Người Đọc Thực Tế</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {announcementTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 p-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Tổng người nhận</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {data?.totalRecipients || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Đã mở xem ({readPercent}%)</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {data?.totalRead || 0}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Lượt click CTA</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {data?.clickCount || 0}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email người đọc..."
            className="flex-1 text-xs bg-transparent border-0 focus:outline-hidden text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
          <button
            type="button"
            onClick={fetchReceipts}
            className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* List of Read Receipts */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">Đang tải danh sách người đã đọc...</p>
          ) : filteredReceipts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              {data?.totalRead === 0 ? 'Chưa có người dùng nào mở xem thông báo này.' : 'Không tìm thấy kết quả phù hợp.'}
            </p>
          ) : (
            filteredReceipts.map(r => (
              <div key={r.userId} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 overflow-hidden shrink-0">
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      r.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{r.name}</div>
                    <div className="text-slate-400 text-[11px]">{r.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] justify-end">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {new Date(r.readAt).toLocaleTimeString('vi-VN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {r.clickedAt && (
                    <div className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 justify-end mt-0.5">
                      <MousePointerClick className="w-3 h-3" />
                      <span>Đã bấm nút CTA</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
