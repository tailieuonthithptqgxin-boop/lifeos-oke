import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-600" />
          Khởi tạo Quyết định Mới (Problem Definition)
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          Xác định rõ bản chất bài toán, lý do, hạn chót và rào cản khống chế trước khi xây dựng ma trận phương án.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tên Quyết định (Decision Title) *
          </label>
          <input 
            type="text"
            required
            placeholder="Ví dụ: Chọn Mua Laptop mới phục vụ Học tập & Lập trình"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              What? — Vấn đề cần giải quyết (Problem Statement) *
            </label>
            <textarea 
              required
              rows={3}
              placeholder="Tôi đang cần quyết định điều gì? Chi tiết thực trạng khó khăn..."
              value={newProblem}
              onChange={e => setNewProblem(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Why? — Tại sao phải quyết định? (Context & Purpose)
            </label>
            <textarea 
              rows={3}
              placeholder="Lý do động lực thúc đẩy? Nếu không quyết định thì sao?"
              value={newWhy}
              onChange={e => setNewWhy(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Deadline ra Quyết định
            </label>
            <input 
              type="date"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category (Lĩnh vực)
            </label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as DecisionCategory)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="Purchases">Purchases (Mua sắm)</option>
              <option value="Career">Career (Sự nghiệp)</option>
              <option value="Finance">Finance (Tài chính)</option>
              <option value="Study">Study (Học tập)</option>
              <option value="Projects">Projects (Dự án)</option>
              <option value="Personal">Personal (Cá nhân)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mức độ Quan trọng (Importance)
            </label>
            <select
              value={newImportance}
              onChange={e => setNewImportance(e.target.value as DecisionImportance)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="Low">Low (Thấp)</option>
              <option value="Medium">Medium (Trung bình)</option>
              <option value="High">High (Cao)</option>
              <option value="Critical">Critical (Nghiêm trọng)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Constraints? — Các điều kiện khống chế (Mỗi dòng 1 điều kiện)
          </label>
          <textarea 
            rows={3}
            placeholder={"Ví dụ:\nBudget <= 30 triệu\nKhông ảnh hưởng Quỹ Tiết kiệm\nDùng ổn định ít nhất 4 năm"}
            value={newConstraints}
            onChange={e => setNewConstraints(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Goal Liên quan (Optional)
            </label>
            <select
              value={newGoalId}
              onChange={e => setNewGoalId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="">-- Không chọn --</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project Liên quan (Optional)
            </label>
            <select
              value={newProjectId}
              onChange={e => setNewProjectId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="">-- Không chọn --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Tạo Decision & Xây Ma trận <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
