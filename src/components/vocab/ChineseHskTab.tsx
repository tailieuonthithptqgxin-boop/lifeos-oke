import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Volume2, Bookmark, CheckCircle2, 
  Clock, Brain, Eye, ChevronLeft, ChevronRight, CheckSquare, 
  Square, Play, Sparkles, AlertTriangle, Layers, Plus, 
  RotateCcw, BookOpen, Check, ShieldAlert, ShieldCheck, Globe
} from 'lucide-react';
import { 
  SystemChineseHskWord, 
  UserWordProgress, 
  VocabCollection, 
  MasteryState,
  VocabWord,
  VocabUserData,
  speakWord,
  systemChineseWordToVocabWord 
} from '../../lib/vocabEngine';
import { renderChineseScript } from '../../lib/chineseVocab/traditionalMappingEngine';
import { detectToneSandhi } from '../../lib/chineseVocab/pinyinToneEngine';
import { detectChineseConfusables } from '../../lib/chineseVocab/chineseConfusablesEngine';
import { verifyChineseWord } from '../../lib/chineseVocab/chineseVerificationEngine';
import { ChineseWord, ActiveRecallMode } from '../../lib/chineseVocab/types';
import { ChineseQualityControlView } from './chinese/ChineseQualityControlView';
import { ChineseActiveRecallModal } from './chinese/ChineseActiveRecallModal';

interface ChineseHskTabProps {
  systemWords: SystemChineseHskWord[];
  progressMap: Record<string, UserWordProgress>;
  collections: VocabCollection[];
  userData?: VocabUserData;
  onUpdateUserData?: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onOpenWordDetail: (word: VocabWord) => void;
  onOpenAddToCollection: (wordIds: string[]) => void;
  onStartStudyWords: (words: VocabWord[]) => void;
  onQuickMarkState: (wordId: string, state: MasteryState) => void;
}

const HSK_LEVELS = [
  { label: 'Tất cả cấp độ (1-9)', value: 0 },
  { label: 'HSK 1 (356 từ)', value: 1 },
  { label: 'HSK 2 (494 từ)', value: 2 },
  { label: 'HSK 3 (967 từ)', value: 3 },
  { label: 'HSK 4 (600 từ)', value: 4 },
  { label: 'HSK 5 (1,066 từ)', value: 5 },
  { label: 'HSK 6 (1,138 từ)', value: 6 },
  { label: 'HSK 7-9 (5,619 từ)', value: 7 },
];

const POS_FILTERS = [
  { label: 'Tất cả từ loại', value: 'all' },
  { label: 'Danh từ', value: 'danh từ' },
  { label: 'Động từ', value: 'động từ' },
  { label: 'Tính từ', value: 'tính từ' },
  { label: 'Phó từ', value: 'phó từ' },
  { label: 'Lượng từ', value: 'lượng từ' },
  { label: 'Giới từ', value: 'giới từ' },
  { label: 'Liên từ', value: 'liên từ' },
  { label: 'Trợ từ', value: 'trợ từ' },
  { label: 'Thành ngữ / Cụm từ', value: 'thành ngữ' },
];

const STATUS_FILTERS = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: '🌱 Chưa học / Mới', value: 'new' },
  { label: '⚡ Đang học', value: 'learning' },
  { label: '✓ Đã thuộc vững', value: 'mastered' },
  { label: '⏰ Cần ôn hôm nay', value: 'due' },
  { label: '🔥 Hay quên', value: 'difficult' },
  { label: '⚠️ Cần đối chiếu (Needs Review)', value: 'needs_review' }
];

export function ChineseHskTab({
  systemWords = [],
  progressMap = {},
  collections = [],
  userData,
  onUpdateUserData,
  onOpenWordDetail,
  onOpenAddToCollection,
  onStartStudyWords,
  onQuickMarkState
}: ChineseHskTabProps) {
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scriptMode, setScriptMode] = useState<'simplified' | 'traditional' | 'both'>('simplified');
  
  // Modals & Panels
  const [showQualityControl, setShowQualityControl] = useState(false);
  const [showActiveRecallModal, setShowActiveRecallModal] = useState(false);

  // Selection
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  const today = new Date().toISOString().split('T')[0];

  // Filtering Logic
  const filteredWords = useMemo(() => {
    return systemWords.filter(w => {
      // 1. Level Filter
      if (selectedLevel > 0) {
        if (selectedLevel === 7) {
          if (w.hskLevel < 7) return false;
        } else if (w.hskLevel !== selectedLevel) {
          return false;
        }
      }

      // 2. Search (Chinese Hanzi term, Pinyin, or Vietnamese meaning)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTerm = w.term.toLowerCase().includes(q);
        const matchesPinyin = w.pinyin.toLowerCase().includes(q);
        const matchesMeaning = w.meaning.toLowerCase().includes(q);
        if (!matchesTerm && !matchesPinyin && !matchesMeaning) return false;
      }

      // 3. POS Filter
      if (posFilter !== 'all') {
        if (!w.pos.toLowerCase().includes(posFilter.toLowerCase())) return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'needs_review') {
          if (!w.needsReview) return false;
        } else {
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
      }

      return true;
    });
  }, [systemWords, selectedLevel, search, posFilter, statusFilter, progressMap, today]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedLevel, posFilter, statusFilter]);

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
    const vocabWords = targets.map(t => systemChineseWordToVocabWord(t, progressMap[t.id]));
    onStartStudyWords(vocabWords);
  };

  // Convert page words or filtered words to ChineseWords for Active Recall
  const activeRecallPool: ChineseWord[] = useMemo(() => {
    const sample = filteredWords.slice(0, 100);
    return sample.map(raw => verifyChineseWord(raw, userData?.verificationOverrides?.[raw.id] as any));
  }, [filteredWords, userData?.verificationOverrides]);

  // Calculate high-level progress stats for HSK
  const stats = useMemo(() => {
    let mastered = 0;
    let learning = 0;
    let due = 0;
    let difficult = 0;

    for (const w of systemWords) {
      const prog = progressMap[w.id];
      const state = prog?.state || 'new';

      if (state === 'mastered') mastered++;
      else if (state === 'learning' || state === 'reviewing') learning++;
      else if (state === 'difficult') difficult++;

      if (state !== 'new' && prog?.nextReviewAt && prog.nextReviewAt <= today) {
        due++;
      }
    }

    return { mastered, learning, due, difficult };
  }, [systemWords, progressMap, today]);

  // If Quality Control view is active
  if (showQualityControl && userData && onUpdateUserData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowQualityControl(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            ← Quay lại Danh mục từ vựng HSK
          </button>
        </div>
        <ChineseQualityControlView
          systemWords={systemWords}
          userData={userData}
          onUpdateUserData={onUpdateUserData}
          onClose={() => setShowQualityControl(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. HERO PROGRESS CARD & ACTION SHORTCUTS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-1">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-400 block">Kho HSK 1 - 9</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {systemWords.length.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">Từ vựng chuẩn HSK 3.0</span>
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

        {/* Feature Action Buttons */}
        <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
          <button
            type="button"
            onClick={() => setShowQualityControl(true)}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Kiểm định & Quality Control</span>
          </button>

          <button
            type="button"
            onClick={() => setShowActiveRecallModal(true)}
            className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Brain className="w-4 h-4" />
            <span>Active Recall (7 Chế Độ)</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS SECTION */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        {/* Search Bar + Select Dropdowns + Script Toggle */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo Hán tự (爱, 学习...), Pinyin (ài, xuéxí...) hoặc nghĩa tiếng Việt (yêu, học...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
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

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(Number(e.target.value))}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {HSK_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>

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

            {/* Script Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScriptMode('simplified')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'simplified' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Giản (简)
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('traditional')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'traditional' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Phồn (繁)
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('both')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'both' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Cả hai
              </button>
            </div>
          </div>
        </div>

        {/* HSK LEVEL PILLS BAR */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-slate-400 mr-2 shrink-0">Cấp độ:</span>
            {HSK_LEVELS.map(lvl => {
              const isActive = selectedLevel === lvl.value;
              return (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lvl.label}
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
            <span className="px-2.5 py-1 bg-rose-500 rounded-lg text-white font-mono">
              {selectedWordIds.size}
            </span>
            <span>từ tiếng Trung đã được chọn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStudySelected}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Brain className="w-3.5 h-3.5" /> Học ngay ({selectedWordIds.size})
            </button>

            <button
              type="button"
              onClick={() => onOpenAddToCollection(Array.from(selectedWordIds))}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5" /> Thêm vào Bộ sưu tập
            </button>

            <button
              type="button"
              onClick={() => setSelectedWordIds(new Set())}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs font-semibold"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN VOCABULARY LIST CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Table Header controls */}
        <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAllPage}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              {pageWords.length > 0 && pageWords.every(w => selectedWordIds.has(w.id)) ? (
                <CheckSquare className="w-4 h-4 text-rose-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Chọn cả trang này ({pageWords.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-semibold">
            Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{filteredWords.length.toLocaleString()}</span> từ tiếng Trung
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
              Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc cấp độ / từ loại.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedLevel(0);
                setPosFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer"
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
              
              const scriptRender = renderChineseScript({ term: word.term }, scriptMode);
              const sandhi = detectToneSandhi(word.term, word.pinyin);
              const confusables = detectChineseConfusables(word.term);

              return (
                <div
                  key={word.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group ${
                    isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  {/* Left: Checkbox + Term + Pinyin + POS + Meaning */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWord(word.id)}
                      className="mt-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          #{word.index}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {word.sheet}
                        </span>

                        <h4 
                          onClick={() => onOpenWordDetail(systemChineseWordToVocabWord(word, progress))}
                          className="font-black text-slate-900 dark:text-white text-lg hover:text-rose-600 cursor-pointer transition flex items-center gap-1.5"
                        >
                          {scriptRender.primary}
                        </h4>

                        {scriptRender.secondary && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {scriptRender.secondary}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => speakWord(word.term, 'zh-CN')}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                          title="Phát âm tiếng Trung chuẩn (zh-CN)"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          [{word.pinyin}]
                        </span>

                        {word.pos && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {word.pos}
                          </span>
                        )}

                        {sandhi && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1" title={sandhi}>
                            🔊 Biến điệu
                          </span>
                        )}

                        {confusables.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1" title={`Dễ nhầm với ${confusables[0].confusedWith}`}>
                            💡 Dễ nhầm
                          </span>
                        )}

                        {word.needsReview && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-600" /> Cần đối chiếu
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {word.meaning}
                      </p>

                      {word.exampleSentence && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {word.exampleSentence} {word.exampleTranslation ? `— ${word.exampleTranslation}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status badge & Action buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    
                    {/* Mastery Status Badge */}
                    {state === 'mastered' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Đã thuộc
                      </span>
                    ) : state === 'difficult' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        🔥 Khó nhớ
                      </span>
                    ) : state === 'learning' || state === 'reviewing' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        ⚡ Đang học
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800">
                        🌱 Mới
                      </span>
                    )}

                    {isDue && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                        Cần ôn
                      </span>
                    )}

                    {/* Quick State Toggle */}
                    <button
                      type="button"
                      onClick={() => onQuickMarkState(word.id, state === 'mastered' ? 'learning' : 'mastered')}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        state === 'mastered'
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800'
                      }`}
                      title={state === 'mastered' ? 'Đánh dấu cần ôn lại' : 'Đánh dấu đã thuộc'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className="p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Trang {currentPage} / {totalPages} ({filteredWords.length.toLocaleString()} từ)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Trước
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
              >
                Sau <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ACTIVE RECALL MODAL */}
      {showActiveRecallModal && (
        <ChineseActiveRecallModal
          words={activeRecallPool}
          allPoolWords={activeRecallPool}
          onClose={() => setShowActiveRecallModal(false)}
        />
      )}

    </div>
  );
}
