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
    <div className="space-y-8">
      {/* Executive Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Đang chờ & Đánh giá
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{activeCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Cần xử lý gần nhất</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Rủi ro cao / Quan trọng
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{highRiskCount}</p>
          <span className="text-[11px] text-red-600 font-medium">Critical & High</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Đã ra quyết định / Review
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{completedCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Hoàn thành theo dõi</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-blue-500" />
            Avg Decision Score
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{avgDecisionScore} <span className="text-xs font-normal text-slate-400">/ 10</span></p>
          <span className="text-[11px] text-blue-600 font-medium">Chất lượng ma trận</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            Success Rate
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{avgSuccessRate}%</p>
          <span className="text-[11px] text-purple-600 font-medium">Theo kết quả thực tế</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Tổng Chi phí Dự kiến
          </span>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalCost)}</p>
          <span className="text-[11px] text-slate-500 font-medium">Các phương án chọn</span>
        </div>
      </div>

      {/* Decision Pipeline Status Breakdown */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Quy trình ra Quyết định (Decision Lifecycle Pipeline)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { status: 'Draft', label: 'Bản thảo', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
            { status: 'Collecting Information', label: 'Thu thập tin', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
            { status: 'Comparing', label: 'Ma trận So sánh', color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
            { status: 'Ready to Decide', label: 'Sẵn sàng chọn', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
            { status: 'Decided', label: 'Đã chọn', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
            { status: 'Implementing', label: 'Thực thi', color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' },
            { status: 'Reviewing', label: 'Review Thực tế', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
            { status: 'Completed', label: 'Hoàn thành', color: 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300' },
            { status: 'Cancelled', label: 'Hủy bỏ', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' },
          ].map(st => {
            const count = decisions.filter(d => d.status === st.status).length;
            return (
              <div key={st.status} className={`p-3 rounded-xl border border-slate-100 dark:border-slate-800 ${st.color} text-center`}>
                <p className="text-xs font-semibold">{st.label}</p>
                <p className="text-lg font-black mt-1">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Important Decisions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Quyết định Quan trọng & Sắp đến hạn
              </h3>
              <button type="button" 
                onClick={() => onNavigateTab('list')} 
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          dec.importance === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300' :
                          dec.importance === 'High' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {dec.importance} Importance
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md">
                          {dec.category}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Hạn ra QĐ: {dec.deadline}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{dec.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{dec.problemStatement}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">Best Score</span>
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          {selOpt?.finalScore || 8.0}/10
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => {
                          onSelectDecision(dec.id);
                          onNavigateTab('matrix');
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Phân tích Matrix <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-module Impact Center */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <FolderSymlink className="w-5 h-5 text-purple-600" />
              Ảnh hưởng Liên liên kết (Cross-Module Impacts)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-1">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Finance Impact
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Chi phí đầu tư</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Ảnh hưởng trực tiếp ngân sách tháng & Quỹ tiết kiệm</p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 space-y-1">
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                  <Target className="w-4 h-4 text-blue-600" /> Goal Alignment
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Liên kết Mục tiêu</p>
                <p className="text-xs text-blue-700 dark:text-blue-400">Tác động tiến độ Goals học tập & sự nghiệp</p>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 space-y-1">
                <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-indigo-600" /> Project Execution
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Đầu ra Dự án</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">Sinh ra các Task và Project thực thi trực tiếp</p>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900 space-y-1">
                <span className="text-xs font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-purple-600" /> Capacity Impact
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Thời gian & Quỹ sức</p>
                <p className="text-xs text-purple-700 dark:text-purple-400">Ảnh hưởng dung lượng làm việc 20-30h/tháng</p>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity & System Monitor Sidebar */}
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Resource Workload Monitor
            </h3>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">Daily Capacity</span>
                <span className="font-bold text-slate-900 dark:text-white">{dailyCapacity}h / ngày</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">Total Planned Tasks</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalPlannedHours}h</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-400">Tải công việc hiện tại</span>
                <span className={`font-bold ${workloadPercentage > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {workloadPercentage}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${workloadPercentage > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                />
              </div>
            </div>

            {workloadPercentage > 100 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-900 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Hệ thống cảnh báo quá tải thời gian. Xem xét trì hoãn quyết định chưa khẩn cấp!</span>
              </div>
            )}
          </div>

          {/* Quick Decision Rules List */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                Quy tắc Ra quyết định
              </h3>
              <button type="button" onClick={() => onNavigateTab('rules')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">
                Quản lý Rules
              </button>
            </div>

            <div className="space-y-2.5">
              {decisionRules.map(rule => (
                <div key={rule.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span>{rule.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${rule.enabled ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                      {rule.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{rule.condition}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
