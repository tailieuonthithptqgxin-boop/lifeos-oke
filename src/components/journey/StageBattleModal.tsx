import React from 'react';
import { ChapterNodeItem } from '../../backend/services/progression.service';
import { X, Star, Skull, Shield, Coins, Sparkles, ArrowRight, Zap, Play } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface StageBattleModalProps {
  node: ChapterNodeItem | null;
  chapterIndex: number;
  chapterTitle: string;
  onClose: () => void;
  onGoToModule: (view: 'tasks' | 'focus' | 'study' | 'habits' | 'finance') => void;
}

export function StageBattleModal({
  node,
  chapterIndex,
  chapterTitle,
  onClose,
  onGoToModule
}: StageBattleModalProps) {
  if (!node) return null;

  const percent = Math.min(100, Math.round((node.current / node.target) * 100));
  const isMastered = node.status === 'MASTERED';
  const isDone = node.status === 'COMPLETED' || isMastered;
  const isLocked = node.status === 'LOCKED';
  const isBoss = node.requirementText.includes('Master') || node.rewardCoins >= 25;

  // Star ratings
  const starsEarned = isMastered ? 3 : isDone ? 2 : percent > 0 ? 1 : 0;

  // Map category to app view
  const targetModule: 'tasks' | 'focus' | 'study' | 'habits' | 'finance' = 
    node.category === 'focus' ? 'focus' :
    node.category === 'learning' ? 'study' :
    node.category === 'habit' ? 'habits' :
    node.category === 'finance' ? 'finance' : 'tasks';

  const handleEnterBattle = () => {
    soundEngine.playPop();
    onClose();
    onGoToModule(targetModule);
  };

  // Nemesis lore generator
  const nemesisName = 
    node.category === 'focus' ? 'Bóng Ma Xao Nhãng (Phantom of Distraction)' :
    node.category === 'habit' ? 'Cơn Lười Trì Trệ (Sloth of Hesitation)' :
    node.category === 'learning' ? 'Hố Sâu Quên Lãng (Void of Amnesia)' :
    node.category === 'finance' ? 'Cơn Bốc Đồng Chi Tiêu (Impulse Fiend)' : 'Chúa Tể Trì Hoãn (Lord of Procrastination)';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-7 text-white overflow-hidden space-y-5">
        
        {/* Glow ambient */}
        <div className={`absolute -top-24 -right-24 w-60 h-60 ${
          isBoss ? 'bg-rose-500/20' : 'bg-emerald-500/20'
        } rounded-full blur-3xl pointer-events-none`} />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
              isBoss ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isBoss ? '🔥 BOSS STAGE' : `ẢI ${chapterIndex} · STAGE`}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {chapterTitle.split(': ')[1] || chapterTitle}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Hero Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {node.title}
            </h3>
            {/* Stars */}
            <div className="flex items-center gap-0.5 ml-auto">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-5 h-5 ${
                    starIdx <= starsEarned
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {node.description}
          </p>
        </div>

        {/* Nemesis Boss Encounter Box */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              {isBoss ? <Skull className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider block">
                ĐỐI THỦ CẦN ĐÁNH BẠI
              </span>
              <h4 className="text-sm font-black text-white mt-0.5">
                {nemesisName}
              </h4>
              <span className="text-[11px] text-slate-400">
                Vũ khí khắc chế: Sự tập trung kiên trì của bạn
              </span>
            </div>
          </div>
        </div>

        {/* Requirement & Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Mục tiêu nhiệm vụ: {node.requirementText}</span>
            <span className="text-white font-mono">{node.current} / {node.target} {node.unit} ({percent}%)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 p-0.5 border border-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Star Rating Breakdown */}
        <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1.5 text-xs">
          <div className={`flex items-center justify-between ${starsEarned >= 1 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            <span>⭐ 1 Sao: Bắt đầu thử thách (&gt; 0%)</span>
            <span>{starsEarned >= 1 ? '✓ Đạt' : 'Chưa'}</span>
          </div>
          <div className={`flex items-center justify-between ${starsEarned >= 2 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            <span>⭐⭐ 2 Sao: Hoàn thành 100% mục tiêu</span>
            <span>{starsEarned >= 2 ? '✓ Đạt' : 'Chưa'}</span>
          </div>
          <div className={`flex items-center justify-between ${starsEarned >= 3 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            <span>⭐⭐⭐ 3 Sao: Chạm mốc Tinh Hoa Mastered</span>
            <span>{starsEarned >= 3 ? '✓ Đạt' : 'Chưa'}</span>
          </div>
        </div>

        {/* Reward Preview */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <span className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Phần Thưởng Ải:</span>
          </span>
          <span className="font-black text-amber-400">
            +{node.rewardXp} XP · +{node.rewardCoins} 🪙 {node.rewardTitle ? `· Unlock: ${node.rewardTitle}` : ''}
          </span>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            onClick={handleEnterBattle}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isDone ? 'TIẾP TỤC RÈN LUYỆN' : 'VÀO THAM CHIẾN NGAY'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
