import React, { useState, useEffect } from 'react';
import { Volume2, Sparkles, BookOpen, ArrowRight, Zap } from 'lucide-react';
import { OXFORD_3000_WORDS } from '../../lib/vocabEngine';
import { soundEngine } from '../../lib/soundEngine';
import { useAppStore } from '../../lib/store';

interface WordOfTheHourWidgetProps {
  onOpenStudy?: () => void;
  deepWorkTaskCount?: number;
}

export function WordOfTheHourWidget({ onOpenStudy, deepWorkTaskCount = 0 }: WordOfTheHourWidgetProps) {
  const { setCurrentView } = useAppStore();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    // Deterministic selection based on current hour
    const currentHourEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
    const index = Math.abs(currentHourEpoch) % OXFORD_3000_WORDS.length;
    setWordIndex(index);
  }, []);

  const word = OXFORD_3000_WORDS[wordIndex] || OXFORD_3000_WORDS[0];

  const playSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playPop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word.term);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    }
  };

  const handleStudy = () => {
    soundEngine.playPop();
    if (onOpenStudy) {
      onOpenStudy();
    } else {
      window.dispatchEvent(new CustomEvent('lifeos:open-genz-vocab-study'));
    }
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Word of the Hour
            </span>
          </div>

          <button
            type="button"
            onClick={playSpeech}
            className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title="Phát âm từ vựng"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Word and IPA */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
              {word.term}
            </h3>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
              {word.pos || 'n.'}
            </span>
          </div>
          <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
            {word.phonetic || `/${word.term}/`}
          </p>
        </div>

        {/* Meaning */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2.5 line-clamp-2 leading-relaxed">
          {word.meaning}
        </p>

        {/* Cognitive Load Balancer Indicator */}
        {deepWorkTaskCount >= 2 && (
          <div className="mt-3 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium flex items-center gap-1.5">
            <Zap className="w-3 h-3 shrink-0" />
            <span>Tải công việc cao: Chế độ ôn trắc nghiệm nhẹ nhàng kích hoạt</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">Tự đổi mỗi giờ</span>
        <button
          type="button"
          onClick={handleStudy}
          className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline group-hover:translate-x-0.5 transition-transform cursor-pointer"
        >
          <span>Luyện từ này</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
