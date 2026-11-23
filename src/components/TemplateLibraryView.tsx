import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingBag, Search, Download, Check, Sparkles, Filter, 
  ArrowRight, ShoppingCart, Loader2, CheckCircle2, X,
  DollarSign, BookOpen, Heart, Flame, Rocket, Target, Layers, Info
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Product } from '../lib/types';
import { apiCall } from '../lib/apiClient';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { soundEngine } from '../lib/soundEngine';

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

function TemplatePreviewModal({
  template,
  onClose,
  onApply,
  isApplying,
  isApplied,
  canApplyDirectly,
  inCart
}: {
  template: Product;
  onClose: () => void;
  onApply: (t: Product) => void;
  isApplying: boolean;
  isApplied: boolean;
  canApplyDirectly: boolean;
  inCart: boolean;
}) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const { icon: VisualIcon, bg: visualBg } = getTemplateVisual(template.category, template.title);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-backdrop-fade cursor-default"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border-t sm:border border-slate-200 dark:border-slate-800 animate-modal-enter flex flex-col"
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${visualBg}`}>
              <VisualIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {template.category || 'Productivity'}
                </span>
                {template.tier && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {template.tier}
                  </span>
                )}
                {template.isFree || template.price === 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Miễn phí
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    Gói dịch vụ
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {template.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mô tả chi tiết
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {template.description}
            </p>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Từ khóa & Thẻ
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map(t => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Cơ chế tạo dữ liệu tự động</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Khi áp dụng, hệ thống sẽ tự động khởi tạo bộ dữ liệu cấu trúc (dự án, mục tiêu, công việc mẫu hoặc thói quen) trực tiếp vào workspace của bạn mà không làm ảnh hưởng đến dữ liệu hiện có.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <span className="text-xs text-slate-400">
            Tác giả: {template.author || 'LifeOS Team'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(template);
                onClose();
              }}
              disabled={isApplying}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                isApplied
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90'
              }`}
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : isApplied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Áp dụng lại</span>
                </>
              ) : canApplyDirectly ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Áp dụng ngay</span>
                </>
              ) : inCart ? (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Đã trong giỏ</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Thêm vào giỏ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateLibraryView() {
  const { products, cart, addToCart, loadAllData, setCurrentView, currentUser, subscriptionStatus } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Selected category with F5 Reload Persistence
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_marketplace_category');
        if (saved) return saved;
      } catch {}
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_marketplace_category', selectedCategory);
    } catch {}
  }, [selectedCategory]);

  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});
  const [previewTemplate, setPreviewTemplate] = useState<Product | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    targetView?: 'projects' | 'tasks' | 'finance' | 'habits' | 'notes' | 'cart';
    viewLabel?: string;
  } | null>(null);

  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!notification) return;
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 7000);
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, [notification]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const categories = ['All', 'Productivity', 'Finance', 'Study', 'Health', 'Management', 'Habits'];

  const userRole = (currentUser?.role || '').toUpperCase();
  // 100% Free-to-use mode: All templates are unlocked for 1-click apply
  const hasAccess = true;

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (products || []).filter((product: Product) => {
      const matchesSearch =
        !q ||
        (product.title || '').toLowerCase().includes(q) ||
        (product.description || '').toLowerCase().includes(q) ||
        (product.tags || []).some(t => t.toLowerCase().includes(q));
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleApplyTemplate = async (tpl: Product) => {
    if (!hasAccess && !tpl.isFree && tpl.price > 0) {
      if (addToCart) addToCart(tpl);
      soundEngine.playPop();
      setNotification({
        type: 'info',
        message: `Mẫu "${tpl.title}" đã được thêm vào giỏ hàng. Vui lòng kích hoạt gói dịch vụ để sử dụng.`,
        targetView: 'cart',
        viewLabel: 'Xem giỏ hàng & Gói dịch vụ'
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
        soundEngine.playSuccess();

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
      soundEngine.playPop();
      setNotification({
        type: 'error',
        message: err.message || 'Có lỗi xảy ra khi áp dụng mẫu. Vui lòng thử lại.'
      });
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8 overflow-x-hidden">
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
              onClick={() => {
                if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
                setNotification(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs w-full min-w-0">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm mẫu P.A.R.A, tài chính 50/30/20, thói quen nguyên tử..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800 dark:text-slate-100 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-full transition-colors"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain py-1 w-full sm:w-auto pb-1 sm:pb-0 min-w-0">
          {categories.map(cat => {
            const isActive = selectedCategory === cat;
            return (
              <button
                type="button"
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  soundEngine.playPop();
                }}
                className={`px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-0 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
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
          {(searchTerm || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                soundEngine.playPop();
              }}
              className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Đặt lại tìm kiếm & Bộ lọc
            </button>
          )}
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
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group relative"
              >
                <div 
                  onClick={() => setPreviewTemplate(tpl)}
                  className="cursor-pointer"
                >
                  {/* Top section: visual icon with category tag */}
                  <div className="flex items-center justify-between mb-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visualBg}`}>
                      <VisualIcon className="w-5 h-5" />
                    </div>
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

                {/* Card Footer: 'By LifeOS Team' aligned left, sleek 'Áp dụng' button aligned right */}
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

      {/* Template Detail Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onApply={handleApplyTemplate}
          isApplying={applyingId === previewTemplate.id}
          isApplied={!!appliedIds[previewTemplate.id]}
          canApplyDirectly={previewTemplate.isFree || previewTemplate.price === 0 || hasAccess}
          inCart={(cart || []).some(c => c.productId === previewTemplate.id)}
        />
      )}
    </div>
  );
}

export default TemplateLibraryView;