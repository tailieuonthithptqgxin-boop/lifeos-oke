import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Share2, Globe, Check, X, Flame, Clock, Trophy } from 'lucide-react';
import { connectApi } from '../../lib/connectApiClient';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { toast } from '../../lib/toast';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

export interface StudyReceiptData {
  title: string;
  minutes: number;
  xpEarned?: number;
  streakDays?: number;
  userName?: string;
  modeLabel?: string;
}

interface AestheticStudyReceiptModalProps {
  receipt: StudyReceiptData | null;
  onClose: () => void;
  onOpenStoryModal?: () => void;
}

function getTimeOfDayPersona(hour: number) {
  if (hour >= 22 || hour < 5) {
    return { badge: '🌙 HỘI CÚ ĐÊM · NIGHT OWL', gradient: 'from-indigo-950 via-purple-950 to-slate-950', accent: 'text-purple-300 border-purple-500/30 bg-purple-500/15' };
  }
  if (hour >= 5 && hour < 9) {
    return { badge: '🌅 DẬY SỚM BỨT PHÁ · EARLY BIRD', gradient: 'from-emerald-950 via-teal-950 to-slate-950', accent: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15' };
  }
  if (hour >= 18 && hour < 22) {
    return { badge: '🔥 CA TỐI BỀN BỈ · EVENING GRIND', gradient: 'from-amber-950/90 via-slate-950 to-indigo-950', accent: 'text-amber-300 border-amber-500/30 bg-amber-500/15' };
  }
  return { badge: '⚡ TẬP TRUNG SÂU · DEEP WORK', gradient: 'from-slate-950 via-emerald-950/70 to-slate-900', accent: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/15' };
}

export function AestheticStudyReceiptModal({
  receipt,
  onClose,
  onOpenStoryModal,
}: AestheticStudyReceiptModalProps) {
  useBodyScrollLock(Boolean(receipt));
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const now = new Date();
  const persona = getTimeOfDayPersona(now.getHours());
  const xp = receipt.xpEarned ?? Math.max(15, receipt.minutes * 2);
  const streak = receipt.streakDays ?? 1;
  const timeStamp = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStamp = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const handleShareToCommunity = async () => {
    if (isPosting || posted) return;
    setIsPosting(true);
    try {
      const content = `Vừa hoàn thành ${receipt.minutes} phút tập trung sâu: "${receipt.title}" (${persona.badge.split('·')[0].trim()}) ✨ +${xp} XP · Chuỗi 🔥 ${streak} ngày!`;
      await connectApi.createPost({
        content,
        tags: ['StudyWithMe', 'DeepWork', 'KỷLuậtMỗiNgày'],
        lifeOsShareType: 'STUDY_RECEIPT',
        achievementCard: {
          title: receipt.title,
          minutes: receipt.minutes,
          xpEarned: xp,
          streakDays: streak,
          badge: persona.badge,
          completedAt: now.toISOString(),
        },
      });
      setPosted(true);
      try {
        soundEngine.playCelebration();
      } catch {}
      triggerConfetti();
      toast.success('Đã đăng thẻ thành tích lên Bảng Tin Cộng Đồng! 🔥');
    } catch {
      toast.error('Chưa thể đăng lúc này, bạn có thể sao chép hoặc tải ảnh Story nhé!');
    } finally {
      setIsPosting(false);
    }
  };

  const handleCopyReceipt = () => {
    const text = `🧾 PHIẾU HỌC TẬP LIFEOS · ${dateStamp} ${timeStamp}\n• Mục tiêu: ${receipt.title}\n• Thời lượng: ${receipt.minutes} phút tập trung\n• Thưởng: +${xp} XP | Chuỗi: 🔥 ${streak} ngày\n• Hạng: ${persona.badge}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    try {
      soundEngine.playPop();
    } catch {}
    toast.success('Đã sao chép biên lai học tập!');
    setTimeout(() => setCopied(false), 2000);
  };

  const modal = (
    <div className="fixed inset-0 z-[110] overflow-y-auto" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md rounded-3xl bg-gradient-to-br ${persona.gradient} border border-white/15 shadow-2xl p-6 text-left text-white space-y-5 animate-in zoom-in-95 duration-200`}
        >
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Persona Pill */}
          <div className="flex items-center justify-between pr-8">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${persona.accent}`}>
              {persona.badge}
            </span>
          </div>

          {/* Receipt Glass Card ("Strava / Receiptify for Study") */}
          <div className="rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-4 sm:p-5 space-y-4 font-sans">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/60 border-b border-dashed border-white/15 pb-3">
              <span>STUDY RECEIPT #{now.getTime().toString().slice(-4)}</span>
              <span>{dateStamp} · {timeStamp}</span>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/60 font-bold">
                  {receipt.modeLabel || 'Thời gian tập trung'}
                </div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums mt-0.5">
                  +{receipt.minutes} <span className="text-base font-extrabold text-emerald-400">phút</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
                <Trophy className="w-6 h-6 stroke-[2.3]" />
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-b border-dashed border-white/15 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/60">Hạng mục</span>
                <span className="font-bold text-white truncate max-w-[210px]">{receipt.title}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/60">Điểm kinh nghiệm</span>
                <span className="font-black text-emerald-400">+{xp} XP ✨</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/60">Chuỗi kỷ luật</span>
                <span className="font-black text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  {streak} ngày liên tiếp
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span>Học viên: <strong className="text-white/90">{receipt.userName || 'Chiến binh LifeOS'}</strong></span>
              <span className="font-mono">VERIFIED ✓</span>
            </div>
          </div>

          {/* 1-Tap Viral Actions */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isPosting || posted}
              onClick={handleShareToCommunity}
              className={`w-full py-3 min-h-[44px] rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                posted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {posted ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Đã khoe lên Bảng Tin Cộng Đồng!</span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  <span>{isPosting ? 'Đang đăng...' : 'Khoe lên Bảng Tin Cộng Đồng (+1 chạm)'}</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {onOpenStoryModal ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStoryModal();
                  }}
                  className="py-2.5 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tải ảnh Story 9:16</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="py-2.5 min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copied ? 'Đã chép!' : 'Chép biên lai'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Học tiếp / Đóng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
