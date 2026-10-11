import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, Brain, Award, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, Sparkles, Activity, Layers, ArrowUpRight,
  Info, BarChart2, Calendar, Play, Volume2, HelpCircle,
  History, ArrowRight, Check, X, RotateCcw, Filter, Flame
} from 'lucide-react';
import { 
  VocabWord, 
  LearningLanguage, 
  speakWord,
  estimateRetentionProbability,
  calculateMemoryStability,
  generateForgettingCurvePoints,
  computeMemoryLevel,
  calculateMemoryPyramid,
  buildSmartReviewQueue
} from '../../lib/vocabEngine';

interface MemoryDashboardTabProps {
  activeLang: LearningLanguage;
  allWords: VocabWord[];
  onStartStudyWords: (
    words: VocabWord[], 
    mode?: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank'
  ) => void;
  onOpenWordDetail: (word: VocabWord) => void;
}

export function MemoryDashboardTab({
  activeLang,
  allWords = [],
  onStartStudyWords,
  onOpenWordDetail
}: MemoryDashboardTabProps) {
  const [selectedWordForCurve, setSelectedWordForCurve] = useState<VocabWord | null>(null);
  const [selectedPyramidTier, setSelectedPyramidTier] = useState<number | null>(null);
  const [selectedModeForReview, setSelectedModeForReview] = useState<'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling'>('flashcard');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch chronological learning history from backend API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingHistory(true);
    fetch('/api/vocab/history?limit=30')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.data?.logs) {
          setHistoryLogs(data.data.logs);
        }
      })
      .catch(() => {
        // Fallback to local logs
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });
    return () => { isMounted = false; };
  }, [allWords]);

  // High-level Retention & Pyramid Analytics
  const analytics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const pyramid = calculateMemoryPyramid(allWords);

    let totalRetention = 0;
    let totalStability = 0;
    let totalReviews = 0;
    let successfulReviews = 0;

    const activeWords = allWords.filter(w => w.state !== 'new');

    for (const w of activeWords) {
      const ret = estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses);
      const stab = calculateMemoryStability(w.intervalDays, w.easeFactor, w.lapses);
      
      totalRetention += ret;
      totalStability += stab;

      if (w.reviewLogs) {
        for (const log of w.reviewLogs) {
          totalReviews++;
          if (log.rating >= 3) successfulReviews++;
        }
      }
    }

    const avgRetention = activeWords.length > 0 ? Math.round(totalRetention / activeWords.length) : 100;
    const avgStability = activeWords.length > 0 ? Number((totalStability / activeWords.length).toFixed(1)) : 0;
    const accuracyRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

    // Prioritized Smart Review Queue (Hôm nay bạn cần ôn)
    const smartQueue = buildSmartReviewQueue(allWords.filter(w => w.state !== 'new'));
    const dueTodayWords = smartQueue.filter(w => {
      const isDue = w.nextReviewAt ? w.nextReviewAt <= today : false;
      return isDue || w.lapses > 0;
    });

    // Weak words (Từ đang yếu: lapses >= 2 hoặc tỉ lệ đúng < 60%)
    const weakWords = allWords.filter(w => {
      const totalAtt = (w.correctCount || 0) + (w.incorrectCount || 0);
      const acc = totalAtt > 0 ? (w.correctCount || 0) / totalAtt : 1;
      return w.lapses >= 2 || (totalAtt >= 2 && acc < 0.6);
    }).sort((a, b) => (b.lapses || 0) - (a.lapses || 0));

    return {
      activeCount: activeWords.length,
      avgRetention,
      avgStability,
      accuracyRate,
      totalReviews,
      pyramid,
      dueTodayWords,
      weakWords
    };
  }, [allWords]);

  // Curve data points for visualization
  const curvePoints = useMemo(() => {
    const stability = selectedWordForCurve
      ? calculateMemoryStability(selectedWordForCurve.intervalDays, selectedWordForCurve.easeFactor, selectedWordForCurve.lapses)
      : Math.max(1, analytics.avgStability);
    return generateForgettingCurvePoints(stability, 30);
  }, [selectedWordForCurve, analytics.avgStability]);

  // Filtered words when clicking a specific pyramid tier
  const filteredTierWords = useMemo(() => {
    if (selectedPyramidTier === null) return [];
    return allWords.filter(w => {
      const lvl = w.memoryLevel !== undefined
        ? w.memoryLevel
        : computeMemoryLevel(w.repetitionCount, w.intervalDays, w.lapses);
      return lvl === selectedPyramidTier;
    });
  }, [selectedPyramidTier, allWords]);

  const isChinese = activeLang.id === 'zh';
  const foreignLangShort = isChinese ? 'Trung' : 'Anh';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. HERO HEADER BANNER */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-emerald-900/50">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Tháp Trí Nhớ & Khoa Học Nhận Thức
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-slate-900">
              Thành thạo: {analytics.pyramid.completionPercent}%
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Tháp Trí Nhớ & Hệ Thống Ôn Tập Thông Minh
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Hệ thống phân loại từ vựng thành 6 tầng trí nhớ dựa trên lịch sử recall thực tế. Tự động điều chỉnh khoảng cách ôn tập theo thuật toán Spaced Repetition (SM-2) và Đường cong quên Ebbinghaus.
          </p>
        </div>

        {/* Quick Launch CTA */}
        <div className="w-full md:w-auto bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center md:text-right shrink-0">
          <span className="text-[11px] text-emerald-300 block font-medium">Hôm nay bạn cần ôn</span>
          <span className="text-3xl font-black text-white">{analytics.dueTodayWords.length} từ</span>
          <div className="mt-2 flex gap-1.5 justify-center md:justify-end">
            <button
              type="button"
              onClick={() => onStartStudyWords(analytics.dueTodayWords, selectedModeForReview)}
              disabled={analytics.dueTodayWords.length === 0}
              className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg ${
                analytics.dueTodayWords.length > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-[1.02]'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Ôn ngay ({analytics.dueTodayWords.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (TỔNG QUAN HỆ THỐNG) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Tổng số từ</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{analytics.pyramid.total}</span>
            <span className="text-xs text-slate-400">từ</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Kho từ hiện tại</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Từ mới (Tầng 0)</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-slate-600 dark:text-slate-300">{analytics.pyramid.level0_new}</span>
            <span className="text-xs text-slate-400">từ</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Chưa từng ôn</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Đang học (Tầng 1-2)</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {analytics.pyramid.level1_learning + analytics.pyramid.level2_uncertain}
            </span>
            <span className="text-xs text-slate-400">từ</span>
          </div>
          <span className="text-[10px] text-amber-500 mt-0.5 block font-medium">Đang củng cố</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Đã thành thạo</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{analytics.pyramid.level5_mastered}</span>
            <span className="text-xs text-slate-400">từ</span>
          </div>
          <span className="text-[10px] text-blue-500 mt-0.5 block font-medium">Khoảng cách ≥30d</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Độ chính xác Recall</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{analytics.accuracyRate}%</span>
            <span className="text-xs text-slate-400">{analytics.totalReviews} lượt</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">Tỷ lệ Good / Easy</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Từ đang yếu</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-2xl font-black ${analytics.weakWords.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {analytics.weakWords.length}
            </span>
            <span className="text-xs text-slate-400">từ</span>
          </div>
          <span className="text-[10px] text-rose-500 mt-0.5 block font-medium">Cần củng cố</span>
        </div>
      </div>

      {/* 3. THÁP TRÍ NHỚ TRỰC QUAN (INTERACTIVE MEMORY PYRAMID) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Tháp Trí Nhớ (Memory Pyramid)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Càng lên đỉnh tháp, độ bền ký ức càng cao và khoảng cách ôn càng giãn nở. Nhấp vào từng tầng để xem danh sách và luyện tập.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Phương pháp ôn:</span>
            <select
              value={selectedModeForReview}
              onChange={e => setSelectedModeForReview(e.target.value as any)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="flashcard">🎴 Flashcard: {foreignLangShort} → Việt</option>
              <option value="flashcard_reverse">🔄 Flashcard: Việt → {foreignLangShort}</option>
              <option value="quiz">📝 Trắc nghiệm 4 đáp án</option>
              <option value="spelling">✍️ Luyện gõ chính tả</option>
            </select>
          </div>
        </div>

        {/* Visual Pyramid Tiers */}
        <div className="space-y-2 max-w-3xl mx-auto py-2">
          
          {/* Tầng 5: Thành thạo (Apex) */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 5 ? null : 5)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-sm ${
              selectedPyramidTier === 5
                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400'
                : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 text-blue-900 dark:text-blue-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                5
              </span>
              <div>
                <span className="font-black text-xs block">🔵 Tầng 5 — Thành thạo (Mastered)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 5 ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                  Khoảng cách ôn ≥ 30 ngày • Ổn định vĩnh viễn
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level5_mastered} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level5_mastered / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Tầng 4: Nhớ tốt / Đã nhớ */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 4 ? null : 4)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-md ${
              selectedPyramidTier === 4
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                4
              </span>
              <div>
                <span className="font-black text-xs block">🟢 Tầng 4 — Nhớ tốt / Đã nhớ (Strong Memory)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 4 ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  Khoảng cách ôn 14 - 29 ngày • Phản xạ nhanh
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level4_strong} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level4_strong / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Tầng 3: Nhớ khá */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 3 ? null : 3)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-lg ${
              selectedPyramidTier === 3
                ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                3
              </span>
              <div>
                <span className="font-black text-xs block">🟡 Tầng 3 — Nhớ khá (Good Recall)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 3 ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>
                  Khoảng cách ôn 7 - 13 ngày • Recall ổn định
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level3_good} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level3_good / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Tầng 2: Đang ghi nhớ / Chưa chắc */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 2 ? null : 2)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-xl ${
              selectedPyramidTier === 2
                ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-400'
                : 'bg-orange-50/70 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50 hover:bg-orange-100 text-orange-900 dark:text-orange-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                2
              </span>
              <div>
                <span className="font-black text-xs block">🟠 Tầng 2 — Đang ghi nhớ / Chưa chắc (Uncertain)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 2 ? 'text-orange-100' : 'text-orange-600 dark:text-orange-400'}`}>
                  Khoảng cách ôn 3 - 6 ngày • Cần ôn củng cố
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level2_uncertain} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level2_uncertain / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Tầng 1: Mới học */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 1 ? null : 1)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-2xl ${
              selectedPyramidTier === 1
                ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400'
                : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                1
              </span>
              <div>
                <span className="font-black text-xs block">🔴 Tầng 1 — Mới học (Learning)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 1 ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'}`}>
                  Vừa tiếp xúc lần 1 • Khoảng cách ôn 1 - 2 ngày
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level1_learning} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level1_learning / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Tầng 0: Từ mới (Đáy tháp) */}
          <div 
            onClick={() => setSelectedPyramidTier(selectedPyramidTier === 0 ? null : 0)}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 mx-auto max-w-3xl ${
              selectedPyramidTier === 0
                ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-black shrink-0">
                0
              </span>
              <div>
                <span className="font-black text-xs block">⚪ Tầng 0 — Từ mới (New / Untouched)</span>
                <span className={`text-[10px] ${selectedPyramidTier === 0 ? 'text-slate-200' : 'text-slate-400'}`}>
                  Từ trong kho chưa từng học hoặc vừa nạp vào
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black block">{analytics.pyramid.level0_new} từ</span>
              <span className="text-[10px] font-bold opacity-80">
                {analytics.pyramid.total > 0 ? Math.round((analytics.pyramid.level0_new / analytics.pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>

        </div>

        {/* Selected Tier Words Drawer */}
        {selectedPyramidTier !== null && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Danh sách từ ở Tầng {selectedPyramidTier} ({filteredTierWords.length} từ)
                </h4>
                <p className="text-xs text-slate-500">Bấm nút để khởi chạy phiên luyện tập cho riêng tầng này.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartStudyWords(filteredTierWords, selectedModeForReview)}
                  disabled={filteredTierWords.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Luyện tập tầng này ({filteredTierWords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPyramidTier(null)}
                  className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
              {(filteredTierWords || []).slice(0, 48).map(w => (
                <div key={w.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{w.term}</span>
                    <span className="text-[11px] text-slate-400 block truncate">{w.meaning}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenWordDetail(w)}
                    className="text-[10px] text-emerald-600 font-bold hover:underline shrink-0 cursor-pointer"
                  >
                    Chi tiết
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. TODAY'S REVIEW (HÔM NAY BẠN CẦN ÔN) & WEAK WORDS (TỪ ĐANG YẾU) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Review List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-emerald-600">
                <Clock className="w-4 h-4" /> Hôm nay bạn cần ôn ({analytics.dueTodayWords.length} từ)
              </h4>
              <p className="text-xs text-slate-500">Ưu tiên từ sai gần đây, level thấp và đến hạn ôn theo Spaced Repetition.</p>
            </div>
            {analytics.dueTodayWords.length > 0 && (
              <button
                type="button"
                onClick={() => onStartStudyWords(analytics.dueTodayWords, selectedModeForReview)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Ôn ngay
              </button>
            )}
          </div>

          {(!analytics?.dueTodayWords || analytics.dueTodayWords.length === 0) ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              🎉 Bạn đã hoàn thành toàn bộ từ cần ôn hôm nay! Hãy quay lại vào ngày mai nhé.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
              {(analytics.dueTodayWords || []).slice(0, 15).map(w => (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900 dark:text-white">{w.term}</span>
                      <span className="text-[10px] font-mono text-slate-400">{w.partOfSpeech}</span>
                      {w.lapses > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                          Quên {w.lapses}x
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{w.meaning}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakWord(w.term, activeLang?.speechVoiceCode || 'en-US')}
                      className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Words List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4" /> Từ đang yếu / Hay quên ({(analytics?.weakWords || []).length} từ)
              </h4>
              <p className="text-xs text-slate-500">Những từ bạn thường xuyên trả lời sai hoặc có số lần quên cao.</p>
            </div>
            {analytics?.weakWords && analytics.weakWords.length > 0 && (
              <button
                type="button"
                onClick={() => onStartStudyWords(analytics.weakWords, selectedModeForReview)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Củng cố điểm yếu
              </button>
            )}
          </div>

          {(!analytics?.weakWords || analytics.weakWords.length === 0) ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              🎉 Tuyệt vời! Hiện không có từ nào rơi vào nhóm nguy cơ cao.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
              {(analytics.weakWords || []).slice(0, 15).map(w => (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900 dark:text-white">{w.term}</span>
                      <span className="text-[10px] font-mono text-slate-400">{w.partOfSpeech}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{w.meaning}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Quên {w.lapses || 1} lần
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 5. LEARNING HISTORY (LỊCH SỬ HỌC THEO NGÀY) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Lịch Sử Luyện Tập Theo Ngày (Learning History)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toàn bộ lượt ôn luyện trên cả 4 phương pháp được lưu trữ đồng bộ trên cơ sở dữ liệu.
            </p>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs text-slate-400">Đang tải lịch sử ôn tập từ database...</div>
        ) : (!historyLogs || historyLogs.length === 0) ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            Chưa có lịch sử ôn tập gần đây. Hãy bắt đầu một phiên học ngay nhé!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Từ vựng</th>
                  <th className="py-2.5 px-3">Phương pháp</th>
                  <th className="py-2.5 px-3">Kết quả</th>
                  <th className="py-2.5 px-3">Tháp trí nhớ</th>
                  <th className="py-2.5 px-3">Khoảng cách mới</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(historyLogs || []).slice(0, 10).map((log, idx) => {
                  const dateStr = log.reviewedAt ? new Date(log.reviewedAt).toLocaleString('vi-VN') : 'Vừa xong';
                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {log.term || log.wordId}
                        <span className="text-[10px] text-slate-400 block font-normal">{log.meaning}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.exerciseType === 'flashcard_reverse'
                            ? `Việt → ${foreignLangShort}`
                            : log.exerciseType === 'quiz'
                            ? 'Trắc nghiệm'
                            : log.exerciseType === 'spelling'
                            ? 'Chính tả'
                            : `${foreignLangShort} → Việt`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {log.isCorrect ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Đúng ({log.rating})
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Quên ({log.rating})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Tầng {log.memoryLevelBefore ?? 0} → Tầng {log.memoryLevelAfter ?? log.memoryLevelBefore ?? 0}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">
                        {log.intervalAfter} ngày
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
