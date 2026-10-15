import React, { useState } from 'react';
import { 
  ShoppingBag, Search, Download, Check, Sparkles, Filter, 
  ArrowRight, ShoppingCart, Loader2, CheckCircle2,
  DollarSign, BookOpen, Heart, Flame, Rocket, Target, Layers
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Product } from '../lib/types';
import { apiCall } from '../lib/apiClient';

const getTemplateVisual = (category: string = '', title: string = '') => {
  const cat = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (cat.includes('finance') || t.includes('tài chính') || t.includes('budget') || t.includes('tiền')) {
    return {
      icon: DollarSign,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60'
    };
  }
  if (cat.includes('study') || t.includes('học') || t.includes('cornell') || t.includes('từ vựng')) {
    return {
      icon: BookOpen,
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60'
    };
  }
  if (cat.includes('health') || t.includes('sức khỏe') || t.includes('thể lực') || t.includes('mindful')) {
    return {
      icon: Heart,
      bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60'
    };
  }
  if (cat.includes('habit') || t.includes('thói quen')) {
    return {
      icon: Flame,
      bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60'
    };
  }
  if (t.includes('startup') || t.includes('launch') || t.includes('dự án')) {
    return {
      icon: Rocket,
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60'
    };
  }
  return {
    icon: Target,
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  };
};

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
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">Thư viện Mẫu (Template Library)</h2>
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
                className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full min-w-0">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm mẫu P.A.R.A, tài chính 50/30/20, thói quen nguyên tử..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0 min-w-0">
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-semibold'
                    : 'bg-[#F1F5F9] dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                }`}
              >
                {cat === 'All' ? 'Tất cả' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Templates (3-Column Bento Layout) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center w-full min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
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
            const { icon: VisualIcon, bg: visualBg } = getTemplateVisual(tpl.category, tpl.title);

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group"
              >
                <div>
                  {/* Top section: small elegant square placeholder with monochromatic icon backed by soft pastel block */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visualBg}`}>
                      <VisualIcon className="w-5 h-5" />
                    </div>
                    {/* Clean category tag in minimal gray text (no heavy background) */}
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {tpl.category || 'Productivity'}
                    </span>
                  </div>

                  {/* Card Body */}
                  <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1.5 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                {/* Card Footer: 'By LifeOS Team' aligned left, sleek 'Áp dụng' button or right-arrow aligned right */}
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                    By {tpl.author || 'LifeOS Team'}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    disabled={isCurrentlyApplying}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isApplied
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isCurrentlyApplying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đã có</span>
                      </>
                    ) : canApplyDirectly ? (
                      <>
                        <span>Áp dụng</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    ) : inCart ? (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Trong giỏ</span>
                      </>
                    ) : (
                      <>
                        <span>Áp dụng</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
