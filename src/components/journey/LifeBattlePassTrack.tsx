import React from 'react';
import { Crown, Gift, Lock, CheckCircle2, Star, Coins, Sparkles, ChevronRight } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface LifeBattlePassTrackProps {
  userLevel: number;
  userCoins: number;
}

interface BattlePassTier {
  tier: number;
  requiredLevel: number;
  freeReward: { title: string; type: 'coins' | 'xp' | 'badge'; value: string; icon: string };
  eliteReward: { title: string; type: 'cosmetic' | 'coins' | 'title'; value: string; icon: string };
}

const BATTLE_PASS_TIERS: BattlePassTier[] = [
  {
    tier: 1,
    requiredLevel: 1,
    freeReward: { title: 'Túi Tiền Nhập Môn', type: 'coins', value: '+20 Coins', icon: '🪙' },
    eliteReward: { title: 'Danh Hiệu: Khởi Nguyên', type: 'title', value: 'Title: Initiator', icon: '🌱' }
  },
  {
    tier: 2,
    requiredLevel: 2,
    freeReward: { title: 'Bụi Sao Kinh Nghiệm', type: 'xp', value: '+50 XP', icon: '✨' },
    eliteReward: { title: 'Khung Avatar: Emerald Neon', type: 'cosmetic', value: 'Neon Aura', icon: '🟢' }
  },
  {
    tier: 3,
    requiredLevel: 3,
    freeReward: { title: 'Kho Báu Bạc', type: 'coins', value: '+35 Coins', icon: '🪙' },
    eliteReward: { title: 'Danh Hiệu: Người Bền Bỉ', type: 'title', value: 'Title: Tenacious', icon: '⚡' }
  },
  {
    tier: 4,
    requiredLevel: 5,
    freeReward: { title: 'Khiên Bảo Vệ Chuỗi', type: 'badge', value: 'Streak Shield', icon: '🛡️' },
    eliteReward: { title: 'Khung Avatar: Cyber Cyan', type: 'cosmetic', value: 'Cyber Glow', icon: '💎' }
  },
  {
    tier: 5,
    requiredLevel: 7,
    freeReward: { title: 'Túi Vàng Chiến Binh', type: 'coins', value: '+60 Coins', icon: '🪙' },
    eliteReward: { title: 'Hòm Quà Hoàng Gia', type: 'cosmetic', value: 'Royal Relic', icon: '👑' }
  },
  {
    tier: 6,
    requiredLevel: 10,
    freeReward: { title: 'Bình Linh Hồn Focus', type: 'xp', value: '+120 XP', icon: '🔮' },
    eliteReward: { title: 'Danh Hiệu: Bậc Thầy Sâu', type: 'title', value: 'Deep Master', icon: '🧘' }
  },
  {
    tier: 7,
    requiredLevel: 12,
    freeReward: { title: 'Rương Thép Cuộc Đời', type: 'coins', value: '+80 Coins', icon: '🪙' },
    eliteReward: { title: 'Khung: Amethyst Aura', type: 'cosmetic', value: 'Amethyst Glow', icon: '💜' }
  },
  {
    tier: 8,
    requiredLevel: 15,
    freeReward: { title: 'Huy Hiệu Tinh Anh', type: 'badge', value: 'Elite Crest', icon: '🎖️' },
    eliteReward: { title: 'Danh Hiệu: Bất Khả Chiến Bại', type: 'title', value: 'Invincible', icon: '⚔️' }
  },
  {
    tier: 9,
    requiredLevel: 18,
    freeReward: { title: 'Rương Kim Cương', type: 'coins', value: '+150 Coins', icon: '🪙' },
    eliteReward: { title: 'Khung: Obsidian Gold', type: 'cosmetic', value: 'Obsidian Mythic', icon: '🌟' }
  },
  {
    tier: 10,
    requiredLevel: 20,
    freeReward: { title: 'Đại Hòm Thần Thoại', type: 'xp', value: '+500 XP', icon: '🏆' },
    eliteReward: { title: 'Vương Miện Bá Chủ Cuộc Đời', type: 'cosmetic', value: 'Mythic Crown', icon: '👑' }
  }
];

export function LifeBattlePassTrack({ userLevel, userCoins }: LifeBattlePassTrackProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      
      {/* Battle Pass Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 p-4 sm:p-8 text-white shadow-2xl w-full min-w-0">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 w-full min-w-0">
          <div className="space-y-2 max-w-xl min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">LIFE PASS · SEASON 01: THE AWAKENING</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white">
              Đường Đua Tiến Trình Mùa Giải
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              Tích lũy cấp độ thực tế từ công việc, thói quen và học tập để mở khóa các mốc quà tặng độc quyền của Mùa Giải Khởi Nguyên.
            </p>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-center shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">CẤP ĐỘ CỦA BẠN</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">LEVEL {userLevel}</div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Đã mở {BATTLE_PASS_TIERS.filter(t => userLevel >= t.requiredLevel).length} / {BATTLE_PASS_TIERS.length} Tiers
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Battle Pass Track */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
        
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">TIẾN TRÌNH CÁC MỐC</span>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
              Cuộn ngang để xem hết 10 Tiers ➔
            </span>
          </div>
        </div>

        {/* Scroll Container */}
        <div className="overflow-x-auto pb-4 sm:pb-6 scrollbar-thin w-full min-w-0 max-w-full">
          <div className="flex items-stretch gap-4 min-w-[1100px] pt-4">
            {BATTLE_PASS_TIERS.map((tier) => {
              const isUnlocked = userLevel >= tier.requiredLevel;

              return (
                <div
                  key={tier.tier}
                  className={`w-64 rounded-3xl border flex flex-col justify-between p-4 transition-all ${
                    isUnlocked
                      ? 'bg-slate-800/80 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800 opacity-70'
                  }`}
                >
                  {/* Tier Number & Unlock Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-white">
                        TIER {tier.tier}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                        Lv.{tier.requiredLevel}
                      </span>
                    </div>

                    {isUnlocked ? (
                      <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>MỞ</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>KHÓA</span>
                      </span>
                    )}
                  </div>

                  {/* Free Track Reward Card */}
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                        <span>FREE PASS</span>
                        <span>{tier.freeReward.icon}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate">
                        {tier.freeReward.title}
                      </h4>
                      <span className="text-[11px] font-black text-amber-400 block">
                        {tier.freeReward.value}
                      </span>
                    </div>

                    {/* Elite Master Reward Card */}
                    <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-500/15 to-purple-500/15 border border-amber-500/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-400">
                        <span>ELITE MASTER</span>
                        <span>{tier.eliteReward.icon}</span>
                      </div>
                      <h4 className="text-xs font-bold text-amber-200 truncate">
                        {tier.eliteReward.title}
                      </h4>
                      <span className="text-[11px] font-black text-purple-300 block">
                        {tier.eliteReward.value}
                      </span>
                    </div>
                  </div>

                  {/* Tier Status Bottom Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
                    {isUnlocked ? (
                      <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider">
                        ✓ ĐÃ ĐẠT TIẾN TRÌNH
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">
                        Cần thêm {tier.requiredLevel - userLevel} Levels
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
