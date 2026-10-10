import React, { useMemo, useState } from 'react';
import {
  Volume2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Eye
} from 'lucide-react';
import { speakWord } from '../../lib/vocabEngine';
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

  // Options for Quiz mode
  const quizOptions = useMemo(() => {
    if (!currentWord || mode !== 'quiz') return [];
    const wrongOptions = words
      .filter((w: any) => w.id !== currentWord.id)
      .map((w: any) => w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [currentWord.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
  }, [currentWord, mode, words]);

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
            Hệ thống đã tự động lưu tiến độ và lên lịch ôn ngắt quãng cho từng từ vựng.
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
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
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

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
          {mode === 'flashcard_reverse' 
            ? 'Flashcard Việt → Anh' 
            : mode === 'quiz' 
            ? 'Trắc nghiệm' 
            : mode === 'spelling' 
            ? 'Luyện chính tả' 
            : mode === 'fill_in_blank'
            ? 'Điền từ vào ngữ cảnh'
            : 'Flashcard Anh → Việt'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
        <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* FLASHCARD CARD CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 min-h-[380px] flex flex-col justify-between">
        
        {/* CARD FRONT: Normal vs Reverse */}
        <div className="text-center space-y-3 pt-2">
          {currentWord.partOfSpeech && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-mono">
              {currentWord.partOfSpeech}
            </span>
          )}

          {mode === 'flashcard_reverse' ? (
            /* REVERSE FLASHCARD: Show Vietnamese Meaning first */
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Nghĩa tiếng Việt
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {currentWord.meaning}
              </h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                Hãy nhớ lại từ tiếng Anh tương ứng và cách phát âm trước khi lật mặt sau!
              </p>
            </div>
          ) : (
            /* NORMAL FLASHCARD: Show English Term first */
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentWord.term}
                </h2>

                <button
                  type="button"
                  onClick={() => speakWord(currentWord.term, activeLang.speechVoiceCode)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition cursor-pointer"
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
            </div>
          )}
        </div>

        {/* MODE SPECIFIC INTERACTIONS */}

        {/* 1. QUIZ MODE INTERACTION */}
        {mode === 'quiz' && !isRevealed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4">
            {quizOptions.map((opt: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuizOption(opt)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 text-left font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* 2. SPELLING MODE INTERACTION */}
        {mode === 'spelling' && !isRevealed && (
          <div className="space-y-3 py-4 max-w-md mx-auto w-full">
            <p className="text-xs text-center text-slate-500">
              Nghĩa: <strong className="text-slate-800 dark:text-slate-200">{currentWord.meaning}</strong>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={spellingInput}
                onChange={e => onSpellingChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCheckSpelling();
                }}
                placeholder="Gõ từ vựng tiếng Anh..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-center focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={onCheckSpelling}
                className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {/* 3. FILL IN THE BLANK INTERACTION */}
        {mode === 'fill_in_blank' && !isRevealed && (
          <div className="space-y-4 py-4 max-w-lg mx-auto w-full text-center">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-sm">
              {currentWord.exampleSentence ? (
                <p className="font-semibold text-slate-900 dark:text-slate-100 italic leading-relaxed">
                  "{currentWord.exampleSentence.replace(new RegExp(`\\b${currentWord.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[ ______ ]')}"
                </p>
              ) : (
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Hãy nhớ lại từ thích hợp cho ngữ cảnh: <strong>[ ______ ]</strong>
                </p>
              )}
              {currentWord.exampleTranslation && (
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">
                  → {currentWord.exampleTranslation}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Gợi ý nghĩa: <strong className="text-slate-800 dark:text-slate-200">{currentWord.meaning}</strong>
            </p>

            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={spellingInput}
                onChange={e => onSpellingChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCheckSpelling();
                }}
                placeholder="Điền từ tiếng Anh còn thiếu..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-center focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={onCheckSpelling}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {/* BACK OF CARD (REVEALED) */}
        {isRevealed ? (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            
            {mode === 'flashcard_reverse' ? (
              /* REVEALED IN REVERSE MODE: Show Term + Pronunciation */
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {currentWord.term}
                  </h3>
                  <button
                    type="button"
                    onClick={() => speakWord(currentWord.term, activeLang.speechVoiceCode)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {currentWord.phonetic && (
                  <p className="font-mono text-sm text-slate-400">{currentWord.phonetic}</p>
                )}
              </div>
            ) : (
              /* REVEALED IN NORMAL MODE: Show Meaning */
              <div className="text-center space-y-1">
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentWord.meaning}
                </div>
              </div>
            )}

            {/* Quiz Result Indicator */}
            {mode === 'quiz' && quizSelectedOption && (() => {
              const res = isEquivalentAnswer(quizSelectedOption, currentWord.meaning, currentWord.secondaryMeanings);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Bạn đã chọn chính xác!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Đáp án đúng là: ${currentWord.meaning}`}
                </div>
              );
            })()}

            {/* Spelling Result Indicator */}
            {mode === 'spelling' && spellingChecked && (() => {
              const res = isEquivalentAnswer(spellingInput, currentWord.term);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Gõ chính tả hoàn toàn chính xác!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Từ đúng là: "${currentWord.term}"`}
                </div>
              );
            })()}

            {/* Fill-in-the-blank Result Indicator */}
            {mode === 'fill_in_blank' && spellingChecked && (() => {
              const res = isEquivalentAnswer(spellingInput, currentWord.term);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Bạn đã điền chính xác từ vào câu!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Từ cần điền là: "${currentWord.term}"`}
                </div>
              );
            })()}

            {/* Example sentence if available */}
            {currentWord.exampleSentence && (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
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

            {/* Mnemonic / Personal Notes */}
            {(currentWord.mnemonic || currentWord.notes) && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Ghi chú / Mẹo:</strong> {currentWord.mnemonic || currentWord.notes}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* NOT REVEALED YET */
          <div className="text-center py-6">
            {(mode === 'flashcard' || mode === 'flashcard_reverse' || (mode === 'fill_in_blank' && !spellingChecked)) && (
              <button
                type="button"
                onClick={onReveal}
                className="px-6 py-3 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Eye className="w-4 h-4" /> Hiện đáp án & Nghĩa chi tiết
              </button>
            )}
          </div>
        )}

        {/* 4 SM-2 SPACED REPETITION RATING BUTTONS */}
        {isRevealed && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              Đánh giá mức độ ghi nhớ (Thuật toán SM-2)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRateWithCompanion(1)}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔴</span>
                <span className="block font-black">Quên (Again)</span>
                <span className="text-[10px] text-rose-500">Ôn lại ngày mai</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(2)}
                className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟠</span>
                <span className="block font-black">Khó (Hard)</span>
                <span className="text-[10px] text-amber-500">Ôn sau 1-2 ngày</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(3)}
                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟢</span>
                <span className="block font-black">Nhớ tốt (Good)</span>
                <span className="text-[10px] text-emerald-600">Tăng khoảng cách</span>
              </button>

              <button
                type="button"
                onClick={() => handleRateWithCompanion(4)}
                className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔵</span>
                <span className="block font-black">Dễ dàng (Easy)</span>
                <span className="text-[10px] text-blue-600">Nhảy vọt ngày ôn</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
