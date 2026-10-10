import React from 'react';
import { Trash2 } from 'lucide-react';
import { DecisionItem } from '../../lib/types';

interface DecisionListTabProps {
  filteredDecisions: DecisionItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterStatus: string;
  setFilterStatus: (st: string) => void;
  onSelectDecision: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onDeleteDecision: (id: string) => void;
}

export const DecisionListTab: React.FC<DecisionListTabProps> = ({
  filteredDecisions,
  searchQuery,
  setSearchQuery,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  onSelectDecision,
  onNavigateTab,
  onDeleteDecision
}) => {
  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input 
            type="text"
            placeholder="Tìm kiếm quyết định, vấn đề, tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-full md:w-72 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">Tất cả Category</option>
            <option value="Purchases">Purchases (Sắm sửa)</option>
            <option value="Career">Career (Sự nghiệp)</option>
            <option value="Finance">Finance (Tài chính)</option>
            <option value="Study">Study (Học tập)</option>
            <option value="Projects">Projects (Dự án)</option>
            <option value="Personal">Personal (Cá nhân)</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="Collecting Information">Collecting Info</option>
            <option value="Comparing">Comparing</option>
            <option value="Decided">Decided</option>
            <option value="Implementing">Implementing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Hiển thị <span className="font-bold text-slate-900 dark:text-white">{filteredDecisions.length}</span> quyết định
        </div>
      </div>

      {/* Decisions List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(filteredDecisions || []).map(dec => {
          const selOpt = (dec.options || []).find(o => o.id === dec.selectedOptionId) || dec.options?.[0];
          return (
            <div 
              key={dec.id}
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900">
                    {dec.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      dec.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' :
                      dec.status === 'Decided' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}>
                      {dec.status}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                      {dec.threshold} Analysis
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-snug">{dec.title}</h3>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Bài toán (Problem):</span>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{dec.problemStatement}</p>
                </div>

                {dec.constraints && dec.constraints.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Constraints:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {dec.constraints.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] rounded-md">
                          • {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Selected / Best Option:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{selOpt?.name || 'Chưa chọn'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button type="button"
                    onClick={() => {
                      onSelectDecision(dec.id);
                      onNavigateTab('matrix');
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Mở Matrix
                  </button>

                  <button type="button"
                    onClick={() => onDeleteDecision(dec.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all cursor-pointer"
                    title="Xóa Quyết định"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
