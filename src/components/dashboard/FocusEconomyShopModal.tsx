import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import {
  ShoppingBag, X, Shield, Palette, Sparkles, Check, Coins, Zap
} from 'lucide-react';

interface ShopItem {
  id: string;
  name: string;
  category: 'streak' | 'theme' | 'pet';
  price: number;
  icon: any;
  color: string;
  description: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze',
    name: 'Bảo Hiểm Chuỗi (Streak Freeze)',
    category: 'streak',
    price: 30,
    icon: Shield,
    color: '#38bdf8',
    description: 'Bảo vệ chuỗi kỉ luật của bạn tự động nếu lỡ quên vào ngày bận rộn'
  },
  {
    id: 'theme_obsidian',
    name: 'Giao Diện Obsidian Dark Vibe',
    category: 'theme',
    price: 50,
    icon: Palette,
    color: '#6366f1',
    description: 'Bản sắc OLED đen sâu với điểm nhấn Indigo Neon & Amber Gold'
  },
  {
    id: 'theme_matcha',
    name: 'Giao Diện Matcha Latte Vibe',
    category: 'theme',
    price: 50,
    icon: Palette,
    color: '#10b981',
    description: 'Bản sắc xanh matcha thư thái cùng gam màu ngà ấm áp'
  },
  {
    id: 'pet_crown',
    name: 'Vương Miện Kim Cương Cho Pet',
    category: 'pet',
    price: 80,
    icon: Sparkles,
    color: '#f59e0b',
    description: 'Phụ kiện vương miện lấp lánh đội lên đầu linh vật đồng hành của bạn'
  }
];

interface FocusEconomyShopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FocusEconomyShopModal({ isOpen, onClose }: FocusEconomyShopModalProps) {
  const { currentUser } = useAppStore();
  const [coins, setCoins] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('lifeos_user_coins') || '120', 10);
    } catch {
      return 120;
    }
  });
  const [purchasedIds, setPurchasedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lifeos_purchased_shop_items') || '[]');
    } catch {
      return [];
    }
  });
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBuy = (item: ShopItem) => {
    if (purchasedIds.includes(item.id)) return;

    if (coins < item.price) {
      soundEngine.playPop();
      setFeedbackMsg(`Bạn không đủ Coin! Cần thêm ${item.price - coins} Coin.`);
      setTimeout(() => setFeedbackMsg(null), 2500);
      return;
    }

    soundEngine.playCelebration();
    triggerConfetti({ particleCount: 35 });

    const newCoins = coins - item.price;
    const newPurchased = [...purchasedIds, item.id];
    setCoins(newCoins);
    setPurchasedIds(newPurchased);

    try {
      localStorage.setItem('lifeos_user_coins', String(newCoins));
      localStorage.setItem('lifeos_purchased_shop_items', JSON.stringify(newPurchased));
      if (item.id === 'streak_freeze') {
        const currentFreezes = parseInt(localStorage.getItem('lifeos_streak_freezes') || '0', 10);
        localStorage.setItem('lifeos_streak_freezes', String(currentFreezes + 1));
      }
    } catch {}

    setFeedbackMsg(`Đã đổi thành công "${item.name}"!`);
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Focus Economy Reward Shop
              </h3>
              <p className="text-[11px] text-slate-400">Đổi thưởng thành quả học tập & làm việc</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Coins Banner */}
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Số dư Coin hiện có:
            </span>
          </div>
          <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
            {coins} Coins
          </span>
        </div>

        {feedbackMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center animate-in fade-in">
            {feedbackMsg}
          </div>
        )}

        {/* Shop Items List */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[60vh]">
          {SHOP_ITEMS.map(item => {
            const Icon = item.icon;
            const isOwned = purchasedIds.includes(item.id);

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  disabled={isOwned}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isOwned
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95'
                  }`}
                >
                  {isOwned ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Đã có
                    </span>
                  ) : (
                    <span>{item.price} Coins</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
