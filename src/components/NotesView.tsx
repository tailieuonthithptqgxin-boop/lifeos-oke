import React, { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';
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

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
  const [detailNote, setDetailNote] = useState<Note | null>(null);

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

      return matchesSearch && matchesCat && matchesType && matchesTag;
    });
  }, [activeNotes, searchQuery, selectedCategory, selectedType, selectedTag]);

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
      noteDate: new Date().toISOString().split('T')[0],
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
      alert(t('Vui lòng nhập tiêu đề ghi chú!'));
      return;
    }
    const existing = (notes || []).find(n => n.id === noteToSave.id);
    if (existing) {
      updateNote(existing.id, noteToSave);
    } else {
      addNote(noteToSave as Note);
    }
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-purple-100/80 dark:border-purple-900/40 shadow-sm card-cute w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-tr from-violet-600 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{t('Notes & Knowledge Hub')}</h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50 shrink-0">
                  {t('Notes Hub')}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-medium line-clamp-1 sm:line-clamp-none break-words">
                {t('Organize thoughts, link concepts, manage meetings, and build your personal Knowledge Graph')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button"
            onClick={() => handleCreateNewNote('Normal')}
            className="btn-squishy flex items-center gap-2 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 text-white font-extrabold px-5 py-3 rounded-2xl shadow-md shadow-purple-500/25 transition-all text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> {t('Create New Note')}
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
          { id: 'all', label: 'All Notes', icon: FileText, count: activeNotes.length },
          { id: 'daily', label: 'Daily Notes', icon: Calendar },
          { id: 'meetings', label: 'Meetings & Decisions', icon: Users },
          { id: 'graph', label: 'Knowledge Graph', icon: Network },
          { id: 'templates', label: 'Templates Library', icon: Sparkles },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'archive', label: 'Archive & Trash', icon: Archive, count: archivedNotes.length + trashNotes.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`btn-squishy flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.label)}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/25 text-white' : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
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
          onOpenDetail={setDetailNote}
          onOpenEdit={(n) => { setEditingNote(n); setIsEditorOpen(true); }}
          onTogglePin={toggleNotePin}
          onToggleFav={toggleNoteFavorite}
          onMoveTrash={moveToTrashNote}
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
          onDeletePermanent={deleteNote}
          onOpenDetail={setDetailNote}
        />
      )}
      </div>

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
  onToggleFav 
}: {
  notes: Note[];
  pinnedNotes: Note[];
  favoriteNotes: Note[];
  tags: [string, number][];
  onOpenDetail: (n: Note) => void;
  onOpenEdit: (n: Note) => void;
  onCreateNote: (t?: NoteType) => void;
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
}) {
  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()).slice(0, 6);
  }, [notes]);

  const pendingChecklistNotes = useMemo(() => {
    return notes.filter(n => n.checklists && n.checklists.some(c => !c.completed));
  }, [notes]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* QUICK METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 w-full min-w-0">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-bold shrink-0">
            <FileText className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white truncate">{notes.length}</div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Hoạt động</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Pin className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white truncate">{pinnedNotes.length}</div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Đã ghim</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Star className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white truncate">{favoriteNotes.length}</div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Yêu thích</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center font-bold shrink-0">
            <ListCheck className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white truncate">{pendingChecklistNotes.length}</div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">Chờ xử lý</div>
          </div>
        </div>
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
              />
            ))}
          </div>
        </div>
      )}

      {/* MAIN GRID: RECENT NOTES & SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
        <div className="lg:col-span-2 space-y-4 min-w-0 w-full">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" /> Cập nhật gần đây
            </h3>
            <button type="button" 
              onClick={() => onCreateNote()} 
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 shrink-0"
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
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK CREATION & TAGS */}
        <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-6 rounded-2xl shadow-sm space-y-3 sm:space-y-4 w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 font-bold text-base sm:text-lg text-amber-400">
              <Sparkles className="w-5 h-5 shrink-0" /> Quick Note Templates
            </div>
            <p className="text-xs text-slate-300 break-words">
              Tạo nhanh ghi chú theo định dạng chuẩn hóa để tích hợp với hệ thống công việc.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full min-w-0">
              <button type="button" 
                onClick={() => onCreateNote('Meeting')}
                className="bg-slate-700/80 hover:bg-slate-700 text-xs font-medium p-2.5 rounded-xl border border-slate-600 flex items-center gap-2 truncate"
              >
                <Users className="w-4 h-4 text-blue-400 shrink-0" /> <span className="truncate">Cuộc họp</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Decision')}
                className="bg-slate-700/80 hover:bg-slate-700 text-xs font-medium p-2.5 rounded-xl border border-slate-600 flex items-center gap-2 truncate"
              >
                <Scale className="w-4 h-4 text-amber-400 shrink-0" /> <span className="truncate">Quyết định</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Daily')}
                className="bg-slate-700/80 hover:bg-slate-700 text-xs font-medium p-2.5 rounded-xl border border-slate-600 flex items-center gap-2 truncate"
              >
                <Calendar className="w-4 h-4 text-purple-400 shrink-0" /> <span className="truncate">Daily Note</span>
              </button>
              <button type="button" 
                onClick={() => onCreateNote('Checklist')}
                className="bg-slate-700/80 hover:bg-slate-700 text-xs font-medium p-2.5 rounded-xl border border-slate-600 flex items-center gap-2 truncate"
              >
                <ListCheck className="w-4 h-4 text-emerald-400 shrink-0" /> <span className="truncate">Checklist</span>
              </button>
            </div>
          </div>

          {/* TAG CLOUD */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" /> Tags Nổi bật
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(([tag, count]) => (
                <span key={tag} className="bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer transition-all flex items-center gap-1">
                  #{tag} <span className="text-[10px] text-slate-400 font-bold">({count})</span>
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
  onToggleFav 
}: { 
  note: Note; 
  onClick: () => void; 
  onEdit: () => void;
  onTogglePin: () => void;
  onToggleFav: () => void;
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
      className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 relative group w-full min-w-0 max-w-full overflow-hidden break-words"
    >
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${typeMeta.bg} ${typeMeta.color}`}>
            <TypeIcon className="w-3 h-3 shrink-0" /> {t(typeMeta.label)}
          </span>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
            <button type="button" 
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${note.pinned ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
            </button>
            <button type="button" 
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${note.favorite ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>

        <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 transition-colors break-words">
          {note.title}
        </h4>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed break-words">
          {note.content || 'Chưa có nội dung xem trước...'}
        </p>

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
  onOpenDetail,
  onOpenEdit,
  onTogglePin,
  onToggleFav,
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
  onOpenDetail: (n: Note) => void;
  onOpenEdit: (n: Note) => void;
  onTogglePin: (id: string) => void;
  onToggleFav: (id: string) => void;
  onMoveTrash: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, nội dung, tag, liên kết..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
            >
              {categories.map(c => <option key={c} value={c}>Danh mục: {c}</option>)}
            </select>

            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
            >
              <option value="All">Loại: Tất cả</option>
              {NOTE_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button type="button" 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                Grid
              </button>
              <button type="button" 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* TAG FILTER CHIPS */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="font-bold text-slate-500 whitespace-nowrap">Filter Tag:</span>
            {selectedTag && (
              <button type="button" 
                onClick={() => setSelectedTag(null)} 
                className="bg-blue-600 text-white font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1"
              >
                #{selectedTag} <X className="w-3 h-3" />
              </button>
            )}
            {allTags.map(([tag]) => (
              <button type="button"
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-2.5 py-0.5 rounded-full font-medium transition-all ${
                  selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* NOTES DISPLAY */}
      {notes.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-700">Không tìm thấy ghi chú nào</h4>
          <p className="text-xs text-slate-500">Hãy thử thay đổi từ khóa tìm kiếm hoặc tạo mới một ghi chú.</p>
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
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
          {notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onOpenDetail(note)}
              className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button type="button" 
                  onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                  className={`${note.pinned ? 'text-amber-500' : 'text-slate-300'}`}
                >
                  <Pin className="w-4 h-4 fill-current" />
                </button>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{note.title}</div>
                  <div className="text-xs text-slate-500 truncate">{note.content}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {note.type}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(note.updatedAt || note.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <button type="button" 
                  onClick={(e) => { e.stopPropagation(); onMoveTrash(note.id); }}
                  className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"
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
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t('Tạo Daily Note hôm nay')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {notes.map(note => (
          <div 
            key={note.id}
            onClick={() => onOpenDetail(note)}
            className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all cursor-pointer space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-800 text-lg">{note.title}</span>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg">
                {note.noteDate || 'Hàng ngày'}
              </span>
            </div>

            <div className="space-y-2">
              {note.sections?.map(sec => (
                <div key={sec.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="font-bold text-slate-700 mb-1">{sec.title}</div>
                  <div className="text-slate-600 whitespace-pre-line line-clamp-3">{sec.content}</div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Cuộc họp & Nhật ký Quyết định
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Chuyển Action Items cuộc họp thành Task thật và lưu vết lý do đưa ra các quyết định trọng yếu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" 
            onClick={onCreateMeeting}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" /> + Meeting Note
          </button>
          <button type="button" 
            onClick={onCreateDecision}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Scale className="w-4 h-4" /> + Decision Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {notes.map(note => (
          <div key={note.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  note.type === 'Meeting' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {note.type === 'Meeting' ? 'Cuộc họp' : 'Quyết định'}
                </span>
                <h4 className="font-bold text-slate-800 text-lg mt-1">{note.title}</h4>
              </div>
              <button type="button" 
                onClick={() => onOpenDetail(note)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Chi tiết
              </button>
            </div>

            {/* MEETING ACTION ITEMS DISPLAY */}
            {note.meetingData?.actionItems && (
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-bold text-slate-700">Action Items cuộc họp:</div>
                {note.meetingData.actionItems.map(act => (
                  <div key={act.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-800 font-medium">{act.text}</span>
                    {act.convertedTaskId ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        Đã chuyển thành Task
                      </span>
                    ) : (
                      <button type="button" 
                        onClick={() => onConvertAction(note.id, act.id)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
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
              <div className="space-y-2 bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-xs">
                <div><span className="font-bold text-amber-800">Lựa chọn:</span> {note.decisionData.chosenOption}</div>
                <div><span className="font-bold text-amber-800">Lý do:</span> {note.decisionData.reason}</div>
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
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Network className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-xl font-bold text-slate-800">Personal Knowledge Graph</h3>
            <p className="text-xs text-slate-500">Mạng lưới liên kết 2 chiều giữa Ghi chú, Dự án, Mục tiêu & Công việc.</p>
          </div>
        </div>

        {/* MAP VISUALIZATION */}
        <div className="bg-slate-900 text-white p-8 rounded-2xl min-h-[350px] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
          
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-6 max-w-2xl">
            {notes.map(n => (
              <div 
                key={n.id}
                onClick={() => onOpenDetail(n)}
                className="bg-slate-800/90 hover:bg-blue-600 text-white p-3 rounded-xl border border-slate-700 cursor-pointer transition-all shadow-lg text-center"
              >
                <div className="text-xs font-bold line-clamp-1">{n.title}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Links: {(n.linkedItems?.taskIds?.length || 0) + (n.linkedItems?.projectIds?.length || 0)}
                </div>
              </div>
            ))}
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" /> Thư viện Mẫu Ghi chú (Standard Templates)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Sử dụng các cấu trúc mẫu đã được tối ưu hóa cho công việc, học tập và quản trị bản thân.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {tmpl.category}
              </span>
              <h4 className="font-bold text-slate-800 text-lg mt-2">{tmpl.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{tmpl.description}</p>
            </div>

            <button type="button" 
              onClick={() => onUseTemplate(tmpl)}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
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
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach(n => {
      const cat = n.category || 'Khác';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map);
  }, [notes]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-600" /> Thống kê & Dòng chảy Tri thức
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-500">Tổng ghi chú</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{notes.length}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-slate-500">Tỷ lệ liên kết</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {Math.round((notes.filter(n => n.linkedItems?.taskIds?.length).length / (notes.length || 1)) * 100)}%
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
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Archive className="w-6 h-6 text-slate-600" /> Kho Lưu trữ & Thùng rác
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Khôi phục hoặc xóa vĩnh viễn các ghi chú đã lưu trữ hoặc tạm xóa.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-slate-700 text-sm">Ghi chú đã Lưu trữ ({archivedNotes.length})</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedNotes.map(n => (
            <div key={n.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-sm">{n.title}</div>
                <div className="text-xs text-slate-400">{n.category}</div>
              </div>
              <button type="button" 
                onClick={() => onRestore(n.id)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
              </button>
            </div>
          ))}
        </div>
      </div>
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
  onRestoreVersion
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
}) {
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'links' | 'history'>('content');

  // Backlinks (notes that link to this note)
  const backlinks = useMemo(() => {
    return allNotes.filter(n => n.id !== note.id && n.linkedItems?.noteIds?.includes(note.id));
  }, [allNotes, note]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-modal-enter">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-1 rounded-full">
              {note.type || 'Standard'}
            </span>
            <h3 className="font-bold text-slate-800 dark:text-white text-xl">{note.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" 
              onClick={onTogglePin}
              className={`p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 btn-squishy cursor-pointer ${note.pinned ? 'text-amber-500' : 'text-slate-400'}`}
              title="Pin note"
            >
              <Pin className="w-5 h-5 fill-current" />
            </button>
            <button type="button" 
              onClick={onToggleFav}
              className={`p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 btn-squishy cursor-pointer ${note.favorite ? 'text-rose-500' : 'text-slate-400'}`}
              title="Favorite note"
            >
              <Star className="w-5 h-5 fill-current" />
            </button>
            <button type="button" 
              onClick={onEdit}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 btn-squishy cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Edit3 className="w-4 h-4" /> Edit Note
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl btn-squishy cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT TABS */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button type="button" 
            onClick={() => setActiveSubTab('content')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeSubTab === 'content' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Nội dung Chi tiết
          </button>
          <button type="button" 
            onClick={() => setActiveSubTab('links')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeSubTab === 'links' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Liên kết & Backlinks ({backlinks.length})
          </button>
          <button type="button" 
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 ${activeSubTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            Lịch sử Phiên bản
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeSubTab === 'content' && (
            <div className="space-y-6">
              <div className="text-slate-700 whitespace-pre-line text-sm leading-relaxed">
                {note.content}
              </div>

              {/* SECTIONS */}
              {note.sections && note.sections.map(sec => (
                <div key={sec.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">{sec.title}</h4>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{sec.content}</p>
                </div>
              ))}

              {/* MEETING ACTIONS */}
              {note.meetingData?.actionItems && (
                <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-3">
                  <h4 className="font-bold text-blue-900 text-sm">Action Items:</h4>
                  {note.meetingData.actionItems.map(act => (
                    <div key={act.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-slate-800 font-medium">{act.text}</span>
                      {act.convertedTaskId ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Đã chuyển thành Task
                        </span>
                      ) : (
                        <button type="button" 
                          onClick={() => onConvertAction(note.id, act.id)}
                          className="text-[10px] font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded"
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
              <h4 className="font-bold text-slate-800 text-sm">Backlinks (Ghi chú tham chiếu đến đây):</h4>
              {backlinks.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có ghi chú nào dẫn liên kết đến đây.</p>
              ) : (
                <div className="space-y-2">
                  {backlinks.map(bl => (
                    <div key={bl.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800">{bl.title}</span>
                      <p className="text-slate-500 line-clamp-1 mt-0.5">{bl.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Lịch sử Chỉnh sửa:</h4>
              {note.versionHistory && note.versionHistory.length > 0 ? (
                note.versionHistory.map(v => (
                  <div key={v.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-700">{v.note || 'Bản lưu'}</div>
                      <div className="text-[10px] text-slate-400">{new Date(v.timestamp).toLocaleString('vi-VN')}</div>
                    </div>
                    <button type="button" 
                      onClick={() => onRestoreVersion(v.id)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
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
  onSave: (n: Partial<Note>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Note>>({
    ...note,
    sections: note.sections || [],
    tags: note.tags || []
  });

  const [tagInput, setTagInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Kích thước ảnh không được vượt quá 10MB');
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
      alert('Lỗi khi đọc ảnh: ' + err.message);
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-modal-enter">
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-lg">
            {note.id ? 'Edit Note' : 'Create New Note'}
          </h3>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl btn-squishy cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TITLE & TYPE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Note Title *</label>
              <input 
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData(s => ({ ...s, title: e.target.value }))}
                placeholder="Enter note title..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Note Type</label>
              <select 
                value={formData.type || 'Normal'}
                onChange={(e) => setFormData(s => ({ ...s, type: e.target.value as NoteType }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {NOTE_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Nội dung Chính</label>
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
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SECTIONS MANAGER */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Các phần nội dung (Sections)</span>
              <button type="button"
                onClick={handleAddSection}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                + Thêm Section
              </button>
            </div>

            {formData.sections?.map((sec, idx) => (
              <div key={sec.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <input 
                  type="text"
                  value={sec.title}
                  onChange={(e) => {
                    const updated = [...(formData.sections || [])];
                    updated[idx].title = e.target.value;
                    setFormData(s => ({ ...s, sections: updated }));
                  }}
                  className="w-full font-bold text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg"
                />
                <textarea 
                  rows={2}
                  value={sec.content}
                  onChange={(e) => {
                    const updated = [...(formData.sections || [])];
                    updated[idx].content = e.target.value;
                    setFormData(s => ({ ...s, sections: updated }));
                  }}
                  className="w-full text-xs bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg"
                />
              </div>
            ))}
          </div>

          {/* TAGS */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 block mb-1">Tags</label>
            <div className="flex items-center gap-2 mb-2">
              <input 
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Nhập tag rồi ấn +"
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
              <button type="button" 
                onClick={handleAddTag} 
                className="bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                + Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags?.map(t => (
                <span key={t} className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
            Hủy
          </button>
          <button type="button" 
            onClick={() => {
              if (!formData.title?.trim()) {
                alert('Vui lòng nhập tiêu đề ghi chú!');
                return;
              }
              onSave(formData);
            }}
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer"
          >
            Lưu Ghi chú
          </button>
        </div>
      </div>
    </div>
  );
}
