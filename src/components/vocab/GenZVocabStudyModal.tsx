import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import {
  X, Volume2, Sparkles, Check, RotateCcw,
  Zap, BookOpen, Layers, Edit3, ArrowRight, Eye, HelpCircle
} from 'lucide-react';
import { OXFORD_3000_WORDS, System3000Word } from '../../lib/vocabEngine';
import { createInitialFSRSItem, processFSRSReview, FSRSRating } from '../../utils/fsrs';
import { SpeedMatchGameModal } from './SpeedMatchGameModal';

interface GenZVocabStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'flashcard' | 'cloze' | 'speed_match' | 'dictation';
}

export function GenZVocabStudyModal({ isOpen, onClose, initialMode = 'flashcard' }: GenZVocabStudyModalProps) {
  const { addXp, addCoins } = useAppStore() as any;
  const [activeMode, setActiveMode] = useState<'flashcard' | 'cloze' | 'speed_match' | 'dictation'>(initialMode);
  const [wordList, setWordList] = useState<System3000Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Flashcard states
  const [isFlipped, setIsFlipped] = useState(false);

  // Cloze test states
  const [clozeInput, setClozeInput] = useState('');
  const [clozeIsCorrect, setClozeIsCorrect] = useState<boolean | null>(null);

  // Dictation & Sentence Builder states
  const [dictationInput, setDictationInput] = useState('');
  const [sentenceInput, setSentenceInput] = useState('');
  const [sentenceValidationMsg, setSentenceValidationMsg] = useState<{ valid: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Pick 15 random words from Oxford 3000
      const shuffled = [...OXFORD_3000_WORDS].sort(() => 0.5 - Math.random());
      setWordList(shuffled.slice(0, 15));
      setCurrentIndex(0);
      setIsFlipped(false);
      setClozeInput('');
      setClozeIsCorrect(null);
      setDictationInput('');
      setSentenceInput('');
      setSentenceValidationMsg(null);
    }
  }, [isOpen]);

  const currentWord = wordList[currentIndex];

  if (!isOpen || !currentWord) return null;

  const playSpeech = (text?: string) => {
    const term = text || currentWord.term;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(term);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    }
  };

  const handleNextWord = () => {
    soundEngine.playPop();
    setIsFlipped(false);
    setClozeInput('');
    setClozeIsCorrect(null);
    setDictationInput('');
    setSentenceInput('');
    setSentenceValidationMsg(null);
    if (currentIndex + 1 < wordList.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      triggerConfetti({ particleCount: 40 });
      soundEngine.playCelebration();
      onClose();
    }
  };

  // FSRS Rating Handler
  const handleFSRSRating = (rating: FSRSRating) => {
    soundEngine.playPop();
    const fsrs = createInitialFSRSItem(currentWord.id);
    const reviewResult = processFSRSReview(fsrs, rating);

    // Save to user storage
    try {
      const progressKey = 'lifeos_fsrs_progress';
      const stored = JSON.parse(localStorage.getItem(progressKey) || '{}');
      stored[currentWord.id] = reviewResult;
      localStorage.setItem(progressKey, JSON.stringify(stored));
    } catch {}

    if (rating >= 3) {
      if (typeof addXp === 'function') addXp(15);
      if (typeof addCoins === 'function') addCoins(2);
    }

    handleNextWord();
  };

  // Cloze submit verification
  const handleCheckCloze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = clozeInput.trim().toLowerCase();
    const cleanWord = currentWord.term.trim().toLowerCase();

    if (cleanInput === cleanWord) {
      setClozeIsCorrect(true);
      soundEngine.playPop();
      triggerConfetti({ particleCount: 25 });
      if (typeof addXp === 'function') addXp(20);
      setTimeout(handleNextWord, 1200);
    } else {
      setClozeIsCorrect(false);
      soundEngine.playPop();
    }
  };

  // Regex Sentence Builder Validator (Zero-AI, 100% Deterministic)
  const handleVerifySentence = () => {
    const s = sentenceInput.trim();
    if (!s) {
      setSentenceValidationMsg({ valid: false, msg: 'Vui lòng gõ câu hoàn chỉnh.' });
      return;
    }

    // Check sentence capitalization
    if (!/^[A-ZÀ-Ỹ]/.test(s)) {
      setSentenceValidationMsg({ valid: false, msg: 'Câu phải bắt đầu bằng chữ hoa (Capitalized).' });
      return;
    }

    // Check sentence ending punctuation (.!?)
    if (!/[.!?]$/.test(s)) {
      setSentenceValidationMsg({ valid: false, msg: 'Câu phải kết thúc bằng dấu câu (. ? hoặc !).' });
      return;
    }

    // Check length (at least 4 words)
    const wordsInSentence = s.split(/\s+/).length;
    if (wordsInSentence < 4) {
      setSentenceValidationMsg({ valid: false, msg: 'Câu phải có ít nhất 4 từ để tạo ngữ cảnh rõ ràng.' });
      return;
    }

    // Check presence of target word or common inflections (-s, -es, -ed, -ing, -d)
    const stem = currentWord.term.toLowerCase().replace(/e$/, '');
    const wordPattern = new RegExp(`\\b(${currentWord.term}|${stem}ing|${stem}ed|${currentWord.term}s|${currentWord.term}es)\\b`, 'i');
    if (!wordPattern.test(s)) {
      setSentenceValidationMsg({
        valid: false,
        msg: `Câu phải chứa từ vựng "${currentWord.term}" hoặc dạng biến thể của từ.`
      });
      return;
    }

    // Passed!
    setSentenceValidationMsg({
      valid: true,
      msg: 'Xuất sắc! Câu văn đúng ngữ pháp và sử dụng chính xác từ vựng (+25 XP).'
    });
    soundEngine.playPop();
    triggerConfetti({ particleCount: 30 });
    if (typeof addXp === 'function') addXp(25);
    if (typeof addCoins === 'function') addCoins(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Mode Switcher */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Phòng Luyện Từ Vựng Gen Z
              </h3>
              <p className="text-[11px] text-slate-400">
                Từ {currentIndex + 1} / {wordList.length} · Thuật toán FSRS v4
              </p>
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

        {/* 4 Gamified Mode Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-100/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => { setActiveMode('flashcard'); soundEngine.playPop(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMode === 'flashcard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            🎴 3D Flashcard
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('cloze'); soundEngine.playPop(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMode === 'cloze'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📝 Điền khuyết Cloze
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('speed_match'); soundEngine.playPop(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMode === 'speed_match'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ⚡ Nối từ 60s
          </button>
          <button
            type="button"
            onClick={() => { setActiveMode('dictation'); soundEngine.playPop(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMode === 'dictation'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ✍️ Nghe chép & Đặt câu
          </button>
        </div>

        {/* Mode Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* MODE 1: 3D FLASHCARD */}
          {activeMode === 'flashcard' && (
            <div className="space-y-4">
              <div
                onClick={() => { setIsFlipped(!isFlipped); soundEngine.playPop(); }}
                className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-indigo-50/20 dark:from-slate-850 dark:to-indigo-950/20 p-8 min-h-[260px] flex flex-col items-center justify-center text-center cursor-pointer shadow-sm hover:shadow-md transition-all select-none group"
              >
                {!isFlipped ? (
                  /* Front Side */
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {currentWord.pos || 'vocabulary'}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                      {currentWord.term}
                    </h2>
                    <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                      {currentWord.phonetic || `/${currentWord.term}/`}
                    </p>
                    <p className="text-xs text-slate-400 pt-4 flex items-center justify-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Chạm để lật mặt sau
                    </p>
                  </div>
                ) : (
                  /* Back Side */
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                      Định nghĩa tiếng Việt
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentWord.meaning}
                    </p>
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic">
                      &ldquo;The {currentWord.term} plays a key role in our daily routine.&rdquo;
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    playSpeech();
                  }}
                  className="absolute bottom-4 right-4 p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:scale-110 active:scale-95 transition-all"
                  title="Phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* FSRS Rating Buttons */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-2.5">
                  Đánh giá độ nhớ (FSRS Scheduler)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFSRSRating(1)}
                    className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs border border-red-500/20 transition-all cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span>🔴 Quên</span>
                    <span className="text-[9px] font-normal opacity-70">1 ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFSRSRating(2)}
                    className="p-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs border border-amber-500/20 transition-all cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span>🟡 Khó</span>
                    <span className="text-[9px] font-normal opacity-70">2 ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFSRSRating(3)}
                    className="p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-xs border border-emerald-500/20 transition-all cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span>🟢 Nhớ</span>
                    <span className="text-[9px] font-normal opacity-70">4 ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFSRSRating(4)}
                    className="p-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-bold text-xs border border-indigo-500/20 transition-all cursor-pointer flex flex-col items-center gap-0.5"
                  >
                    <span>⚡ Quá dễ</span>
                    <span className="text-[9px] font-normal opacity-70">7+ ngày</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: CONTEXTUAL CLOZE */}
          {activeMode === 'cloze' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                    Điền khuyết ngữ cảnh
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Độ dài: {currentWord.term.length} ký tự
                  </span>
                </div>

                <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                  Ý nghĩa: <strong className="text-emerald-500">{currentWord.meaning}</strong>
                </p>

                {/* Cloze prompt with blanks e.g. s______y */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center font-mono text-lg font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                  {currentWord.term[0]}
                  {'_'.repeat(Math.max(1, currentWord.term.length - 2))}
                  {currentWord.term.length > 2 ? currentWord.term[currentWord.term.length - 1] : ''}
                </div>
              </div>

              <form onSubmit={handleCheckCloze} className="space-y-3">
                <input
                  type="text"
                  value={clozeInput}
                  onChange={e => setClozeInput(e.target.value)}
                  placeholder={`Gõ từ hoàn chỉnh (${currentWord.term.length} chữ cái)...`}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />

                {clozeIsCorrect === false && (
                  <p className="text-xs text-rose-500 font-medium">
                    Chưa chính xác. Gợi ý: từ có {currentWord.term.length} chữ cái bắt đầu bằng &ldquo;{currentWord.term[0]}&rdquo;.
                  </p>
                )}

                {clozeIsCorrect === true && (
                  <p className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Chính xác tuyệt đối! +20 XP
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
                  >
                    Kiểm tra đáp án
                  </button>
                  <button
                    type="button"
                    onClick={() => playSpeech()}
                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold"
                  >
                    Nghe gợi ý
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE 3: SPEED MATCH 60s */}
          {activeMode === 'speed_match' && (
            <div className="py-6 text-center space-y-4">
              <Zap className="w-12 h-12 text-amber-500 mx-auto fill-current" />
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                Sẵn sàng nối từ 60 giây?
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Ghép nhanh các cặp từ tiếng Anh và nghĩa tương ứng để kích hoạt chuỗi combo XP và Coins cực lớn!
              </p>
              <button
                type="button"
                onClick={() => {
                  // Switch to embedded SpeedMatch
                  onClose();
                  window.dispatchEvent(new CustomEvent('lifeos:open-speed-match'));
                }}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                Bắt đầu ngay ⚡
              </button>
            </div>
          )}

          {/* MODE 4: DICTATION & SENTENCE BUILDER */}
          {activeMode === 'dictation' && (
            <div className="space-y-4">
              {/* Dictation Box */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Phần 1: Nghe chép chính tả (Dictation)
                  </span>
                  <button
                    type="button"
                    onClick={() => playSpeech()}
                    className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Nghe lại
                  </button>
                </div>
                <input
                  type="text"
                  value={dictationInput}
                  onChange={e => setDictationInput(e.target.value)}
                  placeholder="Nghe và gõ lại đúng từ vựng..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Sentence Builder Box */}
              <div className="p-4 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 space-y-2">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                  Phần 2: Đặt câu với từ &ldquo;{currentWord.term}&rdquo;
                </span>
                <p className="text-[11px] text-slate-400">
                  Quy tắc: Viết hoa đầu câu, kết thúc bằng dấu chấm, có ít nhất 4 từ và chứa từ vựng.
                </p>
                <textarea
                  value={sentenceInput}
                  onChange={e => setSentenceInput(e.target.value)}
                  placeholder={`VD: She has a strong ${currentWord.term} when working under pressure.`}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white resize-none"
                />

                {sentenceValidationMsg && (
                  <p
                    className={`text-xs font-medium ${
                      sentenceValidationMsg.valid ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {sentenceValidationMsg.msg}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleVerifySentence}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Kiểm tra câu văn (Regex Validator)
                  </button>
                  <button
                    type="button"
                    onClick={handleNextWord}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Bỏ qua từ này
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
