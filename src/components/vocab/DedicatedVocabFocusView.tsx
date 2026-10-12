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
import { verifyWord } from '../../lib/vocabVerificationEngine';
import { YouTubeFocusPlayer } from '../YouTubeFocusPlayer';
import { CompanionMood } from '../../lib/companionEngine';
import { companionEventBus } from '../../lib/companion/companionEventBus';
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

  // Companion state
  const [companionMood, setCompanionMood] = useState<CompanionMood>('focus');
  const [companionDialogueKey, setCompanionDialogueKey] = useState<any>('focusStart');

  // Emit events to global companion overlay
  useEffect(() => {
    if (companionMood) {
      companionEventBus.emit({
        type: 'mood_change',
        mood: companionMood,
        category: companionDialogueKey
      });
    }
  }, [companionMood, companionDialogueKey]);

  const sessionStartTimeRef = useRef<number>(Date.now());

  const currentWord = queue[currentIndex] || null;
  const progressPercent = queue.length > 0 ? Math.round(((currentIndex + 1) / queue.length) * 100) : 0;

  // Swipe & Gesture state
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [flyDirection, setFlyDirection] = useState<'left' | 'right' | null>(null);

  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleNextCard = () => {
    if (currentIndex + 1 < queue.length) {
      setFlyDirection('left');
      soundEngine.playFlip();
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
        setFlyDirection(null);
        setDragX(0);
      }, 180);
    } else {
      soundEngine.playSuccess();
      setSessionCompleted(true);
      setCompanionMood('achievement');
      setCompanionDialogueKey('vocabRoundCompleted');
      retentionEngine.completeQuest('study');
    }
  };

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setFlyDirection('right');
      soundEngine.playFlip();
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsRevealed(false);
        setFlyDirection(null);
        setDragX(0);
      }, 180);
    } else {
      setDragX(0);
    }
  };

  // Key navigation for desktop focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sessionCompleted || !currentWord) return;

      if (e.code === 'Space') {
        e.preventDefault();
        soundEngine.playFlip();
        setIsRevealed(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
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
  }, [currentIndex, isRevealed, sessionCompleted, currentWord, queue.length]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (flyDirection) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || flyDirection) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      e.preventDefault();
      if (currentIndex === 0 && diffX > 0) {
        setDragX(diffX * 0.3);
      } else {
        setDragX(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || flyDirection) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    const threshold = 65;
    if (dragX < -threshold) {
      handleNextCard();
    } else if (dragX > threshold) {
      handlePrevCard();
    } else {
      setDragX(0);
    }
  };

  // Mouse handlers for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (flyDirection) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || flyDirection) return;
    const diffX = e.clientX - touchStartXRef.current;
    if (currentIndex === 0 && diffX > 0) {
      setDragX(diffX * 0.3);
    } else {
      setDragX(diffX);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 70;
    if (dragX < -threshold) {
      handleNextCard();
    } else if (dragX > threshold) {
      handlePrevCard();
    } else {
      setDragX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragX(0);
    }
  };

  const handleCardClick = () => {
    if (Math.abs(dragX) > 10) return;
    soundEngine.playFlip();
    setIsRevealed(prev => !prev);
  };

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
      setCompanionMood('celebrate');
      setCompanionDialogueKey('vocabCorrect');
    } else {
      setCompanionMood('encourage');
      setCompanionDialogueKey('vocabIncorrect');
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
      setCompanionMood('achievement');
      setCompanionDialogueKey('vocabRoundCompleted');
      retentionEngine.completeQuest('study');
    }
  };

  const handleRestart = () => {
    setQueue([...initialWords]);
    setCurrentIndex(0);
    setIsRevealed(false);
    setSessionCompleted(false);
    setCompanionMood('focus');
    setCompanionDialogueKey('focusStart');
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
            {(() => {
              const report = currentWord.verification || verifyWord({
                id: currentWord.id,
                term: currentWord.term,
                pos: currentWord.partOfSpeech,
                phonetic: currentWord.phonetic,
                meaning: currentWord.meaning,
                exampleSentence: currentWord.exampleSentence,
                exampleTranslation: currentWord.exampleTranslation
              });

              return (
                <div className="relative w-full">
                  {/* Lateral Previous / Next Buttons on Desktop */}
                  <button
                    type="button"
                    onClick={handlePrevCard}
                    disabled={currentIndex === 0}
                    title="Từ trước đó (←)"
                    className="hidden sm:flex absolute -left-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/10 bg-slate-900/90 shadow-lg backdrop-blur-sm items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextCard}
                    title={currentIndex + 1 >= queue.length ? 'Hoàn thành' : 'Từ tiếp theo (→)'}
                    className="hidden sm:flex absolute -right-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-white/10 bg-slate-900/90 shadow-lg backdrop-blur-sm items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Swipe Direction Peek Badge */}
                  {isDragging && (
                    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-between px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                          dragX > 35
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : 'bg-white/10 text-slate-400 opacity-60'
                        }`}
                      >
                        ← Từ trước
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                          dragX < -35
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : 'bg-white/10 text-slate-400 opacity-60'
                        }`}
                      >
                        Từ tiếp theo →
                      </span>
                    </div>
                  )}

                  <div 
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleCardClick}
                    style={{
                      transform: `translateX(${
                        flyDirection === 'left' ? -380 : flyDirection === 'right' ? 380 : dragX
                      }px) rotate(${
                        flyDirection === 'left' ? -12 : flyDirection === 'right' ? 12 : dragX * 0.05
                      }deg) scale(${isDragging ? 0.985 : 1})`,
                      opacity: flyDirection ? 0 : 1,
                      transition: isDragging
                        ? 'none'
                        : 'transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s ease, box-shadow 0.2s ease',
                      touchAction: 'pan-y'
                    }}
                    className="w-full min-h-[340px] sm:min-h-[380px] p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-900/90 border border-white/15 hover:border-indigo-500/50 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing select-none relative group"
                  >
                  {/* Card Header metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 text-indigo-300">
                        {currentWord.partOfSpeech || 'Word'}
                      </span>
                      {currentWord.isFavorite && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      )}

                      {/* Linguistic Verification Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        report.status === 'lexical_verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : report.status === 'needs_review'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : report.primarySource === 'ai_generated'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {report.status === 'lexical_verified' ? '🛡️ Đối chiếu nguồn' :
                         report.status === 'needs_review' ? '⚠️ Cần xem xét' :
                         report.primarySource === 'ai_generated' ? '🤖 Đề xuất AI' : '📋 Chuẩn hóa'}
                      </span>

                      {report.dialectVariation && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          🇬🇧 / 🇺🇸
                        </span>
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
                        title="Nghe phát âm chuẩn (US)"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(currentWord.term, 'en-GB');
                        }}
                        className="p-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors text-[10px] font-bold cursor-pointer"
                        title="Nghe phát âm chuẩn (UK)"
                      >
                        UK
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
                      <div className="pt-6 border-t border-white/10 space-y-3.5 animate-in fade-in duration-200">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                          {currentWord.meaning}
                        </p>

                        {/* Dialect note if any */}
                        {report.dialectVariation && (
                          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 text-left">
                            <span className="font-bold block">🇬🇧 BrE: {report.dialectVariation.bre} • 🇺🇸 NAmE: {report.dialectVariation.name}</span>
                            <p className="text-[11px] text-indigo-300 italic">{report.dialectVariation.distinction}</p>
                          </div>
                        )}

                        {/* Confusable warning alert if any */}
                        {report.confusables && report.confusables.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 text-left space-y-0.5">
                            <span className="font-bold flex items-center gap-1 text-purple-300">
                              💡 Tránh nhầm với "{report.confusables[0].word}":
                            </span>
                            <p className="text-[11px] text-purple-200">{report.confusables[0].distinction}</p>
                          </div>
                        )}

                        {/* Multi-meaning breakdown if any */}
                        {report.multiMeanings && report.multiMeanings.length > 1 && (
                          <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-200 text-left space-y-1">
                            <span className="font-bold block text-teal-300">Các nét nghĩa riêng:</span>
                            {report.multiMeanings.slice(0, 3).map(s => (
                              <p key={s.senseNumber} className="text-[11px] text-teal-100">
                                #{s.senseNumber}. {s.definition}
                              </p>
                            ))}
                          </div>
                        )}

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
                    Thẻ Flashcard Ôn tập • Độc lập với đánh giá trí nhớ SM-2
                  </div>
                </div>
              </div>
              );
            })()}

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

    </div>
  );
}
