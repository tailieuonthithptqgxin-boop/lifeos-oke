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
  Check
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Project } from '../lib/types';

export function ProjectsView() {
  const { projects, addProject, updateProject, deleteProject } = useAppStore();
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
    if (!editingProject || !editingProject.name.trim()) return;

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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Quản trị Dự án</h2>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50">
              Projects Hub 🎯
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Theo dõi tiến độ, sức khỏe và ngân sách các mục tiêu lớn chill chill ✨
          </p>
        </div>
        <button
          id="btn-add-project"
          onClick={() => setShowAddModal(true)}
          className="btn-squishy px-5 py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white text-sm font-extrabold rounded-2xl flex items-center gap-2 shadow-md shadow-purple-500/25 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Thêm Dự án 🚀
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', 'Đang làm', 'Hoàn thành', 'Tạm dừng'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`btn-squishy px-4 py-2 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
              filter === tab
                ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300'
            }`}
          >
            {tab === 'All' ? 'Tất cả ✨' : tab}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-purple-100/70 dark:border-purple-900/40 p-12 text-center">
          <FolderKanban className="w-12 h-12 text-purple-300 dark:text-purple-600 mx-auto mb-3 animate-wiggle" />
          <h3 className="font-extrabold text-slate-900 dark:text-white">Chưa có dự án nào 🌸</h3>
          <p className="text-xs text-slate-500 mt-1 font-medium">Bấm nút "Thêm Dự án 🚀" để khởi tạo dự án đầu tiên của bạn nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: Project) => (
            <div
              key={project.id}
              className="card-cute bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-purple-100/80 dark:border-purple-900/40 rounded-3xl p-5 space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      project.health === 'Tốt'
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                        : project.health === 'Rủi ro'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200'
                        : 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200'
                    }`}
                  >
                    Sức khỏe: {project.health || 'Tốt'}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                    {project.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingProject(project)}
                    className="text-slate-400 hover:text-purple-600 p-1.5 transition-colors cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl"
                    title="Chỉnh sửa dự án"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm?.(`Bạn có chắc muốn xóa dự án "${project.name}" không?`)) {
                        deleteProject(project.id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                    title="Xóa dự án"
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

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">Tiến độ</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{project.progress || 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-purple-50 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-purple-100/50 dark:border-purple-950">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
                  />
                </div>
              </div>

              {/* Meta information */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {project.deadline || 'Không thời hạn'}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tạo Dự án Mới</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên dự án *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tái cấu trúc cơ sở dữ liệu"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả
                </label>
                <textarea
                  rows={2}
                  placeholder="Mục đích cốt lõi của dự án..."
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hạn hoàn thành
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
                    Sức khỏe ban đầu
                  </label>
                  <select
                    value={newProject.health}
                    onChange={e => setNewProject({ ...newProject, health: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Tốt">Tốt</option>
                    <option value="Rủi ro">Rủi ro</option>
                    <option value="Nguy cấp">Nguy cấp</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                >
                  Khởi tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chỉnh sửa Dự án</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên dự án *
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
                  Mô tả
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
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Tiến độ hoàn thành:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{editingProject.progress || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingProject.progress || 0}
                  onChange={e => setEditingProject({ ...editingProject, progress: Number(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editingProject.status || 'Đang làm'}
                    onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Đang làm">Đang làm</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sức khỏe dự án
                  </label>
                  <select
                    value={editingProject.health || 'Tốt'}
                    onChange={e => setEditingProject({ ...editingProject, health: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Tốt">Tốt</option>
                    <option value="Rủi ro">Rủi ro</option>
                    <option value="Nguy cấp">Nguy cấp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn hoàn thành
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
