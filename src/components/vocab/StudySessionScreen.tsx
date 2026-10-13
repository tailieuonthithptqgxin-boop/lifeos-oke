import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  Headphones,
  ArrowRight,
  Brain,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Music
} from 'lucide-react';
import { speakWord, computeMemoryLevel, VocabWord } from '../../lib/vocabEngine';
import { isEquivalentAnswer } from '../../lib/vocabVerificationEngine';
import { CompanionMood, CompanionDialoguePool } from '../../lib/companionEngine';
import { companionEventBus } from '../../lib/companion/companionEventBus';
import { StudyCompanionWidget } from '../companion/StudyCompanionWidget';
import { soundEngine } from '../../lib/soundEngine';
import { YouTubeFocusPlayer } from '../YouTubeFocusPlayer';

interface StudySessionScreenProps {
  activeLang: any;
  words: any[];
  currentIndex: number;
  mode: string;
  isRevealed: boolean;
  isCompleted: boolean;
  stats: { reviewed: number; passed: number; again: number };
  quizSelectedOption: string | null;
  spellingInput: string;
  spellingChecked: boolean;
  distractorPool?: any[];
  onReveal: () => void;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  onNextCard?: () => void;
  onPrevCard?: () => void;
  onSelectQuizOption: (option: string) => void;
  onSpellingChange: (val: string) => void;
  onCheckSpelling: () => void;
  onExitSession: () => void;
  onRestartSession: () => void;
}

export const StudySessionScreen: React.FC<StudySessionScreenProps> = ({
  activeLang,
  words,
  currentIndex,
  mode,
  isRevealed,
  isCompleted,
  stats,
  quizSelectedOption,
  spellingInput,
  spellingChecked,
  distractorPool = [],
  onReveal,
  onRate,
  onNextCard,
  onPrevCard,
  onSelectQuizOption,
  onSpellingChange,
  onCheckSpelling,
  onExitSession,
  onRestartSession
}) => {
  const currentWord = words[currentIndex];

  const [companionMood, setCompanionMood] = useState<CompanionMood>(isCompleted ? 'achievement' : 'focus');
  const [companionDialogueKey, setCompanionDialogueKey] = useState<keyof CompanionDialoguePool | undefined>(
    isCompleted ? 'vocabRoundCompleted' : undefined
  );

  // Swipe & Gesture State
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [flyDirection, setFlyDirection] = useState<'left' | 'right' | null>(null);
  const [enterDirection, setEnterDirection] = useState<'left' | 'right' | null>(null);
  const [showMusicPlayer, setShowMusicPlayer] = useState<boolean>(false);

  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const isFlashcardMode = mode === 'flashcard' || mode === 'flashcard_reverse';

  // Trigger smooth card navigation with direction animation
  const triggerNavigateNext = () => {
    if (!onNextCard) return;
    if (currentIndex + 1 >= words.length) {
      // Reached the end of deck: notify & proceed via onNextCard logic
      onNextCard();
      return;
    }
    setFlyDirection('left');
    soundEngine.playFlip();
    setTimeout(() => {
      onNextCard();
      setFlyDirection(null);
      setDragX(0);
      setEnterDirection('right');
      setTimeout(() => setEnterDirection(null), 250);
    }, 180);
  };

  const triggerNavigatePrev = () => {
    if (!onPrevCard) return;
    if (currentIndex === 0) {
      // First card: bounce back smoothly without crashing
      setDragX(0);
      return;
    }
    setFlyDirection('right');
    soundEngine.playFlip();
    setTimeout(() => {
      onPrevCard();
      setFlyDirection(null);
      setDragX(0);
      setEnterDirection('left');
      setTimeout(() => setEnterDirection(null), 250);
    }, 180);
  };

  // Keyboard navigation for Desktop / Power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in spelling input or modal
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (isCompleted || !currentWord) return;

      if (e.code === 'Space') {
        if (isFlashcardMode) {
          e.preventDefault();
          soundEngine.playFlip();
          onReveal();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerNavigateNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerNavigatePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isCompleted, currentWord, isFlashcardMode, onReveal, words.length]);

  // Touch Gesture Handlers (Mobile & Tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isFlashcardMode || flyDirection) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isFlashcardMode || flyDirection) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartXRef.current;
    const diffY = touch.clientY - touchStartYRef.current;

    // Detect gesture axis: ignore if user is scrolling vertically
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Prevent browser default back/forward swipe
      e.preventDefault();
      // Apply slight resistance when at first card and swiping right
      if (currentIndex === 0 && diffX > 0) {
        setDragX(diffX * 0.3);
      } else {
        setDragX(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging || !isFlashcardMode || flyDirection) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);

    const threshold = 65; // Minimum px distance to trigger swipe navigation
    if (dragX < -threshold) {
      // Swiped Left -> Next Card
      triggerNavigateNext();
    } else if (dragX > threshold) {
      // Swiped Right -> Previous Card
      triggerNavigatePrev();
    } else {
      // Snapped back
      setDragX(0);
    }
  };

  // Mouse drag handlers for desktop trackpad/mouse preview
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFlashcardMode || flyDirection) return;
    // Don't drag if clicking buttons, audio, or links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isFlashcardMode || flyDirection) return;
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
      triggerNavigateNext();
    } else if (dragX > threshold) {
      triggerNavigatePrev();
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

  // Handle card click (Tap to Flip vs Drag to Navigate)
  const handleCardClick = (e: React.MouseEvent) => {
    // If movement exceeded 10px, it was a drag gesture, not a click
    if (Math.abs(dragX) > 10) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    if (isFlashcardMode) {
      soundEngine.playFlip();
      onReveal();
    }
  };

  const handlePlayWordAudio = (word?: VocabWord) => {
    if (!word) return;
    const isJa = activeLang?.id === 'ja' || word.languageId === 'ja';
    const isZh = activeLang?.id === 'zh' || word.languageId === 'zh';
    const voiceCode = activeLang?.speechVoiceCode || (isJa ? 'ja-JP' : isZh ? 'zh-CN' : 'en-US');
    const textToSpeak = (isJa && (word.furigana || word.phonetic))
      ? (word.furigana || word.phonetic)
      : word.term;
    speakWord(textToSpeak, voiceCode);
  };

  // Play audio automatically in spelling mode on each new card
  useEffect(() => {
    if (currentWord && mode === 'spelling') {
      handlePlayWordAudio(currentWord);
    }
  }, [currentWord?.id, mode, activeLang?.speechVoiceCode]);

  const handleRateWithCompanion = (rating: 1 | 2 | 3 | 4) => {
    if (rating >= 3) {
      setCompanionMood('celebrate');
      setCompanionDialogueKey('vocabCorrect');
      companionEventBus.emitVocabCorrect();
    } else {
      setCompanionMood('encourage');
      setCompanionDialogueKey('vocabIncorrect');
      companionEventBus.emitVocabIncorrect();
    }
    onRate(rating);
  };

  // 4 Distractors for Quiz mode with random positioning and real dictionary data
  const quizOptions = useMemo(() => {
    if (!currentWord || mode !== 'quiz') return [];
    
    // Choose distractor pool from whole vocabulary pool if available
    const pool = (distractorPool && distractorPool.length >= 10) ? distractorPool : (words || []);
    const filtered = pool.filter(
      (w: any) => w && w.id !== currentWord.id && w.meaning !== currentWord.meaning
    );

    const shuffledDistractors = [...filtered]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w: any) => w?.meaning || '');

    // Guaranteed 4 distinct options
    const options = [currentWord.meaning, ...shuffledDistractors];
    return options.sort(() => Math.random() - 0.5);
  }, [currentWord?.id, currentWord?.meaning, mode, distractorPool, words]);

  // Memory Level Badge
  const memoryLevelInfo = useMemo(() => {
    if (!currentWord) return { level: 0, label: 'Level 0 — Chưa học', color: 'bg-slate-100 text-slate-700' };
    const lvl = currentWord.memoryLevel !== undefined
      ? currentWord.memoryLevel
      : computeMemoryLevel(currentWord.repetitionCount, currentWord.intervalDays, currentWord.lapses);

    switch (lvl) {
      case 0: return { level: 0, label: 'Level 0 — Chưa học', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 1: return { level: 1, label: 'Level 1 — Mới học', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 2: return { level: 2, label: 'Level 2 — Đang ghi nhớ', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 3: return { level: 3, label: 'Level 3 — Nhớ khá', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 4: return { level: 4, label: 'Level 4 — Nhớ tốt', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 5: return { level: 5, label: 'Level 5 — Thành thạo', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      default: return { level: 0, label: 'Level 0 — Chưa học', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }, [currentWord]);

  if (isCompleted || !currentWord) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-xl mx-auto space-y-6 shadow-xl my-6">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            Hoàn thành Phiên học Xuất sắc!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống đã lưu tiến độ vào Tháp trí nhớ và đồng bộ lên cơ sở dữ liệu.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Đã ôn</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.reviewed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-emerald-500 block uppercase">Nhớ tốt</span>
            <span className="text-2xl font-black text-emerald-600">{stats.passed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-rose-500 block uppercase">Cần ôn thêm</span>
            <span className="text-2xl font-black text-rose-600">{stats.again}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onExitSession}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Quay về Dashboard
          </button>
          <button
            type="button"
            onClick={onRestartSession}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Tiếp tục Ôn tập
          </button>
        </div>

        {/* AI Study Companion on Completion */}
        <StudyCompanionWidget 
          contextMood="achievement"
          contextDialogueKey="vocabRoundCompleted"
        />
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  // Check spelling accuracy
  const spellingMatch = spellingChecked
    ? isEquivalentAnswer(spellingInput, currentWord.term)
    : null;

  // Check quiz accuracy
  const quizMatch = quizSelectedOption
    ? isEquivalentAnswer(quizSelectedOption, currentWord.meaning, currentWord.secondaryMeanings)
    : null;

  // Language short name
  const isChinese = activeLang?.id === 'zh';
  const isJapanese = activeLang?.id === 'ja' || currentWord?.languageId === 'ja';
  const foreignLangShort = isJapanese ? 'Nhật' : isChinese ? 'Trung' : 'Anh';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between text-xs gap-2">
        <button
          type="button"
          onClick={onExitSession}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>

        <span className="font-bold text-slate-600 dark:text-slate-400 shrink-0">
          Từ {currentIndex + 1} / {words.length} ({progressPercent}%)
        </span>

        <div className="flex items-center gap-2">
          {/* YouTube Lo-Fi Music Button */}
          <button
            type="button"
            onClick={() => setShowMusicPlayer(prev => !prev)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              showMusicPlayer
                ? 'bg-red-500/15 border-red-500/40 text-red-500 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Nghe nhạc YouTube Lo-Fi tập trung"
          >
            <Music className="w-3 h-3 text-red-500" />
            <span className="hidden sm:inline">{showMusicPlayer ? 'Ẩn nhạc' : 'Nhạc YouTube'}</span>
          </button>

          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border hidden sm:inline-block ${memoryLevelInfo.color}`}>
            {memoryLevelInfo.label}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-xs shrink-0 ${
            mode === 'flashcard_reverse'
              ? 'bg-indigo-600 text-white'
              : mode === 'quiz'
              ? 'bg-purple-600 text-white animate-pulse'
              : mode === 'spelling'
              ? 'bg-pink-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {mode === 'flashcard_reverse' 
              ? `🔄 Đảo chiều` 
              : mode === 'quiz' 
              ? '📝 Quiz' 
              : mode === 'spelling' 
              ? '✍️ Gõ từ' 
              : `🎴 Flashcard`}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Floating Collapsible Music Player Drawer */}
      {showMusicPlayer && (
        <div className="w-full animate-in slide-in-from-top-2 duration-200">
          <YouTubeFocusPlayer defaultExpanded={true} />
        </div>
      )}

      {/* FLASHCARD / EXERCISE CARD CONTAINER */}
      <div className="relative w-full">
        {/* DESKTOP QUICK PREV / NEXT LATERAL BUTTONS (VISIBLE ON MD+ SCREENS) */}
        {isFlashcardMode && (
          <>
            <button
              type="button"
              onClick={triggerNavigatePrev}
              disabled={currentIndex === 0}
              title="Từ trước đó (Phím Mũi tên Trái ←)"
              className={`hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-md backdrop-blur-sm items-center justify-center text-slate-600 dark:text-slate-300 transition cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 hover:scale-105 active:scale-95 disabled:opacity-20 disabled:pointer-events-none`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={triggerNavigateNext}
              title={currentIndex + 1 >= words.length ? 'Hoàn thành lượt học' : 'Từ tiếp theo (Phím Mũi tên Phải →)'}
              className={`hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-md backdrop-blur-sm items-center justify-center text-slate-600 dark:text-slate-300 transition cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-600 hover:scale-105 active:scale-95`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* SWIPE HINT BADGES ON DRAG */}
        {isDragging && isFlashcardMode && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-between px-6">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                dragX > 35
                  ? 'bg-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-slate-200/60 text-slate-500 opacity-60'
              }`}
            >
              ← Từ trước
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                dragX < -35
                  ? 'bg-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-slate-200/60 text-slate-500 opacity-60'
              }`}
            >
              Từ tiếp theo →
            </span>
          </div>
        )}

        {/* INTERACTIVE FLASHCARD SURFACE */}
        <div
          ref={cardContainerRef}
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
          className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 min-h-[390px] flex flex-col justify-between select-none relative ${
            isFlashcardMode ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
        
        {/* ------------------------------------------------------------- */}
        {/* 1. FLASHCARD ANH -> VIỆT (FRONT) */}
        {/* ------------------------------------------------------------- */}
        {mode === 'flashcard' && (
          <div className="text-center space-y-3 pt-2">
            {currentWord.partOfSpeech && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-mono">
                {currentWord.partOfSpeech}
              </span>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentWord.term}
                </h2>
                <button
                  type="button"
                  onClick={() => handlePlayWordAudio(currentWord)}
                  className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition cursor-pointer"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
              {currentWord.phonetic && (
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  {currentWord.phonetic}
                </p>
              )}
              <p className="text-xs text-slate-400 italic">
                Chủ động nhớ lại nghĩa tiếng Việt trước khi lật mặt sau!
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. FLASHCARD ĐẢO CHIỀU VIỆT -> ANH (FRONT) */}
        {/* ------------------------------------------------------------- */}
        {mode === 'flashcard_reverse' && (
          <div className="text-center space-y-3 pt-2">
            {currentWord.partOfSpeech && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-mono">
                {currentWord.partOfSpeech}
              </span>
            )}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Nghĩa tiếng Việt
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {currentWord.meaning}
              </h2>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                {isJapanese
                  ? 'Hãy nhớ lại từ vựng tiếng Nhật (Kanji/Hiragana) tương ứng và cách phát âm!'
                  : isChinese
                  ? 'Hãy nhớ lại chữ Hán / Pinyin tiếng Trung tương ứng và cách phát âm!'
                  : 'Hãy nhớ lại từ vựng tiếng Anh tương ứng và cách phát âm!'}
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3. TRẮC NGHIỆM 4 ĐÁP ÁN (QUIZ MODE) */}
        {/* ------------------------------------------------------------- */}
        {mode === 'quiz' && (
          <div className="space-y-4 pt-2">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Câu hỏi trắc nghiệm (Chọn nghĩa đúng)
              </span>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {currentWord.term}
                </h2>
                <button
                  type="button"
                  onClick={() => handlePlayWordAudio(currentWord)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full cursor-pointer"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
              {currentWord.phonetic && (
                <p className="font-mono text-xs text-slate-400">{currentWord.phonetic}</p>
              )}
            </div>

            {/* 4 Quiz Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
              {(quizOptions || []).map((opt: string, idx: number) => {
                const isSelected = quizSelectedOption === opt;
                const isCorrectOption = opt === currentWord.meaning;
                let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:border-emerald-500';

                if (quizSelectedOption) {
                  if (isSelected && quizMatch?.isMatch) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500';
                  } else if (isSelected && !quizMatch?.isMatch) {
                    btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500';
                  } else if (isCorrectOption) {
                    btnStyle = 'border-emerald-500 bg-emerald-50/60 text-emerald-700 ring-1 ring-emerald-400';
                  } else {
                    btnStyle = 'border-slate-200 opacity-50 text-slate-400';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={quizSelectedOption !== null}
                    onClick={() => onSelectQuizOption(opt)}
                    className={`p-3.5 rounded-2xl border text-left font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {quizSelectedOption && isCorrectOption && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {quizSelectedOption && isSelected && !quizMatch?.isMatch && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. LUYỆN GÕ CHÍNH TẢ (SPELLING MODE) */}
        {/* ------------------------------------------------------------- */}
        {mode === 'spelling' && (
          <div className="space-y-4 pt-2 text-center">
            {/* Pronunciation & Listening Prompt */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Nghe phát âm và gõ chính xác từ vựng
              </h3>
              <p className="text-xs text-slate-500">
                Gợi ý nghĩa: <strong className="text-slate-800 dark:text-slate-200">{currentWord.meaning}</strong>
                {currentWord.partOfSpeech && <span className="ml-1 text-[10px] font-mono text-slate-400">({currentWord.partOfSpeech})</span>}
              </p>
              <button
                type="button"
                onClick={() => handlePlayWordAudio(currentWord)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Nghe lại phát âm
              </button>
            </div>

            {/* Input Form */}
            {!spellingChecked && (
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  value={spellingInput}
                  onChange={e => onSpellingChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onCheckSpelling();
                  }}
                  placeholder={
                    isJapanese
                      ? "Gõ Kanji hoặc Hiragana nghe được..."
                      : isChinese
                      ? "Gõ chữ Hán hoặc Pinyin nghe được..."
                      : "Gõ từ vựng tiếng Anh nghe được..."
                  }
                  className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm text-center focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onCheckSpelling}
                  disabled={!spellingInput.trim()}
                  className="px-5 py-3 bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Kiểm tra
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REVEALED CONTENT (BACK OF CARD / DETAILED ANSWER) */}
        {/* ------------------------------------------------------------- */}
        {isRevealed && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            
            {/* In Reverse Mode: Reveal English Term + Audio */}
            {mode === 'flashcard_reverse' && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {currentWord.term}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handlePlayWordAudio(currentWord)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {currentWord.phonetic && (
                  <p className="font-mono text-sm text-slate-400">{currentWord.phonetic}</p>
                )}
              </div>
            )}

            {/* In Normal Mode: Reveal Vietnamese Meaning */}
            {mode === 'flashcard' && (
              <div className="text-center space-y-1">
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentWord.meaning}
                </div>
              </div>
            )}

            {/* Quiz Result Indicator & Quick Next CTA */}
            {mode === 'quiz' && quizSelectedOption && (
              <div className="space-y-2">
                <div className={`p-3 rounded-2xl text-center text-xs font-bold ${
                  quizMatch?.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {quizMatch?.isMatch
                    ? '🎉 Xuất sắc! Bạn đã chọn chính xác.'
                    : `✕ Chưa chính xác! Đáp án đúng là: "${currentWord.meaning}"`}
                </div>
                <button
                  type="button"
                  onClick={() => handleRateWithCompanion(quizMatch?.isMatch ? 3 : 1)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  Tiếp tục câu tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Spelling Result Indicator & Quick Next CTA */}
            {mode === 'spelling' && spellingChecked && (
              <div className="space-y-3 text-center">
                <div className={`p-3.5 rounded-2xl text-xs font-bold ${
                  spellingMatch?.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {spellingMatch?.isMatch ? (
                    <div className="flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>🎉 Gõ chính tả hoàn toàn chính xác!</span>
                    </div>
                  ) : (
                    <div>
                      <span>✕ Chưa chính xác! Từ đúng là: </span>
                      <strong className="text-rose-900 underline text-sm">{currentWord.term}</strong>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {currentWord.term} <span className="font-mono text-slate-400 font-normal">[{currentWord.phonetic}]</span>
                  </div>
                  <div className="text-slate-500">{currentWord.meaning}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRateWithCompanion(spellingMatch?.isMatch ? 3 : 1)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  Tiếp tục từ tiếp theo <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Example sentence if available */}
            {currentWord.exampleSentence && (
              <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentWord.exampleSentence}
                </div>
                {currentWord.exampleTranslation && (
                  <div className="text-slate-500 dark:text-slate-400 italic">
                    {currentWord.exampleTranslation}
                  </div>
                )}
              </div>
            )}

            {/* Mnemonic / Notes */}
            {(currentWord.mnemonic || currentWord.notes) && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Ghi chú / Mẹo nhớ:</strong> {currentWord.mnemonic || currentWord.notes}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* REVEAL BUTTON (FOR FLASHCARD MODES) */}
        {/* ------------------------------------------------------------- */}
        {!isRevealed && (mode === 'flashcard' || mode === 'flashcard_reverse') && (
          <div className="text-center py-4">
            <button
              type="button"
              onClick={onReveal}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2 mx-auto"
            >
              <Eye className="w-4 h-4" /> Hiện đáp án & Chi tiết
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4 SM-2 SPACED REPETITION RATING BUTTONS (FOR FLASHCARD MODES) */}
        {/* ------------------------------------------------------------- */}
        {isRevealed && (mode === 'flashcard' || mode === 'flashcard_reverse') && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              Đánh giá mức độ ghi nhớ (Tháp trí nhớ & Thuật toán SM-2)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRateWithCompanion(1)}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔴</span>
                <span className="block font-black">1. Quên (Again)</span>
                <span className="text-[10px] text-rose-500">Giảm tầng / Ôn mai</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(2)}
                className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟠</span>
                <span className="block font-black">2. Khó (Hard)</span>
                <span className="text-[10px] text-amber-500">Ôn sau 1-2 ngày</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(3)}
                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟢</span>
                <span className="block font-black">3. Nhớ tốt (Good)</span>
                <span className="text-[10px] text-emerald-600">Lên tầng tháp</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(4)}
                className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔵</span>
                <span className="block font-black">4. Dễ dàng (Easy)</span>
                <span className="text-[10px] text-blue-600">Thăng tiến nhanh</span>
              </button>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* FOOTER NAVIGATION HELPER & MOBILE SWIPE HINT */}
      {isFlashcardMode && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
          <button
            type="button"
            onClick={triggerNavigatePrev}
            disabled={currentIndex === 0}
            className="flex items-center gap-1 font-semibold hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Từ trước</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400/80">
            <span className="hidden sm:inline">Phím ← / →</span>
            <span className="inline sm:hidden">👈 Vuốt qua lại 👉</span>
            <span>•</span>
            <span>Chạm để lật thẻ</span>
          </div>

          <button
            type="button"
            onClick={triggerNavigateNext}
            className="flex items-center gap-1 font-semibold hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer text-emerald-600 dark:text-emerald-400"
          >
            <span>{currentIndex + 1 >= words.length ? 'Xong lượt' : 'Từ tiếp'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
