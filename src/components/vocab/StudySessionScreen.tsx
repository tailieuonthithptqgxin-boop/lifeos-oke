import React, { useMemo, useState, useEffect } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { speakWord, computeMemoryLevel } from '../../lib/vocabEngine';
import { isEquivalentAnswer } from '../../lib/vocabVerificationEngine';
import { CompanionMood, CompanionDialoguePool } from '../../lib/companionEngine';
import { companionEventBus } from '../../lib/companion/companionEventBus';
import { StudyCompanionWidget } from '../companion/StudyCompanionWidget';

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

  // Play audio automatically in spelling mode on each new card
  useEffect(() => {
    if (currentWord && mode === 'spelling') {
      speakWord(currentWord.term, activeLang?.speechVoiceCode || 'en-US');
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
  const foreignLangShort = isChinese ? 'Trung' : 'Anh';

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onExitSession}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Thoát phiên
        </button>

        <span className="font-bold text-slate-600 dark:text-slate-400">
          Từ {currentIndex + 1} / {words.length} ({progressPercent}%)
        </span>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${memoryLevelInfo.color}`}>
            {memoryLevelInfo.label}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-xs ${
            mode === 'flashcard_reverse'
              ? 'bg-indigo-600 text-white'
              : mode === 'quiz'
              ? 'bg-purple-600 text-white animate-pulse'
              : mode === 'spelling'
              ? 'bg-pink-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            {mode === 'flashcard_reverse' 
              ? `🔄 Đảo chiều: Việt → ${foreignLangShort}` 
              : mode === 'quiz' 
              ? '📝 Trắc nghiệm 4 đáp án (Quiz)' 
              : mode === 'spelling' 
              ? '✍️ Luyện gõ chính tả (Spelling)' 
              : `🎴 Flashcard: ${foreignLangShort} → Việt`}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* FLASHCARD / EXERCISE CARD CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 min-h-[390px] flex flex-col justify-between">
        
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
                  onClick={() => speakWord(currentWord.term, activeLang?.speechVoiceCode)}
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
                {isChinese
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
                  onClick={() => speakWord(currentWord.term, activeLang?.speechVoiceCode)}
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
                onClick={() => speakWord(currentWord.term, activeLang?.speechVoiceCode)}
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
                  placeholder={isChinese ? "Gõ chữ Hán hoặc Pinyin nghe được..." : "Gõ từ vựng tiếng Anh nghe được..."}
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
                    onClick={() => speakWord(currentWord.term, activeLang?.speechVoiceCode)}
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
  );
};
