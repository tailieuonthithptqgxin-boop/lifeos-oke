import React, { useRef } from 'react';
import { 
  X, Flame, Sparkles, Trophy, Download, Share2, 
  Check, Copy, Award, Zap, Heart
} from 'lucide-react';
import { RetentionProfile } from '../lib/retentionEngine';
import { soundEngine } from '../lib/soundEngine';

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RetentionProfile;
  userName?: string;
  todayCompletedTasks?: number;
  moodEmoji?: string;
  moodLabel?: string;
}

export function ShareStoryModal({
  isOpen,
  onClose,
  profile,
  userName = 'Life OS Member',
  todayCompletedTasks = 0,
  moodEmoji = '⚡',
  moodLabel = 'Deep Focus'
}: ShareStoryModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyText = () => {
    soundEngine.playPop();
    const shareText = `🔥 Mình vừa giữ vững chuỗi ${profile.streak} ngày kỷ luật trên Life OS!\n⚡ Level ${profile.level} - ${profile.levelTitle}\n✅ Hoàn thành ${todayCompletedTasks} task hôm nay.\n#LifeOS #HabitTracker #Productivity #GenZ`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Share2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white">Story Card Năng Suất</h3>
              <p className="text-[11px] text-slate-400">Khoe chuỗi streak và năng lượng hôm nay</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The 9:16 Aspect Ratio Aesthetic Card */}
        <div 
          ref={cardRef}
          className="relative w-full aspect-[9/14] rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10 select-none bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950"
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top: Brand & Mood */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-black tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>LIFE OS</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold">
              <span>{moodEmoji}</span>
              <span>{moodLabel}</span>
            </div>
          </div>

          {/* Card Middle: Streak Focus Hero */}
          <div className="relative z-10 text-center space-y-3 py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/30 text-4xl mx-auto transform hover:scale-105 transition-transform">
              🔥
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-200">
                {profile.streak} NGÀY
              </div>
              <p className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Chuỗi Kỷ Luật Liên Tục
              </p>
            </div>

            {/* User Badges / Stats Pill */}
            <div className="grid grid-cols-2 gap-2 pt-2 max-w-xs mx-auto">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-center">
                <span className="text-[10px] text-slate-400 block">Cấp bậc</span>
                <span className="text-xs font-black text-indigo-300">Lv.{profile.level} {profile.levelTitle.split(' ')[0]}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs text-center">
                <span className="text-[10px] text-slate-400 block">Task hoàn thành</span>
                <span className="text-xs font-black text-emerald-300">{todayCompletedTasks} nhiệm vụ</span>
              </div>
            </div>
          </div>

          {/* Card Bottom: User Signature */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-bold block text-white">{userName}</span>
                <span className="text-[10px] text-slate-400">Năng suất mỗi ngày</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">#DisciplineOverMotivation</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Đã sao chép caption flex story!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Sao chép text để Flex lên Threads / Story</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
