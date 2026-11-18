import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw, Sparkles, Volume2 } from 'lucide-react';
import { pronunciationService } from '../../lib/pronunciationService';

export interface FlashcardItem {
  id: string;
  front: string;
  phonetic: string;
  back: string;
  context: string;
  languageId?: string;
}

export interface SpatialFlashcardDeckProps {
  cards?: FlashcardItem[];
  onCompleteSession?: () => void;
  className?: string;
}

const DEFAULT_CARDS: FlashcardItem[] = [
  { id: 'c1', front: 'Accomplish', phonetic: '/əˈkʌm.plɪʃ/', back: 'Hoàn thành xuất sắc, đạt được mục tiêu', context: 'She accomplished her goal through daily discipline.', languageId: 'en' },
  { id: 'c2', front: 'Resilience', phonetic: '/rɪˈzɪl.jəns/', back: 'Sự kiên cường, khả năng phục hồi', context: 'True resilience is built during high friction challenges.', languageId: 'en' },
  { id: 'c3', front: 'Consistent', phonetic: '/kənˈsɪs.tənt/', back: 'Nhất quán, kiên trì đều đặn', context: 'Small consistent efforts compound into massive results.', languageId: 'en' },
];

export const SpatialFlashcardDeck: React.FC<SpatialFlashcardDeckProps> = ({ 
  cards = DEFAULT_CARDS, 
  onCompleteSession,
  className = ''
}) => {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeCard = cards[index] || cards[0];

  const handleNext = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    setIsFlipped(false);
    if (rating === 'good' || rating === 'easy') {
      window.dispatchEvent(new CustomEvent('lifeos:task-completed', { detail: { cardId: activeCard.id } }));
    }
    if (index + 1 < cards.length) {
      setIndex(i => i + 1);
    } else {
      onCompleteSession?.();
      window.dispatchEvent(new CustomEvent('lifeos:task-completed', { detail: { sessionFinished: true } }));
      setIndex(0);
    }
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeCard?.front) {
      pronunciationService.speak(activeCard.front, { 
        languageId: activeCard.languageId || 'en' 
      });
    }
  };

  if (!activeCard) return null;

  return (
    <div className={`flex flex-col items-center justify-between h-full min-h-[300px] ${className}`}>
      {/* Top Deck Info */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            3D Spaced Repetition Deck
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {index + 1} / {cards.length}
        </span>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="relative w-full max-w-[340px] h-[190px] my-auto cursor-pointer" 
        style={{ perspective: '1200px' }} 
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.55, type: 'spring', stiffness: 220, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-full h-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/90 dark:to-[#0B0F19] border border-slate-200 dark:border-emerald-500/30 p-5 shadow-xl flex flex-col justify-between"
        >
          {/* Front Face */}
          <div 
            style={{ backfaceVisibility: 'hidden' }}
            className="absolute inset-0 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">
                  Từ vựng mục tiêu
                </span>
                <button
                  type="button"
                  onClick={handlePlayAudio}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition"
                  title="Phát âm từ vựng"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {activeCard.front}
              </h4>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                {activeCard.phonetic}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <RotateCw className="w-3.5 h-3.5 text-emerald-500" /> Nhấp để lật nghĩa & ngữ cảnh
            </div>
          </div>

          {/* Back Face (Rotated 180deg) */}
          <div 
            style={{ 
              backfaceVisibility: 'hidden', 
              transform: 'rotateY(180deg)' 
            }}
            className="absolute inset-0 p-5 flex flex-col justify-between bg-emerald-50/50 dark:bg-[#0E1526] rounded-2xl border border-emerald-500/40"
          >
            <div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">
                Định nghĩa & Ví dụ
              </span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {activeCard.back}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1 bg-white/60 dark:bg-white/[0.04] p-2 rounded-lg border border-slate-200 dark:border-white/5">
                "{activeCard.context}"
              </p>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              Khoảng cách ôn tập tiếp theo: +3 Ngày (FSRS)
            </div>
          </div>
        </motion.div>
      </div>

      {/* SRS Rating Control Bar */}
      <div className="grid grid-cols-4 gap-2 w-full pt-3 border-t border-slate-200 dark:border-white/[0.08]">
        <button
          type="button"
          onClick={() => handleNext('again')}
          className="py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-600 dark:text-rose-300 transition-all cursor-pointer"
        >
          Lại (1m)
        </button>
        <button
          type="button"
          onClick={() => handleNext('hard')}
          className="py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-bold text-amber-600 dark:text-amber-300 transition-all cursor-pointer"
        >
          Khó (1d)
        </button>
        <button
          type="button"
          onClick={() => handleNext('good')}
          className="py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-[11px] font-bold text-blue-600 dark:text-blue-300 transition-all cursor-pointer"
        >
          Tốt (3d)
        </button>
        <button
          type="button"
          onClick={() => handleNext('easy')}
          className="py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer"
        >
          Dễ (7d)
        </button>
      </div>
    </div>
  );
};
export default SpatialFlashcardDeck;
