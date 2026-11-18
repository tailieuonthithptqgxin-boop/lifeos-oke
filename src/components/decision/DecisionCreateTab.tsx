import React from 'react';
import { Plus, ArrowRight, BrainCircuit, Target, Sparkles } from 'lucide-react';
import { DecisionCategory, DecisionImportance } from '../../lib/types';

interface DecisionCreateTabProps {
  newTitle: string;
  setNewTitle: (val: string) => void;
  newProblem: string;
  setNewProblem: (val: string) => void;
  newWhy: string;
  setNewWhy: (val: string) => void;
  newDeadline: string;
  setNewDeadline: (val: string) => void;
  newConstraints: string;
  setNewConstraints: (val: string) => void;
  newCategory: DecisionCategory;
  setNewCategory: (val: DecisionCategory) => void;
  newImportance: DecisionImportance;
  setNewImportance: (val: DecisionImportance) => void;
  newGoalId: string;
  setNewGoalId: (val: string) => void;
  newProjectId: string;
  setNewProjectId: (val: string) => void;
  goals: any[];
  projects: any[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const DecisionCreateTab: React.FC<DecisionCreateTabProps> = ({
  newTitle,
  setNewTitle,
  newProblem,
  setNewProblem,
  newWhy,
  setNewWhy,
  newDeadline,
  setNewDeadline,
  newConstraints,
  setNewConstraints,
  newCategory,
  setNewCategory,
  newImportance,
  setNewImportance,
  newGoalId,
  setNewGoalId,
  newProjectId,
  setNewProjectId,
  goals,
  projects,
  onSubmit,
  onCancel
}) => {
  return (
    <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80">
            <BrainCircuit className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Khởi Tạo Bài Toán Ra Quyết Định Chi Tiết
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Xác định rõ bản chất bài toán, mục đích, hạn chót và rào cản khống chế trước khi lập ma trận phương án.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 text-xs sm:text-sm">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Tên Quyết định (Decision Title) *
          </label>
          <input 
            type="text"
            required
            autoFocus
            placeholder="Ví dụ: Chọn Mua Laptop mới phục vụ Học tập & Lập trình"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              What? — Vấn đề cần giải quyết (Problem Statement) *
            </label>
            <textarea 
              required
              rows={3}
              placeholder="Tôi đang cần quyết định điều gì? Chi tiết thực trạng khó khăn hiện tại..."
              value={newProblem}
              onChange={e => setNewProblem(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Why? — Tại sao phải quyết định? (Context & Purpose)
            </label>
            <textarea 
              rows={3}
              placeholder="Lý do thúc đẩy? Nếu không quyết định ngay thì gặp trở ngại gì?"
              value={newWhy}
              onChange={e => setNewWhy(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs leading-relaxed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Hạn chót ra Quyết định (Deadline)
            </label>
            <input 
              type="date"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Lĩnh vực (Category)
            </label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as DecisionCategory)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="Purchases">Mua sắm (Purchases)</option>
              <option value="Career">Sự nghiệp (Career)</option>
              <option value="Finance">Tài chính (Finance)</option>
              <option value="Study">Học tập (Study)</option>
              <option value="Projects">Dự án (Projects)</option>
              <option value="Personal">Cá nhân (Personal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mức độ Quan trọng (Importance)
            </label>
            <select
              value={newImportance}
              onChange={e => setNewImportance(e.target.value as DecisionImportance)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="Low">Thấp (Low)</option>
              <option value="Medium">Trung bình (Medium)</option>
              <option value="High">Cao (High)</option>
              <option value="Critical">Rất quan trọng (Critical)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Điều kiện khống chế — Constraints (Mỗi dòng 1 điều kiện)
          </label>
          <textarea 
            rows={3}
            placeholder={"Ví dụ:\nNgân sách tối đa 35 triệu\nKhông làm ảnh hưởng quỹ khẩn cấp\nThời gian bảo hành từ 2 năm trở lên"}
            value={newConstraints}
            onChange={e => setNewConstraints(e.target.value)}
            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mục tiêu lớn liên quan (Goal - Tùy chọn)
            </label>
            <select
              value={newGoalId}
              onChange={e => setNewGoalId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">-- Không liên kết mục tiêu --</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Dự án liên quan (Project - Tùy chọn)
            </label>
            <select
              value={newProjectId}
              onChange={e => setNewProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="">-- Không liên kết dự án --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="submit"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Tạo Bài Toán & Mở Ma Trận</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
