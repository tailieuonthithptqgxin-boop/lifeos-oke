import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, X, Volume2, Star, Lightbulb, Pin, Play, Plus, BookOpen,
  Check, Sparkles, Layers, ArrowRight
} from 'lucide-react';
import {
  VocabWord,
  VocabCollection,
  LearningLanguage,
  VocabUserData,
  speakWord,
  searchAllDictionaries,
  toggleUniversalFavorite,
  toggleWordDifficult,
  toggleWordReviewLater,
  addToLearningQueue,
  toggleBookmarkSystemWord
} from '../../lib/vocabEngine';
import { useAppStore } from '../../lib/store';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLang: LearningLanguage;
  collections: VocabCollection[];
  userData: VocabUserData;
  onUpdateUserData: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onStartStudySingle: (word: VocabWord) => void;
  onOpenWordDetail: (word: VocabWord) => void;
}

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  activeLang,
  collections = [],
  userData,
  onUpdateUserData,
  onStartStudySingle,
  onOpenWordDetail
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [query, setQuery] = useState('');
  const [selectedWordForCol, setSelectedWordForCol] = useState<VocabWord | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  const [addedQueueWords, setAddedQueueWords] = useState<Set<string>>(new Set());

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return searchAllDictionaries(query, activeLang.id, 40);
  }, [query, activeLang.id]);

  if (!isOpen) return null;

  const handleSpeech = (e: React.MouseEvent, word: VocabWord) => {
    e.stopPropagation();
    const isJa = activeLang.id === 'ja';
    const isZh = activeLang.id === 'zh';
    const voice = activeLang.speechVoiceCode || (isJa ? 'ja-JP' : isZh ? 'zh-CN' : 'en-US');
    const textToSpeak = isJa && word.furigana ? word.furigana : word.term;
    speakWord(textToSpeak, voice);
  };

  const handleAddToQueue = (wordId: string) => {
    onUpdateUserData(prev => addToLearningQueue(prev, [wordId]));
    setAddedQueueWords(prev => new Set(prev).add(wordId));
    setTimeout(() => {
      setAddedQueueWords(prev => {
        const next = new Set(prev);
        next.delete(wordId);
        return next;
      });
    }, 2000);
  };

  const handleAddToCollection = (colId: string) => {
    if (!selectedWordForCol) return;
    onUpdateUserData(prev => toggleBookmarkSystemWord(prev, selectedWordForCol.id, colId));
    setSelectedWordForCol(null);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        
        {/* Modal Header & Search Input */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                <Search className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {isVi ? 'Tìm kiếm từ vựng toàn năng' : 'Universal Vocabulary Search'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isVi 
                    ? `Tra cứu tức thì trong kho ${activeLang.name} (Oxford / HSK / JLPT & từ cá nhân)` 
                    : `Instant dictionary lookup across ${activeLang.name}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isVi ? 'Gõ từ tiếng Anh, Hán tự, Pinyin, Hiragana, Kanji hoặc nghĩa tiếng Việt...' : 'Type term, pinyin, furigana, or meaning...'}
              className="w-full pl-10 pr-9 py-2.5 text-sm font-semibold rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
          {!query.trim() ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-purple-400 stroke-1" />
              <p className="font-semibold text-slate-500 dark:text-slate-400">
                {isVi ? 'Nhập từ khóa để tìm kiếm xuyên suốt toàn bộ kho từ vựng' : 'Enter keywords to search across all vocabularies'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isVi 
                  ? 'Tìm theo từ vựng gốc, phiên âm, âm Hán Việt hoặc nghĩa tiếng Việt.' 
                  : 'Search by source term, phonetic, reading, or translation.'}
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <p className="font-bold text-slate-600 dark:text-slate-300">
                {isVi ? `Không tìm thấy từ nào khớp với "${query}"` : `No words found matching "${query}"`}
              </p>
              <p className="text-[11px]">
                {isVi ? 'Thử gõ dạng không dấu hoặc từ đồng nghĩa.' : 'Try different spelling or synonyms.'}
              </p>
            </div>
          ) : (
            searchResults.map(({ word }) => {
              const inQueue = addedQueueWords.has(word.id);

              return (
                <div
                  key={word.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-purple-300 dark:hover:border-purple-800 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Term details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-900 dark:text-white text-base">
                        {word.term}
                      </h4>
                      {(word.phonetic || word.furigana || word.hanViet) && (
                        <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold">
                          [{word.furigana || word.phonetic || word.hanViet}]
                        </span>
                      )}
                      {word.partOfSpeech && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                          {word.partOfSpeech}
                        </span>
                      )}
                      {word.tags && word.tags.map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                          {t}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {word.meaning}
                    </p>

                    {word.exampleSentence && (
                      <p className="text-[11px] text-slate-400 italic line-clamp-1">
                        "{word.exampleSentence}"
                      </p>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={(e) => handleSpeech(e, word)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 transition cursor-pointer"
                      title={isVi ? 'Phát âm' : 'Pronounce'}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateUserData(prev => toggleUniversalFavorite(prev, word.id))}
                      className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 transition cursor-pointer ${
                        word.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-amber-500'
                      }`}
                      title={isVi ? 'Yêu thích ⭐' : 'Favorite ⭐'}
                    >
                      <Star className={`w-4 h-4 ${word.isFavorite ? 'fill-current' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToQueue(word.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        inQueue
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                      title={isVi ? 'Thêm vào hàng đợi học' : 'Add to queue'}
                    >
                      {inQueue ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{inQueue ? (isVi ? 'Đã thêm' : 'Added') : (isVi ? 'Hàng đợi' : 'Queue')}</span>
                    </button>

                    {collections.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedWordForCol(word)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                        title={isVi ? 'Thêm vào bộ sưu tập' : 'Add to set'}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isVi ? 'Bộ từ' : 'Set'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartStudySingle(word);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isVi ? 'Học ngay' : 'Learn'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal footer / Quick add to collection popup overlay */}
        {selectedWordForCol && (
          <div className="p-4 bg-purple-50 dark:bg-slate-800 border-t border-purple-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
              {isVi ? `Thêm từ "${selectedWordForCol.term}" vào bộ sưu tập:` : `Add "${selectedWordForCol.term}" to collection:`}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {collections.map(col => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleAddToCollection(col.id)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-purple-100 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-purple-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                >
                  <span>{col.icon || '📚'}</span>
                  <span>{col.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedWordForCol(null)}
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
