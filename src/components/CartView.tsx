import React, { useState, useEffect, useRef } from 'react';
import { apiCall } from '../lib/apiClient';
import { useAppStore } from '../lib/store';
import { formatCurrency } from '../lib/utils';
import { soundEngine } from '../lib/soundEngine';
import { CartItem } from '../lib/types';
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  RotateCcw,
  X,
  Mail,
  HelpCircle
} from 'lucide-react';

export function CartView() {
  const { cart, removeFromCart, addToCart, checkout, setCurrentView } = useAppStore();

  // Coupon code with F5 reload persistence
  const [couponCode, setCouponCode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_cart_coupon') || '';
      } catch {}
    }
    return '';
  });

  useEffect(() => {
    try {
      if (couponCode) {
        localStorage.setItem('lifeos_cart_coupon', couponCode);
      } else {
        localStorage.removeItem('lifeos_cart_coupon');
      }
    } catch {}
  }, [couponCode]);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 5-Second Undo Toast State for Item Removal
  const [undoCartItem, setUndoCartItem] = useState<{
    product: any;
    quantity: number;
  } | null>(null);
  const undoCartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (undoCartTimerRef.current) clearTimeout(undoCartTimerRef.current);
    };
  }, []);

  const handleRemoveItem = (item: CartItem) => {
    if (undoCartTimerRef.current) clearTimeout(undoCartTimerRef.current);
    const itemData = { ...item };
    setUndoCartItem({ product: itemData, quantity: (item as any).quantity || 1 });
    removeFromCart(item.id || item.productId);
    soundEngine.playPop();

    undoCartTimerRef.current = setTimeout(() => {
      setUndoCartItem(null);
    }, 5000);
  };

  const handleUndoRemove = async () => {
    if (undoCartItem) {
      if (undoCartTimerRef.current) clearTimeout(undoCartTimerRef.current);
      await addToCart(undoCartItem.product);
      setUndoCartItem(null);
      soundEngine.playSuccess();
    }
  };

  const applyCoupon = async () => {
    if (!couponCode || isApplying) return;
    setIsApplying(true);
    try {
      const res = await apiCall('/api/coupons/validate', 'POST', { code: couponCode });
      if (!isMountedRef.current) return;
      setDiscountPercent(res.discountPercent);
      soundEngine.playSuccess();
      setMessage({ text: `Áp dụng mã giảm giá thành công! Giảm ${res.discountPercent}%`, type: 'success' });
      setTimeout(() => {
        if (isMountedRef.current) setMessage(null);
      }, 3500);
    } catch (e: any) {
      if (!isMountedRef.current) return;
      soundEngine.playPop();
      setMessage({ text: e.message || 'Mã giảm giá không hợp lệ', type: 'error' });
      setDiscountPercent(0);
    } finally {
      if (isMountedRef.current) setIsApplying(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discount = (subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    try {
      await checkout(couponCode);
      if (!isMountedRef.current) return;
      soundEngine.playSuccess();
      setMessage({ text: 'Thanh toán thành công! Bản quyền đã được áp dụng vào tài khoản của bạn.', type: 'success' });
      setTimeout(() => {
        if (isMountedRef.current) setCurrentView('account');
      }, 1200);
    } catch (e: any) {
      if (!isMountedRef.current) return;
      soundEngine.playPop();
      setMessage({ text: e.message || 'Lỗi thanh toán', type: 'error' });
    } finally {
      if (isMountedRef.current) setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center font-sans w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 sm:mb-5">
          <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-2">Giỏ hàng của bạn đang trống</h2>
        <p className="text-slate-500 max-w-md mb-6 text-xs sm:text-sm break-words">
          Bạn chưa chọn mẫu quy trình số nào từ Marketplace. Bạn có thể khám phá các mẫu có sẵn hoặc nâng cấp gói bản quyền trực tuyến LifeOS.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setCurrentView('subscription')}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Xem Gói Dịch Vụ LifeOS</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('marketplace')}
            className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Khám phá Thư viện Mẫu
          </button>
        </div>

        {/* Floating 5-Second Undo Toast */}
        {undoCartItem && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-300 text-xs font-semibold backdrop-blur-md animate-slide-up">
            <span className="truncate max-w-[200px] sm:max-w-[280px]">
              Đã xóa "{undoCartItem.product.title || undoCartItem.product.name}" khỏi giỏ hàng
            </span>
            <button
              type="button"
              onClick={handleUndoRemove}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hoàn tác (5s)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoCartTimerRef.current) clearTimeout(undoCartTimerRef.current);
                setUndoCartItem(null);
              }}
              className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-opacity cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 font-sans overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">Giỏ hàng bản quyền</h2>
          <p className="text-xs text-slate-500 mt-0.5 break-words">
            Sản phẩm phần mềm & mẫu quy trình kỹ thuật số (Kích hoạt trực tuyến ngay sau khi thanh toán)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentView('subscription')}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 fill-blue-600" />
          <span>Xem Gói Dịch Vụ LifeOS</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={item.product.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex gap-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">{item.product.name || item.product.title}</h3>
                    <p className="font-bold text-slate-900 dark:text-white text-sm shrink-0">{formatCurrency(item.product.price)}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Bởi {item.product.author || 'LifeOS Team'}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Số lượng: {item.quantity} (Bản quyền cá nhân)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item)}
                    className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Guarantees & Support Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Kích hoạt tự động vào không gian làm việc ngay sau khi hoàn tất thanh toán.
              </span>
            </div>
            <div className="flex items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
              <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>
                Hỗ trợ kỹ thuật: <strong className="text-slate-700 dark:text-slate-300">adminteamdaniel@gmail.com</strong>. Chính sách hoàn tiền chỉ áp dụng đối với các sự cố kỹ thuật website phát sinh trong quá trình thanh toán hoặc cấp quyền dịch vụ.
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sticky top-6 space-y-5">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Tổng thanh toán trực tuyến</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Giảm giá</span>
                <span className="font-medium text-emerald-600">-{formatCurrency(discount)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Tổng cộng</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Mã giảm giá (ví dụ: LIFEOS20)..."
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs uppercase font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={isApplying || !couponCode.trim()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {isApplying ? '...' : 'Áp dụng'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{isCheckingOut ? 'Đang kích hoạt bản quyền...' : 'Thanh toán & Kích hoạt'}</span>
                {!isCheckingOut && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 leading-normal">
                Không có phí vận chuyển. Quyền sử dụng phần mềm kỹ thuật số được cấp ngay cho tài khoản của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating 5-Second Undo Toast */}
      {undoCartItem && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-300 text-xs font-semibold backdrop-blur-md animate-slide-up">
          <span className="truncate max-w-[200px] sm:max-w-[280px]">
            Đã xóa "{undoCartItem.product.title || undoCartItem.product.name}" khỏi giỏ hàng
          </span>
          <button
            type="button"
            onClick={handleUndoRemove}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác (5s)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoCartTimerRef.current) clearTimeout(undoCartTimerRef.current);
              setUndoCartItem(null);
            }}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 transition-opacity cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default CartView;