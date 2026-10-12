import React, { useState } from 'react';
import { Sparkles, Coins, Gift, X, Star, Crown, Shield, Zap } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';

interface DailyMysteryChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: {
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    xp: number;
    coins: number;
    title: string;
  } | null;
}

export function DailyMysteryChestModal({
  isOpen,
  onClose,
  reward
}: DailyMysteryChestModalProps) {
  const [revealed, setRevealed] = useState(false);
  const [opening, setOpening] = useState(false);

  if (!isOpen || !reward) return null;

  const handleOpenClick = () => {
    if (opening || revealed) return;
    setOpening(true);
    soundEngine.playChestOpen();

    setTimeout(() => {
      setRevealed(true);
      setOpening(false);
      triggerConfetti();
      soundEngine.playCoinShower();
    }, 900);
  };

  const handleClose = () => {
    setRevealed(false);
    setOpening(false);
    onClose();
  };

  const rarityConfig = {
    LEGENDARY: {
      label: '👑 THẦN THOẠI (LEGENDARY)',
      bg: 'from-amber-500/30 via-yellow-500/20 to-slate-900',
      border: 'border-amber-400 shadow-amber-400/40',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-400 text-slate-950',
      icon: Crown
    },
    EPIC: {
      label: '🔮 HUYỀN BÍ (EPIC)',
      bg: 'from-purple-500/30 via-indigo-500/20 to-slate-900',
      border: 'border-purple-400 shadow-purple-500/40',
      text: 'text-purple-400',
      badgeBg: 'bg-purple-500 text-white',
      icon: Zap
    },
    RARE: {
      label: '⚔️ HIẾM (RARE)',
      bg: 'from-cyan-500/30 via-teal-500/20 to-slate-900',
      border: 'border-cyan-400 shadow-cyan-400/40',
      text: 'text-cyan-400',
      badgeBg: 'bg-cyan-400 text-slate-950',
      icon: Shield
    },
    COMMON: {
      label: '🌱 TINH ANH (COMMON)',
      bg: 'from-emerald-500/30 via-slate-800 to-slate-900',
      border: 'border-emerald-500 shadow-emerald-500/30',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500 text-slate-950',
      icon: Star
    }
  }[reward.rarity];

  const RarityIcon = rarityConfig.icon;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-sm rounded-3xl bg-slate-900 border ${rarityConfig.border} shadow-2xl p-6 sm:p-7 text-white text-center overflow-hidden transition-all duration-300`}>
        
        {/* Glow ambient mesh */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-gradient-to-br from-amber-500/20 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!revealed ? (
          // UNOPENED CHEST STATE
          <div className="space-y-6 py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5" />
              <span>RƯƠNG KHO BÁU BÍ ẨN HẰNG NGÀY</span>
            </div>

            {/* 3D Chest Visual */}
            <div 
              onClick={handleOpenClick}
              className={`relative mx-auto w-32 h-32 flex items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-1 shadow-2xl shadow-amber-500/30 cursor-pointer select-none transition-transform active:scale-95 ${
                opening ? 'animate-bounce' : 'hover:scale-105'
              }`}
            >
              <div className="w-full h-full rounded-[22px] bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden border border-amber-300/40">
                <span className="text-5xl select-none">🎁</span>
                <span className="text-[10px] font-black uppercase text-amber-300 mt-1 tracking-widest">
                  MYSTERY CHEST
                </span>
                {/* Shiny overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                Kho Báu Cuộc Đời Đang Chờ Đón!
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Mỗi ngày kiên trì rèn luyện, bạn nhận được một cơ hội mở rương nhận thưởng XP và Coins ngẫu nhiên.
              </p>
            </div>

            <button
              onClick={handleOpenClick}
              disabled={opening}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>{opening ? 'ĐANG MỞ KHO BÁU...' : 'CHẠM ĐỂ MỞ RƯƠNG NGAY'}</span>
            </button>
          </div>
        ) : (
          // REVEALED REWARD CARD STATE
          <div className="space-y-5 py-2 animate-in zoom-in-95 duration-300">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
              <span className={`px-2.5 py-0.5 rounded-md ${rarityConfig.badgeBg}`}>
                {rarityConfig.label}
              </span>
            </div>

            {/* Glowing Reward Badge */}
            <div className={`mx-auto w-24 h-24 rounded-3xl bg-gradient-to-b ${rarityConfig.bg} border ${rarityConfig.border} flex items-center justify-center shadow-xl`}>
              <RarityIcon className={`w-12 h-12 ${rarityConfig.text} animate-pulse`} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                {reward.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Phần thưởng đã được tự động cộng vào hồ sơ chiến binh của bạn!
              </p>
            </div>

            {/* Reward Stats Breakdown */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div className="p-3 rounded-xl bg-slate-900/80 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">KINH NGHIỆM</span>
                <span className="text-xl font-black text-emerald-400">+{reward.xp} XP</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">TIỀN XU</span>
                <span className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                  +{reward.coins} <Coins className="w-4 h-4" />
                </span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
            >
              [ THU NHẬN CHIẾN LỢI PHẨM ]
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
