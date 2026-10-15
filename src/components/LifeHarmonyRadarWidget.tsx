import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { 
  Sparkles, 
  Trophy, 
  Info, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Calculator, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { LifeHarmonyOverview, LifeHarmonyDimension } from '../lib/lifeHarmonyEngine';

export interface LifeHarmonyRadarWidgetProps {
  harmony: LifeHarmonyOverview;
  onExploreGoals?: () => void;
  className?: string;
}

export const LifeHarmonyRadarWidget: React.FC<LifeHarmonyRadarWidgetProps> = ({
  harmony,
  onExploreGoals,
  className = ''
}) => {
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [selectedDimForTrace, setSelectedDimForTrace] = useState<LifeHarmonyDimension | null>(null);

  const getScoreBadgeColor = (score: number | null) => {
    if (score === null) return 'from-slate-400 to-slate-500 text-white';
    if (score >= 80) return 'from-emerald-400 to-teal-500 text-white';
    if (score >= 60) return 'from-purple-400 to-indigo-500 text-white';
    return 'from-amber-400 to-orange-500 text-white';
  };

  const isAllEmpty = harmony.evaluatedDimensionsCount === 0 || harmony.overallScore === null;

  // Radar data mapping
  const radarData = harmony.dimensions.map(d => ({
    subject: d.name + (d.status === 'insufficient_data' ? ' (Chưa có dữ liệu)' : ''),
    score: d.score ?? 0,
    fullMark: d.fullMark
  }));

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <>
      <div className={`rounded-xl p-5 sm:p-6 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs relative overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-2xs">
              <Trophy className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                  Chỉ Số Cân Bằng Cuộc Sống
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                  5D Harmony
                </span>
                <span className="text-[9px] font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Dữ liệu thực tế
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {harmony.rankTitle}
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedDimForTrace(null);
                setShowTraceModal(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-normal transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Xem chi tiết nguồn gốc và công thức tính điểm thực tế"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Minh bạch số liệu</span>
            </button>

            {/* Score Badge */}
            <div className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-semibold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {harmony.overallScore !== null ? <span className="font-mono tabular-nums">{harmony.overallScore}/100</span> : 'Chưa có điểm'}
              </span>
            </div>
          </div>
        </div>

        {/* BODY AREA */}
        {isAllEmpty ? (
          /* TRƯỜNG HỢP 1: TOÀN BỘ 5 CHIỀU CHƯA CÓ HOẠT ĐỘNG THỰC TẾ (COMPACT RADAR PLACEHOLDER) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-3 relative z-10">
            {/* Aesthetic Radar Placeholder on Left (7 cols) */}
            <div className="md:col-span-7 h-56 w-full flex flex-col items-center justify-center relative p-2">
              <svg viewBox="0 0 200 200" className="w-48 h-48 mx-auto overflow-visible opacity-75">
                {/* 3 Concentric Polygons */}
                <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="#e2e8f0" strokeWidth="1.2" className="dark:stroke-slate-800" />
                <polygon points="100,45 152,83 132,144 68,144 48,83" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-slate-800" />
                <polygon points="100,70 128,90 117,122 83,122 72,90" fill="none" stroke="#e2e8f0" strokeWidth="0.8" className="dark:stroke-slate-800" />
                {/* Axes */}
                <line x1="100" y1="100" x2="100" y2="20" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                <line x1="100" y1="100" x2="176" y2="75" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                <line x1="100" y1="100" x2="147" y2="165" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                <line x1="100" y1="100" x2="53" y2="165" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                <line x1="100" y1="100" x2="24" y2="75" stroke="#cbd5e1" strokeWidth="1" className="dark:stroke-slate-700" />
                {/* Translucent Active Area Placeholder */}
                <polygon points="100,60 135,92 110,135 70,128 65,85" fill="#10b981" fillOpacity="0.12" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
                {/* Labels */}
                <text x="100" y="12" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold">Năng suất</text>
                <text x="182" y="77" textAnchor="start" fill="#64748b" fontSize="8" fontWeight="bold">Kỷ luật</text>
                <text x="150" y="178" textAnchor="start" fill="#64748b" fontSize="8" fontWeight="bold">Phát triển</text>
                <text x="50" y="178" textAnchor="end" fill="#64748b" fontSize="8" fontWeight="bold">Tài chính</text>
                <text x="18" y="77" textAnchor="end" fill="#64748b" fontSize="8" fontWeight="bold">Mục tiêu</text>
              </svg>
              <span className="text-[10px] text-slate-400 font-medium mt-1">
                Ghi nhận hoạt động đầu tiên để hệ thống bắt đầu vẽ biểu đồ
              </span>
            </div>

            {/* 5-Dimension Cards on Right (5 cols) */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>5 Khía cạnh đời sống</span>
                <span className="text-amber-500 font-bold">Chờ số liệu</span>
              </div>
              {harmony.dimensions.map((dim) => (
                <div 
                  key={dim.dimension} 
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {dim.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      0/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300 dark:bg-slate-600 rounded-full w-0 transition-all duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TRƯỜNG HỢP 2 & 3: ĐÃ CÓ HOẠT ĐỘNG THỰC TẾ (Một phần hoặc đầy đủ) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-3 relative z-10">
            {/* Radar Visual */}
            <div className="md:col-span-7 h-60 w-full flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Điểm thực tế"
                    dataKey="score"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="#c084fc"
                    fillOpacity={0.45}
                  />
                </RadarChart>
              </ResponsiveContainer>

              <div className="text-[10px] text-slate-400 font-medium">
                {harmony.summaryInsight}
              </div>
            </div>

            {/* 5-Dimension Cards */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>Khía cạnh đời sống</span>
                <span>Tiến độ thực tế ({harmony.dataSufficiencyRatio})</span>
              </div>

              {harmony.dimensions.map((dim) => {
                const isCalculated = dim.status === 'calculated' && dim.score !== null;

                return (
                  <div 
                    key={dim.dimension} 
                    onClick={() => {
                      setSelectedDimForTrace(dim);
                      setShowTraceModal(true);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer hover:scale-[1.01] ${
                      isCalculated 
                        ? 'bg-purple-50/50 dark:bg-slate-800/50 border-purple-100/60 dark:border-slate-800' 
                        : 'bg-amber-50/30 dark:bg-amber-950/10 border-dashed border-amber-200/80 dark:border-amber-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">
                        {dim.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate">
                        {isCalculated ? dim.insight : (dim.sufficiencyReason || 'Chưa đủ dữ liệu')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-black shrink-0 ml-2">
                      {isCalculated ? (
                        <>
                          <span className="text-purple-600 dark:text-purple-400 text-xs">
                            {dim.score}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300">
                            {dim.grade}
                          </span>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Chưa đủ dữ liệu
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="text-[10px] text-slate-400 text-right pt-1 flex items-center justify-end gap-1">
                <Calendar className="w-3 h-3" />
                <span>Cập nhật: {formatDateTime(harmony.lastUpdated)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TRACEABILITY & AUDIT MODAL: "VÌ SAO TÔI CÓ ĐIỂM NÀY?" */}
      {showTraceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Minh Bạch Số Liệu 5D Harmony (Traceability)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nguồn dữ liệu & công thức tính toán thực tế cho từng khía cạnh
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowTraceModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-purple-900 dark:text-purple-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Nguyên tắc cam kết: Real Data Only</span>
                </div>
                <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-400">
                  Mọi điểm số trên biểu đồ 5D Harmony đều được tính toán trực tiếp từ dữ liệu hoạt động của chính tài khoản của bạn (không sử dụng mock, demo hay random number). Nếu một khía cạnh chưa có hoạt động, hệ thống sẽ giữ trạng thái <em>Chưa đủ dữ liệu</em> thay vì tạo điểm ảo.
                </p>
              </div>

              {/* Dimension Breakdown Accordion / List */}
              <div className="space-y-3">
                {harmony.dimensions
                  .filter(dim => !selectedDimForTrace || dim.dimension === selectedDimForTrace.dimension)
                  .map(dim => {
                    const isCalc = dim.status === 'calculated' && dim.score !== null;

                    return (
                      <div 
                        key={dim.dimension}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 dark:text-white text-sm">
                              {dim.name}
                            </span>
                            {isCalc ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                Đã tính toán ({dim.score}/100)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                <AlertCircle className="w-3 h-3" />
                                Chưa đủ dữ liệu
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">
                              Bản ghi: <strong>{dim.dataPointsCount}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Trace Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <div className="flex items-center gap-1 text-slate-500 font-bold">
                              <Database className="w-3.5 h-3.5 text-blue-500" />
                              <span>Nguồn dữ liệu thực:</span>
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 font-medium font-mono text-[10px]">
                              {dim.dataSource}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                            <div className="flex items-center gap-1 text-slate-500 font-bold">
                              <Calculator className="w-3.5 h-3.5 text-purple-500" />
                              <span>Công thức tính điểm:</span>
                            </div>
                            <div className="text-slate-800 dark:text-slate-200 font-medium">
                              {dim.calculationFormula}
                            </div>
                          </div>
                        </div>

                        {/* Trace Points List */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Các chỉ số đối soát thực tế:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dim.tracePoints.map((tp, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 text-[11px]"
                              >
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 block">{tp.label}</span>
                                  <span className="text-[10px] text-slate-400">{tp.description}</span>
                                </div>
                                <span className="font-black text-slate-900 dark:text-white shrink-0 ml-2">
                                  {tp.value} {tp.unit || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!isCalc && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <div>
                              <strong>Điều kiện kích hoạt:</strong> {dim.sufficiencyReason}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-400">
                Lần cập nhật cuối: {formatDateTime(harmony.lastUpdated)}
              </span>
              <button
                type="button"
                onClick={() => setShowTraceModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs cursor-pointer hover:opacity-90"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
