import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Volume2, Star, Check, X, RotateCcw, 
  HelpCircle, Sparkles, Flame, Trophy, Bookmark, 
  ChevronRight, ChevronLeft, Music, Maximize2, Minimize2,
  BookOpen, Brain, Clock, AlertTriangle
} from 'lucide-react';
import { 
  VocabWord, 
  LearningLanguage, 
  speakWord, 
  calculateSM2Algorithm 
} from '../../lib/vocabEngine';
import { YouTubeFocusPlayer } from '../YouTubeFocusPlayer';
import { retentionEngine } from '../../lib/retentionEngine';
import { analytics } from '../../lib/analytics';
import { soundEngine } from '../../lib/soundEngine';

interface DedicatedVocabFocusViewProps {
  topicTitle: string;
  words: VocabWord[];
  activeLang: LearningLanguage;
  onExit: () => void;
  onUpdateWordProgress?: (wordId: string, rating: 1 | 2 | 3 | 4) => void;
  onToggleFavorite?: (wordId: string) => void;
}

export function DedicatedVocabFocusView({
  topicTitle,
  words: initialWords,
  activeLang,
  onExit,
  onUpdateWordProgress,
  onToggleFavorite
}: DedicatedVocabFocusViewProps) {
  const [queue, setQueue] = useState<VocabWord[]>(initialWords);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    remembered: 0,
    forgotten: 0
  });

  const sessionStartTimeRef = useRef<number>(Date.now());

  const currentWord = queue[currentIndex] || null;
  const progressPercent = queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;

  // Key navigation for desktop focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted || !currentWord) return;

      if (e.code === 'Space') {
        e.preventDefault();
        soundEngine.playFlip();
        setIsRevealed(prev => !prev);
      } else if (e.key === 'ArrowRight' && isRevealed) {
        handleRateWord(3); // Good
      } else if (e.key === 'ArrowLeft' && isRevealed) {
        handleRateWord(1); // Again
      } else if (e.key === '1' && isRevealed) {
        handleRateWord(1);
      } else if (e.key === '2' && isRevealed) {
        handleRateWord(2);
      } else if (e.key === '3' && isRevealed) {
        handleRateWord(3);
      } else if (e.key === '4' && isRevealed) {
        handleRateWord(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isRevealed, sessionCompleted, currentWord]);

  // Audio pronunciation
  const playPronunciation = () => {
    if (currentWord) {
      speakWord(currentWord.term, activeLang.speechVoiceCode || 'en-US');
    }
  };

  const handleRateWord = (rating: 1 | 2 | 3 | 4) => {
    if (!currentWord) return;

    if (rating >= 3) {
      soundEngine.playPop();
    }

    // Trigger store update callback if available
    if (onUpdateWordProgress) {
      onUpdateWordProgress(currentWord.id, rating);
    }

    // Award XP
    retentionEngine.addXp(rating >= 3 ? 15 : 5, `Ôn từ vựng: ${currentWord.term}`);
    analytics.track('vocab_reviewed', { term: currentWord.term, rating });

    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      remembered: rating >= 3 ? prev.remembered + 1 : prev.remembered,
      forgotten: rating < 3 ? prev.forgotten + 1 : prev.forgotten
    }));

    // Next card or finish
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex(prev => prev + 1);
      setIsRevealed(false);
    } else {
      soundEngine.playSuccess();
      setSessionCompleted(true);
      retentionEngine.completeQuest('vocab');
      retentionEngine.completeQuest('study');
    }
  };

  const handleRestart = () => {
    setQueue([...initialWords]);
    setCurrentIndex(0);
    setIsRevealed(false);
    setSessionCompleted(false);
    setSessionStats({ reviewed: 0, remembered: 0, forgotten: 0 });
    sessionStartTimeRef.current = Date.now();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans overflow-hidden">
      
      {/* Top Bar: Minimal Focus Header */}
      <header className="px-4 sm:px-8 py-4 border-b border-white/10 bg-slate-950/70 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </button>

          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              Vocabulary Dedicated Focus Mode
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {topicTitle}
            </h2>
          </div>
        </div>

        {/* Progress & Music toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
            <span>{currentIndex + 1} / {queue.length} từ</span>
            <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMusicPlayer(!showMusicPlayer)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showMusicPlayer
                ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-sm'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showMusicPlayer ? 'Ẩn nhạc' : 'Nhạc nền'}</span>
          </button>
        </div>
      </header>

      {/* Main Focus Study Zone */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:py-10 flex flex-col items-center justify-center relative">
        
        {/* Floating Collapsible Music Player Drawer */}
        {showMusicPlayer && (
          <div className="absolute top-4 right-4 sm:right-8 z-40 w-full max-w-sm animate-in slide-in-from-top-4 duration-200">
            <YouTubeFocusPlayer defaultExpanded={true} />
          </div>
        )}

        {/* Finished State Celebration Screen */}
        {sessionCompleted ? (
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 text-3xl">
              🎉
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Hoàn Thành Phiên Học!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Kỷ luật của bạn là chìa khóa mở rộng vốn từ vựng bền vững.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-center font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans">Đã ôn</span>
                <p className="text-xl font-black text-white">{sessionStats.reviewed}</p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-sans">Ghi nhớ</span>
                <p className="text-xl font-black text-emerald-400">{sessionStats.remembered}</p>
              </div>
              <div>
                <span className="text-[10px] text-rose-400 uppercase font-sans">Cần ôn lại</span>
                <p className="text-xl font-black text-rose-400">{sessionStats.forgotten}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Học lại lượt nữa</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Quay về kho từ
              </button>
            </div>
          </div>
        ) : currentWord ? (
          /* Central Flashcard with Flip Animation */
          <div className="w-full max-w-xl flex flex-col items-center space-y-6">
            
            {/* Mobile counter indicator */}
            <div className="flex sm:hidden items-center justify-between w-full px-2 text-xs font-mono text-slate-400">
              <span>{currentIndex + 1} / {queue.length}</span>
              <span>{progressPercent}%</span>
            </div>

            {/* Flashcard container */}
            <div 
              onClick={() => setIsRevealed(!isRevealed)}
              className="w-full min-h-[340px] sm:min-h-[380px] p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/90 border border-white/15 hover:border-indigo-500/50 shadow-2xl flex flex-col justify-between cursor-pointer transition-all duration-300 relative group select-none"
            >
              {/* Card Header metadata */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 text-indigo-300">
                    {currentWord.partOfSpeech || 'Word'}
                  </span>
                  {currentWord.isFavorite && (
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPronunciation();
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(currentWord.id);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star className={`w-4 h-4 ${currentWord.isFavorite ? 'text-amber-400 fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Center: Term & Pronunciation */}
              <div className="text-center my-auto space-y-3">
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {currentWord.term}
                </h1>
                
                {currentWord.phonetic && (
                  <p className="font-mono text-sm sm:text-base text-slate-400">
                    {currentWord.phonetic}
                  </p>
                )}

                {/* Back revealed content */}
                {isRevealed ? (
                  <div className="pt-6 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                      {currentWord.meaning}
                    </p>

                    {currentWord.exampleSentence && (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-left space-y-1">
                        <p className="font-medium text-slate-200 italic">
                          "{currentWord.exampleSentence}"
                        </p>
                        {currentWord.exampleTranslation && (
                          <p className="text-indigo-300">
                            → {currentWord.exampleTranslation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-6 text-xs text-slate-500 font-semibold flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Nhấn hoặc gõ Phím Cách để xem nghĩa</span>
                  </div>
                )}
              </div>

              {/* Card footer indicator */}
              <div className="text-center text-[10px] text-slate-500">
                {isRevealed ? 'Đánh giá mức độ nhớ bên dưới' : 'Chạm để lật thẻ (Tap to flip)'}
              </div>
            </div>

            {/* SM-2 Recall Rating Actions Bar */}
            {isRevealed ? (
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-in slide-in-from-bottom-2 duration-150">
                <button
                  type="button"
                  onClick={() => handleRateWord(1)}
                  className="py-3 px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">Quên (1)</span>
                  <span className="text-[10px] text-rose-400/80">Ôn lại ngay</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateWord(2)}
                  className="py-3 px-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">Khó (2)</span>
                  <span className="text-[10px] text-amber-400/80">Nhớ mơ màng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateWord(3)}
                  className="py-3 px-3 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">Tốt (3)</span>
                  <span className="text-[10px] text-blue-400/80">Nhớ đúng lúc</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRateWord(4)}
                  className="py-3 px-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">Dễ (4)</span>
                  <span className="text-[10px] text-emerald-400/80">Thuộc làu làu</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsRevealed(true)}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all cursor-pointer active:scale-98"
              >
                Xem Đáp Án (Phím Cách)
              </button>
            )}

            {/* Quick Prev / Next navigation */}
            <div className="flex items-center justify-between w-full text-xs text-slate-400 pt-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(prev => prev - 1);
                    setIsRevealed(false);
                  }
                }}
                className={`flex items-center gap-1 font-semibold ${
                  currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Từ trước</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Phím tắt: [1] Quên · [2] Khó · [3] Tốt · [4] Dễ
              </span>

              <button
                type="button"
                disabled={currentIndex >= queue.length - 1}
                onClick={() => {
                  if (currentIndex < queue.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setIsRevealed(false);
                  }
                }}
                className={`flex items-center gap-1 font-semibold ${
                  currentIndex >= queue.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:text-white cursor-pointer'
                }`}
              >
                <span>Từ sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Bottom Minimal Footer */}
      <footer className="px-4 py-3 border-t border-white/10 text-center text-[11px] text-slate-500">
        <span>LifeOS Spaced Repetition (SuperMemo SM-2) · Focus Mode Active</span>
      </footer>
    </div>
  );
}
