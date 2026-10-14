import React, { useState } from 'react';
import { ShoppingBag, Search, Download, Check, Sparkles, Filter, ArrowRight, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Product } from '../lib/types';
import { apiCall } from '../lib/apiClient';

export function TemplateLibraryView() {
  const { products, cart, addToCart, loadAllData, setCurrentView, currentUser, subscriptionStatus } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    targetView?: 'projects' | 'tasks' | 'finance' | 'habits' | 'notes' | 'cart';
    viewLabel?: string;
  } | null>(null);

  const categories = ['All', 'Productivity', 'Finance', 'Study', 'Health', 'Management', 'Habits'];

  const userRole = (currentUser?.role || '').toUpperCase();
  const hasAccess = Boolean(subscriptionStatus?.hasAccess || userRole === 'ADMIN' || userRole === 'SUPERADMIN');

  const filteredProducts = (products || []).filter((product: Product) => {
    const matchesSearch =
      (product.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApplyTemplate = async (tpl: Product) => {
    if (!hasAccess && !tpl.isFree) {
      if (addToCart) addToCart(tpl);
      setNotification({
        type: 'info',
        message: `Mẫu "${tpl.title}" yêu cầu tài khoản đã kích hoạt gói dịch vụ. Vui lòng kích hoạt gói để sử dụng toàn bộ mẫu.`,
        targetView: 'cart',
        viewLabel: 'Xem gói dịch vụ'
      });
      return;
    }

    try {
      setApplyingId(tpl.id);
      setNotification(null);

      const res = await apiCall(`/api/templates/${tpl.id}/apply`, 'POST');

      if (res && res.success) {
        // Refresh local store to reflect new projects, tasks, habits, etc.
        await loadAllData();
        setAppliedIds(prev => ({ ...prev, [tpl.id]: true }));

        const targetView = (res.summary?.view || 'tasks') as any;
        const viewNames: Record<string, string> = {
          projects: 'Dự án',
          tasks: 'Công việc',
          finance: 'Tài chính',
          habits: 'Thói quen',
          notes: 'Ghi chú'
        };

        setNotification({
          type: 'success',
          message: res.message || `Đã áp dụng mẫu "${tpl.title}" thành công vào không gian làm việc của bạn!`,
          targetView,
          viewLabel: `Mở xem trong ${viewNames[targetView] || 'Không gian làm việc'}`
        });
      } else {
        throw new Error(res?.message || 'Không thể áp dụng mẫu');
      }
    } catch (err: any) {
      console.error('Failed to apply template:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Có lỗi xảy ra khi áp dụng mẫu. Vui lòng thử lại.'
      });
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">Thư viện Mẫu (Template Library)</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 break-words">
            Các khuôn mẫu quản trị năng suất, tài chính, dự án và thói quen chuẩn hóa — Nhấn "Áp dụng" để tạo ngay vào workspace cá nhân.
          </p>
        </div>
      </div>

      {/* Interactive Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : notification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <span className="text-lg">⚠️</span>}
            {notification.type === 'info' && <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
            <span className="text-xs sm:text-sm font-medium">{notification.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notification.targetView && notification.viewLabel && (
              <button
                type="button"
                onClick={() => setCurrentView(notification.targetView as any)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <span>{notification.viewLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full min-w-0">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm mẫu P.A.R.A, tài chính 50/30/20, thói quen nguyên tử..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0 min-w-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Templates */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center w-full min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Không tìm thấy mẫu phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
          {filteredProducts.map((tpl: Product) => {
            const isApplied = !!appliedIds[tpl.id];
            const isCurrentlyApplying = applyingId === tpl.id;
            const inCart = (cart || []).some(c => c.productId === tpl.id);
            const canApplyDirectly = tpl.isFree || tpl.price === 0 || hasAccess;

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900/50 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      {tpl.category || 'General'}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      tpl.isFree || tpl.price === 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : hasAccess
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {tpl.isFree || tpl.price === 0 ? 'Miễn phí' : hasAccess ? 'Đã bao gồm trong gói' : `${tpl.price.toLocaleString('vi-VN')} ₫`}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5">{tpl.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">Tác giả: {tpl.author || 'LifeOS Core'}</span>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Primary Apply Button */}
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      disabled={isCurrentlyApplying}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                        isApplied
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : canApplyDirectly
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : inCart
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                      }`}
                    >
                      {isCurrentlyApplying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang áp dụng...</span>
                        </>
                      ) : isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã áp dụng ✓</span>
                        </>
                      ) : canApplyDirectly ? (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Áp dụng</span>
                        </>
                      ) : inCart ? (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Trong giỏ hàng</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Mua & Áp dụng</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
