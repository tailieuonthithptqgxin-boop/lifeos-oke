import React, { useState, useMemo } from 'react';
import { 
  X, Sparkles, Trophy, Clock, CheckSquare, Flame, 
  Share2, ArrowRight, ArrowLeft, Zap, Award, Download, Copy, Check
} from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import { retentionEngine } from '../../lib/retentionEngine';

interface LifeOsWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoryShare?: () => void;
}

export function LifeOsWrappedModal({
  isOpen,
  onClose,
  onOpenStoryShare
}: LifeOsWrappedModalProps) {
  const { tasks = [], focusSessions = [], currentUser } = useAppStore();
  const [slide, setSlide] = useState<number>(0);
  const [hasCopied, setHasCopied] = useState(false);

  const profile = useMemo(() => {
    return retentionEngine.getProfile(currentUser?.id);
  }, [currentUser]);

  // Monthly stats calculations (past 30 days)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const recentSessions = focusSessions.filter(s => {
      const d = new Date(s.startTime || s.createdAt || now);
      return d >= thirtyDaysAgo;
    });
    const totalMinutes = recentSessions.reduce((sum, s) => sum + (s.duration || s.minutes || 0), 0);
    const completedTasks = tasks.filter(t => t.status === 'Đã xong' || t.status === 'Hoàn thành');

    // Archetype calculation
    let archetype = {
      title: 'Chiến Thần Kỷ Luật ⚡',
      desc: 'Sự kiên trì phi thường, biến từng giây phút thành bước đệm vươn lên đỉnh cao!',
      badgeColor: 'from-amber-400 to-orange-500'
    };
    if (totalMinutes > 1200) {
      archetype = {
        title: 'Bậc Thầy Cày Đêm 🦉',
        desc: 'Khả năng Deep Work vô địch, đè bẹp mọi deadline chỉ trong một cái chớp mắt!',
        badgeColor: 'from-indigo-500 to-purple-600'
      };
    } else if (completedTasks.length > 20) {
      archetype = {
        title: 'Cỗ Máy Năng Suất 🚀',
        desc: 'Nghiền nát việc nhanh như chớp, hành động dứt khoát không một chút chần chừ!',
        badgeColor: 'from-emerald-400 to-teal-500'
      };
    }

    return {
      hours: (totalMinutes / 60).toFixed(1),
      sessions: recentSessions.length,
      taskCount: completedTasks.length,
      streak: profile.streak,
      level: profile.level,
      archetype
    };
  }, [focusSessions, tasks, profile]);

  if (!isOpen) return null;

  const slides = [
    // Slide 0: Intro
    {
      title: 'LifeOS Wrapped Tháng 🌟',
      subtitle: 'Sẵn sàng mở hộp thành tích tháng qua của bạn chưa?',
      render: (
        <div className="space-y-4 text-center py-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 text-slate-950 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 animate-bounce">
            <Sparkles className="w-10 h-10 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Tháng Qua Của Bạn Thật Tuyệt Vời!
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Không phải ai cũng có can đảm sống kỷ luật mỗi ngày như bạn. Hãy cùng xem những con số biết nói nhé!
            </p>
          </div>
        </div>
      )
    },
    // Slide 1: Deep Work
    {
      title: 'Sức Mạnh Tập Trung ⏱️',
      subtitle: 'Từng phút Deep Work đều biến thành Lực Chiến CP thật',
      render: (
        <div className="space-y-4 text-center py-4">
          <div className="w-20 h-20 rounded-3xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mx-auto shadow-xl">
            <Clock className="w-10 h-10" />
          </div>
          <div>
            <span className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 block tracking-tight">
              {monthlyStats.hours} Giờ
            </span>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Qua {monthlyStats.sessions} phiên Zen Focus & Pomodoro
            </span>
          </div>
          <p className="text-xs text-slate-300 italic max-w-xs mx-auto bg-slate-800/60 p-3 rounded-2xl border border-slate-700">
            "Bạn đã vượt qua hơn 90% sự xao nhãng của thế giới hiện đại để giữ cho tâm trí tĩnh lặng và sắc bén."
          </p>
        </div>
      )
    },
    // Slide 2: Tasks Done
    {
      title: 'Nghiền Nát Nhiệm Vụ 📋',
      subtitle: 'Mỗi việc tích xanh là một bước tiến đời thực',
      render: (
        <div className="space-y-4 text-center py-4">
          <div className="w-20 h-20 rounded-3xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto shadow-xl">
            <CheckSquare className="w-10 h-10" />
          </div>
          <div>
            <span className="text-4xl sm:text-5xl font-black font-mono text-teal-300 block tracking-tight">
              {monthlyStats.taskCount} Việc
            </span>
            <span className="text-xs font-bold text-slate-400 mt-1 block">
              Đã được đánh dấu hoàn thành xuất sắc
            </span>
          </div>
          <p className="text-xs text-slate-300 italic max-w-xs mx-auto bg-slate-800/60 p-3 rounded-2xl border border-slate-700">
            "Không trì hoãn, không né tránh. Từng mục tiêu nhỏ đã tích tụ thành thành quả lớn!"
          </p>
        </div>
      )
    },
    // Slide 3: Archetype & Grand Title
    {
      title: 'Danh Hiệu Tối Thượng 🏆',
      subtitle: 'Hệ thống đã phân tích phong cách sống của bạn',
      render: (
        <div className="space-y-4 text-center py-4">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-tr ${monthlyStats.archetype.badgeColor} text-slate-950 flex items-center justify-center mx-auto shadow-2xl`}>
            <Trophy className="w-10 h-10 fill-slate-950" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
              Tháng Này Bạn Là
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {monthlyStats.archetype.title}
            </h3>
            <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
              {monthlyStats.archetype.desc}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-black text-xs border border-slate-700">
              Level {monthlyStats.level}
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/40 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-rose-500" /> {monthlyStats.streak} ngày streak
            </span>
          </div>
        </div>
      )
    }
  ];

  const currentSlideData = slides[slide];
  const isLast = slide === slides.length - 1;

  const handleNext = () => {
    soundEngine.playPop();
    if (!isLast) {
      setSlide(s => s + 1);
    } else {
      triggerConfetti();
      soundEngine.playSuccess();
    }
  };

  const handlePrev = () => {
    soundEngine.playPop();
    setSlide(s => Math.max(0, s - 1));
  };

  const handleCopyCaption = () => {
    soundEngine.playPop();
    const caption = `Tháng này mình đã cày ${monthlyStats.hours}h Deep Work và nghiền nát ${monthlyStats.taskCount} tasks trên LifeOS! Danh hiệu: ${monthlyStats.archetype.title} ⚡ #LifeOS #Productivity #SoloLeveling #GenZ`;
    navigator.clipboard.writeText(caption);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto">
        {/* Story progress tick bars at top */}
        <div className="p-4 pb-0 flex items-center gap-1.5 z-10">
          {slides.map((_, idx) => (
            <div 
              key={idx}
              className="flex-1 h-1 rounded-full overflow-hidden bg-slate-800"
            >
              <div 
                className={`h-full transition-all duration-300 ${idx < slide ? 'bg-emerald-400 w-full' : idx === slide ? 'bg-emerald-400 w-full' : 'w-0'}`}
              />
            </div>
          ))}
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-2 flex items-center justify-between z-10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              {currentSlideData.title}
            </span>
            <p className="text-xs text-slate-400">
              {currentSlideData.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Body */}
        <div className="p-5 sm:p-6 min-h-[300px] flex items-center justify-center">
          {currentSlideData.render}
        </div>

        {/* Footer controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={slide === 0}
            onClick={handlePrev}
            className={`p-2.5 rounded-xl text-xs font-bold transition-colors ${slide === 0 ? 'opacity-20 cursor-not-allowed text-slate-600' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <span>Xem tiếp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleCopyCaption}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopied ? 'Đã copy!' : 'Copy Caption'}</span>
              </button>

              {onOpenStoryShare && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStoryShare();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Flex Story 9:16 📸</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
