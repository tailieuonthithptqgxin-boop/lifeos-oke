import React from 'react';
import { 
  Clock, AlertTriangle, CheckCircle2, Award, TrendingUp, DollarSign,
  Activity, AlertCircle, ChevronRight, Calendar, ArrowRight, FolderSymlink,
  Target, Briefcase, SlidersHorizontal 
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { DecisionItem, DecisionRule } from '../../lib/types';

interface DecisionDashboardTabProps {
  decisions: DecisionItem[];
  activeCount: number;
  highRiskCount: number;
  completedCount: number;
  avgDecisionScore: string;
  avgSuccessRate: number;
  totalCost: number;
  dailyCapacity: number;
  totalPlannedHours: number;
  workloadPercentage: number;
  decisionRules: DecisionRule[];
  onSelectDecision: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DecisionDashboardTab: React.FC<DecisionDashboardTabProps> = ({
  decisions,
  activeCount,
  highRiskCount,
  completedCount,
  avgDecisionScore,
  avgSuccessRate,
  totalCost,
  dailyCapacity,
  totalPlannedHours,
  workloadPercentage,
  decisionRules,
  onSelectDecision,
  onNavigateTab
}) => {
  return (
    <div className="space-y-6">
      {/* Executive Key Metrics (6 Minimalist Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Đang chờ xử lý</span>
            <Clock className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{activeCount}</p>
          <span className="text-[11px] text-slate-400 font-normal block">Cần xử lý gần nhất</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Rủi ro cao</span>
            <AlertTriangle className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{highRiskCount}</p>
          <span className="text-[11px] text-slate-400 font-normal block">Critical & High priority</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Đã chốt / Review</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{completedCount}</p>
          <span className="text-[11px] text-slate-400 font-normal block">Hoàn tất theo dõi</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Điểm QĐ Trung Bình</span>
            <Award className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {avgDecisionScore} <span className="text-xs font-normal text-slate-400 font-sans">/ 10</span>
          </p>
          <span className="text-[11px] text-slate-400 font-normal block">Chất lượng ma trận</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Tỷ lệ Thành công</span>
            <TrendingUp className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{avgSuccessRate}%</p>
          <span className="text-[11px] text-slate-400 font-normal block">Theo kết quả thực tế</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">Chi phí Dự kiến</span>
            <DollarSign className="w-4 h-4 text-slate-400 stroke-[1.7]" />
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white truncate">
            {formatCurrency(totalCost)}
          </p>
          <span className="text-[11px] text-slate-400 font-normal block">Các phương án đã chọn</span>
        </div>
      </div>

      {/* Decision Lifecycle Pipeline (Horizontal Stepper) */}
      <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 stroke-[1.8]" />
            Quy trình ra Quyết định (Decision Lifecycle Pipeline)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {decisions.length} quyết định
          </span>
        </div>

        <div className="relative pt-1 pb-1">
          {/* Connecting Line behind dots */}
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-[1px] bg-slate-200 dark:bg-slate-800 -z-0 hidden md:block" />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2 relative z-10">
            {[
              { status: 'Draft', label: 'Bản thảo' },
              { status: 'Collecting Information', label: 'Thu thập tin' },
              { status: 'Comparing', label: 'So sánh' },
              { status: 'Ready to Decide', label: 'Sẵn sàng chọn' },
              { status: 'Decided', label: 'Đã chọn' },
              { status: 'Implementing', label: 'Thực thi' },
              { status: 'Reviewing', label: 'Đánh giá' },
              { status: 'Completed', label: 'Hoàn thành' },
              { status: 'Cancelled', label: 'Hủy bỏ' },
            ].map(st => {
              const count = decisions.filter(d => d.status === st.status).length;
              const hasItems = count > 0;
              return (
                <div 
                  key={st.status} 
                  className={`p-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    hasItems 
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-xs' 
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasItems ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                      {st.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Urgent Decisions + Cross-Module Impacts (2x2 Grid) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent & Important Decisions */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Quyết định Quan trọng & Sắp đến hạn
              </h3>
              <button type="button" 
                onClick={() => onNavigateTab('list')} 
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Xem tất cả ({decisions.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {(decisions || []).slice(0, 3).map(dec => {
                const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
                return (
                  <div 
                    key={dec.id}
                    className="p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          dec.importance === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300' :
                          dec.importance === 'High' ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {dec.importance}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-md">
                          {dec.category}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" /> Hạn: {dec.deadline}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{dec.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{dec.problemStatement}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">Điểm số</span>
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {selOpt?.finalScore || 8.0}/10
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => {
                          onSelectDecision(dec.id);
                          onNavigateTab('matrix');
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Phân tích Matrix <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-Module Impacts (2x2 Minimal White Cards) */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <FolderSymlink className="w-4 h-4 text-emerald-600 stroke-[1.8]" />
              Ảnh hưởng Liên kết (Cross-Module Impacts)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Finance Impact</span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Chi phí đầu tư & Dòng tiền</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">Ảnh hưởng trực tiếp đến ngân sách tháng & Quỹ dự phòng an toàn</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Goal Alignment</span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Liên kết Mục tiêu Dài hạn</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">Đo lường mức độ tương thích với OKRs học tập & lộ trình thăng tiến</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Project Execution</span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Đầu ra Thực thi Dự án</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">Tự động kích hoạt các Task và Project liên quan trong hệ thống</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Capacity Impact</span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Thời gian & Quỹ sức làm việc</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">Tác động tải làm việc ước tính 20-30h/tháng đối với người dùng</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Resource Workload Monitor & Rules */}
        <div className="space-y-6">
          {/* Resource Workload Monitor */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 stroke-[1.8]" />
              Resource Workload Monitor
            </h3>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Công suất hàng ngày (Daily Capacity)</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">{dailyCapacity}h / ngày</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Tổng giờ task đã lên lịch</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-white">{totalPlannedHours}h</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Công suất Nhóm hiện tại</span>
                <span className={`font-bold font-mono ${workloadPercentage > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {workloadPercentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${workloadPercentage > 100 ? 'bg-red-500' : 'bg-emerald-600'}`}
                  style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                />
              </div>
            </div>

            {workloadPercentage > 100 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Cảnh báo quá tải thời gian. Hãy cân nhắc trì hoãn quyết định chưa khẩn cấp!</span>
              </div>
            )}
          </div>

          {/* Quick Decision Rules List */}
          <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-500 stroke-[1.8]" />
                Quy tắc Ra Quyết định
              </h3>
              <button type="button" onClick={() => onNavigateTab('rules')} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline cursor-pointer">
                Quản lý Rules
              </button>
            </div>

            <div className="space-y-2.5">
              {decisionRules.map(rule => (
                <div key={rule.id} className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span className="truncate max-w-[200px]">{rule.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${rule.enabled ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      {rule.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate">{rule.condition}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
