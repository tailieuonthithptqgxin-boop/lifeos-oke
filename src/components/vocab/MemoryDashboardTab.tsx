import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Brain, Award, AlertTriangle, CheckCircle2, 
  Clock, ShieldAlert, Sparkles, Activity, Layers, ArrowUpRight,
  Info, BarChart2, Calendar, Play, Volume2, HelpCircle
} from 'lucide-react';
import { 
  VocabWord, 
  LearningLanguage, 
  speakWord,
  estimateRetentionProbability,
  calculateMemoryStability,
  generateForgettingCurvePoints
} from '../../lib/vocabEngine';

interface MemoryDashboardTabProps {
  activeLang: LearningLanguage;
  allWords: VocabWord[];
  onStartStudyWords: (words: VocabWord[]) => void;
  onOpenWordDetail: (word: VocabWord) => void;
}

export function MemoryDashboardTab({
  activeLang,
  allWords,
  onStartStudyWords,
  onOpenWordDetail
}: MemoryDashboardTabProps) {
  const [selectedWordForCurve, setSelectedWordForCurve] = useState<VocabWord | null>(null);

  // High-level Retention Analytics
  const metrics = useMemo(() => {
    let totalRetention = 0;
    let totalStability = 0;
    let totalReviews = 0;
    let successfulReviews = 0;

    let tierMastered = 0;  // interval >= 30
    let tierStable = 0;    // interval 7 - 29
    let tierLearning = 0;  // interval 1 - 6
    let tierAtRisk = 0;    // retention < 60% or lapses >= 2

    const activeWords = allWords.filter(w => w.state !== 'new');

    for (const w of activeWords) {
      const ret = estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses);
      const stab = calculateMemoryStability(w.intervalDays, w.easeFactor, w.lapses);
      
      totalRetention += ret;
      totalStability += stab;

      if (w.intervalDays >= 30) tierMastered++;
      else if (w.intervalDays >= 7) tierStable++;
      else tierLearning++;

      if (ret < 60 || w.lapses >= 2) tierAtRisk++;

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

    // Top words at highest risk of forgetting (Lowest retention)
    const atRiskWords = [...activeWords]
      .map(w => ({
        word: w,
        retention: estimateRetentionProbability(w.lastReviewedAt, w.intervalDays, w.easeFactor, w.lapses)
      }))
      .filter(item => item.retention < 75 || item.word.lapses >= 2)
      .sort((a, b) => a.retention - b.retention)
      .slice(0, 8);

    // Top mastered words (Highest interval)
    const topMasteredWords = [...activeWords]
      .sort((a, b) => b.intervalDays - a.intervalDays)
      .slice(0, 8);

    return {
      activeCount: activeWords.length,
      avgRetention,
      avgStability,
      accuracyRate,
      totalReviews,
      tierMastered,
      tierStable,
      tierLearning,
      tierAtRisk,
      atRiskWords,
      topMasteredWords
    };
  }, [allWords]);

  // Curve data points for visualization (cohort or selected word)
  const curvePoints = useMemo(() => {
    const stability = selectedWordForCurve
      ? calculateMemoryStability(selectedWordForCurve.intervalDays, selectedWordForCurve.easeFactor, selectedWordForCurve.lapses)
      : Math.max(1, metrics.avgStability);
    return generateForgettingCurvePoints(stability, 30);
  }, [selectedWordForCurve, metrics.avgStability]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. HERO HEADER */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Mô hình Đường cong quên Ebbinghaus
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Độ lưu giữ TB: {metrics.avgRetention}%
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Sức khỏe Trí nhớ & Lưu giữ Dài hạn
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Phân tích tốc độ phân rã trí nhớ cá nhân hóa theo từng từ vựng. Đánh giá khả năng chủ động nhớ lại (Active Recall) và ổn định ký ức.
          </p>
        </div>

        {/* Disclaimer Pill */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 max-w-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Info className="w-3.5 h-3.5" /> Minh bạch khoa học:
          </div>
          <p className="text-[11px] text-slate-400">
            Đường cong quên là mô hình hàm mũ ước tính từ dữ liệu ôn tập thực tế, không phải phép đo sinh học trực tiếp của não bộ.
          </p>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Tỷ lệ lưu giữ TB</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{metrics.avgRetention}%</span>
            <span className="text-xs font-bold text-emerald-600">Ổn định</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Xác suất nhớ khi gặp lại</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Độ bền trí nhớ (S)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{metrics.avgStability}</span>
            <span className="text-xs font-bold text-slate-500">ngày</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Bán rã ký ức trung bình</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Độ chính xác Recall</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{metrics.accuracyRate}%</span>
            <span className="text-xs font-bold text-slate-500">{metrics.totalReviews} lượt</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Đánh giá Good hoặc Easy</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Nguy cơ quên</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-black ${metrics.tierAtRisk > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700'}`}>
              {metrics.tierAtRisk}
            </span>
            <span className="text-xs font-bold text-slate-500">từ</span>
          </div>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">Cần ôn củng cố gấp</span>
        </div>
      </div>

      {/* 3. INTERACTIVE FORGETTING CURVE VISUALIZATION */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              Biểu đồ Đường cong Quên (Retention Decay Curve)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedWordForCurve
                ? `Mô phỏng cho từ vựng: "${selectedWordForCurve.term}" (Độ bền S = ${calculateMemoryStability(selectedWordForCurve.intervalDays, selectedWordForCurve.easeFactor, selectedWordForCurve.lapses)} ngày)`
                : `Mô phỏng trung bình cho kho từ (${metrics.activeCount} từ đang học, S trung bình = ${metrics.avgStability} ngày)`
              }
            </p>
          </div>

          {selectedWordForCurve && (
            <button
              type="button"
              onClick={() => setSelectedWordForCurve(null)}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              ✕ Xem đường cong trung bình
            </button>
          )}
        </div>

        {/* SVG Curve Plot */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
          <div className="h-56 w-full relative flex items-end">
            
            {/* Horizontal guideline markers */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
              <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full flex justify-between">
                <span>100% (Vừa ôn xong)</span>
              </div>
              <div className="border-b border-dashed border-emerald-300/40 dark:border-emerald-800/40 w-full flex justify-between text-emerald-600">
                <span>80% (Ngưỡng vàng Spaced Repetition)</span>
              </div>
              <div className="border-b border-dashed border-amber-300/40 dark:border-amber-800/40 w-full flex justify-between text-amber-600">
                <span>50% (Bắt đầu suy giảm nghiêm trọng)</span>
              </div>
              <div className="border-b border-slate-200 dark:border-slate-800 w-full flex justify-between">
                <span>0%</span>
              </div>
            </div>

            {/* Bars & Curve Points */}
            <div className="relative z-10 w-full flex items-end justify-between gap-1 sm:gap-2 px-2 pt-6">
              {curvePoints.map((pt, idx) => {
                const heightPercent = Math.max(10, pt.retentionPercent);
                const isOptimalRecallPoint = pt.retentionPercent >= 75 && pt.retentionPercent <= 90;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition">
                      {pt.retentionPercent}%
                    </span>

                    <div className="w-full bg-slate-200/50 dark:bg-slate-800 rounded-t-lg h-36 flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isOptimalRecallPoint
                            ? 'bg-gradient-to-t from-purple-600 to-emerald-500 shadow-xs'
                            : pt.retentionPercent >= 80
                            ? 'bg-gradient-to-t from-indigo-600 to-blue-500'
                            : pt.retentionPercent >= 50
                            ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                            : 'bg-gradient-to-t from-rose-600 to-rose-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      {pt.day === 0 ? '0d' : `${pt.day}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Vùng tối ưu ôn tập (80-90%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Bắt đầu quên (50-79%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                Cần học lại (&lt;50%)
              </span>
            </div>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium italic">
              💡 Thuật toán lên lịch ôn khi từ vừa chạm vùng 80-85% để đạt hiệu quả tối đa.
            </span>
          </div>
        </div>
      </div>

      {/* 4. MEMORY STABILITY COHORTS (PHÂN TẦNG ĐỘ BỀN) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Phân tầng Độ bền Ký ức (Memory Stability Cohorts)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Thành thạo dài hạn</span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{metrics.tierMastered} từ</span>
            <p className="text-[11px] text-emerald-600/80">Khoảng cách ôn ≥ 30 ngày. Đã neo vững vào vỏ não.</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Đang ổn định tốt</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-400">{metrics.tierStable} từ</span>
            <p className="text-[11px] text-blue-600/80">Khoảng cách ôn 7 - 29 ngày. Cần vài lần củng cố nữa.</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Đang nạp & Ngắn hạn</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{metrics.tierLearning} từ</span>
            <p className="text-[11px] text-amber-600/80">Khoảng cách ôn 1 - 6 ngày. Đang trong giai đoạn nhạy cảm.</p>
          </div>
        </div>
      </div>

      {/* 5. TOP AT-RISK WORDS (BÁO ĐỘNG ĐỎ) & TOP MASTERED */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* At-risk list */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-4 h-4" /> Từ có nguy cơ quên cao nhất
              </h4>
              <p className="text-xs text-slate-500">Tỷ lệ lưu giữ ước tính thấp hoặc số lần quên cao.</p>
            </div>
            {metrics.atRiskWords.length > 0 && (
              <button
                type="button"
                onClick={() => onStartStudyWords(metrics.atRiskWords.map(i => i.word))}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Ôn ngay ({metrics.atRiskWords.length})
              </button>
            )}
          </div>

          {metrics.atRiskWords.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              🎉 Tuyệt vời! Không có từ nào đang ở mức nguy cơ quên cao.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.atRiskWords.map(({ word: w, retention }) => (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => setSelectedWordForCurve(w)}
                        className="font-black text-xs text-slate-900 dark:text-white hover:text-purple-600 cursor-pointer"
                        title="Bấm để xem đường cong quên của từ này"
                      >
                        {w.term}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{w.partOfSpeech}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{w.meaning}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      Còn {retention}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Mastered List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 text-emerald-600">
              <Award className="w-4 h-4" /> Từ ghi nhớ vững chắc nhất
            </h4>
            <p className="text-xs text-slate-500">Khoảng cách ôn tập xa nhất, ổn định trí nhớ cao.</p>
          </div>

          {metrics.topMasteredWords.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              Chưa có từ nào đạt mốc thành thạo vững chắc. Hãy tiếp tục ôn tập đều đặn nhé!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.topMasteredWords.map(w => (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        onClick={() => setSelectedWordForCurve(w)}
                        className="font-black text-xs text-slate-900 dark:text-white hover:text-purple-600 cursor-pointer"
                        title="Bấm để xem đường cong quên của từ này"
                      >
                        {w.term}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{w.partOfSpeech}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{w.meaning}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Cách ôn: {w.intervalDays} ngày
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(w)}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
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

    </div>
  );
}
