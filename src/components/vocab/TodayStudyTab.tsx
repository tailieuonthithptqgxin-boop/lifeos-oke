import React, { useState, useMemo } from 'react';
import { 
  Brain, Clock, AlertTriangle, CheckCircle2, Play, Flame, 
  Sparkles, Filter, ChevronRight, Layers, Volume2, ArrowRight,
  BookOpen, Bookmark, Calendar, RotateCcw, Shuffle, Check, Search,
  Share2, Award, Target, Zap, BarChart2, X, RefreshCw
} from 'lucide-react';
import { 
  VocabWord, 
  LearningLanguage, 
  speakWord,
  calculateMemoryPyramid,
  computeMemoryLevel,
  getForecast7Days,
  calculateCompletionProjection,
  estimateRetentionProbability
} from '../../lib/vocabEngine';
import { 
  ShuffleMode, 
  buildSmartShuffledSession, 
  mixedShuffle, 
  smartReviewShuffle, 
  fisherYatesShuffle,
  isWordNew,
  isWordMistake
} from '../../lib/smartShuffleEngine';

export interface TodayStudyTabProps {
  activeLang: LearningLanguage;
  allWords: VocabWord[];
  completedBatchIndices?: number[];
  completedBatchesStats?: Record<number, { accuracy: number; total: number }>;
  onStartStudyBatch: (
    words: VocabWord[], 
    mode: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank',
    shuffleMode?: ShuffleMode
  ) => void;
  onOpenWordDetail: (word: VocabWord) => void;
  onLookupWord?: () => void;
  onShareToCommunity?: (pyramidStats: any) => void;
}

export function TodayStudyTab({
  activeLang,
  allWords = [],
  completedBatchIndices = [],
  completedBatchesStats = {},
  onStartStudyBatch,
  onOpenWordDetail,
  onLookupWord,
  onShareToCommunity
}: TodayStudyTabProps) {
  // 1. Controls State
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(15);
  const [selectedMode, setSelectedMode] = useState<'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank'>('flashcard');
  const [selectedShuffleMode, setSelectedShuffleMode] = useState<ShuffleMode>('smart_review');
  const [selectedPyramidTier, setSelectedPyramidTier] = useState<number | null>(null);
  const [tierSearchQuery, setTierSearchQuery] = useState<string>('');
  const [viewFilter, setViewFilter] = useState<'all' | 'overdue' | 'due' | 'difficult' | 'new'>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 2. High-Precision 6-Tier Memory Pyramid Calculation
  const pyramid = useMemo(() => {
    return calculateMemoryPyramid(allWords);
  }, [allWords]);

  // 3. 7-Day Review Forecast
  const forecast7Days = useMemo(() => {
    return getForecast7Days(allWords);
  }, [allWords]);

  // 4. Warehouse Completion Target Projection
  const projection = useMemo(() => {
    return calculateCompletionProjection(allWords, activeLang?.dailyNewWordTarget || 15);
  }, [allWords, activeLang?.dailyNewWordTarget]);

  // 5. Overdue and Due Today Words
  const { overdueWords, dueTodayWords, difficultWords, newWords } = useMemo(() => {
    const overdue: VocabWord[] = [];
    const due: VocabWord[] = [];
    const diff: VocabWord[] = [];
    const news: VocabWord[] = [];

    for (const w of allWords) {
      const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
      if (lvl === 0 || w.state === 'new') {
        news.push(w);
      } else {
        if (w.isDifficult || (w.lapses && w.lapses >= 2)) {
          diff.push(w);
        }
        if (w.nextReviewAt) {
          if (w.nextReviewAt < todayIso) overdue.push(w);
          else if (w.nextReviewAt === todayIso) due.push(w);
        }
      }
    }

    return {
      overdueWords: overdue,
      dueTodayWords: due,
      difficultWords: diff,
      newWords: news
    };
  }, [allWords, todayIso]);

  const totalDueToday = overdueWords.length + dueTodayWords.length;

  // 6. Dynamic Queue Builder based on Selected Shuffle Mode
  const activeQueue = useMemo(() => {
    switch (selectedShuffleMode) {
      case 'new_words': {
        const list = allWords.filter(w => isWordNew(w));
        return list.length > 0 ? list : allWords.slice(0, 100);
      }
      case 'mistakes': {
        const list = allWords.filter(w => isWordMistake(w));
        return list.length > 0 ? list : (totalDueToday > 0 ? [...overdueWords, ...dueTodayWords] : allWords.slice(0, 50));
      }
      case 'mixed': {
        return mixedShuffle(allWords, todayIso);
      }
      case 'random': {
        return fisherYatesShuffle(allWords);
      }
      case 'smart_review':
      default: {
        return smartReviewShuffle(allWords, todayIso);
      }
    }
  }, [selectedShuffleMode, allWords, todayIso, overdueWords, dueTodayWords, totalDueToday]);

  // 7. Sliced Batches (Phiên 1, Phiên 2, Phiên 3...)
  const batches = useMemo(() => {
    const result: VocabWord[][] = [];
    if (!activeQueue || activeQueue.length === 0) return result;
    const batchCount = Math.ceil(activeQueue.length / selectedBatchSize);
    for (let i = 0; i < batchCount; i++) {
      const start = i * selectedBatchSize;
      const slice = activeQueue.slice(start, start + selectedBatchSize);
      if (slice.length > 0) result.push(slice);
    }
    return result;
  }, [activeQueue, selectedBatchSize]);

  // 8. Filtered Words for Tier Drawer
  const tierWords = useMemo(() => {
    if (selectedPyramidTier === null) return [];
    return allWords.filter(w => {
      const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
      if (lvl !== selectedPyramidTier) return false;
      if (!tierSearchQuery.trim()) return true;
      const q = tierSearchQuery.toLowerCase().trim();
      return (
        (w.term && w.term.toLowerCase().includes(q)) ||
        (w.meaning && w.meaning.toLowerCase().includes(q)) ||
        (w.phonetic && w.phonetic.toLowerCase().includes(q))
      );
    });
  }, [selectedPyramidTier, allWords, tierSearchQuery]);

  // 9. Display Words for Today List Tab
  const displayWords = useMemo(() => {
    switch (viewFilter) {
      case 'overdue': return overdueWords;
      case 'due': return dueTodayWords;
      case 'difficult': return difficultWords;
      case 'new': return newWords;
      default: return activeQueue.slice(0, 100);
    }
  }, [viewFilter, overdueWords, dueTodayWords, difficultWords, newWords, activeQueue]);

  // Handlers
  const handleLaunchBatch = (batchIndex: number = 0) => {
    const targetBatch = batches[batchIndex] || activeQueue.slice(0, selectedBatchSize);
    if (!targetBatch || targetBatch.length === 0) return;
    onStartStudyBatch(targetBatch, selectedMode, selectedShuffleMode);
  };

  const handleLaunchTodayDue = () => {
    const dueQueue = [...overdueWords, ...dueTodayWords];
    if (dueQueue.length > 0) {
      onStartStudyBatch(dueQueue.slice(0, Math.max(selectedBatchSize, 25)), selectedMode, 'smart_review');
    } else {
      handleLaunchBatch(0);
    }
  };

  const handleLaunchTierStudy = (tier: number) => {
    const wordsInTier = allWords.filter(w => {
      const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
      return lvl === tier;
    });
    if (wordsInTier.length === 0) return;
    setSelectedPyramidTier(null);
    onStartStudyBatch(wordsInTier.slice(0, Math.max(selectedBatchSize, 25)), selectedMode, 'random');
  };

  const isChinese = activeLang.id === 'zh';
  const isJapanese = activeLang.id === 'ja';
  const foreignLangShort = isJapanese ? 'Nhật' : isChinese ? 'Trung' : 'Anh';

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${encodeURIComponent(activeLang?.id || 'en')}_vocab`
    : '';

  const handleCopyShare = () => {
    const text = `🏆 Tôi vừa nâng cấp Tháp Trí Nhớ trên Vocabulary Master!\n📊 ${pyramid.level5_mastered} từ thành thạo (Tầng 5)\n🔥 ${totalDueToday} từ cần ôn hôm nay\nTham gia học cùng tôi tại: ${referralLink}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
    if (onShareToCommunity) {
      onShareToCommunity(pyramid);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. HERO CALLOUT: HÔM NAY CẦN ÔN (DUE TODAY BANNER)                        */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>🔥 Cần Ôn Hôm Nay</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Thành thạo: {pyramid.completionPercent}%
              </span>
              {activeLang && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-slate-200">
                  {activeLang.flag} {activeLang.name}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kế Hoạch & Tháp Trí Nhớ 6 Tầng
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kho từ vựng {pyramid.total} từ được phân tầng khoa học theo Spaced Repetition (SM-2). Trả bài đúng ngày hôm nay để chặn đứng đường cong quên Ebbinghaus!
            </p>
          </div>

          {/* Quick CTA Box */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 text-center md:text-right shrink-0 shadow-lg">
            <span className="text-[11px] text-emerald-300 block font-semibold uppercase tracking-wider">
              Tổng số từ đến hạn & quá hạn
            </span>
            <div className="flex items-baseline justify-center md:justify-end gap-1.5 my-1">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">{totalDueToday}</span>
              <span className="text-xs text-slate-300 font-medium">từ</span>
            </div>
            {overdueWords.length > 0 && (
              <span className="text-[11px] text-rose-300 font-medium block mb-2">
                ⚠️ Trong đó có {overdueWords.length} từ quá hạn cần cứu vãn
              </span>
            )}
            <div className="mt-2 flex flex-col sm:flex-row gap-2 justify-center md:justify-end">
              <button
                type="button"
                onClick={handleLaunchTodayDue}
                className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-95"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>🚀 Vào trả bài hôm nay ngay</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="min-h-[46px] px-3.5 py-2.5 rounded-xl font-bold text-xs bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/20 active:scale-95"
                title="Khoe Tháp Trí Nhớ lên Cộng đồng"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Khoe Tháp</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THÁP TRÍ NHỚ 6 TẦNG TRỰC QUAN (INTERACTIVE 6-TIER MEMORY TOWER)         */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Tháp Trí Nhớ 6 Tầng (Interactive Memory Tower)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nhấp vào bất kỳ tầng nào để mở danh sách từ và ôn tập riêng tầng đó!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tỷ lệ thành thạo:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {pyramid.completionPercent}%
            </span>
          </div>
        </div>

        {/* Visual Pyramid Tiers Stack */}
        <div className="space-y-2 max-w-3xl mx-auto py-1">
          
          {/* TẦNG 5: THÀNH THẠO (APEX) */}
          <div 
            onClick={() => setSelectedPyramidTier(5)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-md bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                5
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-200 block truncate">
                  🔵 Tầng 5 — Thành thạo (Mastered)
                </span>
                <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 block truncate">
                  Khoảng cách ôn ≥ 30 ngày • Ổn định vĩnh viễn
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-blue-950 dark:text-blue-100 block font-mono">
                {pyramid.level5_mastered} từ
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {pyramid.total > 0 ? Math.round((pyramid.level5_mastered / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 dark:bg-blue-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level5_mastered / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* TẦNG 4: NHỚ TỐT / PHẢN XẠ NHANH */}
          <div 
            onClick={() => setSelectedPyramidTier(4)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-lg bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                4
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 block truncate">
                  🟢 Tầng 4 — Nhớ tốt / Phản xạ nhanh
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 block truncate">
                  Khoảng cách ôn 14 - 29 ngày • Phản xạ nhanh &lt;3s
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-100 block font-mono">
                {pyramid.level4_strong} từ
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {pyramid.total > 0 ? Math.round((pyramid.level4_strong / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-100 dark:bg-emerald-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level4_strong / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* TẦNG 3: NHỚ KHÁ */}
          <div 
            onClick={() => setSelectedPyramidTier(3)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-xl bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                3
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-amber-950 dark:text-amber-200 block truncate">
                  🟡 Tầng 3 — Nhớ khá (Good Recall)
                </span>
                <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 block truncate">
                  Khoảng cách ôn 7 - 13 ngày • Recall ổn định
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100 block font-mono">
                {pyramid.level3_good} từ
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {pyramid.total > 0 ? Math.round((pyramid.level3_good / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-100 dark:bg-amber-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level3_good / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* TẦNG 2: ĐANG GHI NHỚ / CHƯA CHẮC */}
          <div 
            onClick={() => setSelectedPyramidTier(2)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-2xl bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/60 hover:bg-orange-100 dark:hover:bg-orange-900/50 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                2
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-orange-950 dark:text-orange-200 block truncate">
                  🟠 Tầng 2 — Đang ghi nhớ / Chưa chắc (Uncertain)
                </span>
                <span className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 block truncate">
                  Khoảng cách ôn 3 - 6 ngày • Cần ôn củng cố
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-orange-950 dark:text-orange-100 block font-mono">
                {pyramid.level2_uncertain} từ
              </span>
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                {pyramid.total > 0 ? Math.round((pyramid.level2_uncertain / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-100 dark:bg-orange-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level2_uncertain / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* TẦNG 1: MỚI HỌC */}
          <div 
            onClick={() => setSelectedPyramidTier(1)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-3xl bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                1
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-rose-950 dark:text-rose-200 block truncate">
                  🔴 Tầng 1 — Mới học (Learning)
                </span>
                <span className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 block truncate">
                  Vừa tiếp xúc lần đầu • Khoảng cách ôn 1 - 2 ngày
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-rose-950 dark:text-rose-100 block font-mono">
                {pyramid.level1_learning} từ
              </span>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                {pyramid.total > 0 ? Math.round((pyramid.level1_learning / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-100 dark:bg-rose-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level1_learning / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

          {/* TẦNG 0: TỪ MỚI (ĐÁY THÁP) */}
          <div 
            onClick={() => setSelectedPyramidTier(0)}
            className="p-3.5 sm:p-4 relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-4xl bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-md active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-slate-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                0
              </span>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 block truncate">
                  ⚪ Tầng 0 — Từ mới (New / Untouched)
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 block truncate">
                  Chưa từng học • Sẵn sàng nạp vào phiên học mới
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 block font-mono">
                {pyramid.level0_new} từ
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {pyramid.total > 0 ? Math.round((pyramid.level0_new / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${pyramid.total > 0 ? (pyramid.level0_new / pyramid.total) * 100 : 0}%` }} />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. KẾ HOẠCH ÔN TẬP THEO NGÀY (7 NGÀY TỚI) & DỰ BÁO HOÀN THÀNH              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left: 7-Day Forecast Histogram */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>📅 Kế Hoạch Ôn Tập Theo Ngày (7 Ngày Tới)</span>
            </h3>
            <span className="text-xs text-slate-400">Dự báo Spaced Repetition</span>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {forecast7Days.map((item, idx) => {
              const isToday = idx === 0;
              const maxCount = Math.max(...forecast7Days.map(f => f.totalDue), 10);
              const barHeightPercent = Math.min(100, Math.max(12, Math.round((item.totalDue / maxCount) * 100)));

              return (
                <div 
                  key={item.date}
                  className={`p-2.5 rounded-2xl flex flex-col items-center justify-between text-center transition-all ${
                    isToday
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <span className={`text-[10px] font-bold block ${isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
                    {item.dayLabel}
                  </span>

                  {/* Histogram Bar with mini tier colors */}
                  <div className="w-full h-24 my-2 flex items-end justify-center">
                    <div 
                      className={`w-7 rounded-xl transition-all flex flex-col justify-end overflow-hidden ${
                        item.totalDue > 0 ? (isToday ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700') : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${barHeightPercent}%` }}
                    >
                      {/* Mini color segments */}
                      {item.tierCounts[5] > 0 && <div className="w-full bg-blue-500 h-1" />}
                      {item.tierCounts[4] > 0 && <div className="w-full bg-emerald-400 h-1" />}
                      {item.tierCounts[3] > 0 && <div className="w-full bg-amber-400 h-1" />}
                      {item.tierCounts[2] > 0 && <div className="w-full bg-orange-400 h-1" />}
                      {item.tierCounts[1] > 0 && <div className="w-full bg-rose-400 h-1" />}
                    </div>
                  </div>

                  <div>
                    <span className={`text-sm font-black font-mono block ${isToday ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.totalDue}
                    </span>
                    <span className="text-[9px] text-slate-400 block">từ</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> T1 (1-2d)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> T2 (3-6d)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> T3 (7-13d)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> T4 (14-29d)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> T5 (≥30d)</span>
          </div>
        </div>

        {/* Right: Target & Projection Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>MỤC TIÊU KHO TỪ</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600">
                {projection.completionPercent}% Đạt
              </span>
            </div>

            <h4 className="text-base font-black text-slate-900 dark:text-white">
              Chinh Phục {projection.totalWords} Từ
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Mỗi ngày học {projection.dailyTarget} từ mới. Hệ thống sẽ cân bằng thông minh giữa nạp từ mới và trả bài định kỳ.
            </p>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Từ mới còn lại (Tầng 0):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{projection.remainingNew} từ</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Chỉ tiêu mỗi ngày:</span>
              <span className="font-mono font-bold text-emerald-600">{projection.dailyTarget} từ/ngày</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
              <span className="text-slate-700 dark:text-slate-300 font-bold">Dự kiến hoàn thành:</span>
              <span className="font-mono font-black text-emerald-600">{projection.daysToComplete} ngày nữa</span>
            </div>
            <span className="text-[10px] text-slate-400 block text-right">
              (~ Ngày {projection.estimatedDate})
            </span>
          </div>

          <button
            type="button"
            onClick={onLookupWord}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tra từ điển hoặc thêm từ mới</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. TÙY CHỈNH PHIÊN HỌC NGẮN (MICRO-SESSIONS) & 5 CƠ CHẾ XÁO TRỘN           */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        
        {/* Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span>Tùy Chỉnh Phiên Học Ngắn (Micro-Sessions)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Học ngắt đoạn 5 - 12 phút để đạt hiệu suất nhận thức và phản xạ tối đa trên di động.
            </p>
          </div>

          {/* Active Recall Mode Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 shrink-0">Phương pháp:</span>
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value as any)}
              className="min-h-[44px] text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-full md:w-auto cursor-pointer focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="flashcard">🎴 Flashcard: {foreignLangShort} → Việt</option>
              <option value="flashcard_reverse">🔄 Đảo chiều: Việt → {foreignLangShort}</option>
              <option value="quiz">📝 Trắc nghiệm 4 đáp án (Phản xạ &lt;3s)</option>
              <option value="spelling">✍️ Luyện gõ chính tả (Audio + Gợi ý)</option>
            </select>
          </div>
        </div>

        {/* Row 1: Fast Batch Size Selector (10, 15, 20, 25 từ) */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            1. Chọn dung lượng phiên học (Micro-Session Size):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { size: 10, time: '~5 phút', desc: 'Siêu tốc' },
              { size: 15, time: '~7 phút', desc: 'Chuẩn khoa học' },
              { size: 20, time: '~10 phút', desc: 'Tập trung sâu' },
              { size: 25, time: '~12 phút', desc: 'Thử thách cao' },
            ].map(item => {
              const isSelected = selectedBatchSize === item.size;
              return (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => setSelectedBatchSize(item.size)}
                  className={`min-h-[48px] p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/40 active:scale-95'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-base font-black font-mono block">
                    {item.size} từ
                  </span>
                  <span className={`text-[10px] font-medium block ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                    {item.time} • {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: 5 Distribution & Shuffle Modes */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            2. Cơ chế xáo trộn & phân bổ (Smart Random + Anti-Repetition):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { id: 'smart_review', label: '🧠 Ôn thông minh', desc: 'Ưu tiên đến hạn & hay sai' },
              { id: 'mixed', label: '⚡ Kết hợp (30/70)', desc: '30% mới + 70% ôn tập' },
              { id: 'mistakes', label: '🔥 Hay sai', desc: 'Lọc từ từng quên / lapses' },
              { id: 'new_words', label: '🌱 Từ mới', desc: 'Chỉ từ ở Tầng 0' },
              { id: 'random', label: '🎲 Ngẫu nhiên', desc: 'Fisher-Yates ngẫu nhiên' },
            ].map(m => {
              const isSelected = selectedShuffleMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedShuffleMode(m.id as ShuffleMode)}
                  className={`min-h-[48px] p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40 active:scale-95'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-black block truncate">{m.label}</span>
                  <span className={`text-[10px] block truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Chùm phiên học đã được chia tự động (Batches Slices) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              3. Các chùm phiên học đã được chia tự động ({batches.length} phiên):
            </span>
            <span className="text-xs text-slate-400">
              Tổng pool: {activeQueue.length} từ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {batches.slice(0, 9).map((batch, idx) => {
              const isCompleted = completedBatchIndices.includes(idx);
              const stats = completedBatchesStats[idx];
              const estMinutes = Math.max(1, Math.round((batch.length * 35) / 60));
              const newCount = batch.filter(w => isWordNew(w)).length;
              const reviewCount = batch.length - newCount;

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        Phiên {idx + 1}
                      </span>
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã xong {stats ? `(${stats.accuracy}%)` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {batch.length} từ ({newCount} mới, {reviewCount} ôn) • ~{estMinutes}p
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchBatch(idx)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 ${
                      isCompleted
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                    }`}
                  >
                    <span>{isCompleted ? 'Ôn lại' : 'Học'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {batches.length > 9 && (
            <p className="text-center text-xs text-slate-400 pt-1">
              (Còn {batches.length - 9} phiên tiếp theo trong lộ trình ôn tập...)
            </p>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. DANH SÁCH CHI TIẾT TỪ VỰNG & BỘ LỌC THÔNG MINH                         */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Danh Sách Từ Vựng Hiện Tại ({displayWords.length} từ)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhấp vào từ để xem ngữ cảnh, mẫu câu, từ đồng nghĩa và phát âm chuẩn.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {[
              { id: 'all', label: `Tất cả (${activeQueue.length})` },
              { id: 'overdue', label: `Quá hạn (${overdueWords.length})` },
              { id: 'due', label: `Đến hạn (${dueTodayWords.length})` },
              { id: 'difficult', label: `Cần củng cố (${difficultWords.length})` },
              { id: 'new', label: `Từ mới (${newWords.length})` },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setViewFilter(f.id as any)}
                className={`min-h-[36px] px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  viewFilter === f.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Word List Items */}
        {displayWords.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Không có từ nào trong danh mục này!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bạn đã hoàn thành hết từ vựng mục tiêu hoặc chưa có từ nào rơi vào trạng thái này.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
            {displayWords.map(w => {
              const lvl = w.memoryLevel !== undefined ? w.memoryLevel : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
              const retention = estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses);

              const tierBadgeColor = 
                lvl === 5 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                lvl === 4 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                lvl === 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300' :
                lvl === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300' :
                lvl === 1 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' :
                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

              return (
                <div
                  key={w.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakWord(w.term, activeLang.speechVoiceCode)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl cursor-pointer shrink-0 transition-colors"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onOpenWordDetail(w)}
                          className="font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer truncate transition-colors"
                        >
                          {w.term}
                        </span>
                        {w.partOfSpeech && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {w.partOfSpeech}
                          </span>
                        )}
                        {w.phonetic && (
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            {w.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {w.meaning}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tierBadgeColor}`}>
                      Tầng {lvl}
                    </span>
                    {w.state !== 'new' && (
                      <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                        {retention}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL/DRAWER: DANH SÁCH TỪ THEO TẦNG TRÍ NHỚ (TIER DRAWER)             */}
      {/* ========================================================================= */}
      {selectedPyramidTier !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Tầng {selectedPyramidTier}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {selectedPyramidTier === 5 ? 'Thành thạo (Mastered)' :
                     selectedPyramidTier === 4 ? 'Nhớ tốt / Phản xạ nhanh' :
                     selectedPyramidTier === 3 ? 'Nhớ khá (Good Recall)' :
                     selectedPyramidTier === 2 ? 'Đang ghi nhớ / Chưa chắc' :
                     selectedPyramidTier === 1 ? 'Mới học (Learning)' : 'Từ mới (New / Untouched)'}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 mt-0.5 block">
                  Tổng số: {tierWords.length} từ
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPyramidTier(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Launch CTA */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ trong tầng này..."
                  value={tierSearchQuery}
                  onChange={e => setTierSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLaunchTierStudy(selectedPyramidTier)}
                disabled={tierWords.length === 0}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ Ôn tập riêng tầng này ngay</span>
              </button>
            </div>

            {/* Modal Word List */}
            <div className="p-4 overflow-y-auto space-y-2 divide-y divide-slate-100 dark:divide-slate-800 max-h-[50vh] [scrollbar-gutter:stable]">
              {tierWords.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không tìm thấy từ vựng nào trong tầng này.
                </div>
              ) : (
                tierWords.map(w => (
                  <div 
                    key={w.id}
                    className="pt-2.5 pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => speakWord(w.term, activeLang.speechVoiceCode)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {w.term}
                          </span>
                          {w.phonetic && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {w.phonetic}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {w.meaning}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {w.nextReviewAt ? `Hạn: ${w.nextReviewAt}` : 'Chưa học'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-right">
              <button
                type="button"
                onClick={() => setSelectedPyramidTier(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: KHOE THÁP TRÍ NHỚ LÊN CỘNG ĐỒNG (SOCIAL SHARE)                  */}
      {/* ========================================================================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Khoe Tháp Trí Nhớ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white space-y-2 border border-emerald-900/60 text-center">
              <span className="text-3xl">🏆</span>
              <h4 className="text-base font-black">
                {pyramid.level5_mastered} Từ Đã Thành Thạo (Tầng 5)
              </h4>
              <p className="text-xs text-slate-300">
                Đã chinh phục {pyramid.completionPercent}% kho từ vựng {activeLang.name}.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-500">
              <span>Đường link chia sẻ của bạn (Kèm mã giới thiệu CTV):</span>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] break-all select-all">
                {referralLink}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyShare}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{shareCopied ? 'Đã sao chép link!' : 'Sao chép & Đăng Cộng đồng'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
