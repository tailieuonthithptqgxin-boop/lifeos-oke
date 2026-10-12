import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, History, RefreshCw, Edit, Package, X, Check, AlertTriangle 
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { formatCurrency } from '../../lib/utils';
import { ServicePlan, PlanAuditLog } from './types';

interface AdminPlansTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminPlansTab({ onShowMessage }: AdminPlansTabProps) {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isResettingPlans, setIsResettingPlans] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [planAuditLogs, setPlanAuditLogs] = useState<PlanAuditLog[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const fetchPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const res = await apiCall('/api/admin/plans');
      if (res && res.success) {
        setPlans(res.plans || []);
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi tải danh sách gói dịch vụ', type: 'error' });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchPlanAuditLogs = async () => {
    try {
      const res = await apiCall('/api/admin/plans/audit-history');
      if (res && res.success) {
        setPlanAuditLogs(res.logs || []);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải lịch sử kiểm toán gói:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPlanAuditLogs();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setIsSavingPlan(true);
      const res = await apiCall(`/api/admin/plans/${editingPlan.id}`, 'PUT', {
        name: editingPlan.name,
        badge: editingPlan.badge,
        description: editingPlan.description,
        monthlyPrice: Number(editingPlan.monthlyPrice),
        yearlyPrice: Number(editingPlan.yearlyPrice),
        durationDays: Number(editingPlan.durationDays || (editingPlan.id === 'PERSONAL_3M' ? 90 : 30)),
        billingCycle: editingPlan.billingCycle,
        status: editingPlan.status,
        order: Number(editingPlan.order),
        features: editingPlan.features,
        quota: editingPlan.quota
      });

      if (res && res.success) {
        onShowMessage?.({
          text: `Cập nhật gói "${editingPlan.name}" thành công! Giá mới sẽ áp dụng an toàn cho các đơn hàng tạo sau thời điểm này.`,
          type: 'success'
        });
        setEditingPlan(null);
        await fetchPlans();
        await fetchPlanAuditLogs();
      } else {
        throw new Error(res?.message || 'Không thể cập nhật gói');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi lưu gói', type: 'error' });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleResetPlans = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục và đồng bộ danh sách gói dịch vụ trong quản trị về cấu hình chính thức (Cá nhân 1T, Cá nhân 3T, Team 1T)?')) {
      return;
    }
    try {
      setIsResettingPlans(true);
      const res = await apiCall('/api/admin/plans/reset-defaults', 'POST');
      if (res && res.success) {
        onShowMessage?.({
          text: 'Đã đồng bộ và cập nhật danh sách gói dịch vụ về chuẩn chính thức thành công!',
          type: 'success'
        });
        await fetchPlans();
        await fetchPlanAuditLogs();
      } else {
        throw new Error(res?.message || 'Không thể khôi phục gói');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi khôi phục gói', type: 'error' });
    } finally {
      setIsResettingPlans(false);
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureInput.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeatureInput.trim()]
    });
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: (editingPlan.features || []).filter((_, idx) => idx !== index)
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Danh Sách Gói Dịch Vụ</h3>
          <p className="text-xs text-slate-500">
            Chỉnh sửa giá gói, chu kỳ, tính năng và trạng thái. Thay đổi giá chỉ áp dụng cho đơn hàng mới, đơn hàng cũ giữ nguyên snapshot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetPlans}
            disabled={isResettingPlans || isLoadingPlans}
            className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer"
            title="Đồng bộ danh sách gói về gói chính thức (Cá nhân 1T, Cá nhân 3T, Team 1T)"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResettingPlans ? 'animate-spin' : ''}`} />
            <span>{isResettingPlans ? 'Đang khôi phục...' : 'Khôi phục gói chính thức'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAuditLogs(!showAuditLogs)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>{showAuditLogs ? 'Ẩn Lịch sử đổi giá' : 'Lịch sử đổi giá'}</span>
          </button>

          <button
            type="button"
            onClick={fetchPlans}
            disabled={isLoadingPlans}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPlans ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Clean Plans Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-4 px-6">Gói</th>
                <th className="py-4 px-6 text-right">Giá</th>
                <th className="py-4 px-6">Chu kỳ</th>
                <th className="py-4 px-6">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                      {plan.description}
                    </p>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <div className="font-black text-slate-900 dark:text-white text-sm">
                      {plan.monthlyPrice === 0 ? '0 ₫' : formatCurrency(plan.monthlyPrice)}
                      <span className="text-[10px] font-normal text-slate-400">/{plan.billingCycle || 'chu kỳ'}</span>
                    </div>
                    {plan.yearlyPrice > 0 && (
                      <div className="text-[11px] text-slate-400">
                        {formatCurrency(plan.yearlyPrice)}/năm
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6 font-medium">
                    {plan.billingCycle}
                  </td>

                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      plan.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${plan.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span>{plan.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}</span>
                    </span>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingPlan(plan)}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit History Log Accordion */}
      {showAuditLogs && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs animate-in fade-in duration-150">
          <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span>Nhật Ký Kiểm Toán Thay Đổi Gói & Giá</span>
          </h4>

          {planAuditLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">Chưa có thay đổi giá nào được ghi nhận gần đây.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Người thay đổi</th>
                    <th className="py-2.5 px-3">Gói</th>
                    <th className="py-2.5 px-3">Giá cũ → Giá mới</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {planAuditLogs.map((log) => {
                    let before: any = {};
                    let after: any = {};
                    try { before = JSON.parse(log.beforeState || '{}'); } catch(e){}
                    try { after = JSON.parse(log.afterState || '{}'); } catch(e){}

                    return (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {after.updatedBy || log.adminId}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">
                          {after.name || after.planId}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="line-through text-slate-400 mr-2">
                            {before.monthlyPrice ? formatCurrency(before.monthlyPrice) : '—'}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {after.monthlyPrice ? formatCurrency(after.monthlyPrice) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                            {after.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CHỈNH SỬA GÓI DỊCH VỤ */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Chỉnh Sửa Gói {editingPlan.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên gói *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Huy hiệu (Badge)
                  </label>
                  <input
                    type="text"
                    value={editingPlan.badge || ''}
                    onChange={e => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    placeholder="Khuyên Dùng, Phổ biến..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả gói *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingPlan.description}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60">
                <div>
                  <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                    Giá Gói / Chu kỳ (VND) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    required
                    value={editingPlan.monthlyPrice}
                    onChange={e => setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                    {formatCurrency(editingPlan.monthlyPrice)} / {editingPlan.billingCycle || 'chu kỳ'}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-blue-900 dark:text-blue-300 mb-1">
                    Giá Hàng Năm (VND, tùy chọn)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editingPlan.yearlyPrice || 0}
                    onChange={e => setEditingPlan({ ...editingPlan, yearlyPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                    {editingPlan.yearlyPrice > 0 ? `${formatCurrency(editingPlan.yearlyPrice)} / năm` : '0 ₫ (Không áp dụng)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Thời hạn (ngày) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingPlan.durationDays || (editingPlan.id === 'PERSONAL_3M' ? 90 : 30)}
                    onChange={e => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                    placeholder="30 hoặc 90"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chu kỳ hiển thị *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlan.billingCycle}
                    onChange={e => setEditingPlan({ ...editingPlan, billingCycle: e.target.value })}
                    placeholder="1 tháng (30 ngày)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái bán *
                  </label>
                  <select
                    value={editingPlan.status}
                    onChange={e => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="ACTIVE">Đang hoạt động (Đang bán)</option>
                    <option value="INACTIVE">Tạm ngưng (Ẩn khỏi checkout)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Giới hạn sử dụng / Quota
                </label>
                <input
                  type="text"
                  value={editingPlan.quota || ''}
                  onChange={e => setEditingPlan({ ...editingPlan, quota: e.target.value })}
                  placeholder="Ví dụ: Tối đa 5 thành viên, không giới hạn..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Features List Editing */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Danh sách tính năng ({editingPlan.features.length})
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={e => setNewFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                    placeholder="Nhập tính năng mới..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {editingPlan.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1 hover:text-rose-500 text-slate-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>An toàn giá:</strong> Giá mới sẽ áp dụng cho tất cả lượt mua sau thời điểm này. Các đơn hàng/yêu cầu chuyển khoản đã tạo trước đó vẫn giữ nguyên mức giá cũ.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  disabled={isSavingPlan}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingPlan ? 'Đang lưu...' : 'Lưu Thay Đổi Gói'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
