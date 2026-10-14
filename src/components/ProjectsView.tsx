import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  Check,
  CheckSquare,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Project } from '../lib/types';
import { formatCurrency } from '../lib/utils';

export function ProjectsView() {
  const { projects, tasks = [], transactions = [], addProject, updateProject, deleteProject, setCurrentView, language } = useAppStore();
  const isVi = language === 'vi';
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    deadline: '',
    budget: 0,
    health: 'Tốt',
    status: 'Đang làm'
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    await addProject({
      name: newProject.name.trim(),
      description: newProject.description.trim(),
      deadline: newProject.deadline || null,
      budget: Number(newProject.budget) || 0,
      health: newProject.health,
      status: newProject.status,
      progress: 0
    });

    setNewProject({
      name: '',
      description: '',
      deadline: '',
      budget: 0,
      health: 'Tốt',
      status: 'Đang làm'
    });
    setShowAddModal(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.id || !editingProject.name.trim()) return;

    await updateProject(editingProject.id, {
      name: editingProject.name.trim(),
      description: editingProject.description?.trim() || '',
      deadline: editingProject.deadline || null,
      budget: Number(editingProject.budget) || 0,
      health: editingProject.health || 'Tốt',
      status: editingProject.status || 'Đang làm',
      progress: Math.min(100, Math.max(0, Number(editingProject.progress) || 0))
    });

    setEditingProject(null);
  };

  const filteredProjects = (projects || []).filter((p: Project) => {
    if (filter === 'All') return true;
    return p.status === filter;
  });

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {isVi ? 'Quản lý Dự án' : 'Projects Management'}
            </h2>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50 shrink-0">
              {isVi ? 'Không gian Dự án' : 'Projects Hub'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium break-words">
            {isVi 
              ? 'Theo dõi mốc quan trọng, sức khỏe vận hành và tiến độ của các dự án trọng điểm' 
              : 'Track milestones, operational health, and progress across key initiatives'}
          </p>
        </div>
        <button
          id="btn-add-project"
          onClick={() => setShowAddModal(true)}
          className="btn-squishy px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white text-xs sm:text-sm font-extrabold rounded-2xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all self-start sm:self-auto cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> <span>{isVi ? 'Thêm dự án' : 'Add Project'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'All', label: isVi ? 'Tất cả dự án' : 'All Projects' },
          { id: 'Đang làm', label: isVi ? 'Đang thực hiện' : 'In Progress' },
          { id: 'Hoàn thành', label: isVi ? 'Đã hoàn thành' : 'Completed' },
          { id: 'Tạm dừng', label: isVi ? 'Tạm ngưng' : 'On Hold' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`btn-squishy px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-purple-100/70 dark:border-purple-900/40 p-12 text-center animate-page-enter">
          <FolderKanban className="w-12 h-12 text-purple-300 dark:text-purple-600 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 dark:text-white">
            {isVi ? 'Chưa có dự án nào' : 'No projects found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {isVi 
              ? 'Nhấp "Thêm dự án" để bắt đầu mốc dự án đầu tiên của bạn!' 
              : 'Click "Add Project" to initialize your first project milestone!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-page-enter w-full min-w-0">
          {filteredProjects.map((project: Project) => {
            const pTasks = (tasks || []).filter(t => t.projectId === project.id);
            const pTasksDone = pTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed').length;
            const effectiveProgress = pTasks.length > 0 ? Math.round((pTasksDone / pTasks.length) * 100) : (project.progress || 0);
            const pExpenses = (transactions || [])
              .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && (t.note?.includes(`[Project: ${project.name}]`) || t.note?.includes(project.name)))
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            return (
              <div
                key={project.id}
                className="card-cute bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-purple-100/80 dark:border-purple-900/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-4 hover:shadow-md interactive-card transition-all w-full min-w-0 max-w-full overflow-hidden break-words"
              >
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        project.health === 'Tốt' || project.health === 'Healthy'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                          : project.health === 'Rủi ro' || project.health === 'At Risk'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200'
                          : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
                      }`}
                    >
                      {isVi ? 'Sức khỏe' : 'Health'}: {project.health === 'Tốt' || project.health === 'Healthy' ? (isVi ? 'Tốt' : 'Healthy') : project.health === 'Rủi ro' || project.health === 'At Risk' ? (isVi ? 'Rủi ro' : 'At Risk') : (isVi ? 'Nguy cấp' : 'Critical')}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingProject(project)}
                      className="text-slate-400 hover:text-purple-600 p-1.5 transition-colors cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl btn-squishy"
                      title={isVi ? 'Chỉnh sửa dự án' : 'Edit project'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const confirmMsg = isVi 
                          ? `Bạn có chắc chắn muốn xóa dự án "${project.name}" không?` 
                          : `Are you sure you want to delete project "${project.name}"?`;
                        if (window.confirm?.(confirmMsg)) {
                          deleteProject(project.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl btn-squishy"
                      title={isVi ? 'Xóa dự án' : 'Delete project'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                    {project.description}
                  </p>
                )}

                {/* Progress bar with linked task counter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1.5">
                      <span>{isVi ? 'Tiến độ' : 'Progress'}</span>
                      {pTasks.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({pTasksDone}/{pTasks.length} {isVi ? 'việc' : 'tasks'})
                        </span>
                      )}
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{effectiveProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-purple-50 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-purple-100/50 dark:border-purple-950">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, effectiveProgress))}%` }}
                    />
                  </div>
                </div>

                {/* Project Budget & Financial Integration */}
                {(Number(project.budget) > 0 || pExpenses > 0) && (
                  <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100/60 dark:border-purple-900/40 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-purple-500" /> {isVi ? 'Đã chi' : 'Spent'}: {formatCurrency(pExpenses)}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isVi ? 'Ngân sách' : 'Budget'}: {formatCurrency(Number(project.budget) || 0)}
                      </span>
                    </div>
                    {Number(project.budget) > 0 && (
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pExpenses > Number(project.budget)
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((pExpenses / Number(project.budget)) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Cross-Feature Action Links */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentView('tasks')}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Công việc' : 'Tasks'} ({pTasks.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentView('finance')}
                    className="text-slate-500 hover:text-emerald-500 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span>{isVi ? 'Sổ thu chi' : 'Ledger'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Meta information */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {project.deadline || (isVi ? 'Không có hạn chót' : 'No deadline')}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {project.status === 'Đang làm' 
                      ? (isVi ? 'Đang thực hiện' : 'In Progress') 
                      : project.status === 'Hoàn thành' 
                      ? (isVi ? 'Đã hoàn thành' : 'Completed') 
                      : project.status === 'Tạm dừng' 
                      ? (isVi ? 'Tạm ngưng' : 'On Hold') 
                      : project.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-backdrop-fade">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-modal-enter">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isVi ? 'Tạo Dự án Mới' : 'Create New Project'}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên dự án *' : 'Project Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isVi ? 'VD: Tái cấu trúc cơ sở dữ liệu, Ra mắt ứng dụng di động' : 'e.g. Database Refactor, Mobile App Launch'}
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mô tả dự án' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isVi ? 'Mục tiêu trọng tâm và phạm vi của dự án này...' : 'Core goal and scope of this project...'}
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Hạn chót' : 'Deadline'}
                  </label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Sức khỏe ban đầu' : 'Initial Health'}
                  </label>
                  <select
                    value={newProject.health}
                    onChange={e => setNewProject({ ...newProject, health: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Tốt">{isVi ? 'Tốt' : 'Healthy'}</option>
                    <option value="Rủi ro">{isVi ? 'Rủi ro' : 'At Risk'}</option>
                    <option value="Nguy cấp">{isVi ? 'Nguy cấp' : 'Critical'}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-squishy cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl btn-squishy cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {isVi ? 'Tạo Dự án' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs animate-backdrop-fade">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-modal-enter">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isVi ? 'Chỉnh Sửa Dự Án' : 'Edit Project'}
            </h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên dự án *' : 'Project Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mô tả' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editingProject.description || ''}
                  onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {isVi ? 'Tiến độ hoàn thành:' : 'Completion Progress:'}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{editingProject.progress || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingProject.progress || 0}
                  onChange={e => setEditingProject({ ...editingProject, progress: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Trạng thái' : 'Status'}
                  </label>
                  <select
                    value={editingProject.status || 'Đang làm'}
                    onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Đang làm">{isVi ? 'Đang thực hiện' : 'In Progress'}</option>
                    <option value="Hoàn thành">{isVi ? 'Đã hoàn thành' : 'Completed'}</option>
                    <option value="Tạm dừng">{isVi ? 'Tạm ngưng' : 'On Hold'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Sức khỏe dự án' : 'Project Health'}
                  </label>
                  <select
                    value={editingProject.health || 'Tốt'}
                    onChange={e => setEditingProject({ ...editingProject, health: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Tốt">{isVi ? 'Tốt' : 'Healthy'}</option>
                    <option value="Rủi ro">{isVi ? 'Rủi ro' : 'At Risk'}</option>
                    <option value="Nguy cấp">{isVi ? 'Nguy cấp' : 'Critical'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Hạn chót' : 'Deadline'}
                </label>
                <input
                  type="date"
                  value={editingProject.deadline || ''}
                  onChange={e => setEditingProject({ ...editingProject, deadline: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl btn-squishy cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl btn-squishy cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  {isVi ? 'Lưu Thay Đổi' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
