import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Volume2, Bookmark, CheckCircle2, 
  Clock, Brain, Eye, ChevronLeft, ChevronRight, CheckSquare, 
  Square, Play, Sparkles, Layers, RotateCcw, BookOpen, Check,
  X, RefreshCw, Award
} from 'lucide-react';
import { 
  SystemJapaneseJlptWord, 
  UserWordProgress, 
  VocabCollection, 
  MasteryState,
  VocabWord,
  VocabUserData,
  speakWord,
  systemJapaneseWordToVocabWord 
} from '../../lib/vocabEngine';

interface JapaneseJlptTabProps {
  systemWords: SystemJapaneseJlptWord[];
  progressMap: Record<string, UserWordProgress>;
  collections: VocabCollection[];
  userData?: VocabUserData;
  onUpdateUserData?: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onOpenWordDetail: (word: VocabWord) => void;
  onOpenAddToCollection: (wordIds: string[]) => void;
  onStartStudyWords: (words: VocabWord[]) => void;
  onQuickMarkState: (wordId: string, state: MasteryState) => void;
}

const JLPT_LEVELS = [
  { label: 'Tất cả cấp độ (N5 - N1)', value: 0, tag: 'ALL' },
  { label: 'N5 (Sơ cấp 1 - Minna I)', value: 5, tag: 'N5' },
  { label: 'N4 (Sơ cấp 2 - Minna II)', value: 4, tag: 'N4' },
  { label: 'N3 (Trung cấp - Mimikara)', value: 3, tag: 'N3' },
  { label: 'N2 (Cao cấp - Mimikara)', value: 2, tag: 'N2' },
  { label: 'N1 (Thượng cấp - Mimikara)', value: 1, tag: 'N1' },
];

const POS_FILTERS = [
  { label: 'Tất cả từ loại', value: 'all' },
  { label: 'Danh từ', value: 'Danh từ' },
  { label: 'Động từ', value: 'Động từ' },
  { label: 'Tự động từ', value: 'Tự động từ' },
  { label: 'Tha động từ', value: 'Tha động từ' },
  { label: 'Tính từ đuôi -i', value: 'Tính từ đuôi -i' },
  { label: 'Tính từ đuôi -na', value: 'Tính từ đuôi -na' },
  { label: 'Phó từ', value: 'Phó từ' },
  { label: 'Cụm từ / Thành ngữ', value: 'Cụm từ' },
  { label: 'Liên từ / Trợ từ', value: 'Liên từ' },
];

const STATUS_FILTERS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: '🌱 Chưa học / Mới', value: 'new' },
  { label: '⚡ Đang học', value: 'learning' },
  { label: '✓ Đã thuộc vững', value: 'mastered' },
  { label: '⏰ Cần ôn hôm nay', value: 'due' },
  { label: '🔥 Hay quên', value: 'difficult' }
];

export function JapaneseJlptTab({
  systemWords = [],
  progressMap = {},
  collections = [],
  userData,
  onUpdateUserData,
  onOpenWordDetail,
  onOpenAddToCollection,
  onStartStudyWords,
  onQuickMarkState
}: JapaneseJlptTabProps) {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selection
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  // Flashcard Modal
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const today = new Date().toISOString().split('T')[0];

  // Filtered dataset
  const filteredWords = useMemo(() => {
    return systemWords.filter(item => {
      // 1. Level filter
      if (selectedLevel !== 0 && item.jlptLevel !== selectedLevel) {
        return false;
      }

      // 2. POS filter
      if (posFilter !== 'all') {
        if (!item.pos.toLowerCase().includes(posFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        const prog = progressMap[item.id];
        const state = prog?.state || 'new';

        if (statusFilter === 'due') {
          const isDue = prog && prog.nextReviewAt <= today && state !== 'mastered';
          if (!isDue) return false;
        } else if (statusFilter !== state) {
          return false;
        }
      }

      // 4. Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchTerm = item.term.toLowerCase().includes(q);
        const matchFurigana = (item.furigana || '').toLowerCase().includes(q);
        const matchHanViet = (item.hanViet || '').toLowerCase().includes(q);
        const matchMeaning = (item.meaning || '').toLowerCase().includes(q);
        const matchRomaji = (item.romaji || '').toLowerCase().includes(q);
        if (!matchTerm && !matchFurigana && !matchHanViet && !matchMeaning && !matchRomaji) {
          return false;
        }
      }

      return true;
    });
  }, [systemWords, selectedLevel, posFilter, statusFilter, search, progressMap, today]);

  // Pagination slice
  const totalPages = Math.ceil(filteredWords.length / pageSize) || 1;
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, currentPage]);

  // Statistics for JLPT
  const stats = useMemo(() => {
    const total = systemWords.length;
    let mastered = 0;
    let learning = 0;
    let due = 0;

    for (const w of systemWords) {
      const prog = progressMap[w.id];
      if (prog) {
        if (prog.state === 'mastered') mastered++;
        else if (prog.state === 'learning' || prog.state === 'reviewing') learning++;
        if (prog.nextReviewAt <= today && prog.state !== 'mastered') due++;
      }
    }

    return { total, mastered, learning, due };
  }, [systemWords, progressMap, today]);

  // Selection handlers
  const toggleSelectWord = (id: string) => {
    const next = new Set(selectedWordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedWordIds(next);
  };

  const selectAllPage = () => {
    const next = new Set(selectedWordIds);
    paginatedWords.forEach(w => next.add(w.id));
    setSelectedWordIds(next);
  };

  const deselectAll = () => {
    setSelectedWordIds(new Set());
  };

  // Convert selected or filtered words to VocabWord
  const handleStartStudySelected = () => {
    const wordsToStudy: VocabWord[] = [];
    if (selectedWordIds.size > 0) {
      systemWords
        .filter(w => selectedWordIds.has(w.id))
        .forEach(w => wordsToStudy.push(systemJapaneseWordToVocabWord(w, progressMap[w.id])));
    } else {
      paginatedWords.forEach(w => wordsToStudy.push(systemJapaneseWordToVocabWord(w, progressMap[w.id])));
    }
    if (wordsToStudy.length > 0) {
      onStartStudyWords(wordsToStudy);
    }
  };

  const handleOpenFlashcards = () => {
    if (filteredWords.length === 0) return;
    setFlashcardIndex(0);
    setIsFlipped(false);
    setShowFlashcardModal(true);
  };

  const currentFlashcard = filteredWords[flashcardIndex];

  return (
    <div className="space-y-6">
      
      {/* 1. HERO STATS BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/60 via-slate-900/90 to-teal-950/80 border border-emerald-500/30 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl p-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/30">🇯🇵</span>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Kho Từ Vựng Tiếng Nhật JLPT
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                    N5 → N1
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Chuẩn hóa theo giáo trình <span className="text-emerald-400 font-bold">Minna no Nihongo</span> (N5, N4) & <span className="text-teal-300 font-bold">Mimikara Oboeru</span> (N3, N2, N1) với 100% âm Hán Việt và nghĩa tiếng Việt chuẩn xác.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-3 bg-slate-950/50 p-3.5 rounded-2xl border border-emerald-500/20 backdrop-blur-md">
            <div className="text-center px-2">
              <span className="text-xs text-slate-400 font-medium block">Tổng số</span>
              <span className="text-base sm:text-lg font-black text-white">{stats.total.toLocaleString()}</span>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <span className="text-xs text-emerald-400 font-medium block">Thuộc vững</span>
              <span className="text-base sm:text-lg font-black text-emerald-400">{stats.mastered}</span>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <span className="text-xs text-amber-400 font-medium block">Đang học</span>
              <span className="text-base sm:text-lg font-black text-amber-400">{stats.learning}</span>
            </div>
            <div className="text-center px-2 border-l border-slate-800">
              <span className="text-xs text-rose-400 font-medium block">Cần ôn</span>
              <span className="text-base sm:text-lg font-black text-rose-400">{stats.due}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-emerald-500/20">
          <button
            type="button"
            onClick={handleOpenFlashcards}
            className="btn-squishy px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Brain className="w-4 h-4 text-slate-950" />
            <span>Luyện Thẻ Ghi Nhớ (Flashcards)</span>
          </button>

          <button
            type="button"
            onClick={handleStartStudySelected}
            className="btn-squishy px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 border border-emerald-500/30 cursor-pointer"
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Học ngay {selectedWordIds.size > 0 ? `(${selectedWordIds.size} từ đã chọn)` : `(Trang hiện tại)`}</span>
          </button>

          {selectedWordIds.size > 0 && (
            <button
              type="button"
              onClick={() => onOpenAddToCollection(Array.from(selectedWordIds))}
              className="btn-squishy px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-purple-500/30 cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span>Thêm {selectedWordIds.size} từ vào Bộ sưu tập</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. JLPT LEVEL FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {JLPT_LEVELS.map(lvl => (
          <button
            key={lvl.value}
            type="button"
            onClick={() => { setSelectedLevel(lvl.value); setCurrentPage(1); }}
            className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
              selectedLevel === lvl.value
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            {lvl.label}
          </button>
        ))}
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
        
        {/* Search Input */}
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Tra cứu Kanji, Hiragana, Âm Hán Việt, Nghĩa tiếng Việt..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* POS filter */}
        <div className="md:col-span-3">
          <select
            value={posFilter}
            onChange={(e) => { setPosFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            {POS_FILTERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            {STATUS_FILTERS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. SELECTION BAR & COUNT */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={selectedWordIds.size === paginatedWords.length ? deselectAll : selectAllPage}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            {selectedWordIds.size === paginatedWords.length && paginatedWords.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Chọn trang này</span>
          </button>
          {selectedWordIds.size > 0 && (
            <span className="text-emerald-400 font-bold">
              (Đã chọn {selectedWordIds.size} từ)
            </span>
          )}
        </div>
        <span>
          Hiển thị <span className="font-bold text-white">{filteredWords.length.toLocaleString()}</span> từ vựng
        </span>
      </div>

      {/* 5. VOCABULARY CARDS GRID */}
      {paginatedWords.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800">
          <p className="text-slate-400 text-sm">Không tìm thấy từ vựng nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedWords.map(word => {
            const prog = progressMap[word.id];
            const state: MasteryState = prog?.state || 'new';
            const isSelected = selectedWordIds.has(word.id);

            return (
              <div
                key={word.id}
                className={`group relative p-4 rounded-2xl transition-all duration-200 border backdrop-blur-md ${
                  isSelected 
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 hover:border-emerald-500/30'
                }`}
              >
                {/* Top header row: Checkbox, Level pill, POS, State */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectWord(word.id)}
                      className="cursor-pointer text-slate-500 hover:text-emerald-400 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-400/20">
                      {word.level}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[100px]">
                      {word.pos}
                    </span>
                  </div>

                  {/* Audio button */}
                  <button
                    type="button"
                    onClick={() => speakWord(word.furigana || word.term, 'ja-JP')}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
                    title="Phát âm tiếng Nhật chuẩn"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Term & Furigana & Hán Việt */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-2">
                    <ruby className="text-xl sm:text-2xl font-black text-white tracking-wide">
                      {word.term}
                      {word.furigana && word.furigana !== word.term && (
                        <rt className="text-[11px] font-medium text-emerald-400">{word.furigana}</rt>
                      )}
                    </ruby>
                  </div>
                  
                  {/* Hán Việt badge */}
                  {word.hanViet && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        {word.hanViet}
                      </span>
                    </div>
                  )}
                </div>

                {/* Vietnamese Meaning */}
                <p className="text-xs sm:text-sm font-semibold text-slate-200 line-clamp-2 leading-relaxed mb-3">
                  {word.meaning}
                </p>

                {/* Example sentence if available */}
                {word.exampleSentence && (
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3 text-[11px] text-slate-400">
                    <p className="text-slate-300 font-medium">{word.exampleSentence}</p>
                    {word.exampleTranslation && (
                      <p className="text-slate-500 mt-0.5">{word.exampleTranslation}</p>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  {/* Quick state selector */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onQuickMarkState(word.id, 'new')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        state === 'new' ? 'bg-slate-800 text-slate-300' : 'text-slate-500 hover:text-slate-300'
                      }`}
                      title="Mới"
                    >
                      Mới
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickMarkState(word.id, 'learning')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        state === 'learning' || state === 'reviewing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-amber-400'
                      }`}
                      title="Đang học"
                    >
                      Đang học
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickMarkState(word.id, 'mastered')}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        state === 'mastered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-emerald-400'
                      }`}
                      title="Thuộc vững"
                    >
                      Thuộc
                    </button>
                  </div>

                  {/* Bookmark into personal collection */}
                  <button
                    type="button"
                    onClick={() => onOpenAddToCollection([word.id])}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors cursor-pointer"
                    title="Thêm vào bộ sưu tập cá nhân"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="btn-squishy px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Trước
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Trang <span className="font-bold text-white">{currentPage}</span> / <span className="text-white">{totalPages}</span>
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="btn-squishy px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 7. FLASHCARDS ACTIVE RECALL MODAL */}
      {showFlashcardModal && currentFlashcard && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-400/30">
                  {currentFlashcard.level}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Thẻ {flashcardIndex + 1} / {filteredWords.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFlashcardModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flashcard Card Area (Flip on click) */}
            <div 
              onClick={() => setIsFlipped(prev => !prev)}
              className="min-h-[220px] p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:border-emerald-400/50 shadow-inner group"
            >
              {!isFlipped ? (
                // FRONT OF CARD: Kanji + Audio
                <div className="space-y-3">
                  <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">
                    Nhật Bản (Kanji)
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-wider">
                    {currentFlashcard.term}
                  </h2>
                  <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    💡 Chạm vào thẻ để lật xem cách đọc & nghĩa tiếng Việt
                  </p>
                </div>
              ) : (
                // BACK OF CARD: Furigana + Hán Việt + Meaning
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg text-emerald-400 font-bold">
                      {currentFlashcard.furigana}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speakWord(currentFlashcard.furigana || currentFlashcard.term, 'ja-JP');
                      }}
                      className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {currentFlashcard.hanViet && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Âm Hán Việt: {currentFlashcard.hanViet}
                    </span>
                  )}

                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {currentFlashcard.meaning}
                  </h3>

                  {currentFlashcard.pos && (
                    <p className="text-xs text-slate-400">
                      Từ loại: {currentFlashcard.pos}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Navigation & SM-2 Rating Row */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={flashcardIndex <= 0}
                  onClick={() => {
                    setFlashcardIndex(prev => Math.max(0, prev - 1));
                    setIsFlipped(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Trước
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(prev => !prev)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer border border-emerald-500/30"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Lật thẻ
                </button>

                <button
                  type="button"
                  disabled={flashcardIndex >= filteredWords.length - 1}
                  onClick={() => {
                    setFlashcardIndex(prev => Math.min(filteredWords.length - 1, prev + 1));
                    setIsFlipped(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  Tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* SM-2 Quick Rating Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onQuickMarkState(currentFlashcard.id, 'difficult');
                    if (flashcardIndex < filteredWords.length - 1) {
                      setFlashcardIndex(prev => prev + 1);
                      setIsFlipped(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/20 cursor-pointer"
                >
                  Quên 😣
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickMarkState(currentFlashcard.id, 'learning');
                    if (flashcardIndex < filteredWords.length - 1) {
                      setFlashcardIndex(prev => prev + 1);
                      setIsFlipped(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-xs font-bold border border-amber-500/20 cursor-pointer"
                >
                  Khó 😐
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickMarkState(currentFlashcard.id, 'learning');
                    if (flashcardIndex < filteredWords.length - 1) {
                      setFlashcardIndex(prev => prev + 1);
                      setIsFlipped(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/25 text-blue-300 text-xs font-bold border border-blue-500/20 cursor-pointer"
                >
                  Nhớ 🙂
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickMarkState(currentFlashcard.id, 'mastered');
                    if (flashcardIndex < filteredWords.length - 1) {
                      setFlashcardIndex(prev => prev + 1);
                      setIsFlipped(false);
                    }
                  }}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/20 cursor-pointer"
                >
                  Dễ 😄
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
