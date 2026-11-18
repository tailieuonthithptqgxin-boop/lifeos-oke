import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Sparkles,
  Flame,
  AlertTriangle,
  Snowflake,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { toast } from '../../lib/toast';
import { soundEngine } from '../../lib/soundEngine';
import { useSmoothCounter } from '../../lib/celebrationEngine';

interface FeatureItem {
  featureKey: string;
  featureName: string;
  category: string;
  uniqueUsers: number;
  userPercentage: number;
  totalUses: number;
  repeatRatePercent: number;
  totalDurationMinutes: number;
  tag: 'HOT' | 'OPTIMIZE' | 'COLD' | 'STABLE';
  tagLabel: string;
  tagColor: string;
}

interface SummaryData {
  totalUsers: number;
  online15m: number;
  active7d: number;
  retentionRatePercent: number;
}

interface StudyRoomsAnalyticsData {
  currentTimeCategory: string;
  peakHoursSummary: Array<{ slot: string; label: string; percentage: number; note: string }>;
  activeRooms: Array<{ id: string; name: string; topic: string; participantCount: number; isSystemRoom: boolean; pomodoroPhase: string; pomodoroRunning: boolean }>;
  totalLiveDesks: number;
  totalCommunityStudyMinutes: number;
  topUsers: Array<{ id: string; name: string; email: string; avatar?: string; totalStudyMinutes: number }>;
}

export function AdminFeatureAnalyticsTab() {
  const [summary, setSummary] = useState<SummaryData>({
    totalUsers: 0,
    online15m: 0,
    active7d: 0,
    retentionRatePercent: 0
  });
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Smooth Count-Up Transition for KPI Numbers
  const animatedTotalUsers = useSmoothCounter(summary.totalUsers, 400);
  const animatedOnline15m = useSmoothCounter(summary.online15m, 400);
  const animatedActive7d = useSmoothCounter(summary.active7d, 400);
  const animatedRetention = useSmoothCounter(summary.retentionRatePercent, 400);
  const [studyAnalytics, setStudyAnalytics] = useState<StudyRoomsAnalyticsData | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [res, studyRes] = await Promise.all([
        apiCall<{
          success: boolean;
          summary: SummaryData;
          features: FeatureItem[];
        }>('/api/analytics/admin/features'),
        apiCall<{
          success: boolean;
          analytics: StudyRoomsAnalyticsData;
        }>('/api/analytics/admin/study-rooms')
      ]);

      if (res && res.success) {
        setSummary(res.summary);
        setFeatures(res.features || []);
      } else {
        toast.error('Không thể tải dữ liệu phân tích chức năng.');
      }

      if (studyRes && studyRes.success) {
        setStudyAnalytics(studyRes.analytics);
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    soundEngine.playPop();
    fetchAnalytics();
  };

  const categories = ['ALL', ...Array.from(new Set(features.map((f) => f.category)))];

  const filteredFeatures = filterCategory === 'ALL'
    ? features
    : features.filter((f) => f.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header Info & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-transparent p-4 sm:p-5 rounded-3xl border border-indigo-100 dark:border-indigo-950/60">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Phân Tích Mức Độ Sử Dụng Chức Năng</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Đo lường hành vi người dùng, tỷ lệ quay lại và nhận diện chức năng mũi nhọn cần tập trung đầu tư
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Thẻ Số Liệu Tổng Quan (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Tổng người dùng */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng người dùng</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {animatedTotalUsers}
          </div>
          <div className="text-[11px] text-slate-400">Toàn bộ tài khoản trên web</div>
        </div>

        {/* KPI 2: Đang hoạt động (15p qua) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Đang Online</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {animatedOnline15m}
          </div>
          <div className="text-[11px] text-slate-400">Hoạt động trong 15 phút qua</div>
        </div>

        {/* KPI 3: Hoạt động 7 ngày */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Hoạt động tuần
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
            {animatedActive7d}
          </div>
          <div className="text-[11px] text-slate-400">Đã vào web trong 7 ngày gần nhất</div>
        </div>

        {/* KPI 4: Tỷ lệ giữ chân người dùng */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Tỷ lệ giữ chân
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            {animatedRetention}%
          </div>
          <div className="text-[11px] text-slate-400">Tỷ lệ người dùng duy trì thường xuyên</div>
        </div>
      </div>

      {/* 🦉 Phân Tích Phòng Học Ảo (Virtual Study Rooms Analytics Card) */}
      {studyAnalytics && (
        <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-indigo-950 via-slate-900 to-purple-950 text-white border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🦉</span>
              <div>
                <h4 className="font-black text-sm sm:text-base text-white">
                  Phân Tích Phòng Học Ảo & Bàn Học Trạng Thái Động
                </h4>
                <p className="text-[11px] text-indigo-200">
                  Số liệu thời gian thực: Phòng đông nhất, khung giờ cao điểm và tổng số giờ học cộng đồng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{studyAnalytics.totalLiveDesks} bạn đang ngồi bàn</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
                {studyAnalytics.currentTimeCategory}
              </span>
            </div>
          </div>

          {/* 3 Blocks: Phòng Học Đông Nhất | Khung Giờ Cao Điểm | Top Chăm Chỉ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Block 1: Danh sách phòng học trực tiếp */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-black text-indigo-300 uppercase tracking-wider block">
                Phòng Học Đang Hoạt Động
              </span>
              <div className="space-y-1.5">
                {studyAnalytics.activeRooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                    <span className="font-bold text-white truncate max-w-[170px]">{r.name}</span>
                    <span className="font-extrabold text-emerald-400 shrink-0">🟢 {r.participantCount} bạn</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block 2: Khung Giờ Cao Điểm */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                Khung Giờ Nhiều Người Học Nhất
              </span>
              <div className="space-y-2">
                {studyAnalytics.peakHoursSummary.map((h) => (
                  <div key={h.slot} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white">{h.label}</span>
                      <span className="font-black text-amber-300">{h.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${h.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Block 3: Tổng Phút & Top Chăm Chỉ */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wider block">
                Tổng Giờ Tích Lũy Toàn Web
              </span>
              <div className="text-2xl font-black text-purple-300">
                {Math.floor(studyAnalytics.totalCommunityStudyMinutes / 60)} giờ {studyAnalytics.totalCommunityStudyMinutes % 60}p
              </div>
              <p className="text-[10px] text-slate-400">
                Tích lũy từ tất cả các ca học Pomodoro trên hệ thống
              </p>
              <div className="pt-1 border-t border-white/10">
                <span className="text-[11px] text-indigo-300 font-bold block mb-1">Top chăm chỉ nhất:</span>
                {studyAnalytics.topUsers.slice(0, 2).map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between text-xs py-0.5">
                    <span className="truncate text-slate-300">#{i + 1} {u.name}</span>
                    <span className="font-bold text-amber-300">{Math.floor(u.totalStudyMinutes / 60)}g</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setFilterCategory(cat);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer active:scale-95 ${
              filterCategory === cat
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {cat === 'ALL' ? 'Tất cả phân hệ' : cat}
          </button>
        ))}
      </div>

      {/* Bảng Xếp Hạng Chức Năng (Ranked List) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            Bảng Xếp Hạng Độ Ưa Chuộng Chức Năng ({filteredFeatures.length})
          </h4>
          <span className="text-xs text-slate-400 font-medium">Sắp xếp từ nhiều người dùng nhất</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải xếp hạng tính năng...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
            Không có dữ liệu chức năng nào.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeatures.map((item, idx) => {
              // Badge style mapping
              let badgeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200';
              if (item.tag === 'HOT') {
                badgeBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
              } else if (item.tag === 'OPTIMIZE') {
                badgeBg = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
              } else if (item.tag === 'COLD') {
                badgeBg = 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
              } else if (item.tag === 'STABLE') {
                badgeBg = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
              }

              return (
                <div
                  key={item.featureKey}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  {/* Top Row: Rank, Title, Category & Evaluation Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-black text-xs shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {item.featureName}
                          </h5>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Evaluation Tag */}
                    <div className="shrink-0">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${badgeBg}`}>
                        {item.tagLabel}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar: % Users over Total */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500">Tỷ lệ người dùng đã trải nghiệm:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {item.userPercentage}% ({item.uniqueUsers}/{summary.totalUsers} người)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.userPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* 3 Specific Key Metrics Cards */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                        Người đã dùng
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                        {item.uniqueUsers}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                        Tổng lượt dùng
                      </span>
                      <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                        {item.totalUses}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                        Tỷ lệ quay lại (2+)
                      </span>
                      <span
                        className={`text-sm sm:text-base font-black mt-0.5 block ${
                          item.repeatRatePercent >= 45
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.repeatRatePercent >= 25
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.repeatRatePercent}%
                      </span>
                    </div>
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
