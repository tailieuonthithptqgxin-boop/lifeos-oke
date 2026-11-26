import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
import { formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { soundEngine } from '../lib/soundEngine';
import { 
  Note, 
  NoteType, 
  NoteSection, 
  NoteChecklistItem, 
  NoteMeetingData, 
  NoteDecisionData, 
  NoteTemplate,
  Task,
  Project,
  Goal,
  StudySubject
} from '../lib/types';
import { 
  FileText, 
  Pin, 
  Star, 
  Plus, 
  Search, 
  Filter, 
  Tag, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Calendar, 
  CheckSquare, 
  FolderKanban, 
  Target, 
  GraduationCap, 
  Lightbulb, 
  Users, 
  Scale, 
  Clock, 
  History, 
  ExternalLink, 
  Link as LinkIcon, 
  BookOpen, 
  Sparkles, 
  ListOrdered, 
  ListCheck, 
  AlignLeft, 
  Code, 
  Quote, 
  AlertCircle, 
  ChevronRight, 
  MoreVertical, 
  Eye, 
  Edit3, 
  Bell, 
  Share2, 
  BarChart2, 
  Network,
  X,
  Check,
  Layers,
  HelpCircle,
  TrendingUp,
  FileCode,
  DollarSign,
  Activity,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { saveNoteDraft, loadNoteDraft, clearNoteDraft } from '../lib/learningAutoSave';

const NOTE_TYPES: { type: NoteType; label: string; icon: any; color: string; bg: string }[] = [
  { type: 'Normal', label: 'Standard', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100' },
  { type: 'Checklist', label: 'Checklist', icon: ListCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { type: 'Meeting', label: 'Meeting', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { type: 'Decision', label: 'Decision Log', icon: Scale, color: 'text-amber-600', bg: 'bg-amber-100' },
  { type: 'Daily', label: 'Daily Note', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  { type: 'Study', label: 'Study Note', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { type: 'Project', label: 'Project Note', icon: FolderKanban, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  { type: 'Idea', label: 'Idea', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { type: 'Journal', label: 'Journal', icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-100' },
  { type: 'Reference', label: 'Reference', icon: LinkIcon, color: 'text-teal-600', bg: 'bg-teal-100' },
  { type: 'Finance', label: 'Finance Note', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { type: 'Research', label: 'Research', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-100' },
  { type: 'Custom', label: 'Custom', icon: Layers, color: 'text-slate-600', bg: 'bg-slate-100' },
];

const STANDARD_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tmpl_daily',
    title: 'Daily Reflection & Planning',
    type: 'Daily',
    category: 'Daily',
    description: 'Structured daily log for tracking priorities, insights and evening reflection.',
    defaultSections: [
      { id: 'sec_d1', title: '🎯 Key Priorities Today', content: '• Task 1\n• Task 2' },
      { id: 'sec_d2', title: '💡 Ideas & Observations', content: 'Capture thoughts that surfaced during the day...' },
      { id: 'sec_d3', title: '🌱 Evening Reflection', content: 'What went well? What could be improved?' },
      { id: 'sec_d4', title: '🚀 Tomorrow Preparation', content: '• Top priority tomorrow...' }
    ]
  },
  {
    id: 'tmpl_meeting',
    title: 'Meeting Notes & Actions',
    type: 'Meeting',
    category: 'Meetings',
    description: 'Professional meeting minutes with action items convertible to tasks.',
    defaultSections: [
      { id: 'sec_m1', title: '📌 Agenda & Goals', content: '1. Topic 1\n2. Topic 2' },
      { id: 'sec_m2', title: '💬 Discussion Summary', content: 'Key talking points covered...' },
      { id: 'sec_m3', title: 'Key Decisions & Next Steps', content: 'Agreed direction and resolutions...' }
    ]
  },
  {
    id: 'tmpl_decision',
    title: 'Decision Log Framework',
    type: 'Decision',
    category: 'Decisions',
    description: 'Structured decision framework: Context -> Options -> Pros/Cons -> Chosen Rationale.',
    defaultSections: [
      { id: 'sec_dec1', title: 'Context & Problem Statement', content: 'What specific decision needs to be made?' },
      { id: 'sec_dec2', title: 'Evaluated Options', content: 'Detailed analysis of viable alternatives...' }
    ]
  },
  {
    id: 'tmpl_study',
    title: 'Cornell Study Notes',
    type: 'Study',
    category: 'Study',
    description: 'Cornell method: Key cues/terms, detailed lecture notes, and final summary.',
    defaultSections: [
      { id: 'sec_st1', title: '🔑 Keywords & Cues', content: 'Key terms and core concepts...' },
      { id: 'sec_st2', title: '📝 Lecture Notes', content: 'In-depth subject notes...' },
      { id: 'sec_st3', title: 'Summary', content: 'Synthesize the main thesis in 2-3 sentences...' }
    ]
  },
  {
    id: 'tmpl_project',
    title: 'Project Kickoff Brief',
    type: 'Project',
    category: 'Projects',
    description: 'Project initiation brief: Goals, scope, architectural choices and risks.',
    defaultSections: [
      { id: 'sec_pj1', title: 'Objectives & Scope', content: 'What exact problem does this initiative solve?' },
      { id: 'sec_pj2', title: 'Architecture & Solution', content: 'Proposed system implementation...' },
      { id: 'sec_pj3', title: 'Milestones & Timeline', content: 'Key deliverables and target dates...' }
    ]
  }
];

type ActiveTab = 'dashboard' | 'all' | 'daily' | 'meetings' | 'graph' | 'templates' | 'analytics' | 'archive';

export function NotesView() {
  const { 
    notes, 
    tasks, 
    projects, 
    goals, 
    studySubjects, 
    habits, 
    transactions,
    addNote, 
    updateNote, 
    deleteNote, 
    toggleNotePin, 
    toggleNoteFavorite, 
    moveToTrashNote, 
    restoreNote,
    convertMeetingActionToTask,
    restoreNoteVersion,
    language
  } = useAppStore();

  const t = useTranslation(language);

  // F5 Persistence for Notes Subtab
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_notes_active_tab') as ActiveTab;
        if (saved && ['dashboard', 'all', 'daily', 'meetings', 'graph', 'templates', 'analytics', 'archive'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_notes_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_notes_category') || 'All';
      } catch {}
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_notes_category', selectedCategory);
    } catch {}
  }, [selectedCategory]);

  const [selectedType, setSelectedType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('lifeos_notes_type') || 'All';
      } catch {}
    }
    return 'All';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_notes_type', selectedType);
    } catch {}
  }, [selectedType]);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_notes_view_mode') as 'grid' | 'list';
        if (saved === 'grid' || saved === 'list') return saved;
      } catch {}
    }
    return 'grid';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_notes_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

  // Quick Omnibar & Toast States
  const [quickInput, setQuickInput] = useState('');
  const [quickSuccess, setQuickSuccess] = useState<{ id: string; title: string } | null>(null);
  const [activeFilterMode, setActiveFilterMode] = useState<'all' | 'pinned' | 'favorite' | 'checklist'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_notes_filter_mode') as any;
        if (saved && ['all', 'pinned', 'favorite', 'checklist'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'all';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_notes_filter_mode', activeFilterMode);
    } catch {}
  }, [activeFilterMode]);

  // 5-second Undo Toast State
  const [undoItem, setUndoItem] = useState<{ id: string; title: string; note: Note; action: 'trash' | 'delete' } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);

  // Auto-Save & Instant Note Draft Recovery
  useEffect(() => {
    const draft = loadNoteDraft();
    if (draft && (draft.title?.trim() || draft.content?.trim())) {
      setEditingNote(draft as Partial<Note>);
      setIsEditorOpen(true);
      console.log('✅ [AutoSave] Khôi phục bản nháp ghi chú đang viết dở:', draft.title);
    }
  }, []);

  useEffect(() => {
    if (isEditorOpen && editingNote && (editingNote.title?.trim() || editingNote.content?.trim())) {
      saveNoteDraft(editingNote);
    } else if (!isEditorOpen) {
      clearNoteDraft();
    }
  }, [isEditorOpen, editingNote]);
  const [detailNote, setDetailNote] = useState<Note | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem('lifeos_notes_selected_id');
        if (savedId) {
          const found = notes.find(n => n.id === savedId);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    try {
      if (detailNote) {
        localStorage.setItem('lifeos_notes_selected_id', detailNote.id);
      } else {
        localStorage.removeItem('lifeos_notes_selected_id');
      }
    } catch {}
  }, [detailNote]);

  useEffect(() => {
    if (detailNote) {
      const fresh = notes.find(n => n.id === detailNote.id);
      if (fresh && fresh !== detailNote) {
        setDetailNote(fresh);
      }
    }
  }, [notes, detailNote]);

  // Active notes (excluding trash and archived unless in specific views)
  const activeNotes = useMemo(() => notes.filter(n => !n.inTrash && !n.archived), [notes]);
  const archivedNotes = useMemo(() => notes.filter(n => n.archived && !n.inTrash), [notes]);
  const trashNotes = useMemo(() => notes.filter(n => n.inTrash), [notes]);

  const pinnedNotes = useMemo(() => activeNotes.filter(n => n.pinned), [activeNotes]);
  const favoriteNotes = useMemo(() => activeNotes.filter(n => n.favorite), [activeNotes]);

  // Categories & Tags
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach(n => { if (n.category) cats.add(n.category); });
    return ['All', ...Array.from(cats)];
  }, [notes]);

  const allTags = useMemo(() => {
    const tagsMap: Record<string, number> = {};
    notes.forEach(n => {
      n.tags?.forEach(t => {
        tagsMap[t] = (tagsMap[t] || 0) + 1;
      });
    });
    return Object.entries(tagsMap).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  // Filtered Notes for 'All Notes' view
  const filteredNotes = useMemo(() => {
    return activeNotes.filter(n => {
      const matchesSearch = 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
      const matchesType = selectedType === 'All' || n.type === selectedType;
      const matchesTag = !selectedTag || n.tags?.includes(selectedTag);

      const matchesFilterMode = 
        activeFilterMode === 'all' ? true :
        activeFilterMode === 'pinned' ? n.pinned :
        activeFilterMode === 'favorite' ? n.favorite :
        activeFilterMode === 'checklist' ? (n.checklists && n.checklists.length > 0) : true;

      return matchesSearch && matchesCat && matchesType && matchesTag && matchesFilterMode;
    });
  }, [activeNotes, searchQuery, selectedCategory, selectedType, selectedTag, activeFilterMode]);

  // Handlers
  const handleCreateNewNote = (type: NoteType = 'Normal', template?: NoteTemplate) => {
    const newNote: Partial<Note> = {
      id: Math.random().toString(36).substring(2, 11),
      title: template ? template.title : '',
      content: template?.defaultContent || '',
      type: template ? template.type : type,
      category: template ? template.category : 'Tổng hợp',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      noteDate: formatLocalDateKey(new Date()),
      priority: 'Medium',
      status: 'Active',
      pinned: false,
      favorite: false,
      archived: false,
      inTrash: false,
      sections: template ? template.defaultSections : [],
      checklists: [],
      linkedItems: {}
    };
    setEditingNote(newNote);
    setIsEditorOpen(true);
  };

  const handleSaveNote = (noteToSave: Partial<Note>) => {
    if (!noteToSave.title?.trim()) {
      return;
    }
    clearNoteDraft();
    const existing = (notes || []).find(n => n.id === noteToSave.id);
    if (existing) {
      updateNote(existing.id, noteToSave);
    } else {
      addNote(noteToSave as Note);
    }
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  // Natural Language Quick Add
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = quickInput.trim();
    if (!raw) return;

    // Parse #tags
    const tags: string[] = [];
    const tagMatches = raw.match(/#([\w\u00C0-\u024F\u1E00-\u1EFF]+)/g);
    if (tagMatches) {
      tagMatches.forEach(t => tags.push(t.replace('#', '')));
    }

    // Parse @category
    let category = 'Tổng hợp';
    const catMatch = raw.match(/@([\w\u00C0-\u024F\u1E00-\u1EFF]+)/);
    if (catMatch && catMatch[1]) {
      category = catMatch[1];
    }

    // Infer note type
    let inferredType: NoteType = 'Normal';
    const lower = raw.toLowerCase();
    if (tags.some(t => t.toLowerCase() === 'meeting') || lower.includes('họp') || lower.includes('meeting')) {
      inferredType = 'Meeting';
    } else if (tags.some(t => t.toLowerCase() === 'idea') || lower.includes('ý tưởng') || lower.includes('idea')) {
      inferredType = 'Idea';
    } else if (tags.some(t => t.toLowerCase() === 'checklist') || lower.includes('checklist') || lower.includes('cần mua') || lower.includes('danh sách')) {
      inferredType = 'Checklist';
    } else if (tags.some(t => t.toLowerCase() === 'daily') || lower.includes('nhật ký') || lower.includes('daily')) {
      inferredType = 'Daily';
    } else if (tags.some(t => t.toLowerCase() === 'decision') || lower.includes('quyết định') || lower.includes('decision')) {
      inferredType = 'Decision';
    } else if (tags.some(t => t.toLowerCase() === 'study') || lower.includes('học') || lower.includes('study') || lower.includes('ôn thi')) {
      inferredType = 'Study';
    } else if (tags.some(t => t.toLowerCase() === 'project') || lower.includes('dự án') || lower.includes('project')) {
      inferredType = 'Project';
    } else if (tags.some(t => t.toLowerCase() === 'finance') || lower.includes('tài chính') || lower.includes('chi phí') || lower.includes('ngân sách')) {
      inferredType = 'Finance';
    }

    // Clean title
    let cleanTitle = raw
      .replace(/#([\w\u00C0-\u024F\u1E00-\u1EFF]+)/g, '')
      .replace(/@([\w\u00C0-\u024F\u1E00-\u1EFF]+)/g, '')
      .trim();
    if (!cleanTitle) cleanTitle = raw;

    const newNote: Note = {
      id: 'note_' + Math.random().toString(36).substring(2, 11),
      title: cleanTitle,
      content: '',
      folder: 'Inbox',
      type: inferredType,
      category,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      noteDate: formatLocalDateKey(new Date()),
      priority: 'Medium',
      status: 'Active',
      pinned: false,
      favorite: false,
      archived: false,
      inTrash: false,
      sections: [],
      checklists: inferredType === 'Checklist' ? [{ id: 'chk_1', text: 'Mục 1', completed: false }] : [],
      linkedItems: {}
    };

    addNote(newNote);
    setQuickInput('');
    setQuickSuccess({ id: newNote.id, title: newNote.title });
    setTimeout(() => {
      setQuickSuccess(prev => prev?.id === newNote.id ? null : prev);
    }, 4500);
  };

  // Undo Handlers
  const handleMoveToTrashWithUndo = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    moveToTrashNote(id);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ id, title: note.title, note, action: 'trash' });
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
  };

  const handleDeletePermanentWithUndo = (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    deleteNote(id);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ id, title: note.title, note, action: 'delete' });
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (!undoItem) return;
    if (undoItem.action === 'trash') {
      restoreNote(undoItem.id);
    } else {
      addNote(undoItem.note);
    }
    setUndoItem(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const handleToggleChecklist = (noteId: string, checkId: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const updated = (target.checklists || []).map(c => 
      c.id === checkId ? { ...c, completed: !c.completed } : c
    );
    updateNote(noteId, { checklists: updated });
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {language === 'vi' ? 'Sổ tay & Trung tâm Tri thức' : t('Notes & Knowledge Hub')}
                </h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shrink-0">
                  {language === 'vi' ? 'Tri thức' : 'Hub'}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-normal line-clamp-1 sm:line-clamp-none break-words">
                {language === 'vi' 
                  ? 'Quản lý ghi chú, liên kết tri thức, biên bản cuộc họp và sơ đồ kiến thức cá nhân.'
                  : t('Organize thoughts, link concepts, manage meetings, and build your personal Knowledge Graph')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button type="button"
            onClick={() => handleCreateNewNote('Normal')}
            className="flex items-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-4 py-2.5 min-h-[44px] rounded-xl shadow-xs transition-colors text-xs sm:text-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> {language === 'vi' ? '+ Tạo ghi chú mới' : t('Create New Note')}
          </button>
        </div>
      </div>

      {/* NATURAL LANGUAGE QUICK NOTE OMNIBAR */}
      <div className="bg-white dark:bg-[#141E30] p-3 sm:p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs">
        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={language === 'vi' 
                ? "Ghi chú nhanh: 'Họp kế hoạch Q4 #meeting @Work', 'Ý tưởng app AI #idea', 'Mua sách giáo trình #checklist' (Enter để tạo)..."
                : "Quick capture: 'Weekly sync #meeting @Work', 'AI project idea #idea', 'Buy textbook #checklist' (Press Enter)..."
              }
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-base sm:text-sm min-h-[44px] sm:min-h-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            />
            {quickInput && (
              <button
                type="button"
                onClick={() => setQuickInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Xóa nội dung"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{language === 'vi' ? 'Tạo nhanh 0.2s' : 'Quick Add'}</span>
          </button>
        </form>

        {quickSuccess && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Đã tạo ghi chú: <strong>{quickSuccess.title}</strong></span>
            </span>
            <button
              type="button"
              onClick={() => {
                const created = notes.find(n => n.id === quickSuccess.id);
                if (created) setDetailNote(created);
              }}
              className="font-bold underline hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer"
            >
              Mở xem ngay
            </button>
          </div>
        )}
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200/80 dark:border-slate-800 touch-pan-x overscroll-x-contain py-1">
        {[
          { id: 'dashboard', label: language === 'vi' ? 'Bảng điều khiển' : 'Dashboard', icon: BarChart2 },
          { id: 'all', label: language === 'vi' ? 'Tất cả ghi chú' : 'All Notes', icon: FileText, count: activeNotes.length },
          { id: 'daily', label: language === 'vi' ? 'Nhật ký' : 'Daily Notes', icon: Calendar },
          { id: 'meetings', label: language === 'vi' ? 'Cuộc họp & Quyết định' : 'Meetings & Decisions', icon: Users },
          { id: 'graph', label: language === 'vi' ? 'Sơ đồ tri thức' : 'Knowledge Graph', icon: Network },
          { id: 'templates', label: language === 'vi' ? 'Thư viện mẫu' : 'Templates Library', icon: Sparkles },
          { id: 'analytics', label: language === 'vi' ? 'Phân tích' : 'Analytics', icon: TrendingUp },
          { id: 'archive', label: language === 'vi' ? 'Lưu trữ & Thùng rác' : 'Archive & Trash', icon: Archive, count: archivedNotes.length + trashNotes.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 min-h-[40px] sm:min-h-0 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW CONTENT */}
      <div key={activeTab} className="animate-page-enter">
        {activeTab === 'dashboard' && (
          <NotesDashboardView 
            notes={activeNotes} 
            pinnedNotes={pinnedNotes}
            favoriteNotes={favoriteNotes}
            tags={allTags}
            onOpenDetail={setDetailNote}
            onOpenEdit={(n) => { setEditingNote(n); setIsEditorOpen(true); }}
            onCreateNote={handleCreateNewNote}
            onTogglePin={toggleNotePin}
            onToggleFav={toggleNoteFavorite}
            onToggleChecklist={handleToggleChecklist}
            onMoveTrash={handleMoveToTrashWithUndo}
            onNavigateTab={(tab, filter) => {
              if (filter) setActiveFilterMode(filter);
              setActiveTab(tab);
            }}
            onSelectTag={(tag) => {
              setSelectedTag(tag);
              setActiveTab('all');
            }}
          />
        )}

      {activeTab === 'all' && (
        <AllNotesView 
          notes={filteredNotes}
          categories={allCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          viewMode={viewMode}
          setViewMode={setViewMode}
          allTags={allTags}
          activeFilterMode={activeFilterMode}
          setActiveFilterMode={setActiveFilterMode}
          onOpenDetail={setDetailNote}
          onOpenEdit={(n) => { setEditingNote(n); setIsEditorOpen(true); }}
          onTogglePin={toggleNotePin}
          onToggleFav={toggleNoteFavorite}
          onToggleChecklist={handleToggleChecklist}
          onMoveTrash={handleMoveToTrashWithUndo}
        />
      )}

      {activeTab === 'daily' && (
        <DailyNotesView 
          notes={activeNotes.filter(n => n.type === 'Daily' || n.category === 'Hàng ngày')}
          onCreateDaily={() => handleCreateNewNote('Daily', STANDARD_TEMPLATES[0])}
          onOpenDetail={setDetailNote}
        />
      )}

      {activeTab === 'meetings' && (
        <MeetingsDecisionsView 
          notes={activeNotes.filter(n => n.type === 'Meeting' || n.type === 'Decision')}
          tasks={tasks}
          onConvertAction={convertMeetingActionToTask}
          onCreateMeeting={() => handleCreateNewNote('Meeting', STANDARD_TEMPLATES[1])}
          onCreateDecision={() => handleCreateNewNote('Decision', STANDARD_TEMPLATES[2])}
          onOpenDetail={setDetailNote}
        />
      )}

      {activeTab === 'graph' && (
        <KnowledgeGraphView 
          notes={activeNotes}
          projects={projects}
          goals={goals}
          tasks={tasks}
          onOpenDetail={setDetailNote}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesView 
          templates={STANDARD_TEMPLATES}
          onUseTemplate={(tmpl) => handleCreateNewNote(tmpl.type, tmpl)}
        />
      )}

      {activeTab === 'analytics' && (
        <NotesAnalyticsView notes={notes} />
      )}

      {activeTab === 'archive' && (
        <ArchiveTrashView 
          archivedNotes={archivedNotes}
          trashNotes={trashNotes}
          onRestore={restoreNote}
          onDeletePermanent={handleDeletePermanentWithUndo}
          onOpenDetail={setDetailNote}
        />
      )}
      </div>

      {/* FLOATING 5-SECOND UNDO TOAST */}
      {undoItem && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs min-w-0 flex-1">
            <span>{undoItem.action === 'trash' ? 'Đã chuyển vào thùng rác: ' : 'Đã xóa vĩnh viễn: '}</span>
            <strong className="text-white max-w-[150px] inline-block truncate align-bottom">{undoItem.title}</strong>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1.5 min-h-[38px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác (5s)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              setUndoItem(null);
            }}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-lg"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailNote && (
        <NoteDetailModal 
          note={detailNote} 
          allNotes={notes}
          tasks={tasks}
          projects={projects}
          goals={goals}
          studySubjects={studySubjects}
          onClose={() => setDetailNote(null)}
          onEdit={() => { setEditingNote(detailNote); setDetailNote(null); setIsEditorOpen(true); }}
          onTogglePin={() => toggleNotePin(detailNote.id)}
          onToggleFav={() => toggleNoteFavorite(detailNote.id)}
          onConvertAction={convertMeetingActionToTask}
          onRestoreVersion={(vId) => restoreNoteVersion(detailNote.id, vId)}
          onUpdateNote={(id, updates) => updateNote(id, updates)}
          onToggleChecklist={handleToggleChecklist}
        />
      )}

      {/* EDITOR / CREATION MODAL */}
      {isEditorOpen && editingNote && (
        <NoteEditorModal 
          note={editingNote}
          allNotes={notes}
          tasks={tasks}
          projects={projects}
          goals={goals}
          studySubjects={studySubjects}
          onClose={() => { setIsEditorOpen(false); setEditingNote(null); }}
          onSave={handleSaveNote}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. DASHBOARD VIEW
// ----------------------------------------------------------------------
function NotesDashboardView({ 
  notes, 
  pinnedNotes, 
  favoriteNotes, 
  tags, 
  onOpenDetail, 
  onOpenEdit, 
  onCreateNote,
  onTogglePin,
  onToggleFav,
  onToggleChecklist,
  onMoveTrash,
  onNavigateTab,
  onSelectTag
}: {
  notes: Note[];
  pinnedNotes: Note[];
  favoriteNotes: Note[];
  tags: [string, number][];
  onOpenDetail: (n: Note) => void;
  onOpenEdit: (n: Note) => void;
  onCreateNote: (t?: NoteType, tmpl?: NoteTemplate) => void;
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
  onToggleChecklist?: (noteId: string, checkId: string) => void;
  onMoveTrash?: (id: string) => void;
  onNavigateTab?: (tab: ActiveTab, filter?: 'all' | 'pinned' | 'favorite' | 'checklist') => void;
  onSelectTag?: (tag: string) => void;
}) {
  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 6);
  }, [notes]);

  const pendingChecklistNotes = useMemo(() => {
    return notes.filter(n => n.checklists && n.checklists.some(c => !c.completed));
  }, [notes]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* INTERACTIVE BENTO KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full min-w-0">
        <button
          type="button"
          onClick={() => onNavigateTab?.('all', 'all')}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Hoạt động</span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{notes.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Tất cả ghi chú →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab?.('all', 'pinned')}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 text-left hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Đã ghim</span>
            <Pin className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{pinnedNotes.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Lọc ghi chú ghim →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab?.('all', 'favorite')}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 text-left hover:border-rose-400 dark:hover:border-rose-500 transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Yêu thích</span>
            <Star className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{favoriteNotes.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Lọc ghi chú yêu thích →</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab?.('all', 'checklist')}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs flex flex-col justify-between min-w-0 text-left hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer group active:scale-98"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Chờ xử lý</span>
            <ListCheck className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{pendingChecklistNotes.length}</div>
          <span className="text-[10px] text-slate-400 font-normal mt-1">Lọc checklist tồn đọng →</span>
        </button>
      </div>

      {/* PINNED NOTES SECTION */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3 w-full min-w-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Pin className="w-4 h-4 text-amber-500 shrink-0" /> Ghi chú được ghim
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
            {pinnedNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onClick={() => onOpenDetail(note)} 
                onEdit={() => onOpenEdit(note)}
                onTogglePin={() => onTogglePin(note.id)}
                onToggleFav={() => onToggleFav(note.id)}
                onToggleChecklist={onToggleChecklist}
                onMoveTrash={() => onMoveTrash?.(note.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 1-CLICK POPULAR TEMPLATES STRIP */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-1">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">Mẫu nhanh:</span>
        {STANDARD_TEMPLATES.map(tmpl => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => onCreateNote(tmpl.type, tmpl)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition-all shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{tmpl.title}</span>
          </button>
        ))}
      </div>

      {/* MAIN GRID: RECENT NOTES & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
        <div className="lg:col-span-2 space-y-4 min-w-0 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" /> Cập nhật gần đây
            </h3>
            <button type="button" 
              onClick={() => onCreateNote()} 
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              + Tạo nhanh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
            {recentNotes.map(note => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onClick={() => onOpenDetail(note)} 
                onEdit={() => onOpenEdit(note)}
                onTogglePin={() => onTogglePin(note.id)}
                onToggleFav={() => onToggleFav(note.id)}
                onToggleChecklist={onToggleChecklist}
                onMoveTrash={() => onMoveTrash?.(note.id)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK CREATION & TAGS */}
        <div className="space-y-4 sm:space-y-5 min-w-0 w-full">
          {/* Quick Note Templates (Clean White SaaS Card) */}
          <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs space-y-3.5 w-full min-w-0">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" /> Quick Note Templates
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Tạo nhanh ghi chú theo định dạng chuẩn hóa để tích hợp với hệ thống công việc.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full min-w-0">
              <button type="button" 
                onClick={() => onCreateNote('Meeting')}
                className="bg-[#F1F5F9] hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <Users className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
                <span className="truncate">Cuộc họp</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Decision')}
                className="bg-[#F1F5F9] hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <Scale className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
                <span className="truncate">Quyết định</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Daily')}
                className="bg-[#F1F5F9] hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
                <span className="truncate">Daily Note</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Checklist')}
                className="bg-[#F1F5F9] hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <ListCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
                <span className="truncate">Checklist</span>
              </button>
            </div>
          </div>

          {/* TAG CLOUD */}
          <div className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-slate-400" /> Tags Nổi bật
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(([tag, count]) => (
                <span 
                  key={tag} 
                  onClick={() => onSelectTag?.(tag)}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700 cursor-pointer transition-colors flex items-center gap-1 active:scale-95"
                  title={`Lọc tất cả ghi chú có thẻ #${tag}`}
                >
                  #{tag} <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// NOTE CARD COMPONENT
// ----------------------------------------------------------------------
function NoteCard({ 
  note, 
  onClick, 
  onEdit, 
  onTogglePin, 
  onToggleFav,
  onToggleChecklist,
  onMoveTrash
}: { 
  note: Note; 
  onClick: () => void; 
  onEdit?: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onToggleChecklist?: (noteId: string, checkId: string) => void;
  onMoveTrash?: () => void;
  key?: any;
}) {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const typeMeta = NOTE_TYPES.find(t => t.type === note.type) || NOTE_TYPES[0];
  const TypeIcon = typeMeta.icon;

  const linkedCount = (note.linkedItems?.taskIds?.length || 0) + 
                      (note.linkedItems?.projectIds?.length || 0) + 
                      (note.linkedItems?.goalIds?.length || 0);

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#141E30] p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 relative group w-full min-w-0 max-w-full overflow-hidden break-words"
    >
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${typeMeta.bg} ${typeMeta.color}`}>
            <TypeIcon className="w-3 h-3 shrink-0" /> {t(typeMeta.label)}
          </span>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button type="button" 
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className={`p-2 sm:p-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.pinned ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
              title="Ghim ghi chú"
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
            </button>
            <button type="button" 
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              className={`p-2 sm:p-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.favorite ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}
              title="Yêu thích"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
            </button>
            {onMoveTrash && (
              <button type="button" 
                onClick={(e) => { e.stopPropagation(); onMoveTrash(); }}
                className="p-2 sm:p-1 min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors cursor-pointer"
                title="Chuyển vào thùng rác (Hoàn tác 5s)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
          {note.title}
        </h4>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed break-words">
          {note.content || 'Chưa có nội dung xem trước...'}
        </p>

        {/* CHECKLIST MINI PREVIEW & INTERACTIVE TOGGLE */}
        {note.checklists && note.checklists.length > 0 && (
          <div className="mt-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ListCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Checklist ({note.checklists.filter(c => c.completed).length}/{note.checklists.length})</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.round((note.checklists.filter(c => c.completed).length / note.checklists.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300" 
                style={{ width: `${Math.round((note.checklists.filter(c => c.completed).length / note.checklists.length) * 100)}%` }} 
              />
            </div>
            <div className="space-y-1 pt-0.5">
              {note.checklists.slice(0, 2).map(chk => (
                <label 
                  key={chk.id} 
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none group/chk"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={chk.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleChecklist?.(note.id, chk.id);
                    }}
                    className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer"
                  />
                  <span className={`truncate text-[11px] ${chk.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {chk.text}
                  </span>
                </label>
              ))}
              {note.checklists.length > 2 && (
                <div className="text-[10px] text-slate-400 font-medium pt-0.5">
                  +{note.checklists.length - 2} mục khác...
                </div>
              )}
            </div>
          </div>
        )}

        {/* MEETING ACTION SUMMARY IF ANY */}
        {note.meetingData?.actionItems && note.meetingData.actionItems.length > 0 && (
          <div className="mt-2.5 bg-blue-50/50 dark:bg-blue-950/40 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span className="font-medium truncate">Action Items: {note.meetingData.actionItems.filter(a => a.completed).length}/{note.meetingData.actionItems.length}</span>
            <span className="text-[10px] font-bold underline shrink-0 ml-1">Xem</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{new Date(note.updatedAt || note.createdAt).toLocaleDateString('vi-VN')}</span>
          {linkedCount > 0 && (
            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
              <LinkIcon className="w-3 h-3" /> {linkedCount}
            </span>
          )}
        </div>

        {note.category && (
          <span className="font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate shrink-0 max-w-[120px]">
            {note.category}
          </span>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. ALL NOTES VIEW WITH SEARCH & FILTERS
// ----------------------------------------------------------------------
function AllNotesView({
  notes,
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  viewMode,
  setViewMode,
  allTags,
  activeFilterMode,
  setActiveFilterMode,
  onOpenDetail,
  onOpenEdit,
  onTogglePin,
  onToggleFav,
  onToggleChecklist,
  onMoveTrash
}: {
  notes: Note[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedType: string;
  setSelectedType: (t: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedTag: string | null;
  setSelectedTag: (t: string | null) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  allTags: [string, number][];
  activeFilterMode?: 'all' | 'pinned' | 'favorite' | 'checklist';
  setActiveFilterMode?: (mode: 'all' | 'pinned' | 'favorite' | 'checklist') => void;
  onOpenDetail: (n: Note) => void;
  onOpenEdit: (n: Note) => void;
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
  onToggleChecklist?: (noteId: string, checkId: string) => void;
  onMoveTrash: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung, tag, liên kết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm min-h-[44px] sm:min-h-0 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              {categories.map(c => <option key={c} value={c}>Danh mục: {c}</option>)}
            </select>

            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All">Loại: Tất cả</option>
              {NOTE_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button type="button" 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 min-h-[36px] sm:min-h-0 min-w-[36px] sm:min-w-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                Grid
              </button>
              <button type="button" 
                onClick={() => setViewMode('list')}
                className={`p-1.5 min-h-[36px] sm:min-h-0 min-w-[36px] sm:min-w-0 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500'}`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* QUICK FILTER MODE BUTTONS & TAG FILTER CHIPS */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 shrink-0">Lọc nhanh:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pinned', label: '📌 Đã ghim' },
              { id: 'favorite', label: '⭐ Yêu thích' },
              { id: 'checklist', label: '☑️ Có checklist' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveFilterMode?.(m.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeFilterMode === m.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              <span className="font-bold text-slate-400 whitespace-nowrap">Tags:</span>
              {selectedTag && (
                <button type="button" 
                  onClick={() => setSelectedTag(null)} 
                  className="bg-blue-600 text-white font-medium px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer"
                >
                  #{selectedTag} <X className="w-3 h-3" />
                </button>
              )}
              {allTags.slice(0, 8).map(([tag]) => (
                <button type="button"
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`px-2 py-0.5 rounded-full font-medium transition cursor-pointer ${
                    selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NOTES DISPLAY */}
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-[#141E30] p-12 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">Không tìm thấy ghi chú nào</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">Hãy thử thay đổi bộ lọc hoặc tạo ghi chú mới bằng thanh Omnibar ở trên.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onClick={() => onOpenDetail(note)}
              onEdit={() => onOpenEdit(note)}
              onTogglePin={() => onTogglePin(note.id)}
              onToggleFav={() => onToggleFav(note.id)}
              onToggleChecklist={onToggleChecklist}
              onMoveTrash={() => onMoveTrash(note.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
          {notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onOpenDetail(note)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button type="button" 
                  onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                  className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${note.pinned ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                  title="Ghim"
                >
                  <Pin className="w-4 h-4 fill-current" />
                </button>
                <button type="button" 
                  onClick={(e) => { e.stopPropagation(); onToggleFav(note.id); }}
                  className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition ${note.favorite ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}
                  title="Yêu thích"
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{note.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{note.content || 'Chưa có nội dung'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {note.checklists && note.checklists.length > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50 hidden sm:inline-flex items-center gap-1">
                    <ListCheck className="w-3 h-3" />
                    {note.checklists.filter(c => c.completed).length}/{note.checklists.length}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                  {note.type}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {new Date(note.updatedAt || note.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <button type="button" 
                  onClick={(e) => { e.stopPropagation(); onMoveTrash(note.id); }}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition"
                  title="Chuyển vào thùng rác (Hoàn tác 5s)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. DAILY NOTES VIEW
// ----------------------------------------------------------------------
function DailyNotesView({ 
  notes, 
  onCreateDaily, 
  onOpenDetail 
}: { 
  notes: Note[]; 
  onCreateDaily: () => void; 
  onOpenDetail: (n: Note) => void;
}) {
  const { language } = useAppStore();
  const t = useTranslation(language);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-300" /> {t('Nhật ký Ghi chú Hàng ngày (Daily Notes)')}
          </h3>
          <p className="text-xs text-purple-200 mt-1">
            {t('Ghi chép nhanh các sự kiện, việc quan trọng, ý tưởng phát sinh và suy ngẫm trong ngày.')}
          </p>
        </div>
        <button type="button" 
          onClick={onCreateDaily}
          className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> {t('Tạo Daily Note hôm nay')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.map(note => (
          <div 
            key={note.id}
            onClick={() => onOpenDetail(note)}
            className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:border-purple-300 dark:hover:border-purple-500/50 transition-all cursor-pointer space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-bold text-slate-800 dark:text-white text-lg">{note.title}</span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200/50 dark:border-purple-900/50">
                {note.noteDate || 'Hàng ngày'}
              </span>
            </div>

            <div className="space-y-2">
              {note.sections?.map(sec => (
                <div key={sec.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-200 mb-1">{sec.title}</div>
                  <div className="text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-3">{sec.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. MEETINGS & DECISIONS VIEW
// ----------------------------------------------------------------------
function MeetingsDecisionsView({
  notes,
  tasks,
  onConvertAction,
  onCreateMeeting,
  onCreateDecision,
  onOpenDetail
}: {
  notes: Note[];
  tasks: Task[];
  onConvertAction: (noteId: string, actionId: string) => void;
  onCreateMeeting: () => void;
  onCreateDecision: () => void;
  onOpenDetail: (n: Note) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Cuộc họp & Nhật ký Quyết định
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chuyển Action Items cuộc họp thành Task thật và lưu vết lý do đưa ra các quyết định trọng yếu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" 
            onClick={onCreateMeeting}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Users className="w-4 h-4" /> + Meeting Note
          </button>
          <button type="button" 
            onClick={onCreateDecision}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Scale className="w-4 h-4" /> + Decision Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {notes.map(note => (
          <div key={note.id} className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  note.type === 'Meeting' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {note.type === 'Meeting' ? 'Cuộc họp' : 'Quyết định'}
                </span>
                <h4 className="font-bold text-slate-800 dark:text-white text-lg mt-1">{note.title}</h4>
              </div>
              <button type="button" 
                onClick={() => onOpenDetail(note)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Chi tiết
              </button>
            </div>

            {/* MEETING ACTION ITEMS DISPLAY */}
            {note.meetingData?.actionItems && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Action Items cuộc họp:</div>
                {note.meetingData.actionItems.map(act => (
                  <div key={act.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{act.text}</span>
                    {act.convertedTaskId ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        Đã chuyển thành Task
                      </span>
                    ) : (
                      <button type="button" 
                        onClick={() => onConvertAction(note.id, act.id)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                      >
                        + Chuyển thành Task thật
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* DECISION SUMMARY */}
            {note.decisionData && (
              <div className="space-y-2 bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 text-xs">
                <div><span className="font-bold text-amber-800 dark:text-amber-300">Lựa chọn:</span> <span className="text-slate-700 dark:text-slate-300">{note.decisionData.chosenOption}</span></div>
                <div><span className="font-bold text-amber-800 dark:text-amber-300">Lý do:</span> <span className="text-slate-700 dark:text-slate-300">{note.decisionData.reason}</span></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. KNOWLEDGE GRAPH & BI-DIRECTIONAL LINKS
// ----------------------------------------------------------------------
function KnowledgeGraphView({ 
  notes, 
  projects, 
  goals, 
  tasks, 
  onOpenDetail 
}: {
  notes: Note[];
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  onOpenDetail: (n: Note) => void;
}) {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredGraphNotes = useMemo(() => {
    if (filterType === 'all') return notes;
    if (filterType === 'linked') {
      return notes.filter(n => 
        (n.linkedItems?.taskIds?.length || 0) + 
        (n.linkedItems?.projectIds?.length || 0) + 
        (n.linkedItems?.goalIds?.length || 0) > 0
      );
    }
    return notes.filter(n => n.type === filterType);
  }, [notes, filterType]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">Personal Knowledge Graph</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mạng lưới liên kết 2 chiều giữa Ghi chú, Dự án, Mục tiêu & Công việc.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả Node ({notes.length})</option>
              <option value="linked">Chỉ Node có liên kết</option>
              <option value="Meeting">Meeting Notes</option>
              <option value="Decision">Decision Logs</option>
              <option value="Study">Study Notes</option>
              <option value="Project">Project Notes</option>
            </select>
          </div>
        </div>

        {/* MAP VISUALIZATION */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl min-h-[380px] flex flex-col items-center justify-center relative overflow-hidden border border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-25" />
          
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl">
            {filteredGraphNotes.map(n => {
              const taskCount = n.linkedItems?.taskIds?.length || 0;
              const projCount = n.linkedItems?.projectIds?.length || 0;
              const goalCount = n.linkedItems?.goalIds?.length || 0;
              const totalLinks = taskCount + projCount + goalCount;

              return (
                <div 
                  key={n.id}
                  onClick={() => onOpenDetail(n)}
                  className="bg-slate-800/90 hover:bg-blue-600/90 text-white p-3.5 rounded-2xl border border-slate-700/80 hover:border-blue-400 cursor-pointer transition-all shadow-lg text-left max-w-[220px] shrink-0 group active:scale-95"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-200">
                      {n.type || 'Standard'}
                    </span>
                    {totalLinks > 0 && (
                      <span className="text-[10px] font-mono font-bold bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded-full">
                        {totalLinks} links
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold line-clamp-1 text-white group-hover:text-white">{n.title}</div>
                  <div className="text-[11px] text-slate-400 group-hover:text-blue-100 line-clamp-1 mt-0.5">
                    {n.content || 'Không có mô tả'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. TEMPLATES VIEW
// ----------------------------------------------------------------------
function TemplatesView({ 
  templates, 
  onUseTemplate 
}: { 
  templates: NoteTemplate[]; 
  onUseTemplate: (tmpl: NoteTemplate) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" /> Thư viện Mẫu Ghi chú (Standard Templates)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Sử dụng các cấu trúc mẫu đã được tối ưu hóa cho công việc, học tập và quản trị bản thân.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between gap-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all">
            <div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                {tmpl.category}
              </span>
              <h4 className="font-bold text-slate-800 dark:text-white text-lg mt-2">{tmpl.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{tmpl.description}</p>
            </div>

            <button type="button" 
              onClick={() => onUseTemplate(tmpl)}
              className="w-full bg-slate-900 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Sử dụng Template này
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 7. ANALYTICS VIEW
// ----------------------------------------------------------------------
function NotesAnalyticsView({ notes }: { notes: Note[] }) {
  const activeNotes = useMemo(() => notes.filter(n => !n.inTrash && !n.archived), [notes]);

  const typeStats = useMemo(() => {
    const map: Record<string, number> = {};
    activeNotes.forEach(n => {
      const type = n.type || 'Normal';
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeNotes]);

  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    activeNotes.forEach(n => {
      const cat = n.category || 'Tổng hợp';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [activeNotes]);

  const totalWords = useMemo(() => {
    return activeNotes.reduce((acc, n) => {
      const words = (n.content || '').trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [activeNotes]);

  const totalChecklists = useMemo(() => {
    return activeNotes.reduce((acc, n) => acc + (n.checklists?.length || 0), 0);
  }, [activeNotes]);

  const linkedNotesCount = useMemo(() => {
    return activeNotes.filter(n => 
      (n.linkedItems?.taskIds?.length || 0) + 
      (n.linkedItems?.projectIds?.length || 0) + 
      (n.linkedItems?.goalIds?.length || 0) > 0
    ).length;
  }, [activeNotes]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Thống kê & Dòng chảy Tri thức
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tổng hợp dữ liệu số lượng, mật độ liên kết và thói quen ghi chép tri thức cá nhân.
          </p>
        </div>
        
        {/* 4 BENTO STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng ghi chú</div>
            <div className="text-2xl font-bold font-mono text-slate-800 dark:text-white mt-1">{activeNotes.length}</div>
            <span className="text-[10px] text-slate-400">Đang hoạt động</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Tỷ lệ liên kết</div>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {Math.round((linkedNotesCount / (activeNotes.length || 1)) * 100)}%
            </div>
            <span className="text-[10px] text-slate-400">{linkedNotesCount} ghi chú có link</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Mục Checklist</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{totalChecklists}</div>
            <span className="text-[10px] text-slate-400">Trong toàn bộ sổ tay</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Tổng số từ</div>
            <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">{totalWords.toLocaleString('vi-VN')}</div>
            <span className="text-[10px] text-slate-400">~{Math.round(totalWords / 200)} phút đọc</span>
          </div>
        </div>

        {/* BREAKDOWN SECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Note Types Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" /> Phân loại theo Định dạng
            </h4>
            <div className="space-y-2">
              {typeStats.map(([type, count]) => {
                const pct = Math.round((count / (activeNotes.length || 1)) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{type}</span>
                      <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-emerald-500" /> Phân loại theo Danh mục
            </h4>
            <div className="space-y-2">
              {categoryStats.map(([cat, count]) => {
                const pct = Math.round((count / (activeNotes.length || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>{cat}</span>
                      <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 8. ARCHIVE & TRASH VIEW
// ----------------------------------------------------------------------
function ArchiveTrashView({
  archivedNotes,
  trashNotes,
  onRestore,
  onDeletePermanent,
  onOpenDetail
}: {
  archivedNotes: Note[];
  trashNotes: Note[];
  onRestore: (id: string) => void;
  onDeletePermanent: (id: string) => void;
  onOpenDetail: (n: Note) => void;
}) {
  const [selectedSubTab, setSelectedSubTab] = useState<'archive' | 'trash'>('archive');

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#141E30] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-400" /> Kho Lưu trữ & Thùng rác
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Khôi phục ghi chú đã lưu trữ hoặc quản lý dọn dẹp các ghi chú trong thùng rác.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSelectedSubTab('archive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSubTab === 'archive'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Lưu trữ ({archivedNotes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubTab('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedSubTab === 'trash'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Thùng rác ({trashNotes.length})</span>
          </button>
        </div>
      </div>

      {selectedSubTab === 'archive' ? (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center justify-between">
            <span>Danh sách Ghi chú Lưu trữ ({archivedNotes.length})</span>
          </h4>

          {archivedNotes.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400">
              Không có ghi chú nào trong kho lưu trữ.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedNotes.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => onOpenDetail(n)}
                  className="bg-white dark:bg-[#141E30] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs hover:border-blue-500/50 transition cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{n.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{n.category || 'Ghi chú'}</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(n.id);
                    }}
                    className="min-h-[44px] px-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Khôi phục ghi chú"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center justify-between">
            <span>Danh sách Thùng rác ({trashNotes.length})</span>
            {trashNotes.length > 0 && (
              <span className="text-xs font-normal text-rose-500">
                Các mục xóa vĩnh viễn sẽ không thể phục hồi
              </span>
            )}
          </h4>

          {trashNotes.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400">
              Thùng rác đang trống.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trashNotes.map(n => (
                <div 
                  key={n.id} 
                  className="bg-white dark:bg-[#141E30] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs transition"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-bold text-slate-800 dark:text-white text-sm truncate">{n.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{n.category || 'Ghi chú'}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => onRestore(n.id)}
                      className="min-h-[44px] px-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center gap-1 transition cursor-pointer"
                      title="Khôi phục ghi chú"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Khôi phục</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => onDeletePermanent(n.id)}
                      className="min-h-[44px] px-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-1 transition cursor-pointer"
                      title="Xóa vĩnh viễn (Có thể Hoàn tác 5s)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa hẳn</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// NOTE DETAIL MODAL
// ----------------------------------------------------------------------
function NoteDetailModal({
  note,
  allNotes,
  tasks,
  projects,
  goals,
  studySubjects,
  onClose,
  onEdit,
  onTogglePin,
  onToggleFav,
  onConvertAction,
  onRestoreVersion,
  onUpdateNote,
  onToggleChecklist
}: {
  note: Note;
  allNotes: Note[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  studySubjects: StudySubject[];
  onClose: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
  onConvertAction: (noteId: string, actionId: string) => void;
  onRestoreVersion: (versionId: string) => void;
  onUpdateNote?: (noteId: string, updates: Partial<Note>) => void;
  onToggleChecklist?: (noteId: string, checkId: string) => void;
}) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'links' | 'history'>('content');
  const [newChecklistInput, setNewChecklistInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Backlinks (notes that link to this note)
  const backlinks = useMemo(() => {
    return allNotes.filter(n => n.id !== note.id && n.linkedItems?.noteIds?.includes(note.id));
  }, [allNotes, note]);

  const handleAddChecklistItem = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newItem: NoteChecklistItem = {
      id: 'chk_' + Date.now(),
      text: trimmed,
      completed: false
    };
    const updated = [...(note.checklists || []), newItem];
    onUpdateNote?.(note.id, { checklists: updated });
    setNewChecklistInput('');
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#141E30] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden animate-modal-enter"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-200/50 dark:border-purple-800/50">
              {note.type || 'Standard'}
            </span>
            <h3 className="font-bold text-slate-800 dark:text-white text-xl">{note.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" 
              onClick={onTogglePin}
              className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.pinned ? 'text-amber-500' : 'text-slate-400'}`}
              title="Pin note"
            >
              <Pin className="w-5 h-5 fill-current" />
            </button>
            <button type="button" 
              onClick={onToggleFav}
              className={`p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${note.favorite ? 'text-rose-500' : 'text-slate-400'}`}
              title="Favorite note"
            >
              <Star className="w-5 h-5 fill-current" />
            </button>
            <button type="button" 
              onClick={onEdit}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <Edit3 className="w-4 h-4" /> Edit Note
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-850/50">
          <button type="button" 
            onClick={() => setActiveSubTab('content')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${activeSubTab === 'content' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Nội dung Chi tiết
          </button>
          <button type="button" 
            onClick={() => setActiveSubTab('links')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${activeSubTab === 'links' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Liên kết & Backlinks ({backlinks.length})
          </button>
          <button type="button" 
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${activeSubTab === 'history' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            Lịch sử Phiên bản
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeSubTab === 'content' && (
            <div className="space-y-6">
              <div className="text-slate-700 dark:text-slate-200 whitespace-pre-line text-sm leading-relaxed">
                {note.content}
              </div>

              {/* CHECKLISTS IN DETAIL VIEW */}
              {((note.checklists && note.checklists.length > 0) || note.type === 'Checklist') && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm flex items-center gap-1.5">
                      <ListCheck className="w-4 h-4 text-emerald-600" />
                      <span>Checklist ({note.checklists?.filter(c => c.completed).length || 0}/{note.checklists?.length || 0})</span>
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {note.checklists && note.checklists.length > 0
                        ? Math.round((note.checklists.filter(c => c.completed).length / note.checklists.length) * 100)
                        : 0}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 rounded-full" 
                      style={{ 
                        width: `${note.checklists && note.checklists.length > 0
                          ? Math.round((note.checklists.filter(c => c.completed).length / note.checklists.length) * 100)
                          : 0}%` 
                      }} 
                    />
                  </div>

                  <div className="space-y-2">
                    {note.checklists?.map(chk => (
                      <div 
                        key={chk.id} 
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs shadow-xs"
                      >
                        <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={chk.completed}
                            onChange={() => onToggleChecklist?.(note.id, chk.id)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                          />
                          <span className={`font-medium ${chk.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {chk.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (note.checklists || []).filter(c => c.id !== chk.id);
                            onUpdateNote?.(note.id, { checklists: updated });
                          }}
                          className="p-1 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                          title="Xóa mục checklist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline quick add checklist item */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newChecklistInput}
                      onChange={(e) => setNewChecklistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem(newChecklistInput);
                        }
                      }}
                      placeholder="Thêm việc cần làm (Enter để thêm)..."
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddChecklistItem(newChecklistInput)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 shrink-0"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>
              )}

              {/* SECTIONS */}
              {note.sections && note.sections.map(sec => (
                <div key={sec.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">{sec.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">{sec.content}</p>
                </div>
              ))}

              {/* MEETING ACTIONS */}
              {note.meetingData?.actionItems && (
                <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm">Action Items:</h4>
                  {note.meetingData.actionItems.map(act => (
                    <div key={act.id} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{act.text}</span>
                      {act.convertedTaskId ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                          Đã chuyển thành Task
                        </span>
                      ) : (
                        <button type="button" 
                          onClick={() => onConvertAction(note.id, act.id)}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded cursor-pointer"
                        >
                          + Chuyển thành Task
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'links' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Backlinks (Ghi chú tham chiếu đến đây):</h4>
              {backlinks.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có ghi chú nào dẫn liên kết đến đây.</p>
              ) : (
                <div className="space-y-2">
                  {backlinks.map(bl => (
                    <div key={bl.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">{bl.title}</span>
                      <p className="text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{bl.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Lịch sử Chỉnh sửa:</h4>
              {note.versionHistory && note.versionHistory.length > 0 ? (
                note.versionHistory.map(v => (
                  <div key={v.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{v.note || 'Bản lưu'}</div>
                      <div className="text-[10px] text-slate-400">{new Date(v.timestamp).toLocaleString('vi-VN')}</div>
                    </div>
                    <button type="button" 
                      onClick={() => onRestoreVersion(v.id)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore bản này
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Chưa có phiên bản lịch sử cũ.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// NOTE EDITOR MODAL
// ----------------------------------------------------------------------
function NoteEditorModal({
  note,
  allNotes,
  tasks,
  projects,
  goals,
  studySubjects,
  onClose,
  onSave
}: {
  note: Partial<Note>;
  allNotes: Note[];
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  studySubjects: StudySubject[];
  onClose: () => void;
  onSave: (n: Partial<Note>) => void | Promise<void>;
}) {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const isCreatingNew = !note.id;
  const cachedDraft = isCreatingNew && typeof window !== 'undefined' ? (() => {
    try {
      const saved = localStorage.getItem('lifeos_new_note_draft');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })() : null;

  const initialTitle = note.title || cachedDraft?.title || '';
  const initialContent = note.content || cachedDraft?.content || '';

  const [formData, setFormData] = useState<Partial<Note>>({
    ...note,
    title: initialTitle,
    content: initialContent,
    category: note.category || cachedDraft?.category || 'Fleeting',
    type: note.type || cachedDraft?.type || 'Fleeting Note',
    sections: note.sections || [],
    checklists: note.checklists || [],
    tags: note.tags || cachedDraft?.tags || []
  });

  // Auto-save draft for new notes to prevent losing long text on accidental reload
  useEffect(() => {
    if (isCreatingNew && (formData.title || formData.content)) {
      try {
        localStorage.setItem('lifeos_new_note_draft', JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          type: formData.type,
          tags: formData.tags
        }));
      } catch {}
    }
  }, [isCreatingNew, formData.title, formData.content, formData.category, formData.type, formData.tags]);

  const [tagInput, setTagInput] = useState('');
  const [checklistInput, setChecklistInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const isFormDirty = Boolean(
    (formData.title || '').trim() !== initialTitle.trim() || 
    (formData.content || '').trim() !== initialContent.trim() ||
    formData.category !== note.category ||
    formData.type !== note.type ||
    JSON.stringify(formData.checklists || []) !== JSON.stringify(note.checklists || []) ||
    JSON.stringify(formData.tags || []) !== JSON.stringify(note.tags || [])
  );

  const triggerShake = () => {
    setIsShaking(true);
    soundEngine.playPop();
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isSubmitting) return;
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isFormDirty) {
          triggerShake();
        } else {
          onClose();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDirty, isSubmitting, onClose, formData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Kích thước ảnh không được vượt quá 10MB');
      return;
    }

    try {
      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type || 'image/png',
            folder: 'notes'
          });
          const url = res.file?.url || base64Data;
          const markdownImg = `\n![${file.name}](${url})\n`;
          setFormData(s => ({
            ...s,
            content: (s.content || '') + markdownImg
          }));
        } catch (uploadErr: any) {
          const markdownImg = `\n![${file.name}](${base64Data})\n`;
          setFormData(s => ({
            ...s,
            content: (s.content || '') + markdownImg
          }));
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingImage(false);
      setErrorMessage('Lỗi khi đọc ảnh: ' + err.message);
    }
    e.target.value = '';
  };

  const handleAddSection = () => {
    const newSec: NoteSection = {
      id: Math.random().toString(36).substring(2, 11),
      title: 'Mục mới',
      content: ''
    };
    setFormData(s => ({ ...s, sections: [...(s.sections || []), newSec] }));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setFormData(s => ({ ...s, tags: [...(s.tags || []), tagInput.trim()] }));
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    if (!formData.title?.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề ghi chú!');
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.resolve(onSave(formData));
      if (isCreatingNew) {
        try {
          localStorage.removeItem('lifeos_new_note_draft');
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi lưu ghi chú');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget && !isSubmitting) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto animate-backdrop-fade cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#141E30] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden animate-modal-enter transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
              {note.id ? 'Edit Note' : 'Create New Note'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Biên tập nội dung & liên kết tri thức (Ctrl + Enter để lưu nhanh)</p>
          </div>
          <button 
            type="button" 
            onClick={handleSafeDismiss} 
            disabled={isSubmitting}
            className="w-10 h-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TITLE & TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Note Title *</label>
                <div className="relative">
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={formData.title || ''}
                    onChange={(e) => setFormData(s => ({ ...s, title: e.target.value }))}
                    placeholder="Enter note title..."
                    className="w-full px-3.5 py-2.5 pr-8 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {formData.title && (
                    <button
                      type="button"
                      onClick={() => setFormData(s => ({ ...s, title: '' }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Xóa tiêu đề"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Note Type</label>
                <select 
                  value={formData.type || 'Normal'}
                  onChange={(e) => setFormData(s => ({ ...s, type: e.target.value as NoteType }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {NOTE_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Nội dung Chính</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tải ảnh lên R2...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Chèn ảnh (Cloudflare R2)</span>
                    </>
                  )}
                </button>
              </div>
              <textarea 
                rows={5}
                value={formData.content || ''}
                onChange={(e) => setFormData(s => ({ ...s, content: e.target.value }))}
                placeholder="Nhập nội dung ghi chú..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>

            {/* SECTIONS MANAGER */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Các phần nội dung (Sections)</span>
                <button type="button"
                  onClick={handleAddSection}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  + Thêm Section
                </button>
              </div>

              {formData.sections?.map((sec, idx) => (
                <div key={sec.id} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <input 
                    type="text"
                    value={sec.title}
                    onChange={(e) => {
                      const updated = [...(formData.sections || [])];
                      updated[idx].title = e.target.value;
                      setFormData(s => ({ ...s, sections: updated }));
                    }}
                    placeholder="Tiêu đề mục..."
                    className="w-full font-bold text-base sm:text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-slate-900 dark:text-white"
                  />
                  <textarea 
                    rows={2}
                    value={sec.content}
                    onChange={(e) => {
                      const updated = [...(formData.sections || [])];
                      updated[idx].content = e.target.value;
                      setFormData(s => ({ ...s, sections: updated }));
                    }}
                    placeholder="Nội dung mục..."
                    className="w-full text-base sm:text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            {/* CHECKLISTS MANAGER */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ListCheck className="w-4 h-4 text-emerald-500" />
                  <span>Danh sách Kiểm tra (Checklist)</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formData.checklists?.length || 0} mục
                </span>
              </div>

              {/* Add checklist input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!checklistInput.trim()) return;
                      const newItem: NoteChecklistItem = {
                        id: 'chk_' + Date.now(),
                        text: checklistInput.trim(),
                        completed: false
                      };
                      setFormData(s => ({ ...s, checklists: [...(s.checklists || []), newItem] }));
                      setChecklistInput('');
                    }
                  }}
                  placeholder="Thêm việc cần làm (Enter để thêm)..."
                  className="flex-1 px-3.5 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!checklistInput.trim()) return;
                    const newItem: NoteChecklistItem = {
                      id: 'chk_' + Date.now(),
                      text: checklistInput.trim(),
                      completed: false
                    };
                    setFormData(s => ({ ...s, checklists: [...(s.checklists || []), newItem] }));
                    setChecklistInput('');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold cursor-pointer transition-colors active:scale-95 shrink-0"
                >
                  + Thêm
                </button>
              </div>

              {/* Checklist items list */}
              {formData.checklists && formData.checklists.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {formData.checklists.map((chk, idx) => (
                    <div
                      key={chk.id}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chk.completed}
                          onChange={(e) => {
                            const updated = [...(formData.checklists || [])];
                            updated[idx] = { ...updated[idx], completed: e.target.checked };
                            setFormData(s => ({ ...s, checklists: updated }));
                          }}
                          className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={chk.text}
                          onChange={(e) => {
                            const updated = [...(formData.checklists || [])];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setFormData(s => ({ ...s, checklists: updated }));
                          }}
                          className={`flex-1 bg-transparent border-0 text-xs text-slate-800 dark:text-slate-200 focus:outline-none ${
                            chk.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                          }`}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.checklists || []).filter((_, i) => i !== idx);
                          setFormData(s => ({ ...s, checklists: updated }));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition cursor-pointer shrink-0"
                        title="Xóa mục"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TAGS */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Tags</label>
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nhập tag rồi ấn +..."
                  className="px-3.5 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="button" 
                  onClick={handleAddTag} 
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  + Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {formData.tags?.map(t => (
                  <span key={t} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-end gap-2.5 shrink-0">
            <button 
              type="button" 
              onClick={handleSafeDismiss} 
              disabled={isSubmitting}
              className="px-4 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[44px] text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu Ghi chú</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
