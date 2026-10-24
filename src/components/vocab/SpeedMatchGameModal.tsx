import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import {
  Zap, Clock, Trophy, X, RotateCcw, Check, Sparkles, Award
} from 'lucide-react';
import { OXFORD_3000_WORDS } from '../../lib/vocabEngine';

interface SpeedMatchGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: (score: number) => void;
}

interface MatchCard {
  id: string;
  pairId: string;
  type: 'term' | 'meaning';
  text: string;
  matched: boolean;
}

export function SpeedMatchGameModal({ isOpen, onClose, onFinish }: SpeedMatchGameModalProps) {
  const { addCoins, addXp } = useAppStore() as any;
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);
  const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);

  // Initialize a new round of cards
  const startNewGame = () => {
    // Pick 5 random words from Oxford 3000
    const available = [...OXFORD_3000_WORDS];
    const picked: typeof OXFORD_3000_WORDS = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * available.length);
      picked.push(available.splice(idx, 1)[0]);
    }

    const newCards: MatchCard[] = [];
    picked.forEach((w, idx) => {
      const pairId = `pair_${idx}`;
      newCards.push({
        id: `term_${idx}`,
        pairId,
        type: 'term',
        text: w.term,
        matched: false
      });
      newCards.push({
        id: `meaning_${idx}`,
        pairId,
        type: 'meaning',
        text: w.meaning.split(';')[0].slice(0, 35),
        matched: false
      });
    });

    // Shuffle cards
    for (let i = newCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newCards[i], newCards[j]] = [newCards[j], newCards[i]];
    }

    setCards(newCards);
    setSelectedCard(null);
    setWrongPairIds([]);
    setTimeLeft(60);
    setScore(0);
    setCombo(0);
    setIsGameOver(false);
    setIsPlaying(true);
    soundEngine.playPop();
  };

  useEffect(() => {
    if (isOpen) {
      startNewGame();
    } else {
      setIsPlaying(false);
    }
  }, [isOpen]);

  // 60-second countdown
  useEffect(() => {
    if (!isPlaying || isGameOver) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleEndGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isGameOver]);

  const handleEndGame = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    soundEngine.playCelebration();
    triggerConfetti({ particleCount: 50 });

    const earnedXp = Math.max(20, Math.floor(score / 5));
    const earnedCoins = Math.max(5, Math.floor(score / 20));

    if (typeof addXp === 'function') addXp(earnedXp);
    if (typeof addCoins === 'function') addCoins(earnedCoins);
    if (onFinish) onFinish(score);
  };

  const handleCardClick = (card: MatchCard) => {
    if (!isPlaying || card.matched || isGameOver) return;

    soundEngine.playPop();

    if (!selectedCard) {
      setSelectedCard(card);
      return;
    }

    if (selectedCard.id === card.id) {
      setSelectedCard(null);
      return;
    }

    // Check if they match
    if (selectedCard.pairId === card.pairId && selectedCard.type !== card.type) {
      // Correct match!
      const newCombo = combo + 1;
      const points = 100 * newCombo;
      setScore(prev => prev + points);
      setCombo(newCombo);

      const updated = cards.map(c =>
        c.pairId === card.pairId ? { ...c, matched: true } : c
      );
      setCards(updated);
      setSelectedCard(null);

      // Check if all matched
      if (updated.every(c => c.matched)) {
        triggerConfetti({ particleCount: 25 });
        // Spawn 5 more pairs or add bonus time
        setTimeout(() => {
          // Re-populate with 5 new words
          const available = [...OXFORD_3000_WORDS];
          const picked: typeof OXFORD_3000_WORDS = [];
          for (let i = 0; i < 5; i++) {
            const idx = Math.floor(Math.random() * available.length);
            picked.push(available.splice(idx, 1)[0]);
          }
          const nextCards: MatchCard[] = [];
          picked.forEach((w, idx) => {
            const pairId = `pair_next_${Date.now()}_${idx}`;
            nextCards.push({
              id: `term_${pairId}`,
              pairId,
              type: 'term',
              text: w.term,
              matched: false
            });
            nextCards.push({
              id: `meaning_${pairId}`,
              pairId,
              type: 'meaning',
              text: w.meaning.split(';')[0].slice(0, 35),
              matched: false
            });
          });
          for (let i = nextCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nextCards[i], nextCards[j]] = [nextCards[j], nextCards[i]];
          }
          setCards(nextCards);
        }, 300);
      }
    } else {
      // Mismatch
      setCombo(0);
      setWrongPairIds([selectedCard.id, card.id]);
      setTimeout(() => {
        setWrongPairIds([]);
        setSelectedCard(null);
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Speed Match 60s
              </h3>
              <p className="text-[11px] text-slate-400">Nối cặp từ & nghĩa nhanh giải lao Pomodoro</p>
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

        {/* Game Stats Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-500 animate-ping' : 'text-slate-400'}`} />
            <span className={`text-base font-mono font-black ${timeLeft <= 10 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center gap-3">
            {combo > 1 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-bounce">
                x{combo} COMBO!
              </span>
            )}
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-base font-mono font-black text-slate-900 dark:text-white">
                {score}
              </span>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="p-5">
          {!isGameOver ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 min-h-[280px]">
              {cards.map(card => {
                const isSelected = selectedCard?.id === card.id;
                const isWrong = wrongPairIds.includes(card.id);

                if (card.matched) {
                  return (
                    <div
                      key={card.id}
                      className="p-3.5 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 text-emerald-600 flex items-center justify-center opacity-40 transition-all select-none"
                    >
                      <Check className="w-4 h-4" />
                    </div>
                  );
                }

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardClick(card)}
                    className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center text-center select-none shadow-xs min-h-[58px] ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white scale-102 ring-2 ring-indigo-400/40'
                        : isWrong
                        ? 'bg-rose-500/20 border-rose-500 text-rose-600 animate-shake'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-98'
                    }`}
                  >
                    {card.text}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Game Over Celebration Screen */
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Hoàn Thành Phiên Ôn Tập!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn đã ghi được <strong className="text-amber-500">{score} điểm</strong> trong 60 giây
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  ⚡ +{Math.max(20, Math.floor(score / 5))} XP
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  🪙 +{Math.max(5, Math.floor(score / 20))} Coins
                </span>
              </div>

              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={startNewGame}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Chơi lại
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
