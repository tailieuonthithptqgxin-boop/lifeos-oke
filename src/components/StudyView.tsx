import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BookOpen, GraduationCap, Target, Calculator, FileCheck, Activity, Award, X, Sparkles, RotateCcw, Users
} from 'lucide-react';
import {
  GradingSchema,
  GRADE_PRESETS,
  AcademicSemester,
  SubjectGradeRecord,
  AcademicProfile,
  createDefaultAcademicProfile
} from '../lib/gradeEngine';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { soundEngine } from '../lib/soundEngine';
import { formatLocalDateKey } from '../lib/utils';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

const VocabMasterView = lazyWithRetry(
  () => import('./vocab/VocabMasterView'),
  'VocabMasterView'
);
import { TabButton } from './study/TabButton';
import { StudyOverviewTab } from './study/StudyOverviewTab';
import { StudySubjectsTab } from './study/StudySubjectsTab';
import { SubjectModal } from './study/SubjectModal';
import { StudyAssignmentsTab } from './study/StudyAssignmentsTab';
import { AssignmentModal } from './study/AssignmentModal';
import { StudyExamsTab } from './study/StudyExamsTab';
import { ExamModal } from './study/ExamModal';
import { MyGradesTab } from './study/MyGradesTab';
import { SubjectGradeDetailModal } from './study/SubjectGradeDetailModal';
import { ProfileSettingsModal } from './study/ProfileSettingsModal';
import { SemesterModal } from './study/SemesterModal';
import { GradeForecastTab } from './study/GradeForecastTab';

type Tab = 'vocabulary' | 'overview' | 'my-grades' | 'subjects' | 'assignments' | 'exams' | 'forecast';

export function StudyView() {
  const { 
    currentUser,
    language,
    subjects = [], 
    studyAssignments = [], 
    studyExams = [], 
    addSubject, 
    updateSubject, 
    deleteSubject,
    addStudyAssignment, 
    updateStudyAssignment, 
    deleteStudyAssignment,
    addStudyExam, 
    updateStudyExam, 
    deleteStudyExam,
    addTask
  } = useAppStore();

  const isVi = language === 'vi';

  // Active Tab with F5 Reload Persistence
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_study_active_tab') as any;
        if (saved && ['vocabulary', 'overview', 'my-grades', 'subjects', 'assignments', 'exams', 'forecast'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'vocabulary';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_study_active_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Non-intrusive floating toast state (replaces ugly window.alert)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 5-Second Undo Toast State
  const [undoItem, setUndoItem] = useState<{ type: 'subject' | 'assignment' | 'exam'; data: any } | null>(null);
  const undoTimerRef = useRef<any>(null);

  const handleDeleteSubjectWithUndo = (sub: any) => {
    soundEngine.playPop();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ type: 'subject', data: sub });
    deleteSubject(sub.id);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
  };

  const handleDeleteAssignmentWithUndo = (a: any) => {
    soundEngine.playPop();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ type: 'assignment', data: a });
    deleteStudyAssignment(a.id);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
  };

  const handleDeleteExamWithUndo = (e: any) => {
    soundEngine.playPop();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ type: 'exam', data: e });
    deleteStudyExam(e.id);
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 5000);
  };

  const handleRestoreStudyItem = () => {
    if (!undoItem) return;
    soundEngine.playSuccess();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoItem.type === 'subject') addSubject(undoItem.data);
    else if (undoItem.type === 'assignment') addStudyAssignment(undoItem.data);
    else if (undoItem.type === 'exam') addStudyExam(undoItem.data);
    setUndoItem(null);
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Modal States
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);

  // Academic Profile & Personal Grade Management States
  const userId = currentUser?.id || 'current_user';
  const profileKey = `lifeos_academic_profile_${userId}`;

  const [profile, setProfile] = useState<AcademicProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(profileKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const defaultProf = createDefaultAcademicProfile(userId, parsed.environment || 'THPT');
            if (!Array.isArray(parsed.semesters) || parsed.semesters.length === 0) {
              parsed.semesters = defaultProf.semesters;
            }
            if (!parsed.currentSemesterId && parsed.semesters.length > 0) {
              parsed.currentSemesterId = parsed.semesters[0].id;
            }
            if (!parsed.subjectGrades || typeof parsed.subjectGrades !== 'object') {
              parsed.subjectGrades = {};
            }
            return parsed;
          }
        } catch (e) {
          console.error('Error loading academic profile', e);
        }
      }
    }
    return createDefaultAcademicProfile(userId, 'THPT');
  });

  const [selectedSubjectIdForForecast, setSelectedSubjectIdForForecast] = useState<string>('');
  const [subjectForDetail, setSubjectForDetail] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);

  const isAnyStudyModalOpen = !!(showSubjectModal || showAssignmentModal || showExamModal || subjectForDetail || showProfileModal || showSemesterModal);
  useBodyScrollLock(isAnyStudyModalOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (subjectForDetail) setSubjectForDetail(null);
        else if (showSubjectModal) setShowSubjectModal(false);
        else if (showAssignmentModal) setShowAssignmentModal(false);
        else if (showExamModal) setShowExamModal(false);
        else if (showProfileModal) setShowProfileModal(false);
        else if (showSemesterModal) setShowSemesterModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subjectForDetail, showSubjectModal, showAssignmentModal, showExamModal, showProfileModal, showSemesterModal]);

  // Synchronize profile subject records with store subjects
  useEffect(() => {
    let hasChanges = false;
    const currentSemId = profile?.currentSemesterId || profile?.semesters?.[0]?.id || 'sem_default_1';
    const updatedSubjectGrades = { ...(profile?.subjectGrades || {}) };

    for (const sub of (subjects || [])) {
      if (!updatedSubjectGrades[sub.id]) {
        hasChanges = true;
        let schema: GradingSchema = JSON.parse(JSON.stringify(GRADE_PRESETS[profile?.environment || 'THPT']?.schema || GRADE_PRESETS.THPT.schema));
        if (typeof window !== 'undefined') {
          const savedSubSchema = localStorage.getItem(`lifeos_grade_schema_${sub.id}`);
          if (savedSubSchema) {
            try {
              schema = JSON.parse(savedSubSchema);
            } catch (e) {}
          }
        }
        updatedSubjectGrades[sub.id] = {
          subjectId: sub.id,
          semesterId: currentSemId,
          credits: 1,
          schema,
          targetGrade: Number(sub.targetGrade) || 8.0
        };
      }
    }

    if (hasChanges) {
      const nextProfile = { ...profile, subjectGrades: updatedSubjectGrades };
      setProfile(nextProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem(profileKey, JSON.stringify(nextProfile));
      }
    }
  }, [subjects, profile?.environment]);

  const saveProfile = (updater: (prev: AcademicProfile) => AcademicProfile) => {
    setProfile(prev => {
      const next = updater(prev);
      if (!Array.isArray(next.semesters) || next.semesters.length === 0) {
        next.semesters = prev?.semesters || createDefaultAcademicProfile(userId, next.environment || 'THPT').semesters;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(profileKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const updateSubjectGradeRecord = (subjectId: string, updates: Partial<SubjectGradeRecord>) => {
    saveProfile(prev => {
      const existing = prev.subjectGrades[subjectId] || {
        subjectId,
        semesterId: prev.currentSemesterId,
        credits: 1,
        schema: JSON.parse(JSON.stringify(GRADE_PRESETS[prev.environment].schema)),
        targetGrade: 8.0
      };

      const nextRecord: SubjectGradeRecord = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      return {
        ...prev,
        subjectGrades: {
          ...prev.subjectGrades,
          [subjectId]: nextRecord
        }
      };
    });
  };

  const pendingAssignmentsCount = studyAssignments.filter((a: any) => a.status !== 'Completed' && a.status !== 'Submitted').length;
  const upcomingExamsCount = studyExams.filter((e: any) => {
    const d = new Date(e.date || e.examDate);
    return !isNaN(d.getTime()) && d >= new Date(Date.now() - 24 * 60 * 60 * 1000);
  }).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden w-full min-w-0 max-w-full">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-xl border-b border-[#E2E8F0] dark:border-white/[0.08] px-3.5 sm:px-6 pt-3.5 sm:pt-4 pb-2 shrink-0 w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 w-full min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#0D523F] text-white rounded-xl flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                Study OS
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-[#8387F5]/15 text-[#8387F5] border border-[#8387F5]/30 shrink-0">
                  PRO ENGINE
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal break-words">
                {isVi ? 'Quản lý môn học, lịch thi, bài tập và mô phỏng điểm số học tập chuẩn quốc tế' : 'Manage subjects, exams, assignments and academic performance simulation'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full min-w-0 max-w-full touch-pan-x overscroll-x-contain py-1">
          <TabButton active={activeTab === 'vocabulary'} onClick={() => { setActiveTab('vocabulary'); soundEngine.playPop(); }} icon={<BookOpen className="w-4 h-4 text-emerald-500" />} label={isVi ? 'Từ vựng & Ngoại ngữ' : 'Vocabulary & Languages'} />
          <TabButton active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); soundEngine.playPop(); }} icon={<Activity className="w-4 h-4" />} label={isVi ? 'Tổng quan GPA' : 'GPA Overview'} />
          <TabButton active={activeTab === 'my-grades'} onClick={() => { setActiveTab('my-grades'); soundEngine.playPop(); }} icon={<Award className="w-4 h-4" />} label={isVi ? 'Bảng điểm' : 'Report Card'} count={subjects.length} />
          <TabButton active={activeTab === 'subjects'} onClick={() => { setActiveTab('subjects'); soundEngine.playPop(); }} icon={<BookOpen className="w-4 h-4" />} label={isVi ? 'Môn học' : 'Subjects'} count={subjects.length} />
          <TabButton active={activeTab === 'assignments'} onClick={() => { setActiveTab('assignments'); soundEngine.playPop(); }} icon={<FileCheck className="w-4 h-4" />} label={isVi ? 'Bài tập' : 'Assignments'} count={pendingAssignmentsCount} />
          <TabButton active={activeTab === 'exams'} onClick={() => { setActiveTab('exams'); soundEngine.playPop(); }} icon={<Target className="w-4 h-4" />} label={isVi ? 'Lịch thi' : 'Exams'} count={upcomingExamsCount} />
          <TabButton active={activeTab === 'forecast'} onClick={() => { setActiveTab('forecast'); soundEngine.playPop(); }} icon={<Calculator className="w-4 h-4" />} label={isVi ? 'Dự báo GPA' : 'GPA Forecast'} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 w-full min-w-0 max-w-full overflow-x-hidden pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
          {activeTab === 'overview' && (
            <StudyOverviewTab 
              onNewSubject={() => { soundEngine.playPop(); setEditingSubject(null); setShowSubjectModal(true); }}
              onNewAssignment={() => { soundEngine.playPop(); setEditingAssignment(null); setShowAssignmentModal(true); }}
              onNewExam={() => { soundEngine.playPop(); setEditingExam(null); setShowExamModal(true); }}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'my-grades' && (
            <MyGradesTab
              profile={profile}
              subjects={subjects}
              onOpenSubjectDetail={(sub: any) => { soundEngine.playPop(); setSubjectForDetail(sub); }}
              onOpenForecastForSubject={(subId: string) => {
                soundEngine.playPop();
                setSelectedSubjectIdForForecast(subId);
                setActiveTab('forecast');
              }}
              onNewSubject={() => { soundEngine.playPop(); setEditingSubject(null); setShowSubjectModal(true); }}
              onOpenProfileSettings={() => { soundEngine.playPop(); setShowProfileModal(true); }}
              onOpenSemesterModal={() => { soundEngine.playPop(); setShowSemesterModal(true); }}
              onChangeCurrentSemester={(semId: string) => {
                soundEngine.playPop();
                saveProfile(prev => ({ ...prev, currentSemesterId: semId }));
              }}
            />
          )}

          {activeTab === 'vocabulary' && (
            <React.Suspense
              fallback={
                <div className="flex flex-col items-center justify-center p-16 min-h-[350px] text-slate-500 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {isVi ? 'Đang tải kho từ vựng...' : 'Loading vocabulary database...'}
                  </span>
                </div>
              }
            >
              <VocabMasterView currentUser={currentUser} />
            </React.Suspense>
          )}

          {activeTab === 'subjects' && (
            <StudySubjectsTab 
              onNewSubject={() => { soundEngine.playPop(); setEditingSubject(null); setShowSubjectModal(true); }}
              onEditSubject={(sub: any) => { soundEngine.playPop(); setEditingSubject(sub); setShowSubjectModal(true); }}
              onDeleteSubject={handleDeleteSubjectWithUndo}
            />
          )}

          {activeTab === 'assignments' && (
            <StudyAssignmentsTab 
              onNewAssignment={() => { soundEngine.playPop(); setEditingAssignment(null); setShowAssignmentModal(true); }}
              onEditAssignment={(a: any) => { soundEngine.playPop(); setEditingAssignment(a); setShowAssignmentModal(true); }}
              onDeleteAssignment={handleDeleteAssignmentWithUndo}
              onToggleStatus={(a: any) => {
                soundEngine.playPop();
                const nextStatus = a.status === 'Completed' ? 'Chưa làm' : 'Completed';
                updateStudyAssignment(a.id, { status: nextStatus });
              }}
            />
          )}

          {activeTab === 'exams' && (
            <StudyExamsTab 
              onNewExam={() => { soundEngine.playPop(); setEditingExam(null); setShowExamModal(true); }}
              onEditExam={(e: any) => { soundEngine.playPop(); setEditingExam(e); setShowExamModal(true); }}
              onDeleteExam={handleDeleteExamWithUndo}
              onCreateStudyTask={(exam: any) => {
                const sub = subjects.find((s: any) => s.id === exam.subjectId);
                const examDate = new Date(exam.date || exam.examDate);
                const studyDate = formatLocalDateKey(new Date(examDate.getTime() - 2 * 24 * 60 * 60 * 1000));
                addTask({
                  title: `[Ôn thi] ${exam.title} - ${sub?.name || 'Môn học'}`,
                  description: `Kỳ thi diễn ra ngày ${exam.date || exam.examDate}. Điểm mục tiêu: ${exam.targetScore || 8}/10. Trọng số: ${exam.weight || 30}%.`,
                  priority: 'Cao',
                  status: 'Chưa làm',
                  dueDate: studyDate,
                  estimatedHours: 4
                });
                soundEngine.playSuccess();
                setToastMessage(isVi 
                  ? `Đã tạo nhiệm vụ ôn thi cho "${exam.title}" trong mục Công việc (hạn chót: ${studyDate})!` 
                  : `Created study task for "${exam.title}" in Tasks (due: ${studyDate})!`
                );
              }}
            />
          )}

          {activeTab === 'forecast' && (
            <GradeForecastTab 
              onNewSubject={() => { soundEngine.playPop(); setEditingSubject(null); setShowSubjectModal(true); }}
              preselectedSubjectId={selectedSubjectIdForForecast}
              profile={profile}
              onCommitScoreToProfile={(subId: string, score: number) => {
                const record = profile.subjectGrades[subId];
                if (record) {
                  const nextSchema = JSON.parse(JSON.stringify(record.schema)) as GradingSchema;
                  const targetComp = nextSchema.components.find(c => c.isTargetExam) || nextSchema.components[nextSchema.components.length - 1];
                  if (targetComp) {
                    targetComp.scores = [...(targetComp.scores || []), score];
                    updateSubjectGradeRecord(subId, { schema: nextSchema });
                    soundEngine.playSuccess();
                    setToastMessage(isVi 
                      ? `🎉 Đã lưu điểm ${score} vào bài "${targetComp.name}" của môn "${subjects.find((s: any) => s.id === subId)?.name}" trong Bảng điểm!` 
                      : `Saved score ${score} to "${targetComp.name}" in Report Card!`
                    );
                  }
                }
              }}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: SUBJECT MODAL */}
      {showSubjectModal && (
        <SubjectModal 
          subject={editingSubject}
          onClose={() => { setShowSubjectModal(false); setEditingSubject(null); }}
          onSave={(data: any) => {
            if (editingSubject?.id) {
              updateSubject(editingSubject.id, data);
            } else {
              addSubject(data);
            }
            soundEngine.playSuccess();
            setShowSubjectModal(false);
            setEditingSubject(null);
          }}
        />
      )}

      {/* MODAL 2: ASSIGNMENT MODAL */}
      {showAssignmentModal && (
        <AssignmentModal 
          assignment={editingAssignment}
          subjects={subjects}
          onClose={() => { setShowAssignmentModal(false); setEditingAssignment(null); }}
          onSave={(data: any) => {
            if (editingAssignment?.id) {
              updateStudyAssignment(editingAssignment.id, data);
            } else {
              addStudyAssignment(data);
            }
            soundEngine.playSuccess();
            setShowAssignmentModal(false);
            setEditingAssignment(null);
          }}
        />
      )}

      {/* MODAL 3: EXAM MODAL */}
      {showExamModal && (
        <ExamModal 
          exam={editingExam}
          subjects={subjects}
          onClose={() => { setShowExamModal(false); setEditingExam(null); }}
          onSave={(data: any) => {
            if (editingExam?.id) {
              updateStudyExam(editingExam.id, data);
            } else {
              addStudyExam(data);
            }
            soundEngine.playSuccess();
            setShowExamModal(false);
            setEditingExam(null);
          }}
        />
      )}

      {/* MODAL 4: PERSONAL GRADE DETAIL MODAL */}
      {subjectForDetail && (
        <SubjectGradeDetailModal
          subject={subjectForDetail}
          record={profile.subjectGrades[subjectForDetail.id]}
          profile={profile}
          onClose={() => setSubjectForDetail(null)}
          onSaveRecord={(updates: Partial<SubjectGradeRecord>) => {
            soundEngine.playSuccess();
            updateSubjectGradeRecord(subjectForDetail.id, updates);
          }}
          onOpenForecast={() => {
            soundEngine.playPop();
            setSelectedSubjectIdForForecast(subjectForDetail.id);
            setSubjectForDetail(null);
            setActiveTab('forecast');
          }}
        />
      )}

      {/* MODAL 5: ACADEMIC PROFILE SETTINGS */}
      {showProfileModal && (
        <ProfileSettingsModal
          profile={profile}
          onClose={() => setShowProfileModal(false)}
          onSaveProfile={(updates: Partial<AcademicProfile>) => {
            soundEngine.playSuccess();
            saveProfile(prev => ({ ...prev, ...updates }));
            setShowProfileModal(false);
          }}
        />
      )}

      {/* MODAL 6: SEMESTER MODAL */}
      {showSemesterModal && (
        <SemesterModal
          onClose={() => setShowSemesterModal(false)}
          onSaveSemester={(newSem: AcademicSemester) => {
            soundEngine.playSuccess();
            saveProfile(prev => ({
              ...prev,
              semesters: [...(prev.semesters || []), newSem],
              currentSemesterId: newSem.id
            }));
            setShowSemesterModal(false);
          }}
        />
      )}

      {/* Floating 5-Second Undo Toast */}
      {undoItem && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-3 px-4 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-200 animate-slide-up text-xs font-semibold backdrop-blur-md">
          <span className="min-w-0 flex-1 truncate">
            {isVi 
              ? `Đã xóa ${undoItem.type === 'subject' ? 'môn học' : undoItem.type === 'assignment' ? 'bài tập' : 'kỳ thi'} "${undoItem.data.title || undoItem.data.name}"`
              : `Deleted ${undoItem.type}: "${undoItem.data.title || undoItem.data.name}"`}
          </span>
          <button
            type="button"
            onClick={handleRestoreStudyItem}
            className="flex items-center gap-1 px-3.5 py-1.5 min-h-[38px] bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isVi ? 'Hoàn tác (5s)' : 'Undo (5s)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setUndoItem(null)}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer rounded-lg shrink-0"
            title={isVi ? 'Đóng' : 'Close'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`fixed right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-md animate-slide-up text-xs font-semibold ${
          undoItem ? 'bottom-[max(8.5rem,calc(env(safe-area-inset-bottom)+8rem))] sm:bottom-20' : 'bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6'
        }`}>
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 min-w-0">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white dark:hover:text-slate-900 cursor-pointer rounded-lg shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default StudyView;
