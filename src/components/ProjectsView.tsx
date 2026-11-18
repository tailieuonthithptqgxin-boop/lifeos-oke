import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Check,
  CheckSquare,
  DollarSign,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Search,
  Sparkles,
  Layers,
  Target,
  BookOpen,
  Archive,
  Compass,
  LayoutGrid,
  Kanban
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Project, Task } from '../lib/types';
import { formatCurrency, formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { soundEngine } from '../lib/soundEngine';

export type ParaCategory = 'all' | 'project' | 'area' | 'resource' | 'archive';

export const PARA_METADATA: Record<Exclude<ParaCategory, 'all'>, {
  labelVi: string;
  labelEn: string;
  color: string;
  badge: string;
  icon: string;
  descVi: string;
  descEn: string;
}> = {
  project: {
    labelVi: 'Dự án (Projects)',
    labelEn: 'Projects',
    color: '#3b82f6',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    icon: '🎯',
    descVi: 'Mục tiêu ngắn hạn có thời hạn chót cụ thể',
    descEn: 'Specific initiatives with strict deadlines'
  },
  area: {
    labelVi: 'Lĩnh vực (Areas)',
    labelEn: 'Areas',
    color: '#10b981',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    icon: '🌿',
    descVi: 'Trách nhiệm dài hạn cần duy trì tiêu chuẩn',
    descEn: 'Ongoing spheres of activity and standards'
  },
  resource: {
    labelVi: 'Tài nguyên (Resources)',
    labelEn: 'Resources',
    color: '#f59e0b',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    icon: '📚',
    descVi: 'Tài liệu, chủ đề học tập và công cụ tham khảo',
    descEn: 'Topics of ongoing interest and references'
  },
  archive: {
    labelVi: 'Lưu trữ (Archives)',
    labelEn: 'Archives',
    color: '#64748b',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60',
    icon: '📦',
    descVi: 'Các mục đã hoàn thành hoặc tạm gác lại',
    descEn: 'Inactive or completed items for record-keeping'
  }
};

export function getProjectParaType(project: Project): Exclude<ParaCategory, 'all'> {
  if (project.color === '#64748b' || project.status === 'Hoàn thành' || project.status === 'Completed' || project.status === 'Lưu trữ') {
    return 'archive';
  }
  if (project.color === '#10b981') return 'area';
  if (project.color === '#f59e0b') return 'resource';
  return 'project';
}

export function ProjectsView() {
  const { 
    projects = [], 
    tasks = [], 
    transactions = [], 
    addProject, 
    updateProject, 
    deleteProject, 
    addTask,
    updateTask,
    deleteTask,
    setCurrentView, 
    language 
  } = useAppStore();

  const isVi = language === 'vi';

  // View Mode: Grid (P.A.R.A Cards) vs Kanban Board with F5 Persistence
  type ViewMode = 'grid' | 'kanban';
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_projects_view_mode') as ViewMode;
        if (saved && (saved === 'grid' || saved === 'kanban')) return saved;
      } catch {}
    }
    return 'grid';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_projects_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Navigation & Filtering State with F5 Persistence
  const [paraFilter, setParaFilter] = useState<ParaCategory>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_projects_para_filter') as ParaCategory;
        if (saved && ['all', 'project', 'area', 'resource', 'archive'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_projects_para_filter', paraFilter);
    } catch {}
  }, [paraFilter]);

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_projects_status_filter');
        if (saved && ['All', 'Đang làm', 'Hoàn thành', 'Tạm dừng'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_projects_status_filter', statusFilter);
    } catch {}
  }, [statusFilter]);

  const [healthFilter, setHealthFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_projects_health_filter');
        if (saved && ['All', 'Tốt', 'Rủi ro', 'Nguy cấp'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_projects_health_filter', healthFilter);
    } catch {}
  }, [healthFilter]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddShaking, setIsAddShaking] = useState(false);
  const [isEditShaking, setIsEditShaking] = useState(false);

  // Quick In-line Creation for projects
  const [quickProjectName, setQuickProjectName] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Accordion for expanded project tasks with F5 Persistence
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_projects_expanded_id');
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    try {
      if (expandedProjectId) {
        localStorage.setItem('lifeos_projects_expanded_id', expandedProjectId);
      } else {
        localStorage.removeItem('lifeos_projects_expanded_id');
      }
    } catch {}
  }, [expandedProjectId]);

  const [projectTaskInputs, setProjectTaskInputs] = useState<Record<string, string>>({});

  // 5-Second Undo Toast State
  const [undoProject, setUndoProject] = useState<Project | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 5-Second Undo Toast State for Task Deletion inside Project Card
  const [undoTaskItem, setUndoTaskItem] = useState<Task | null>(null);
  const undoTaskTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoTaskTimerRef.current) clearTimeout(undoTaskTimerRef.current);
    };
  }, []);

  useBodyScrollLock(showAddModal || !!editingProject);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    deadline: '',
    budget: 0,
    health: 'Tốt',
    status: 'Đang làm',
    paraType: 'project' as Exclude<ParaCategory, 'all'>
  });

  const isAddDirty = Boolean(
    newProject.name.trim() || 
    newProject.description.trim() || 
    newProject.deadline || 
    Number(newProject.budget) > 0
  );

  const initialEditRef = useRef<Project | null>(null);
  useEffect(() => {
    if (editingProject) {
      if (!initialEditRef.current || initialEditRef.current.id !== editingProject.id) {
        initialEditRef.current = { ...editingProject };
      }
    } else {
      initialEditRef.current = null;
    }
  }, [editingProject]);

  const isEditDirty = useMemo(() => {
    if (!editingProject || !initialEditRef.current) return false;
    return (
      editingProject.name !== initialEditRef.current.name ||
      (editingProject.description || '') !== (initialEditRef.current.description || '') ||
      editingProject.color !== initialEditRef.current.color ||
      editingProject.status !== initialEditRef.current.status ||
      editingProject.health !== initialEditRef.current.health ||
      Number(editingProject.budget) !== Number(initialEditRef.current.budget) ||
      (editingProject.deadline || '') !== (initialEditRef.current.deadline || '') ||
      Number(editingProject.progress) !== Number(initialEditRef.current.progress)
    );
  }, [editingProject]);

  const handleSafeDismissAdd = () => {
    if (isSubmitting) return;
    if (isAddDirty) {
      soundEngine.playPop();
      setIsAddShaking(true);
      setTimeout(() => setIsAddShaking(false), 500);
      return;
    }
    setShowAddModal(false);
  };

  const handleSafeDismissEdit = () => {
    if (isSubmitting) return;
    if (isEditDirty) {
      soundEngine.playPop();
      setIsEditShaking(true);
      setTimeout(() => setIsEditShaking(false), 500);
      return;
    }
    setEditingProject(null);
  };

  useEffect(() => {
    if (!showAddModal && !editingProject) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) {
          handleSafeDismissAdd();
        } else if (editingProject) {
          handleSafeDismissEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingProject, isAddDirty, isEditDirty]);

  // Fast In-line Project Quick Add
  const handleQuickAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickProjectName.trim();
    if (!trimmed || isQuickSubmitting) return;

    try {
      setIsQuickSubmitting(true);
      const chosenPara: Exclude<ParaCategory, 'all'> = paraFilter === 'all' ? 'project' : paraFilter;
      const chosenColor = PARA_METADATA[chosenPara].color;

      await addProject({
        name: trimmed,
        description: '',
        deadline: null,
        budget: 0,
        health: 'Tốt',
        status: chosenPara === 'archive' ? 'Hoàn thành' : 'Đang làm',
        progress: 0,
        color: chosenColor
      });

      soundEngine.playPop();
      setQuickProjectName('');
    } catch (err) {
      console.error('Failed to quick add project:', err);
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // Create Project via Modal
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const chosenColor = PARA_METADATA[newProject.paraType].color;
      await addProject({
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        deadline: newProject.deadline || null,
        budget: Number(newProject.budget) || 0,
        health: newProject.health,
        status: newProject.paraType === 'archive' ? 'Hoàn thành' : newProject.status,
        progress: 0,
        color: chosenColor
      });

      soundEngine.playPop();
      setNewProject({
        name: '',
        description: '',
        deadline: '',
        budget: 0,
        health: 'Tốt',
        status: 'Đang làm',
        paraType: 'project'
      });
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Project via Modal
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.id || !editingProject.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateProject(editingProject.id, {
        name: editingProject.name.trim(),
        description: editingProject.description?.trim() || '',
        deadline: editingProject.deadline || null,
        budget: Number(editingProject.budget) || 0,
        health: editingProject.health || 'Tốt',
        status: editingProject.status || 'Đang làm',
        progress: Math.min(100, Math.max(0, Number(editingProject.progress) || 0)),
        color: editingProject.color || '#3b82f6'
      });

      soundEngine.playPop();
      setEditingProject(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete with 5-second Undo
  const handleDeleteProject = (project: Project) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    soundEngine.playPop();
    setUndoProject(project);
    deleteProject(project.id);
    undoTimerRef.current = setTimeout(() => {
      setUndoProject(null);
    }, 5000);
  };

  const handleUndoDelete = async () => {
    if (undoProject) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      await addProject(undoProject);
      soundEngine.playPop();
      setUndoProject(null);
    }
  };

  // Delete project task with 5-second Undo
  const handleDeleteProjectTaskWithUndo = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (undoTaskTimerRef.current) clearTimeout(undoTaskTimerRef.current);
    soundEngine.playPop();
    setUndoTaskItem(task);
    deleteTask(task.id);
    undoTaskTimerRef.current = setTimeout(() => {
      setUndoTaskItem(null);
    }, 5000);
  };

  const handleUndoDeleteTask = async () => {
    if (undoTaskItem) {
      if (undoTaskTimerRef.current) clearTimeout(undoTaskTimerRef.current);
      await addTask(undoTaskItem);
      soundEngine.playPop();
      setUndoTaskItem(null);
    }
  };

  // Add a task directly under a project
  const handleAddProjectTask = async (projectId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = (projectTaskInputs[projectId] || '').trim();
    if (!text) return;

    soundEngine.playPop();
    await addTask({
      title: text,
      projectId,
      status: 'Chưa làm',
      priority: 'Trung bình',
      dueDate: formatLocalDateKey(new Date())
    });

    setProjectTaskInputs(prev => ({ ...prev, [projectId]: '' }));
  };

  // Toggle task status inside project card
  const handleToggleProjectTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playPop();
    const isDone = (task.status as string) === 'Hoàn thành' || (task.status as string) === 'Completed' || task.status === 'Done';
    const nextStatus = isDone ? 'To Do' : 'Done';
    await updateTask(task.id, { status: nextStatus as any });
    if (!isDone) {
      window.dispatchEvent(new CustomEvent('lifeos:task-completed', { detail: { taskId: task.id, title: task.title } }));
    }
  };

  // Filtered list based on PARA, status, and search query
  const filteredProjects = useMemo(() => {
    return (projects || []).filter((p: Project) => {
      // 1. PARA Category Filter
      if (paraFilter !== 'all') {
        const type = getProjectParaType(p);
        if (type !== paraFilter) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'All' && p.status !== statusFilter) {
        return false;
      }

      // 3. Health Filter
      if (healthFilter !== 'All') {
        const isHealthy = p.health === 'Tốt' || p.health === 'Healthy';
        if (healthFilter === 'Tốt' && !isHealthy) return false;
        if (healthFilter !== 'Tốt' && p.health !== healthFilter) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }

      return true;
    });
  }, [projects, paraFilter, statusFilter, healthFilter, searchQuery]);

  // Aggregate KPI Calculations
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'Đang làm' || p.status === 'In Progress').length;
    const healthy = projects.filter(p => p.health === 'Tốt' || p.health === 'Healthy').length;
    const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const totalSpent = (transactions || [])
      .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && projects.some(p => t.note?.includes(p.name)))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return { total, active, healthy, totalBudget, totalSpent };
  }, [projects, transactions]);

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* ========================================================= */}
      {/* HEADER BAR                                                */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs shrink-0 w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <FolderKanban className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {isVi ? 'Quản lý Dự án & P.A.R.A Hub' : 'Projects & P.A.R.A Hub'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60">
                  P.A.R.A Framework
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isVi 
                  ? 'Tổ chức cuộc sống theo 4 tầng: Dự án (Projects), Lĩnh vực (Areas), Tài nguyên (Resources) & Lưu trữ (Archives).' 
                  : 'Organize your life across Projects, Areas, Resources, and Archives with clear milestones.'}
              </p>
            </div>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => {
            soundEngine.playPop();
            setShowAddModal(true);
          }}
          className="h-9 px-4 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer shrink-0 shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> 
          <span>{isVi ? 'Thêm dự án mới' : 'Add New Project'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* INTERACTIVE BENTO KPI CARDS                               */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Total */}
        <div 
          onClick={() => {
            setParaFilter('all');
            setStatusFilter('All');
            setHealthFilter('All');
            soundEngine.playPop();
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] hover:border-blue-500/50 hover:shadow-md shadow-xs flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98]"
          title={isVi ? "Xem toàn bộ mục P.A.R.A" : "View all P.A.R.A items"}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Tổng số mục P.A.R.A' : 'Total Items'}</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">{isVi ? 'Xem toàn bộ' : 'View all'}</span>
        </div>

        {/* 2. Active Projects */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Đang làm' ? 'All' : 'Đang làm');
            soundEngine.playPop();
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between active:scale-[0.98] ${
            statusFilter === 'Đang làm'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-blue-500/40 hover:shadow-md'
          }`}
          title={isVi ? "Lọc nhanh các dự án đang thực hiện" : "Filter in-progress projects"}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Đang thực hiện' : 'In Progress'}</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.active}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">{isVi ? 'Chạm để lọc nhanh' : 'Tap to filter'}</span>
        </div>

        {/* 3. Healthy Health */}
        <div 
          onClick={() => {
            setHealthFilter(healthFilter === 'Tốt' ? 'All' : 'Tốt');
            soundEngine.playPop();
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between active:scale-[0.98] ${
            healthFilter === 'Tốt'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white dark:bg-[#141E30] border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-500/40 hover:shadow-md'
          }`}
          title={isVi ? "Lọc các dự án có sức khỏe Tốt" : "Filter healthy projects"}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Sức khỏe Tốt' : 'Healthy Projects'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.healthy}/{stats.total}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">{isVi ? 'Chạm để lọc Tốt' : 'Tap to filter Healthy'}</span>
        </div>

        {/* 4. Financial Budget vs Spent */}
        <div 
          onClick={() => {
            soundEngine.playPop();
            setCurrentView('finance');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] hover:border-amber-500/50 hover:shadow-md transition-all shadow-xs flex flex-col justify-between cursor-pointer active:scale-[0.98]"
          title={isVi ? "Nhấp để mở Sổ thu chi & Quản lý ngân sách" : "Click to view Finance & Budget"}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isVi ? 'Ngân sách & Đã chi' : 'Budget & Spent'}</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
            {formatCurrency(stats.totalSpent)} / {formatCurrency(stats.totalBudget)}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                stats.totalSpent > stats.totalBudget && stats.totalBudget > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${stats.totalBudget > 0 ? Math.min(100, Math.round((stats.totalSpent / stats.totalBudget) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* P.A.R.A NAVIGATION TABS + QUICK SEARCH & ADD               */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {/* P.A.R.A 4-Pillar Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              setParaFilter('all');
              soundEngine.playPop();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              paraFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isVi ? 'Tất cả P.A.R.A' : 'All P.A.R.A'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-black/20 font-mono">
              {projects.length}
            </span>
          </button>

          {(['project', 'area', 'resource', 'archive'] as const).map(key => {
            const meta = PARA_METADATA[key];
            const count = projects.filter(p => getProjectParaType(p) === key).length;
            const isActive = paraFilter === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setParaFilter(key);
                  soundEngine.playPop();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 border-2 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900'
                }`}
                style={isActive ? { borderColor: meta.color, color: meta.color } : {}}
              >
                <span>{meta.icon}</span>
                <span>{isVi ? meta.labelVi : meta.labelEn}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Bar: View Mode + Status Filters + Search + In-line Quick Add */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-[#141E30] p-3 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Grid vs Kanban */}
            <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => { setViewMode('grid'); soundEngine.playPop(); }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isVi ? "Xem dạng lưới P.A.R.A" : "Grid view"}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isVi ? 'Lưới P.A.R.A' : 'Grid'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('kanban'); soundEngine.playPop(); }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={isVi ? "Xem bảng Kanban" : "Kanban board"}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isVi ? 'Bảng Kanban' : 'Kanban'}</span>
              </button>
            </div>

            {/* Status Segmented Control (active in grid view) */}
            {viewMode === 'grid' && (
              <div className="flex bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                {[
                  { id: 'All', label: isVi ? 'Tất cả' : 'All' },
                  { id: 'Đang làm', label: isVi ? 'Đang làm' : 'In Progress' },
                  { id: 'Hoàn thành', label: isVi ? 'Đã xong' : 'Done' },
                  { id: 'Tạm dừng', label: isVi ? 'Tạm ngưng' : 'On Hold' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      soundEngine.playPop();
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Search & Fast In-line Add Form */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Search Box */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm kiếm dự án...' : 'Search projects...'}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Fast In-line Add */}
            <form onSubmit={handleQuickAddProject} className="hidden sm:flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={quickProjectName}
                  onChange={e => setQuickProjectName(e.target.value)}
                  placeholder={isVi ? `+ Thêm nhanh vào ${paraFilter === 'all' ? 'Dự án' : PARA_METADATA[paraFilter].labelVi}...` : '+ Quick add...'}
                  className="w-48 sm:w-52 pl-3 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {quickProjectName && (
                  <button
                    type="button"
                    onClick={() => setQuickProjectName('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    title={isVi ? 'Xóa nội dung' : 'Clear text'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!quickProjectName.trim() || isQuickSubmitting}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isVi ? 'Tạo' : 'Add'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PROJECTS: KANBAN BOARD OR P.A.R.A GRID                     */}
      {/* ========================================================= */}
      {viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 animate-page-enter items-start w-full min-w-0">
          {[
            { id: 'Đang làm', label: isVi ? 'Đang thực hiện' : 'In Progress', color: 'border-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: '⚡' },
            { id: 'Tạm dừng', label: isVi ? 'Tạm ngưng / Chờ' : 'On Hold', color: 'border-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: '⏸️' },
            { id: 'Hoàn thành', label: isVi ? 'Đã hoàn tất' : 'Completed', color: 'border-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: '✅' }
          ].map(column => {
            const columnProjects = filteredProjects.filter(p => {
              if (column.id === 'Đang làm') return p.status === 'Đang làm' || p.status === 'In Progress' || (!p.status && p.status !== 'Hoàn thành' && p.status !== 'Tạm dừng');
              if (column.id === 'Hoàn thành') return p.status === 'Hoàn thành' || p.status === 'Completed';
              return p.status === 'Tạm dừng' || p.status === 'On Hold';
            });

            return (
              <div 
                key={column.id} 
                className="bg-slate-50/80 dark:bg-[#101726] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-3 sm:p-4 flex flex-col space-y-3 min-h-[420px] shadow-xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{column.icon}</span>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                      {column.label}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${column.badge}`}>
                    {columnProjects.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                  {columnProjects.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                      {isVi ? 'Không có dự án nào trong cột này' : 'No projects in this stage'}
                    </div>
                  ) : (
                    columnProjects.map(project => {
                      const pType = getProjectParaType(project);
                      const pMeta = PARA_METADATA[pType];
                      const pTasks = (tasks || []).filter(t => t.projectId === project.id);
                      const pTasksDone = pTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed' || t.status === 'Done' || t.status === 'Đã xong').length;
                      const effectiveProgress = pTasks.length > 0 ? Math.round((pTasksDone / pTasks.length) * 100) : (project.progress || 0);

                      return (
                        <div
                          key={project.id}
                          className="bg-white dark:bg-[#141E30] rounded-xl p-3.5 border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5 group"
                        >
                          {/* Card Top: Badges & Controls */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${pMeta.badge}`}>
                              <span>{pMeta.icon}</span>
                              <span>{isVi ? pMeta.labelVi.split(' ')[0] : pMeta.labelEn}</span>
                            </span>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playPop();
                                  setEditingProject(project);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-500 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title={isVi ? "Chỉnh sửa" : "Edit"}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(project)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title={isVi ? "Xóa" : "Delete"}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                              {project.name}
                            </h4>
                            {project.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                {project.description}
                              </p>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                              <span>{pTasksDone}/{pTasks.length} {isVi ? 'việc' : 'tasks'}</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{effectiveProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, effectiveProgress))}%` }}
                              />
                            </div>
                          </div>

                          {/* Stage Transition Controls */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {project.deadline || (isVi ? 'Không hạn' : 'No date')}
                            </span>
                            <div className="flex items-center gap-1">
                              {column.id !== 'Đang làm' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playPop();
                                    updateProject(project.id, { status: 'Đang làm' });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 text-[10px] font-bold cursor-pointer hover:bg-blue-100 active:scale-95"
                                  title={isVi ? "Chuyển sang Đang làm" : "Move to In Progress"}
                                >
                                  ▶ {isVi ? 'Làm' : 'Active'}
                                </button>
                              )}
                              {column.id !== 'Tạm dừng' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playPop();
                                    updateProject(project.id, { status: 'Tạm dừng' });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 text-[10px] font-bold cursor-pointer hover:bg-amber-100 active:scale-95"
                                  title={isVi ? "Tạm ngưng dự án" : "Pause project"}
                                >
                                  ⏸ {isVi ? 'Dừng' : 'Hold'}
                                </button>
                              )}
                              {column.id !== 'Hoàn thành' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playSuccess();
                                    updateProject(project.id, { status: 'Hoàn thành', progress: 100 });
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-bold cursor-pointer hover:bg-emerald-100 active:scale-95"
                                  title={isVi ? "Đánh dấu hoàn thành" : "Mark as Completed"}
                                >
                                  ✓ {isVi ? 'Xong' : 'Done'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Column Footer: Quick add pre-selected */}
                <button
                  type="button"
                  onClick={() => {
                    setNewProject(prev => ({ ...prev, status: column.id as any }));
                    soundEngine.playPop();
                    setShowAddModal(true);
                  }}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white/50 dark:bg-slate-900/50 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? `Thêm vào ${column.label}` : `Add to ${column.label}`}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : filteredProjects.length === 0 ? (
        /* GRID VIEW: EMPTY STATE */
        <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] p-12 text-center animate-page-enter">
          <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 stroke-1" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {isVi ? 'Không tìm thấy mục nào' : 'No projects found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isVi 
              ? 'Hãy thử thay đổi bộ lọc hoặc nhấp "Thêm dự án mới" để bắt đầu thiết lập mốc mục tiêu đầu tiên.' 
              : 'Try adjusting filters or click "Add New Project" to initialize your first initiative.'}
          </p>
        </div>
      ) : (
        /* GRID VIEW: CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-page-enter w-full min-w-0">
          {filteredProjects.map((project: Project) => {
            const pType = getProjectParaType(project);
            const pMeta = PARA_METADATA[pType];
            const pTasks = (tasks || []).filter(t => t.projectId === project.id);
            const pTasksDone = pTasks.filter(t => t.status === 'Hoàn thành' || t.status === 'Completed' || t.status === 'Done' || t.status === 'Đã xong').length;
            const effectiveProgress = pTasks.length > 0 ? Math.round((pTasksDone / pTasks.length) * 100) : (project.progress || 0);
            
            const pExpenses = (transactions || [])
              .filter(t => (t.type === 'Chi tiêu' || t.type === 'Expense') && (t.note?.includes(`[Project: ${project.name}]`) || t.note?.includes(project.name)))
              .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            const isExpanded = expandedProjectId === project.id;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-[#141E30] border border-[#E2E8F0] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all w-full min-w-0 max-w-full overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges & Action Buttons */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* P.A.R.A Pillar Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pMeta.badge}`}>
                        <span>{pMeta.icon}</span>
                        <span>{isVi ? pMeta.labelVi.split(' ')[0] : pMeta.labelEn}</span>
                      </span>

                      {/* Health Badge */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          project.health === 'Tốt' || project.health === 'Healthy'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60'
                            : project.health === 'Rủi ro' || project.health === 'At Risk'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/60'
                        }`}
                      >
                        {project.health === 'Tốt' || project.health === 'Healthy' ? (isVi ? 'Tốt' : 'Healthy') : project.health === 'Rủi ro' || project.health === 'At Risk' ? (isVi ? 'Rủi ro' : 'At Risk') : (isVi ? 'Nguy cấp' : 'Critical')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => {
                          soundEngine.playPop();
                          setEditingProject(project);
                        }}
                        className="text-slate-400 hover:text-emerald-600 p-1.5 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        title={isVi ? 'Chỉnh sửa dự án' : 'Edit project'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteProject(project)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title={isVi ? 'Xóa dự án' : 'Delete project'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Name & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Progress bar with linked task counter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                        <span>{isVi ? 'Tiến độ hoàn thành' : 'Progress'}</span>
                        {pTasks.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({pTasksDone}/{pTasks.length} {isVi ? 'việc' : 'tasks'})
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{effectiveProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, effectiveProgress))}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Budget & Financial Integration */}
                  {(Number(project.budget) > 0 || pExpenses > 0) && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-500" /> 
                          {isVi ? 'Đã chi' : 'Spent'}: <strong className="text-slate-900 dark:text-white">{formatCurrency(pExpenses)}</strong>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {isVi ? 'Ngân sách' : 'Budget'}: <strong className="text-slate-900 dark:text-white">{formatCurrency(Number(project.budget) || 0)}</strong>
                        </span>
                      </div>
                      {Number(project.budget) > 0 && (
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pExpenses > Number(project.budget) ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.round((pExpenses / Number(project.budget)) * 100))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta Deadline & Status */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{project.deadline || (isVi ? 'Không có hạn chót' : 'No deadline')}</span>
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {project.status === 'Đang làm' || project.status === 'In Progress'
                        ? (isVi ? 'Đang làm' : 'In Progress') 
                        : project.status === 'Hoàn thành' || project.status === 'Completed' || project.status === 'Done' || project.status === 'Đã xong'
                        ? (isVi ? 'Đã xong' : 'Completed') 
                        : project.status === 'Tạm dừng' || project.status === 'On Hold'
                        ? (isVi ? 'Tạm ngưng' : 'On Hold') 
                        : project.status}
                    </span>
                  </div>
                </div>

                {/* Inline Tasks Accordion for Operational Control */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const nextId = isExpanded ? null : project.id;
                        setExpandedProjectId(nextId);
                        soundEngine.playPop();
                      }}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Danh sách công việc' : 'Tasks'} ({pTasks.length})</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentView('finance')}
                      className="text-slate-400 hover:text-emerald-500 text-[11px] flex items-center gap-0.5 cursor-pointer font-medium"
                    >
                      <span>{isVi ? 'Sổ thu chi' : 'Ledger'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Expanded Task Checklist directly in Project Card */}
                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in-50">
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {pTasks.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">
                            {isVi ? 'Chưa có công việc nào thuộc dự án này.' : 'No tasks assigned yet.'}
                          </p>
                        ) : (
                          pTasks.map(task => {
                            const isDone = task.status === 'Hoàn thành' || task.status === 'Completed';
                            return (
                              <div
                                key={task.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleProjectTask(task, e)}
                                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                      isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-400'
                                    }`}
                                  >
                                    {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </button>
                                  <span className={`truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {task.dueDate && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {task.dueDate}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteProjectTaskWithUndo(task, e)}
                                    className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                                    title={isVi ? "Xóa việc này" : "Delete task"}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Fast In-line Task Add Input */}
                      <form onSubmit={(e) => handleAddProjectTask(project.id, e)} className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={projectTaskInputs[project.id] || ''}
                          onChange={e => setProjectTaskInputs({ ...projectTaskInputs, [project.id]: e.target.value })}
                          placeholder={isVi ? '+ Thêm việc nhanh... [Enter]' : '+ Quick task... [Enter]'}
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!(projectTaskInputs[project.id] || '').trim()}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE PROJECT                                     */}
      {/* ========================================================= */}
      {showAddModal && (
        <div 
          onMouseDown={(e) => {
            mouseDownTargetRef.current = e.target;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              handleSafeDismissAdd();
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-backdrop-fade cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-[#141E30] rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border-t sm:border border-slate-200 dark:border-white/[0.08] shadow-2xl space-y-4 animate-modal-enter ${
              isAddShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
            }`}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-500" />
                <span>{isVi ? 'Tạo Mục Mới (P.A.R.A Framework)' : 'Create New P.A.R.A Item'}</span>
              </h3>
              <button 
                type="button" 
                onClick={handleSafeDismissAdd}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              {/* P.A.R.A Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Phân loại theo P.A.R.A *' : 'P.A.R.A Pillar *'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['project', 'area', 'resource', 'archive'] as const).map(pType => {
                    const meta = PARA_METADATA[pType];
                    const isSelected = newProject.paraType === pType;
                    return (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => {
                          setNewProject({ ...newProject, paraType: pType });
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/40 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-base">{meta.icon}</span>
                        <div className="min-w-0">
                          <span className="text-xs block leading-tight">{isVi ? meta.labelVi.split(' ')[0] : meta.labelEn}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-1">{isVi ? meta.descVi : meta.descEn}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên mục / Dự án *' : 'Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={isVi ? 'VD: Ra mắt ứng dụng di động, Thói quen tập gym hàng tuần' : 'e.g. Mobile App Launch, Weekly Gym Routine'}
                    value={newProject.name}
                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 pr-8 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {newProject.name && (
                    <button
                      type="button"
                      onClick={() => setNewProject({ ...newProject, name: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={isVi ? 'Xóa tên' : 'Clear name'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mô tả & Phạm vi' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isVi ? 'Mục tiêu trọng tâm và kết quả then chốt mong muốn...' : 'Key goals and desired outcomes...'}
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Ngân sách (VNĐ)' : 'Budget (VND)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    placeholder="0"
                    value={newProject.budget || ''}
                    onChange={e => setNewProject({ ...newProject, budget: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Hạn chót' : 'Deadline'}
                  </label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Sức khỏe ban đầu' : 'Initial Health'}
                </label>
                <select
                  value={newProject.health}
                  onChange={e => setNewProject({ ...newProject, health: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="Tốt">{isVi ? 'Tốt (Đúng kế hoạch)' : 'Healthy'}</option>
                  <option value="Rủi ro">{isVi ? 'Rủi ro (Cần theo dõi)' : 'At Risk'}</option>
                  <option value="Nguy cấp">{isVi ? 'Nguy cấp (Cần can thiệp)' : 'Critical'}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSafeDismissAdd}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-xl cursor-pointer shadow-xs active:scale-95"
                >
                  {isSubmitting ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo Mục Mới' : 'Create Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT PROJECT                                       */}
      {/* ========================================================= */}
      {editingProject && (
        <div 
          onMouseDown={(e) => {
            mouseDownTargetRef.current = e.target;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
              handleSafeDismissEdit();
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-backdrop-fade cursor-default"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-[#141E30] rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border-t sm:border border-slate-200 dark:border-white/[0.08] shadow-2xl space-y-4 animate-modal-enter ${
              isEditShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
            }`}
          >
            {/* Grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-500" />
                <span>{isVi ? 'Chỉnh Sửa Mục P.A.R.A' : 'Edit P.A.R.A Item'}</span>
              </h3>
              <button 
                type="button" 
                onClick={handleSafeDismissEdit}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              {/* P.A.R.A Pillar Selector in Edit Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isVi ? 'Phân loại theo P.A.R.A' : 'P.A.R.A Pillar'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['project', 'area', 'resource', 'archive'] as const).map(pType => {
                    const meta = PARA_METADATA[pType];
                    const isSelected = (editingProject.color || '#3b82f6') === meta.color;
                    return (
                      <button
                        key={pType}
                        type="button"
                        onClick={() => {
                          setEditingProject({ ...editingProject, color: meta.color });
                          soundEngine.playPop();
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-sm block">{meta.icon}</span>
                        <span className="text-[10px] block font-bold mt-0.5">{isVi ? meta.labelVi.split(' ')[0] : meta.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Tên mục / Dự án *' : 'Project Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editingProject.name}
                    onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                    className="w-full px-3 py-2 pr-8 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {editingProject.name && (
                    <button
                      type="button"
                      onClick={() => setEditingProject({ ...editingProject, name: '' })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={isVi ? 'Xóa tên' : 'Clear name'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isVi ? 'Mô tả' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  value={editingProject.description || ''}
                  onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {isVi ? 'Tiến độ hoàn thành:' : 'Completion Progress:'}
                  </span>
                  <span className="font-black text-emerald-500 tabular-nums">{editingProject.progress || 0}%</span>
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Trạng thái' : 'Status'}
                  </label>
                  <select
                    value={editingProject.status || 'Đang làm'}
                    onChange={e => setEditingProject({ ...editingProject, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="Đang làm">{isVi ? 'Đang thực hiện' : 'In Progress'}</option>
                    <option value="Hoàn thành">{isVi ? 'Đã hoàn thành' : 'Completed'}</option>
                    <option value="Tạm dừng">{isVi ? 'Tạm ngưng' : 'On Hold'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Sức khỏe dự án' : 'Project Health'}
                  </label>
                  <select
                    value={editingProject.health || 'Tốt'}
                    onChange={e => setEditingProject({ ...editingProject, health: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="Tốt">{isVi ? 'Tốt' : 'Healthy'}</option>
                    <option value="Rủi ro">{isVi ? 'Rủi ro' : 'At Risk'}</option>
                    <option value="Nguy cấp">{isVi ? 'Nguy cấp' : 'Critical'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Ngân sách (VNĐ)' : 'Budget (VND)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    placeholder="0"
                    value={editingProject.budget || ''}
                    onChange={e => setEditingProject({ ...editingProject, budget: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isVi ? 'Hạn chót' : 'Deadline'}
                  </label>
                  <input
                    type="date"
                    value={editingProject.deadline || ''}
                    onChange={e => setEditingProject({ ...editingProject, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSafeDismissEdit}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  {isVi ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white rounded-xl cursor-pointer shadow-xs active:scale-95"
                >
                  {isSubmitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu Thay Đổi' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5-SECOND FLOATING UNDO TOAST                              */}
      {/* ========================================================= */}
      {undoProject && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl animate-slide-up border border-slate-700/50 backdrop-blur-md">
          <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">
            {isVi ? `Đã xóa "${undoProject.name}"` : `Deleted "${undoProject.name}"`}
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="px-3 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác' : 'Undo'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              setUndoProject(null);
            }}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {undoTaskItem && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl animate-slide-up border border-slate-700/50 backdrop-blur-md">
          <span className="text-xs font-semibold truncate max-w-[200px] sm:max-w-xs">
            {isVi ? `Đã xóa việc "${undoTaskItem.title}"` : `Deleted task "${undoTaskItem.title}"`}
          </span>
          <button
            type="button"
            onClick={handleUndoDeleteTask}
            className="px-3 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác' : 'Undo'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoTaskTimerRef.current) clearTimeout(undoTaskTimerRef.current);
              setUndoTaskItem(null);
            }}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ProjectsView;
