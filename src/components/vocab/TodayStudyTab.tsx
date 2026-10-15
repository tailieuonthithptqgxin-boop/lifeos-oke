import React, { useState, useMemo } from 'react';
import { 
  Brain, Clock, AlertTriangle, CheckCircle2, Play, Flame, 
  Sparkles, Filter, ChevronRight, Layers, Volume2, ArrowRight,
  BookOpen, Bookmark, Calendar, RotateCcw, Shuffle, Check, Search
} from 'lucide-react';
import { 
  VocabWord, 
  VocabCollection, 
  LearningLanguage, 
  speakWord,
  buildTodayStudyPlan,
  sliceStudyBatches,
  estimateRetentionProbability
} from '../../lib/vocabEngine';

interface TodayStudyTabProps {
  activeLang: LearningLanguage;
  allWords: VocabWord[];
  onStartStudyBatch: (
    words: VocabWord[], 
    mode: 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank'
  ) => void;
  onOpenWordDetail: (word: VocabWord) => void;
  onLookupWord?: () => void;
}

export function TodayStudyTab({
  activeLang,
  allWords = [],
  onStartStudyBatch,
  onOpenWordDetail,
  onLookupWord
}: TodayStudyTabProps) {
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(15);
  const [selectedMode, setSelectedMode] = useState<'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank'>('flashcard');
  const [viewFilter, setViewFilter] = useState<'all' | 'overdue' | 'due' | 'difficult' | 'new'>('all');

  // Compute Today's Study Plan
  const plan = useMemo(() => {
    return buildTodayStudyPlan(
      allWords || [], 
      activeLang?.dailyNewWordTarget || 10, 
      activeLang?.dailyReviewTarget || 30
    );
  }, [allWords, activeLang?.dailyNewWordTarget, activeLang?.dailyReviewTarget]);

  // Combined queue in strict priority order: Overdue -> Due Today -> Difficult -> New
  const prioritizedQueue = useMemo(() => {
    const map = new Map<string, VocabWord>();
    // 1. Overdue first
    (plan?.overdueWords || []).forEach(w => map.set(w.id, w));
    // 2. Due today
    (plan?.dueTodayWords || []).forEach(w => map.set(w.id, w));
    // 3. Difficult
    (plan?.difficultWords || []).forEach(w => map.set(w.id, w));
    // 4. New
    (plan?.newWords || []).forEach(w => map.set(w.id, w));
    return Array.from(map.values());
  }, [plan]);

  // Sliced batches
  const batches = useMemo(() => {
    return sliceStudyBatches(prioritizedQueue, selectedBatchSize);
  }, [prioritizedQueue, selectedBatchSize]);

  // Filtered words for list view
  const displayWords = useMemo(() => {
    switch (viewFilter) {
      case 'overdue': return plan?.overdueWords || [];
      case 'due': return plan?.dueTodayWords || [];
      case 'difficult': return plan?.difficultWords || [];
      case 'new': return plan?.newWords || [];
      default: return prioritizedQueue;
    }
  }, [viewFilter, plan, prioritizedQueue]);

  const handleLaunchBatch = (batchIndex: number = 0) => {
    const targetBatch = batches[batchIndex] || prioritizedQueue.slice(0, selectedBatchSize);
    if (targetBatch.length === 0) return;
    onStartStudyBatch(targetBatch, selectedMode);
  };

  const isChinese = activeLang.id === 'zh';
  const isJapanese = activeLang.id === 'ja';
  const foreignLangShort = isJapanese ? 'Nhật' : isChinese ? 'Trung' : 'Anh';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* ========================================================================= */}
      {/* 1. UPPER SECTION (2-COLUMN BENTO GRID)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Vocabulary Master */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activeLang.flag || '🇬🇧'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                  {activeLang.name || 'Tiếng Anh'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Spaced Repetition</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Vocabulary Master
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Hệ thống ghi nhớ từ vựng thông minh dựa trên chu kỳ ngắt quãng, tự động tối ưu hóa lộ trình ôn tập cá nhân.
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Mục tiêu: {activeLang.dailyNewWordTarget} từ mới / ngày</span>
            {onLookupWord && (
              <button
                type="button"
                onClick={onLookupWord}
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Tra từ điển & tìm kiếm"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Tra từ</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Card: Kế hoạch Ôn tập (Balanced White Card with Emerald CTA) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              LỊCH HỌC HÔM NAY
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              Kế hoạch Ôn tập
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              Ôn tập đúng thời điểm nguy cơ quên bắt đầu tăng để khóa kiến thức vào trí nhớ dài hạn.
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tổng cần học</span>
              <span className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-slate-900 dark:text-white">{plan.totalToStudy} từ</span>
            </div>

            <button
              type="button"
              onClick={() => handleLaunchBatch(0)}
              disabled={plan.totalToStudy === 0}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                plan.totalToStudy > 0
                  ? 'bg-[#10B981] hover:bg-[#059669] text-white active:scale-95'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt đầu học</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MIDDLE SECTION: SYMMETRICAL FILTER PILLS & 2X2 STATS GRID             */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        {/* Symmetrical Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
              viewFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            Lựa chọn bài học
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('due')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              viewFilter === 'due'
                ? 'bg-[#0D523F] text-white border-[#0D523F]'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span>Học hôm nay</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {plan.totalToStudy}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewFilter('new')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer shrink-0 ${
              viewFilter === 'new'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            Phòng học
          </button>
        </div>

        {/* 2x2 Stats Grid: Monochromatic & Quiet with thin utility icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Quá hạn ôn */}
          <button
            type="button"
            onClick={() => setViewFilter('overdue')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer bg-white dark:bg-slate-900 ${
              viewFilter === 'overdue'
                ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Quá hạn ôn</span>
              <AlertTriangle className={`w-3.5 h-3.5 ${plan.overdueWords.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {plan.overdueWords.length}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Cần ưu tiên cứu vãn</span>
          </button>

          {/* 2. Đến hạn hôm nay */}
          <button
            type="button"
            onClick={() => setViewFilter('due')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer bg-white dark:bg-slate-900 ${
              viewFilter === 'due'
                ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Đến hạn hôm nay</span>
              <Clock className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {plan.dueTodayWords.length}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Đúng chu kỳ Spaced Rep</span>
          </button>

          {/* 3. Cần củng cố */}
          <button
            type="button"
            onClick={() => setViewFilter('difficult')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer bg-white dark:bg-slate-900 ${
              viewFilter === 'difficult'
                ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cần củng cố</span>
              <Flame className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {plan.difficultWords.length}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Từng quên / Hay nhầm</span>
          </button>

          {/* 4. Từ mới mục tiêu */}
          <button
            type="button"
            onClick={() => setViewFilter('new')}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer bg-white dark:bg-slate-900 ${
              viewFilter === 'new'
                ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/10'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Từ mới mục tiêu</span>
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {plan.newWords.length}
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Chỉ tiêu: {activeLang.dailyNewWordTarget}/ngày</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LOWER SECTION: CONFIGURATIONS & 2X2 ACTIVE RECALL CARDS                */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8387F5]" />
              Tùy chỉnh Phiên học Ngắn (Micro-Sessions)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chia nhỏ danh sách thành các đợt ngắn để não bộ tiếp nhận hiệu quả nhất.
            </p>
          </div>

          {/* Batch Size Selector (15 từ highlighted in soft lavender) */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[10, 15, 20, 25].map(size => {
              const isSelected = selectedBatchSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedBatchSize(size)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#8387F5] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {size} từ
                </button>
              );
            })}
          </div>
        </div>

        {/* PHƯƠNG PHÁP ACTIVE RECALL - 4 framed 2x2 cards */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            PHƯƠNG PHÁP ACTIVE RECALL
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { id: 'flashcard', name: `Flashcard ${foreignLangShort} → Việt`, desc: 'Chủ động nhớ nghĩa' },
              { id: 'flashcard_reverse', name: `Đảo chuỗi: Việt → ${foreignLangShort}`, desc: 'Nhớ từ & phát âm' },
              { id: 'quiz', name: 'Trắc nghiệm 4 đáp án', desc: 'Chọn nghĩa chính xác' },
              { id: 'spelling', name: 'Luyện gõ chính tả', desc: 'Nghe phát âm gõ từ' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMode(m.id as any);
                  const targetBatch = batches[0] || prioritizedQueue.slice(0, selectedBatchSize);
                  if (targetBatch.length > 0) {
                    onStartStudyBatch(targetBatch, m.id as any);
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[90px] ${
                  selectedMode === m.id
                    ? 'border-[#0D523F] bg-[#0D523F]/5 text-slate-900 dark:text-white ring-1 ring-[#0D523F]/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block">{m.name}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{m.desc}</span>
                </div>
                <div className="flex items-center justify-end pt-2">
                  <span className="text-[11px] font-semibold text-[#0D523F] dark:text-emerald-400 flex items-center gap-1">
                    Bắt đầu <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Batches Overview Carousel / Buttons */}
        {batches.length > 1 && (
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Các chùm phiên học đã được chia tự động ({batches.length} phiên):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(batches || []).map((batch, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      Phiên {idx + 1} ({batch.length} từ)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ~{Math.max(1, Math.round((batch.length * 35) / 60))} phút ôn tập
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLaunchBatch(idx)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    Học <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. TODAY'S WORD QUEUE LIST VIEW */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Danh sách từ cần ôn hôm nay ({displayWords.length} từ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kèm chỉ số ước tính tỷ lệ lưu giữ (Retention %) và thời hạn ôn tiếp theo.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Tất cả ({prioritizedQueue.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('overdue')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewFilter === 'overdue' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Quá hạn ({plan.overdueWords.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('due')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewFilter === 'due' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Đến hạn ({plan.dueTodayWords.length})
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('new')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                viewFilter === 'new' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Từ mới ({plan.newWords.length})
            </button>
          </div>
        </div>

        {displayWords.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
              Không có từ nào trong danh mục này!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bạn đã hoàn thành các từ đến hạn hoặc không có từ nào bị quá hạn. Hãy tiếp tục giữ vững tiến độ nhé!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(displayWords || []).map(w => {
              const isLearned = w.state === 'mastered' || (w.state !== 'new' && (w.repetitions || 0) > 0);
              const retention = estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses);

              return (
                <div
                  key={w.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakWord(w.term, activeLang.speechVoiceCode)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer shrink-0 transition-colors"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    {/* Single elegant status dot */}
                    <span 
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isLearned ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`} 
                      title={isLearned ? `Đang ôn tập (${retention}% lưu giữ)` : 'Chưa học'}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onOpenWordDetail(w)}
                          className="font-semibold text-sm text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer truncate transition-colors"
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

                  <div className="flex items-center gap-3 shrink-0">
                    {isLearned && (
                      <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                        {retention}%
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                      {w.intervalDays}d
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
                      title="Xem chi tiết"
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

    </div>
  );
}
