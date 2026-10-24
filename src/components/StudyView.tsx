import React, { useState, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BookOpen, GraduationCap, Target, Calculator, FileCheck, Activity, Award
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

type Tab = 'overview' | 'my-grades' | 'vocabulary' | 'subjects' | 'assignments' | 'exams' | 'forecast';

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
  const [activeTab, setActiveTab] = useState<Tab>('vocabulary');

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
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full min-w-0 max-w-full">
          <TabButton active={activeTab === 'vocabulary'} onClick={() => setActiveTab('vocabulary')} icon={<BookOpen className="w-4 h-4 text-emerald-500" />} label={isVi ? 'Từ vựng & Ngoại ngữ' : 'Vocabulary & Languages'} />
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity className="w-4 h-4" />} label={isVi ? 'Tổng quan GPA' : 'GPA Overview'} />
          <TabButton active={activeTab === 'my-grades'} onClick={() => setActiveTab('my-grades')} icon={<Award className="w-4 h-4" />} label={isVi ? 'Bảng điểm' : 'Report Card'} count={subjects.length} />
          <TabButton active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} icon={<BookOpen className="w-4 h-4" />} label={isVi ? 'Môn học' : 'Subjects'} count={subjects.length} />
          <TabButton active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} icon={<FileCheck className="w-4 h-4" />} label={isVi ? 'Bài tập' : 'Assignments'} count={pendingAssignmentsCount} />
          <TabButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon={<Target className="w-4 h-4" />} label={isVi ? 'Lịch thi' : 'Exams'} count={upcomingExamsCount} />
          <TabButton active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')} icon={<Calculator className="w-4 h-4" />} label={isVi ? 'Dự báo GPA' : 'GPA Forecast'} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
          {activeTab === 'overview' && (
            <StudyOverviewTab 
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
              onNewAssignment={() => { setEditingAssignment(null); setShowAssignmentModal(true); }}
              onNewExam={() => { setEditingExam(null); setShowExamModal(true); }}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'my-grades' && (
            <MyGradesTab
              profile={profile}
              subjects={subjects}
              onOpenSubjectDetail={(sub: any) => setSubjectForDetail(sub)}
              onOpenForecastForSubject={(subId: string) => {
                setSelectedSubjectIdForForecast(subId);
                setActiveTab('forecast');
              }}
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
              onOpenProfileSettings={() => setShowProfileModal(true)}
              onOpenSemesterModal={() => setShowSemesterModal(true)}
              onChangeCurrentSemester={(semId: string) => {
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
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
              onEditSubject={(sub: any) => { setEditingSubject(sub); setShowSubjectModal(true); }}
              onDeleteSubject={(id: string) => deleteSubject(id)}
            />
          )}

          {activeTab === 'assignments' && (
            <StudyAssignmentsTab 
              onNewAssignment={() => { setEditingAssignment(null); setShowAssignmentModal(true); }}
              onEditAssignment={(a: any) => { setEditingAssignment(a); setShowAssignmentModal(true); }}
              onDeleteAssignment={(id: string) => deleteStudyAssignment(id)}
              onToggleStatus={(a: any) => {
                const nextStatus = a.status === 'Completed' ? 'Chưa làm' : 'Completed';
                updateStudyAssignment(a.id, { status: nextStatus });
              }}
            />
          )}

          {activeTab === 'exams' && (
            <StudyExamsTab 
              onNewExam={() => { setEditingExam(null); setShowExamModal(true); }}
              onEditExam={(e: any) => { setEditingExam(e); setShowExamModal(true); }}
              onDeleteExam={(id: string) => deleteStudyExam(id)}
              onCreateStudyTask={(exam: any) => {
                const sub = subjects.find((s: any) => s.id === exam.subjectId);
                const examDate = new Date(exam.date || exam.examDate);
                const studyDate = new Date(examDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                addTask({
                  title: `[Ôn thi] ${exam.title} - ${sub?.name || 'Môn học'}`,
                  description: `Kỳ thi diễn ra ngày ${exam.date || exam.examDate}. Điểm mục tiêu: ${exam.targetScore || 8}/10. Trọng số: ${exam.weight || 30}%.`,
                  priority: 'Cao',
                  status: 'Chưa làm',
                  dueDate: studyDate,
                  estimatedHours: 4
                });
                alert(`Đã tạo nhiệm vụ ôn thi cho "${exam.title}" trong mục Công việc (hạn chót: ${studyDate})!`);
              }}
            />
          )}

          {activeTab === 'forecast' && (
            <GradeForecastTab 
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
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
                    alert(`🎉 Đã lưu điểm ${score} vào bài "${targetComp.name}" của môn "${subjects.find((s: any) => s.id === subId)?.name}" trong hồ sơ Điểm của tôi!`);
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
            updateSubjectGradeRecord(subjectForDetail.id, updates);
          }}
          onOpenForecast={() => {
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
            saveProfile(prev => ({
              ...prev,
              semesters: [...(prev.semesters || []), newSem],
              currentSemesterId: newSem.id
            }));
            setShowSemesterModal(false);
          }}
        />
      )}
    </div>
  );
}
