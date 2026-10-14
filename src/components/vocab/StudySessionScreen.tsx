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
  Music,
  Pause,
  Play,
  Star,
  Lightbulb,
  Trash2,
  FastForward,
  Clock,
  StopCircle,
  Award,
  AlertCircle
} from 'lucide-react';
import { speakWord, computeMemoryLevel, VocabWord } from '../../lib/vocabEngine';
import { isEquivalentAnswer } from '../../lib/vocabVerificationEngine';
import { CompanionMood, CompanionDialoguePool } from '../../lib/companionEngine';
import { companionEventBus } from '../../lib/companion/companionEventBus';
import { StudyCompanionWidget } from '../companion/StudyCompanionWidget';
import { soundEngine } from '../../lib/soundEngine';
import { YouTubeFocusPlayer } from '../YouTubeFocusPlayer';
import { useAppStore } from '../../lib/store';

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
  durationMinutes?: number;
  onReveal: () => void;
  onRate: (rating: 1 | 2 | 3 | 4) => void;
  onNextCard?: () => void;
  onPrevCard?: () => void;
  onSelectQuizOption: (option: string) => void;
  onSpellingChange: (val: string) => void;
  onCheckSpelling: () => void;
  onExitSession: () => void;
  onRestartSession: () => void;
  onToggleFavorite?: (wordId: string) => void;
  onToggleDifficult?: (wordId: string) => void;
  onSkipWord?: () => void;
  onRemoveWordFromSession?: (wordId: string) => void;
  onReviewMistakes?: (mistakeWords: VocabWord[]) => void;
  onEndSessionEarly?: () => void;
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
  durationMinutes = 0,
  onReveal,
  onRate,
  onNextCard,
  onPrevCard,
  onSelectQuizOption,
  onSpellingChange,
  onCheckSpelling,
  onExitSession,
  onRestartSession,
  onToggleFavorite,
  onToggleDifficult,
  onSkipWord,
  onRemoveWordFromSession,
  onReviewMistakes,
  onEndSessionEarly
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const currentWord = words[currentIndex];

  const [companionMood, setCompanionMood] = useState<CompanionMood>(isCompleted ? 'achievement' : 'focus');
  const [companionDialogueKey, setCompanionDialogueKey] = useState<keyof CompanionDialoguePool | undefined>(
    isCompleted ? 'vocabRoundCompleted' : undefined
  );

  // In-Session Timer & Pause States (Requirement 134.7 & 134.19)
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [mistakeWords, setMistakeWords] = useState<VocabWord[]>([]);

  useEffect(() => {
    if (isCompleted || isPaused) return;
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted, isPaused]);

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
      if (currentWord) {
        setMistakeWords(prev => {
          if (prev.some(w => w.id === currentWord.id)) return prev;
          return [...prev, currentWord];
        });
      }
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
    if (!currentWord) return { level: 0, label: isVi ? 'Level 0 — Chưa học' : 'Level 0 — Unlearned', color: 'bg-slate-100 text-slate-700' };
    const lvl = currentWord.memoryLevel !== undefined
      ? currentWord.memoryLevel
      : computeMemoryLevel(currentWord.repetitionCount, currentWord.intervalDays, currentWord.lapses);

    switch (lvl) {
      case 0: return { level: 0, label: isVi ? 'Level 0 — Chưa học' : 'Level 0 — Unlearned', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 1: return { level: 1, label: isVi ? 'Level 1 — Mới học' : 'Level 1 — Learning', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 2: return { level: 2, label: isVi ? 'Level 2 — Đang ghi nhớ' : 'Level 2 — Memorizing', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 3: return { level: 3, label: isVi ? 'Level 3 — Nhớ khá' : 'Level 3 — Good', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 4: return { level: 4, label: isVi ? 'Level 4 — Nhớ tốt' : 'Level 4 — Strong', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 5: return { level: 5, label: isVi ? 'Level 5 — Thành thạo' : 'Level 5 — Mastered', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      default: return { level: 0, label: isVi ? 'Level 0 — Chưa học' : 'Level 0 — Unlearned', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }, [currentWord, isVi]);

  // Format Elapsed Time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // POST-SESSION RECAP SCREEN (REQUIREMENT 134.20)
  if (isCompleted || !currentWord) {
    const accuracy = stats.reviewed > 0 ? Math.round((stats.passed / stats.reviewed) * 100) : 100;
    const timeSpentFormatted = `${Math.floor(secondsElapsed / 60)} ${isVi ? 'phút' : 'min'} ${secondsElapsed % 60} ${isVi ? 'giây' : 'sec'}`;

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center max-w-xl mx-auto space-y-6 shadow-xl my-6">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {isVi ? 'Hoàn thành Phiên học Xuất sắc!' : 'Study Session Completed!'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isVi ? 'Hệ thống đã lưu tiến độ vào Tháp trí nhớ và đồng bộ dữ liệu.' : 'Progress recorded to Memory Pyramid and synchronized.'}
          </p>
        </div>

        {/* 4 RECAP METRICS */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">{isVi ? 'Đã ôn' : 'Reviewed'}</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.reviewed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-emerald-500 block uppercase">{isVi ? 'Nhớ tốt' : 'Passed'}</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.passed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-rose-500 block uppercase">{isVi ? 'Cần ôn' : 'Again'}</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600">{stats.again}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-violet-500 block uppercase">{isVi ? 'Độ chính xác' : 'Accuracy'}</span>
            <span className="text-xl sm:text-2xl font-black text-violet-600">{accuracy}%</span>
          </div>
        </div>

        {/* Time spent banner */}
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{isVi ? 'Thời gian học:' : 'Time spent:'} <strong>{timeSpentFormatted}</strong></span>
        </div>

        {/* REVIEW MISTAKES SECTION IF ANY (REQUIREMENT 134.20) */}
        {mistakeWords.length > 0 && (
          <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{isVi ? `Các từ cần củng cố (${mistakeWords.length} từ):` : `Words needing review (${mistakeWords.length}):`}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {mistakeWords.map(w => (
                <span key={w.id} className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  {w.term} <span className="font-normal opacity-70">({w.meaning})</span>
                </span>
              ))}
            </div>

            {onReviewMistakes && (
              <button
                type="button"
                onClick={() => onReviewMistakes(mistakeWords)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isVi ? `Ôn lại ngay ${mistakeWords.length} từ đã sai` : `Review ${mistakeWords.length} Mistakes Now`}</span>
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onExitSession}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            {isVi ? 'Quay về Dashboard' : 'Back to Dashboard'}
          </button>
          <button
            type="button"
            onClick={onRestartSession}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isVi ? 'Luyện tập lại phiên này' : 'Restart Session'}</span>
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
  const foreignLangShort = isJapanese ? (isVi ? 'Nhật' : 'JA') : isChinese ? (isVi ? 'Trung' : 'ZH') : (isVi ? 'Anh' : 'EN');

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* PAUSE OVERLAY MODAL */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <span className="text-4xl p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl inline-block">
              ⏸️
            </span>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              {isVi ? 'Đang tạm dừng phiên học' : 'Session Paused'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isVi ? `Đã hoàn thành ${currentIndex} / ${words.length} từ. Hãy hít thở sâu và tiếp tục khi bạn sẵn sàng!` : `Completed ${currentIndex} of ${words.length} words. Take a breath and resume when ready!`}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isVi ? 'Tiếp tục học ngay' : 'Resume Learning'}</span>
              </button>
              <button
                type="button"
                onClick={onExitSession}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isVi ? 'Thoát phiên học' : 'Exit Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION TOP BAR & CONTROLS */}
      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        <button
          type="button"
          onClick={onExitSession}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> {isVi ? 'Thoát' : 'Exit'}
        </button>

        {/* Counter & Timer */}
        <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-400 shrink-0">
          <span>
            {isVi ? 'Từ' : 'Word'} {currentIndex + 1} / {words.length} ({progressPercent}%)
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatTime(secondsElapsed)}</span>
            {durationMinutes > 0 && (
              <span className="text-slate-400 font-normal">/{durationMinutes}m</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Pause Button */}
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
            title={isVi ? 'Tạm dừng phiên học' : 'Pause session'}
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          {/* End Early Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm(isVi ? 'Bạn có muốn kết thúc sớm phiên học và xem thống kê?' : 'End session early and view recap?')) {
                if (onEndSessionEarly) onEndSessionEarly();
                else onExitSession();
              }
            }}
            className="p-1.5 bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950 text-slate-600 hover:text-rose-600 rounded-xl transition cursor-pointer"
            title={isVi ? 'Kết thúc sớm phiên học' : 'End session early'}
          >
            <StopCircle className="w-3.5 h-3.5" />
          </button>

          {/* YouTube Lo-Fi Music Button */}
          <button
            type="button"
            onClick={() => setShowMusicPlayer(prev => !prev)}
            className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              showMusicPlayer
                ? 'bg-red-500/15 border-red-500/40 text-red-500 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Nghe nhạc YouTube Lo-Fi tập trung"
          >
            <Music className="w-3 h-3 text-red-500" />
            <span className="hidden sm:inline">{showMusicPlayer ? (isVi ? 'Ẩn nhạc' : 'Hide') : 'Lo-Fi'}</span>
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
              ? (isVi ? `🔄 Đảo chiều` : '🔄 Reverse')
              : mode === 'quiz' 
              ? '📝 Quiz' 
              : mode === 'spelling' 
              ? (isVi ? '✍️ Gõ từ' : '✍️ Typing')
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

      {/* IN-SESSION ACTIVE WORD CONTROL BAR (REQUIREMENT 134.19) */}
      <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs gap-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(currentWord.id)}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                currentWord.isFavorite
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${currentWord.isFavorite ? 'fill-current text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{isVi ? 'Yêu thích' : 'Favorite'}</span>
            </button>
          )}

          {onToggleDifficult && (
            <button
              type="button"
              onClick={() => onToggleDifficult(currentWord.id)}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer ${
                currentWord.isDifficult
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-yellow-500'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              <span className="hidden sm:inline">{isVi ? 'Từ khó' : 'Difficult'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Skip word button */}
          <button
            type="button"
            onClick={() => {
              if (onSkipWord) onSkipWord();
              else triggerNavigateNext();
            }}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
            title={isVi ? 'Bỏ qua từ này (không trừ điểm)' : 'Skip this word'}
          >
            <FastForward className="w-3.5 h-3.5 text-slate-400" />
            <span>{isVi ? 'Bỏ qua' : 'Skip'}</span>
          </button>

          {/* Remove from session button */}
          {words.length > 1 && onRemoveWordFromSession && (
            <button
              type="button"
              onClick={() => {
                if (confirm(isVi ? 'Xóa từ này khỏi phiên học hiện tại?' : 'Remove this word from active session?')) {
                  onRemoveWordFromSession(currentWord.id);
                }
              }}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
              title={isVi ? 'Xóa khỏi phiên học này' : 'Remove from session'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isVi ? 'Xóa khỏi phiên' : 'Remove'}</span>
            </button>
          )}
        </div>
      </div>

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
                  {isVi ? 'Kiểm tra' : 'Check'}
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
                    ? (isVi ? '🎉 Xuất sắc! Bạn đã chọn chính xác.' : '🎉 Correct! Well done.')
                    : (isVi ? `✕ Chưa chính xác! Đáp án đúng là: "${currentWord.meaning}"` : `✕ Incorrect! Correct answer is: "${currentWord.meaning}"`)}
                </div>
                <button
                  type="button"
                  onClick={() => handleRateWithCompanion(quizMatch?.isMatch ? 3 : 1)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{isVi ? 'Tiếp tục câu tiếp theo' : 'Continue to Next Question'}</span>
                  <ArrowRight className="w-4 h-4" />
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
                      <span>{isVi ? '🎉 Gõ chính tả hoàn toàn chính xác!' : '🎉 Spelling is completely correct!'}</span>
                    </div>
                  ) : (
                    <div>
                      <span>{isVi ? '✕ Chưa chính xác! Từ đúng là: ' : '✕ Incorrect! Correct word is: '}</span>
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
                  <span>{isVi ? 'Tiếp tục từ tiếp theo' : 'Continue to Next Word'}</span>
                  <ArrowRight className="w-4 h-4" />
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
                  <strong>{isVi ? 'Ghi chú / Mẹo nhớ:' : 'Notes / Mnemonic:'}</strong> {currentWord.mnemonic || currentWord.notes}
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
              <Eye className="w-4 h-4" /> {isVi ? 'Hiện đáp án & Chi tiết' : 'Show Answer & Details'}
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4 SM-2 SPACED REPETITION RATING BUTTONS (FOR FLASHCARD MODES) */}
        {/* ------------------------------------------------------------- */}
        {isRevealed && (mode === 'flashcard' || mode === 'flashcard_reverse') && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              {isVi ? 'Đánh giá mức độ ghi nhớ (Tháp trí nhớ & Thuật toán SM-2)' : 'Memory Rating (SM-2 Algorithm)'}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRateWithCompanion(1)}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔴</span>
                <span className="block font-black">{isVi ? '1. Quên (Again)' : '1. Again'}</span>
                <span className="text-[10px] text-rose-500">{isVi ? 'Giảm tầng / Ôn mai' : 'Reset / Review tomorrow'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(2)}
                className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟠</span>
                <span className="block font-black">{isVi ? '2. Khó (Hard)' : '2. Hard'}</span>
                <span className="text-[10px] text-amber-500">{isVi ? 'Ôn sau 1-2 ngày' : 'Review in 1-2 days'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(3)}
                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟢</span>
                <span className="block font-black">{isVi ? '3. Nhớ tốt (Good)' : '3. Good'}</span>
                <span className="text-[10px] text-emerald-600">{isVi ? 'Lên tầng tháp' : 'Advance memory level'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(4)}
                className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔵</span>
                <span className="block font-black">{isVi ? '4. Dễ dàng (Easy)' : '4. Easy'}</span>
                <span className="text-[10px] text-blue-600">{isVi ? 'Thăng tiến nhanh' : 'Fast interval jump'}</span>
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
            <span>{isVi ? 'Từ trước' : 'Previous'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400/80">
            <span className="hidden sm:inline">{isVi ? 'Phím ← / →' : 'Keys ← / →'}</span>
            <span className="inline sm:hidden">{isVi ? '👈 Vuốt qua lại 👉' : '👈 Swipe 👉'}</span>
            <span>•</span>
            <span>{isVi ? 'Chạm để lật thẻ' : 'Tap to flip'}</span>
          </div>

          <button
            type="button"
            onClick={triggerNavigateNext}
            className="flex items-center gap-1 font-semibold hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer text-emerald-600 dark:text-emerald-400"
          >
            <span>{currentIndex + 1 >= words.length ? (isVi ? 'Xong lượt' : 'Complete') : (isVi ? 'Từ tiếp' : 'Next')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
