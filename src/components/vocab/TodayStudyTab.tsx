import React, { useState, useMemo } from 'react';
import { 
  Brain, Clock, AlertTriangle, CheckCircle2, Play, Flame, 
  Sparkles, Filter, ChevronRight, Layers, Volume2, ArrowRight,
  BookOpen, Bookmark, Calendar, RotateCcw, Shuffle, Check
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
}

export function TodayStudyTab({
  activeLang,
  allWords,
  onStartStudyBatch,
  onOpenWordDetail
}: TodayStudyTabProps) {
  const [selectedBatchSize, setSelectedBatchSize] = useState<number>(15);
  const [selectedMode, setSelectedMode] = useState<'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank'>('flashcard');
  const [viewFilter, setViewFilter] = useState<'all' | 'overdue' | 'due' | 'difficult' | 'new'>('all');

  // Compute Today's Study Plan
  const plan = useMemo(() => {
    return buildTodayStudyPlan(
      allWords, 
      activeLang.dailyNewWordTarget || 10, 
      activeLang.dailyReviewTarget || 30
    );
  }, [allWords, activeLang.dailyNewWordTarget, activeLang.dailyReviewTarget]);

  // Combined queue in strict priority order: Overdue -> Due Today -> Difficult -> New
  const prioritizedQueue = useMemo(() => {
    const map = new Map<string, VocabWord>();
    // 1. Overdue first
    plan.overdueWords.forEach(w => map.set(w.id, w));
    // 2. Due today
    plan.dueTodayWords.forEach(w => map.set(w.id, w));
    // 3. Difficult
    plan.difficultWords.forEach(w => map.set(w.id, w));
    // 4. New
    plan.newWords.forEach(w => map.set(w.id, w));
    return Array.from(map.values());
  }, [plan]);

  // Sliced batches
  const batches = useMemo(() => {
    return sliceStudyBatches(prioritizedQueue, selectedBatchSize);
  }, [prioritizedQueue, selectedBatchSize]);

  // Filtered words for list view
  const displayWords = useMemo(() => {
    switch (viewFilter) {
      case 'overdue': return plan.overdueWords;
      case 'due': return plan.dueTodayWords;
      case 'difficult': return plan.difficultWords;
      case 'new': return plan.newWords;
      default: return prioritizedQueue;
    }
  }, [viewFilter, plan, prioritizedQueue]);

  const handleLaunchBatch = (batchIndex: number = 0) => {
    const targetBatch = batches[batchIndex] || prioritizedQueue.slice(0, selectedBatchSize);
    if (targetBatch.length === 0) return;
    onStartStudyBatch(targetBatch, selectedMode);
  };

  const isChinese = activeLang.id === 'zh';
  const foreignLangShort = isChinese ? 'Trung' : 'Anh';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. HERO HERO BANNER — TODAY'S STUDY CALLOUT */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Lịch học hôm nay
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                Ước tính: ~{plan.estimatedMinutes} phút
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Kế hoạch Ôn tập & Nạp từ trong ngày
            </h2>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              Hệ thống tự động gom từ dựa trên <strong>Đường cong quên Ebbinghaus</strong>. Ôn đúng thời điểm nguy cơ quên bắt đầu tăng để khóa kiến thức vào trí nhớ dài hạn.
            </p>
          </div>

          {/* Quick Launch CTA */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center md:text-right shrink-0">
            <span className="text-[11px] text-purple-200 block font-medium">Tổng từ cần học hôm nay</span>
            <span className="text-3xl font-black text-white">{plan.totalToStudy} từ</span>
            <button
              type="button"
              onClick={() => handleLaunchBatch(0)}
              disabled={plan.totalToStudy === 0}
              className={`mt-2 w-full px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                plan.totalToStudy > 0
                  ? 'bg-white hover:bg-slate-100 text-purple-900 hover:scale-[1.02]'
                  : 'bg-white/40 text-purple-200 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {selectedMode === 'flashcard' ? `Bắt đầu: Flashcard ${foreignLangShort} → Việt`
               : selectedMode === 'flashcard_reverse' ? `Bắt đầu: Đảo chiều (Việt → ${foreignLangShort})`
               : selectedMode === 'quiz' ? 'Bắt đầu: Trắc nghiệm 4 đáp án (Quiz)'
               : selectedMode === 'spelling' ? 'Bắt đầu: Luyện gõ chính tả (Spelling)'
               : 'Bắt đầu học'} ({Math.min(selectedBatchSize, plan.totalToStudy)} từ)
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRIC PILLS & QUEUE BREAKDOWN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overdue (Critical) */}
        <button
          type="button"
          onClick={() => setViewFilter('overdue')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            viewFilter === 'overdue'
              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Quá hạn ôn</span>
            <AlertTriangle className={`w-4 h-4 ${plan.overdueWords.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {plan.overdueWords.length}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">Cần ưu tiên cứu vãn</span>
        </button>

        {/* Due Today */}
        <button
          type="button"
          onClick={() => setViewFilter('due')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            viewFilter === 'due'
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Đến hạn hôm nay</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {plan.dueTodayWords.length}
          </div>
          <span className="text-[11px] text-purple-500 font-medium">Đúng chu kỳ Spaced Rep</span>
        </button>

        {/* Difficult / Lapsed */}
        <button
          type="button"
          onClick={() => setViewFilter('difficult')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            viewFilter === 'difficult'
              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Cần củng cố</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {plan.difficultWords.length}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Từng quên / Hay nhầm</span>
        </button>

        {/* New Words */}
        <button
          type="button"
          onClick={() => setViewFilter('new')}
          className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
            viewFilter === 'new'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Từ mới mục tiêu</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {plan.newWords.length}
          </div>
          <span className="text-[11px] text-blue-500 font-medium">Chỉ tiêu: {activeLang.dailyNewWordTarget}/ngày</span>
        </button>
      </div>

      {/* 3. SMART SESSION CONFIGURATOR (BITE-SIZED BATCHES) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Tùy chỉnh Phiên học Ngắn (Micro-Sessions)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chia nhỏ danh sách thành các đợt 10-20 từ để não bộ tiếp nhận hiệu quả nhất mà không bị quá tải.
            </p>
          </div>

          {/* Batch Size Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[10, 15, 20, 25].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedBatchSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedBatchSize === size
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {size} từ
              </button>
            ))}
          </div>
        </div>

        {/* Method / Active Recall Mode Picker */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Phương pháp Active Recall cho phiên này:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'flashcard', name: `Flashcard ${foreignLangShort} → Việt`, icon: '🎴', desc: 'Chủ động nhớ nghĩa' },
              { id: 'flashcard_reverse', name: `Đảo chiều: Việt → ${foreignLangShort}`, icon: '🔄', desc: 'Nhớ từ & phát âm' },
              { id: 'quiz', name: 'Trắc nghiệm 4 đáp án', icon: '📝', desc: 'Quiz chọn nghĩa đúng' },
              { id: 'spelling', name: 'Luyện gõ chính tả', icon: '✍️', desc: 'Nghe phát âm gõ từ' },
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
                className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[85px] ${
                  selectedMode === m.id
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400">▶ Bắt đầu</span>
                </div>
                <div>
                  <span className="text-xs font-bold block line-clamp-1">{m.name}</span>
                  <span className="text-[10px] text-slate-400 block">{m.desc}</span>
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
              {batches.map((batch, idx) => (
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
            {displayWords.map(w => {
              const retention = estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses);
              
              const getRetentionBadge = () => {
                if (w.state === 'new') {
                  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">🌱 Chưa học</span>;
                }
                if (retention < 60) {
                  return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Nguy cơ quên: {retention}%</span>;
                }
                if (retention < 80) {
                  return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Đang giảm: {retention}%</span>;
                }
                return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Ổn định: {retention}%</span>;
              };

              return (
                <div
                  key={w.id}
                  className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakWord(w.term, activeLang.speechVoiceCode)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer shrink-0"
                      title="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => onOpenWordDetail(w)}
                          className="font-black text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                        >
                          {w.term}
                        </span>
                        {w.partOfSpeech && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {w.partOfSpeech}
                          </span>
                        )}
                        {w.phonetic && (
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            {w.phonetic}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {w.meaning}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {getRetentionBadge()}

                    <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
                      Khoảng cách: {w.intervalDays}d
                    </span>

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

    </div>
  );
}
