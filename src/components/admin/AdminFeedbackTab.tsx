import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Filter, Sparkles, CheckCircle2, Clock, 
  Lightbulb, Bug, Star, AlertCircle, Send, Check, Eye
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { soundEngine } from '../../lib/soundEngine';

export function AdminFeedbackTab() {
  const [data, setData] = useState<{ items: any[]; counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Editing / Replying state
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [targetStatus, setTargetStatus] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiCall(`/api/admin/feedback?${params.toString()}`);
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error loading admin feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [statusFilter, typeFilter]);

  const handleOpenEdit = (item: any) => {
    setSelectedFeedback(item);
    setAdminReplyText(item.adminReply || '');
    setTargetStatus(item.status);
    setIsImportant(Boolean(item.isImportant));
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedback) return;

    try {
      setUpdating(true);
      const res = await apiCall(`/api/admin/feedback/${selectedFeedback.id}`, 'PATCH', {
        status: targetStatus,
        adminReply: adminReplyText,
        isImportant
      });

      if (res?.success) {
        soundEngine.playCelebration();
        setSelectedFeedback(null);
        loadFeedbacks();
      }
    } catch (err) {
      console.error('Error updating feedback:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'New':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Mới gửi</span>;
      case 'Reviewing':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Đang xem xét</span>;
      case 'Planned':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">Đã lên kế hoạch</span>;
      case 'In Progress':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Đang phát triển</span>;
      case 'Completed':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Đã hoàn thành ✨</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Từ chối</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics by Status */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
        {[
          { key: 'ALL', label: 'Tất cả', count: (data?.items || []).length, color: 'text-slate-800 dark:text-white' },
          { key: 'New', label: 'Mới gửi', count: data?.counts?.New || 0, color: 'text-blue-600' },
          { key: 'Reviewing', label: 'Đang xem xét', count: data?.counts?.Reviewing || 0, color: 'text-indigo-600' },
          { key: 'Planned', label: 'Đã lên lịch', count: data?.counts?.Planned || 0, color: 'text-purple-600' },
          { key: 'In Progress', label: 'Đang làm', count: data?.counts?.['In Progress'] || 0, color: 'text-amber-600' },
          { key: 'Completed', label: 'Hoàn thành', count: data?.counts?.Completed || 0, color: 'text-emerald-600' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === tab.key
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
            } btn-squishy`}
          >
            <span className={`text-[11px] block font-bold ${statusFilter === tab.key ? 'text-purple-200' : 'text-slate-400'}`}>
              {tab.label}
            </span>
            <span className={`text-xl font-black ${statusFilter === tab.key ? 'text-white' : tab.color}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="card-cute rounded-3xl p-4 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo nội dung, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadFeedbacks()}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 w-56 sm:w-64"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800"
          >
            <option value="ALL">Tất cả loại</option>
            <option value="Idea">Ý tưởng (Idea)</option>
            <option value="Feature">Tính năng (Feature)</option>
            <option value="Bug">Lỗi (Bug)</option>
            <option value="Experience">Trải nghiệm</option>
          </select>
        </div>

        <button
          onClick={loadFeedbacks}
          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer btn-squishy shadow-xs"
        >
          Lọc kết quả
        </button>
      </div>

      {/* 3. Feedback Table */}
      <div className="card-cute rounded-3xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                <th className="pb-3">Tiêu đề & Nội dung</th>
                <th className="pb-3">Người gửi</th>
                <th className="pb-3">Loại</th>
                <th className="pb-3">Upvotes</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pb-3">Phản hồi của Admin</th>
                <th className="pb-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {(!data?.items || data.items.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không có phản hồi nào phù hợp
                  </td>
                </tr>
              ) : (
                data.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {item.isImportant && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                        <span>{item.title}</span>
                      </div>
                      <div className="text-slate-500 text-xs line-clamp-2 mt-0.5">
                        {item.content}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{item.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{item.user?.email}</div>
                    </td>
                    <td className="py-3 font-medium">
                      {item.type}
                    </td>
                    <td className="py-3 font-black text-purple-600">
                      👍 {item.upvotes || 0}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 max-w-xs text-xs text-slate-600 dark:text-slate-300">
                      {item.adminReply ? (
                        <div className="p-2 rounded-xl bg-purple-50/70 dark:bg-slate-800/80 text-[11px] line-clamp-2">
                          {item.adminReply}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa trả lời</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-200 cursor-pointer btn-squishy"
                      >
                        Xử lý / Trả lời
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal Reply & Status Transition */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="card-cute rounded-3xl p-6 bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-800 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span>Xử Lý & Trả Lời Góp Ý</span>
              </h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-white">{selectedFeedback.title}</div>
              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">{selectedFeedback.content}</p>
              <div className="text-[10px] text-slate-400 pt-1">
                Người gửi: {selectedFeedback.user?.name} ({selectedFeedback.user?.email})
              </div>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cập nhật trạng thái:
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  >
                    <option value="New">Mới gửi</option>
                    <option value="Reviewing">Đang xem xét (Reviewing)</option>
                    <option value="Planned">Đã lên kế hoạch (Planned)</option>
                    <option value="In Progress">Đang phát triển (In Progress)</option>
                    <option value="Completed">Đã hoàn thành (Completed)</option>
                    <option value="Rejected">Từ chối (Rejected)</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Đánh dấu quan trọng 🔥</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phản hồi gửi đến người dùng:
                </label>
                <textarea
                  rows={3}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Viết nội dung phản hồi (sẽ tự động gửi thông báo in-app đến người dùng)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md cursor-pointer btn-squishy"
                >
                  {updating ? 'Đang lưu...' : 'Lưu & Gửi thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
