import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Volume2, Bookmark, CheckCircle2, 
  Clock, Brain, Eye, ChevronLeft, ChevronRight, CheckSquare, 
  Square, Play, Sparkles, AlertTriangle, Layers, Plus, 
  RotateCcw, BookOpen, Check
} from 'lucide-react';
import { 
  System3000Word, 
  UserWordProgress, 
  VocabCollection, 
  MasteryState,
  VocabWord,
  getSystem3000Words, 
  speakWord,
  systemWordToVocabWord 
} from '../../lib/vocabEngine';

interface Oxford3000TabProps {
  systemWords: System3000Word[];
  progressMap: Record<string, UserWordProgress>;
  collections: VocabCollection[];
  onOpenWordDetail: (word: VocabWord) => void;
  onOpenAddToCollection: (wordIds: string[]) => void;
  onStartStudyWords: (words: VocabWord[]) => void;
  onQuickMarkState: (wordId: string, state: MasteryState) => void;
}

const ALPHABET = ['TẤT CẢ', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

const POS_FILTERS = [
  { label: 'Tất cả từ loại', value: 'all' },
  { label: 'Danh từ (n.)', value: 'n.' },
  { label: 'Động từ (v.)', value: 'v.' },
  { label: 'Tính từ (adj.)', value: 'adj.' },
  { label: 'Trạng từ (adv.)', value: 'adv.' },
  { label: 'Giới từ (prep.)', value: 'prep.' },
  { label: 'Cụm từ / Thành ngữ', value: 'phrase' }
];

const STATUS_FILTERS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: '🌱 Chưa học / Mới', value: 'new' },
  { label: '⚡ Đang học', value: 'learning' },
  { label: '✓ Đã thuộc vững', value: 'mastered' },
  { label: '⏰ Cần ôn hôm nay', value: 'due' },
  { label: '🔥 Hay quên', value: 'difficult' }
];

export function Oxford3000Tab({
  systemWords,
  progressMap,
  collections,
  onOpenWordDetail,
  onOpenAddToCollection,
  onStartStudyWords,
  onQuickMarkState
}: Oxford3000TabProps) {
  const [search, setSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('TẤT CẢ');
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selection
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const today = new Date().toISOString().split('T')[0];

  // Filtering Logic
  const filteredWords = useMemo(() => {
    return systemWords.filter(w => {
      // 1. Search (English term or Vietnamese meaning)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTerm = w.term.toLowerCase().includes(q);
        const matchesMeaning = w.meaning.toLowerCase().includes(q);
        if (!matchesTerm && !matchesMeaning) return false;
      }

      // 2. Alphabet Filter
      if (selectedLetter !== 'TẤT CẢ') {
        const firstChar = w.term.trim().charAt(0).toUpperCase();
        if (firstChar !== selectedLetter) return false;
      }

      // 3. POS Filter
      if (posFilter !== 'all') {
        if (!w.pos.toLowerCase().includes(posFilter.toLowerCase())) return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all') {
        const prog = progressMap[w.id];
        const state = prog?.state || 'new';

        if (statusFilter === 'due') {
          if (state === 'new' || !prog?.nextReviewAt || prog.nextReviewAt > today) {
            return false;
          }
        } else if (state !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [systemWords, search, selectedLetter, posFilter, statusFilter, progressMap, today]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedLetter, posFilter, statusFilter]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const pageWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, currentPage, pageSize]);

  // Checkbox handlers
  const handleToggleSelectAllPage = () => {
    const pageIds = pageWords.map(w => w.id);
    const allSelected = pageIds.every(id => selectedWordIds.has(id));

    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleWord = (wordId: string) => {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  // Convert selected to VocabWords for study
  const handleStudySelected = () => {
    const targets = systemWords.filter(w => selectedWordIds.has(w.id));
    if (targets.length === 0) return;
    const vocabWords = targets.map(t => systemWordToVocabWord(t, progressMap[t.id]));
    onStartStudyWords(vocabWords);
  };

  // Calculate high-level progress stats for 3000
  const stats = useMemo(() => {
    let mastered = 0;
    let learning = 0;
    let due = 0;
    let difficult = 0;

    for (const sys of systemWords) {
      const p = progressMap[sys.id];
      if (p) {
        if (p.state === 'mastered') mastered++;
        else if (p.state === 'learning' || p.state === 'reviewing') learning++;
        else if (p.state === 'difficult') difficult++;

        if (p.state !== 'new' && p.nextReviewAt && p.nextReviewAt <= today) {
          due++;
        }
      }
    }

    const unlearned = systemWords.length - (mastered + learning + difficult);

    return { mastered, learning, due, difficult, unlearned };
  }, [systemWords, progressMap, today]);

  return (
    <div className="space-y-6">
      
      {/* 1. TOP STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Tổng nguồn từ DOCX</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {systemWords.length.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500">Từ vựng thông dụng chuẩn</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đã ghi nhớ vững</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {stats.mastered}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {Math.round((stats.mastered / (systemWords.length || 1)) * 100)}% toàn bộ kho từ
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đang học / Ôn tập</span>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">
            {stats.learning}
          </div>
          <span className="text-[11px] text-slate-400">Đang củng cố theo SM-2</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đến hạn ôn hôm nay</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">
            {stats.due}
          </div>
          <span className="text-[11px] text-rose-500 font-semibold">Cần làm mới trí nhớ</span>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS SECTION */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        {/* Search Bar + Select Dropdowns */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo từ tiếng Anh (abandon, resilient...) hoặc nghĩa tiếng Việt (bỏ rơi, khả năng...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={posFilter}
              onChange={e => setPosFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {POS_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {STATUS_FILTERS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ALPHABET A-Z QUICK FILTER BAR */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-slate-400 mr-2 shrink-0">Chữ cái:</span>
            {ALPHABET.map(letter => {
              const isActive = selectedLetter === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setSelectedLetter(letter)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. BATCH SELECTION BAR (NẾU CÓ CHỌN TỪ) */}
      {selectedWordIds.size > 0 && (
        <div className="sticky top-4 z-20 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
            <span className="px-2.5 py-1 bg-blue-600 rounded-lg text-xs font-black">
              {selectedWordIds.size} từ đã chọn
            </span>
            <span className="hidden sm:inline text-slate-300">
              Bạn có thể tạo buổi học riêng hoặc lưu vào bộ sưu tập cá nhân.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStudySelected}
              className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Brain className="w-3.5 h-3.5" /> Học ngay {selectedWordIds.size} từ
            </button>
            <button
              type="button"
              onClick={() => onOpenAddToCollection(Array.from(selectedWordIds))}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-blue-400" /> Lưu vào bộ sưu tập
            </button>
            <button
              type="button"
              onClick={() => setSelectedWordIds(new Set())}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg text-xs cursor-pointer"
              title="Bỏ chọn tất cả"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. WORDS TABLE / LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        
        {/* Table Sub-header */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAllPage}
              className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              {pageWords.every(w => selectedWordIds.has(w.id)) && pageWords.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Chọn trang này</span>
            </button>

            <span>
              Hiển thị <strong>{pageWords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(currentPage * pageSize, filteredWords.length)}</strong> trong số <strong>{filteredWords.length.toLocaleString('vi-VN')}</strong> từ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Word rows */}
        {pageWords.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Không tìm thấy từ vựng nào khớp với bộ lọc
            </p>
            <p className="text-xs text-slate-400">
              Hãy thử tìm kiếm với từ khóa khác hoặc thiết lập lại bộ lọc chữ cái / từ loại.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedLetter('TẤT CẢ');
                setPosFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 cursor-pointer"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageWords.map((word) => {
              const isSelected = selectedWordIds.has(word.id);
              const progress = progressMap[word.id];
              const state = progress?.state || 'new';
              const isDue = state !== 'new' && progress?.nextReviewAt && progress.nextReviewAt <= today;
              const bookmarkedCount = progress?.bookmarkedCollectionIds?.length || 0;

              return (
                <div
                  key={word.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group ${
                    isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Left: Checkbox + Term + Phonetic + Meaning */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWord(word.id)}
                      className="mt-1 text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          #{word.index}
                        </span>

                        <h4 
                          onClick={() => onOpenWordDetail(systemWordToVocabWord(word, progress))}
                          className="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 cursor-pointer transition flex items-center gap-1.5"
                        >
                          {word.term}
                        </h4>

                        <button
                          type="button"
                          onClick={() => speakWord(word.term, 'en-US')}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {word.pos && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {word.pos}
                          </span>
                        )}

                        {bookmarkedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Bookmark className="w-2.5 h-2.5" /> {bookmarkedCount} bộ từ
                          </span>
                        )}
                      </div>

                      {word.phonetic && (
                        <p className="text-xs font-mono text-slate-400">
                          {word.phonetic}
                        </p>
                      )}

                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                        {word.meaning}
                      </p>

                      {progress?.personalNotes && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                          💡 Ghi chú: {progress.personalNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: State Badge + Quick Actions */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    {/* Status Badge */}
                    <div className="mr-1">
                      {state === 'mastered' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã thuộc
                        </span>
                      ) : state === 'difficult' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Hay quên
                        </span>
                      ) : isDue ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" /> Cần ôn
                        </span>
                      ) : state === 'learning' || state === 'reviewing' ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                          <Brain className="w-3 h-3" /> Đang học
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Chưa học
                        </span>
                      )}
                    </div>

                    {/* Quick state toggle */}
                    <button
                      type="button"
                      onClick={() => onQuickMarkState(word.id, state === 'mastered' ? 'new' : 'mastered')}
                      className={`p-1.5 rounded-xl text-xs transition cursor-pointer ${
                        state === 'mastered'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800'
                      }`}
                      title={state === 'mastered' ? 'Hủy đánh dấu đã thuộc' : 'Đánh dấu đã thuộc'}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* Bookmark to collection */}
                    <button
                      type="button"
                      onClick={() => onOpenAddToCollection([word.id])}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Lưu vào Bộ sưu tập cá nhân"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>

                    {/* View Details modal */}
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(systemWordToVocabWord(word, progress))}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Chi tiết
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table Footer Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>
            Trang {currentPage} trên tổng số {totalPages} trang
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            >
              Trang trước
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
            >
              Trang sau
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
