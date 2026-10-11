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
const VocabMasterView = React.lazy(() =>
  import('./vocab/VocabMasterView').then(m => ({ default: m.VocabMasterView }))
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

  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
          return JSON.parse(saved);
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
    const currentSemId = profile.currentSemesterId || profile.semesters[0]?.id || 'sem_default_1';
    const updatedSubjectGrades = { ...profile.subjectGrades };

    for (const sub of subjects) {
      if (!updatedSubjectGrades[sub.id]) {
        hasChanges = true;
        let schema: GradingSchema = JSON.parse(JSON.stringify(GRADE_PRESETS[profile.environment || 'THPT'].schema));
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
  }, [subjects, profile.environment]);

  const saveProfile = (updater: (prev: AcademicProfile) => AcademicProfile) => {
    setProfile(prev => {
      const next = updater(prev);
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
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Top Header & Navigation Tabs */}
      <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-purple-100/60 dark:border-purple-900/30 px-4 sm:px-6 pt-4 pb-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-violet-600 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 animate-wiggle">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Study OS
                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-950/60 dark:to-pink-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                  Pro Engine ✨
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Quản lý môn học, lịch thi, bài tập và mô phỏng điểm số thông minh chill chill 🌸
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity className="w-4 h-4" />} label="Tổng quan" />
          <TabButton active={activeTab === 'my-grades'} onClick={() => setActiveTab('my-grades')} icon={<Award className="w-4 h-4" />} label="Điểm của tôi" count={subjects.length} />
          <TabButton active={activeTab === 'vocabulary'} onClick={() => setActiveTab('vocabulary')} icon={<BookOpen className="w-4 h-4 text-amber-500" />} label="Vocabulary Master 📚" />
          <TabButton active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} icon={<BookOpen className="w-4 h-4" />} label="Môn học" count={subjects.length} />
          <TabButton active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} icon={<FileCheck className="w-4 h-4" />} label="Bài tập" count={pendingAssignmentsCount} />
          <TabButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon={<Target className="w-4 h-4" />} label="Lịch thi" count={upcomingExamsCount} />
          <TabButton active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')} icon={<Calculator className="w-4 h-4" />} label="Grade Forecast 🔮" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
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
                <div className="flex flex-col items-center justify-center p-16 min-h-[350px] text-slate-500 card-cute rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-purple-100/60 dark:border-purple-900/40">
                  <div className="w-10 h-10 border-3 border-purple-500 border-t-pink-400 rounded-full animate-spin mb-3"></div>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-300">Đang tải kho 10.000+ từ vựng... ✨</span>
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
              semesters: [...prev.semesters, newSem],
              currentSemesterId: newSem.id
            }));
            setShowSemesterModal(false);
          }}
        />
      )}
    </div>
  );
}
