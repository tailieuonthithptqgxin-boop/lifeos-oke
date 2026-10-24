import React, { useState, useEffect } from 'react';
import { fetchWordData, PublicWordData } from '../../lib/dictionaryApi';
import { useAppStore } from '../../lib/store';
import { soundEngine } from '../../lib/soundEngine';
import { triggerConfetti } from '../../lib/confetti';
import {
  Search, Volume2, Sparkles, X, Check, Loader2, BookOpen,
  Image as ImageIcon, HelpCircle, ArrowRight
} from 'lucide-react';
import { createInitialFSRSItem } from '../../utils/fsrs';

interface ZeroEffortIngestionModalProps {
  initialWord?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ZeroEffortIngestionModal({ initialWord = '', isOpen, onClose }: ZeroEffortIngestionModalProps) {
  const { addWord, words = [] } = useAppStore();
  const [searchTerm, setSearchTerm] = useState(initialWord);
  const [isLoading, setIsLoading] = useState(false);
  const [wordData, setWordData] = useState<PublicWordData | null>(null);
  const [selectedGifIndex, setSelectedGifIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (initialWord) {
      setSearchTerm(initialWord);
      handleSearch(initialWord);
    }
  }, [initialWord]);

  if (!isOpen) return null;

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch || searchTerm).trim();
    if (!term) return;

    setIsLoading(true);
    setErrorMsg(null);
    setWordData(null);
    try {
      const data = await fetchWordData(term);
      setWordData(data);
      setSelectedGifIndex(0);
      soundEngine.playPop();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Không thể tải thông tin từ vựng');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (wordData?.audioUrl) {
      const audio = new Audio(wordData.audioUrl);
      audio.play().catch(() => playSpeech());
    } else {
      playSpeech();
    }
  };

  const playSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && wordData?.word) {
      const utter = new SpeechSynthesisUtterance(wordData.word);
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    }
  };

  const handleSaveWord = () => {
    if (!wordData) return;

    soundEngine.playPop();
    const fsrs = createInitialFSRSItem(`word_${Date.now()}`);

    const newWord = {
      id: fsrs.id,
      term: wordData.word,
      phonetic: wordData.phonetic,
      meaning: wordData.definition,
      pos: wordData.partOfSpeech,
      exampleSentence: wordData.exampleSentence,
      synonyms: wordData.synonyms,
      imageUrl: wordData.gifs[selectedGifIndex] || wordData.gifs[0],
      audioUrl: wordData.audioUrl,
      fsrs,
      createdAt: new Date().toISOString()
    };

    if (typeof addWord === 'function') {
      addWord(newWord);
    } else {
      // Store into localStorage as backup
      try {
        const saved = JSON.parse(localStorage.getItem('lifeos_custom_vocab') || '[]');
        saved.unshift(newWord);
        localStorage.setItem('lifeos_custom_vocab', JSON.stringify(saved));
      } catch {}
    }

    triggerConfetti({ particleCount: 35 });
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nạp Từ Tự Động (Zero-Effort Ingestion)
              </h3>
              <p className="text-[11px] text-slate-400">
                Free Dictionary + Datamuse + Giphy Meme (0ms Zero-AI)
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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Gõ từ tiếng Anh (VD: serendipity, resilient, ephemeral)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 border border-transparent focus:border-emerald-500 focus:outline-none transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchTerm.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tra ngay'}
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs border border-rose-500/20">
              {errorMsg}
            </div>
          )}

          {wordData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Word Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                      {wordData.word}
                    </h2>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {wordData.partOfSpeech}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {wordData.phonetic}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={playAudio}
                  className="p-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Phát âm Audio"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Phát âm</span>
                </button>
              </div>

              {/* Definition */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Định nghĩa & Ý nghĩa
                </p>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  {wordData.definition}
                </p>
              </div>

              {/* Example Sentence */}
              {wordData.exampleSentence && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                    Câu ví dụ thực tế
                  </p>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                    &ldquo;{wordData.exampleSentence}&rdquo;
                  </p>
                </div>
              )}

              {/* Synonyms */}
              {wordData.synonyms.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Từ đồng nghĩa (Datamuse)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {wordData.synonyms.map((s, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        #{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gen Z Meme / Visual GIF Selection */}
              {wordData.gifs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-pink-500" />
                      Meme Visual Recall (Chọn 1 ảnh giúp ghi nhớ lâu)
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {wordData.gifs.map((gif, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedGifIndex(idx)}
                        className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                          selectedGifIndex === idx
                            ? 'border-emerald-500 ring-2 ring-emerald-400/40 scale-102'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={gif}
                          alt="Vocab meme"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {selectedGifIndex === idx && (
                          <div className="absolute top-1 right-1 p-0.5 rounded-full bg-emerald-500 text-white">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!wordData && !isLoading && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">
                Gõ bất kỳ từ vựng nào để nạp dữ liệu từ điển, phát âm và ảnh GIF tự động
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {wordData && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
            <span className="text-[11px] text-slate-400">
              Thuật toán FSRS v4 tự động xếp lịch ôn
            </span>
            <button
              type="button"
              onClick={handleSaveWord}
              disabled={successToast}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {successToast ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              <span>{successToast ? 'Đã lưu thành công!' : 'Lưu vào kho từ vựng (FSRS)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
