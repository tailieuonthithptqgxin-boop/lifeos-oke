import React, { useState, useMemo } from 'react';
import { 
  X, Volume2, CheckCircle2, AlertTriangle, ArrowRight, 
  RotateCcw, Sparkles, Brain, Award, Globe, HelpCircle 
} from 'lucide-react';
import { ChineseWord, ActiveRecallMode, ChineseRecallQuestion } from '../../../lib/chineseVocab/types';
import { generateChineseRecallQuestions } from '../../../lib/chineseVocab/chineseActiveRecallEngine';
import { renderChineseScript } from '../../../lib/chineseVocab/traditionalMappingEngine';
import { speakWord } from '../../../lib/vocabEngine';

interface ChineseActiveRecallModalProps {
  words: ChineseWord[];
  allPoolWords: ChineseWord[];
  initialMode?: ActiveRecallMode;
  onClose: () => void;
  onCompleteSession?: (results: { correctCount: number; totalCount: number }) => void;
}

const RECALL_MODES: { mode: ActiveRecallMode; label: string; desc: string }[] = [
  { mode: 'hanzi_to_meaning', label: '1. Hán tự → Nghĩa', desc: 'Nhìn chữ Hán nhận diện ý nghĩa' },
  { mode: 'meaning_to_hanzi', label: '2. Nghĩa → Hán tự', desc: 'Gợi nhớ chữ Hán từ bản dịch' },
  { mode: 'pinyin_to_hanzi', label: '3. Pinyin → Hán tự', desc: 'Nhìn phiên âm chọn chữ Hán đúng' },
  { mode: 'hanzi_to_pinyin', label: '4. Hán tự → Pinyin', desc: 'Đọc chữ Hán suy ra phiên âm & thanh điệu' },
  { mode: 'audio_to_hanzi', label: '5. Nghe → Hán tự', desc: 'Nghe giọng phát âm chọn chữ Hán' },
  { mode: 'fill_in_blank', label: '6. Điền từ vào câu', desc: 'Hoàn thành câu ví dụ theo ngữ cảnh' },
  { mode: 'context_recall', label: '7. Context Recall', desc: 'Diễn đạt ý nghĩa trong tình huống thực tế' }
];

export function ChineseActiveRecallModal({
  words,
  allPoolWords,
  initialMode = 'hanzi_to_meaning',
  onClose,
  onCompleteSession
}: ChineseActiveRecallModalProps) {
  const [activeMode, setActiveMode] = useState<ActiveRecallMode>(initialMode);
  const [scriptMode, setScriptMode] = useState<'simplified' | 'traditional' | 'both'>('simplified');
  
  // Question pool
  const questions = useMemo(() => {
    return generateChineseRecallQuestions(words, allPoolWords, activeMode, Math.min(15, words.length));
  }, [words, allPoolWords, activeMode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ: ChineseRecallQuestion | undefined = questions[currentIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQ) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctOptionIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      if (onCompleteSession) {
        onCompleteSession({ correctCount: score + (selectedOption === currentQ?.correctOptionIndex ? 1 : 0), totalCount: questions.length });
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsCompleted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-red-50/50 via-amber-50/30 to-slate-50/50 dark:from-slate-800/40 dark:to-slate-800/20">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-red-100 dark:bg-red-950/60 text-red-600 rounded-xl text-lg">
              🇨🇳
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Active Recall Tiếng Trung • 7 Chế Độ
              </h3>
              <p className="text-xs text-slate-500">
                Luyện trí nhớ chủ động theo chuẩn HSK 3.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Script Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setScriptMode('simplified')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  scriptMode === 'simplified' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-xs' : 'text-slate-400'
                }`}
              >
                Giản
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('traditional')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  scriptMode === 'traditional' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-xs' : 'text-slate-400'
                }`}
              >
                Phồn
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODE SELECTOR TABS */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 overflow-x-auto flex gap-1.5 scrollbar-none">
          {RECALL_MODES.map(m => (
            <button
              key={m.mode}
              type="button"
              onClick={() => {
                setActiveMode(m.mode);
                handleRestart();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeMode === m.mode
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="p-6">
          {isCompleted ? (
            /* COMPLETED SCREEN */
            <div className="text-center py-8 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg text-3xl">
                🏆
              </div>

              <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  Hoàn Thành Phiên Active Recall!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Đã kiểm tra trí nhớ thành công với {questions.length} câu hỏi.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-xs mx-auto">
                <span className="text-xs font-bold text-slate-400 uppercase">Điểm chính xác</span>
                <div className="text-3xl font-black text-emerald-600 mt-1">
                  {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Làm lại lượt mới
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : currentQ ? (
            /* ACTIVE QUESTION VIEW */
            <div className="space-y-6">
              
              {/* Question progress */}
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Câu {currentIndex + 1} / {questions.length}</span>
                <span>Chính xác: {score} câu</span>
              </div>

              {/* Central Prompt Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                
                {/* Audio button if relevant */}
                {(activeMode === 'audio_to_hanzi' || activeMode === 'hanzi_to_meaning' || activeMode === 'hanzi_to_pinyin') && (
                  <button
                    type="button"
                    onClick={() => speakWord(currentQ.answer || currentQ.prompt, 'zh-CN')}
                    className="p-3 rounded-2xl bg-red-100 hover:bg-red-200 dark:bg-red-950/60 text-red-600 transition cursor-pointer inline-flex items-center justify-center shadow-xs"
                    title="Phát âm tiếng Trung chuẩn"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                )}

                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-wide">
                  {currentQ.prompt}
                </h2>

                {currentQ.promptSub && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {currentQ.promptSub}
                  </p>
                )}
              </div>

              {/* Multiple Choice Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQ.options?.map((opt, idx) => {
                  let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
                  
                  if (isAnswered) {
                    if (idx === currentQ.correctOptionIndex) {
                      btnStyle = 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                    } else if (idx === selectedOption) {
                      btnStyle = 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200';
                    } else {
                      btnStyle = 'opacity-40 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-4 rounded-2xl border text-left text-sm font-semibold transition cursor-pointer ${btnStyle}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{opt}</span>
                        {isAnswered && idx === currentQ.correctOptionIndex && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feedback and Next CTA */}
              {isAnswered && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150">
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      {selectedOption === currentQ.correctOptionIndex ? '✓ Hoàn toàn chính xác!' : '✕ Chưa chính xác!'}
                    </span>
                    <span className="text-slate-500">
                      Đáp án đúng: <strong>{currentQ.answer}</strong> {currentQ.pinyinAnswer ? `(${currentQ.pinyinAnswer})` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span>{currentIndex + 1 < questions.length ? 'Câu tiếp' : 'Xem kết quả'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
