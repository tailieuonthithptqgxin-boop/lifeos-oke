import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { 
  BookOpen, GraduationCap, Clock, FileText, CheckCircle2, AlertTriangle, 
  Play, ChevronRight, Calculator, Plus, MoreHorizontal, FileCheck, Target, 
  Activity, Calendar, Trash2, Edit3, X, Check, ArrowRight, Sparkles,
  Sliders, RotateCcw, Layers, TrendingUp, Info, Settings2, HelpCircle,
  Award, Save, ExternalLink, BarChart3, Star, School, Search, Filter, Brain
} from 'lucide-react';
import { StudySubject, StudyAssignment, StudyExam } from '../lib/types';
import {
  EducationEnvironment,
  GradeComponent,
  GradingSchema,
  GRADE_PRESETS,
  solveForecast,
  generateScenarios,
  validateGradingSchema,
  normalizeWeights,
  generateNaturalFormula,
  getTotalWeight,
  AcademicSemester,
  SubjectGradeRecord,
  AcademicProfile,
  SubjectAnalytics,
  SemesterAnalytics,
  calculateSubjectAnalytics,
  calculateSemesterAnalytics,
  calculateCumulativeGpa,
  createDefaultAcademicProfile
} from '../lib/gradeEngine';
import { VocabMasterView } from './vocab/VocabMasterView';

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
    addTask,
    setCurrentView 
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

      if (typeof window !== 'undefined' && nextRecord.schema) {
        localStorage.setItem(`lifeos_grade_schema_${subjectId}`, JSON.stringify(nextRecord.schema));
      }

      // Calculate new current grade & progress to sync to Subject in store
      const analytics = calculateSubjectAnalytics(nextRecord, prev.scaleMax, prev.passingScore);
      updateSubject(subjectId, {
        currentGrade: analytics.currentWeightedGrade,
        progress: analytics.completedWeight,
        targetGrade: nextRecord.targetGrade
      });

      return {
        ...prev,
        subjectGrades: {
          ...prev.subjectGrades,
          [subjectId]: nextRecord
        }
      };
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Study OS
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Hệ thống quản lý môn học, hồ sơ điểm cá nhân, bài tập và dự báo kết quả.
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                type="button" 
                onClick={() => setCurrentView('focus')} 
                className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Bắt đầu Phiên học
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 mt-5 overflow-x-auto no-scrollbar pb-1">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Activity className="w-4 h-4" />} label="Tổng quan" />
            <TabButton active={activeTab === 'my-grades'} onClick={() => setActiveTab('my-grades')} icon={<Award className="w-4 h-4" />} label="Điểm của tôi" count={subjects.length} />
            <TabButton active={activeTab === 'vocabulary'} onClick={() => setActiveTab('vocabulary')} icon={<Brain className="w-4 h-4" />} label="Từ vựng (Vocab Master)" />
            <TabButton active={activeTab === 'subjects'} onClick={() => setActiveTab('subjects')} icon={<BookOpen className="w-4 h-4" />} label="Môn học" count={subjects.length} />
            <TabButton active={activeTab === 'assignments'} onClick={() => setActiveTab('assignments')} icon={<FileCheck className="w-4 h-4" />} label="Bài tập" count={studyAssignments.filter((a: any) => a.status !== 'Completed').length} />
            <TabButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon={<Target className="w-4 h-4" />} label="Kỳ thi" count={studyExams.length} />
            <TabButton active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')} icon={<Calculator className="w-4 h-4" />} label="Dự báo Điểm" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'overview' && (
            <StudyOverview 
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
              onNewAssignment={() => { setEditingAssignment(null); setShowAssignmentModal(true); }}
              onNewExam={() => { setEditingExam(null); setShowExamModal(true); }}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === 'my-grades' && (
            <MyGradesDashboard
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
            <VocabMasterView currentUser={currentUser} />
          )}

          {activeTab === 'subjects' && (
            <SubjectsList 
              onNewSubject={() => { setEditingSubject(null); setShowSubjectModal(true); }}
              onEditSubject={(sub: any) => { setEditingSubject(sub); setShowSubjectModal(true); }}
              onDeleteSubject={(id: string) => deleteSubject(id)}
            />
          )}

          {activeTab === 'assignments' && (
            <AssignmentsList 
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
            <ExamsList 
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
            <GradeForecast 
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

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer
        ${active 
          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-xs' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
    >
      {icon} 
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${active ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// -----------------------------------------------------
// 1. OVERVIEW
// -----------------------------------------------------
function StudyOverview({ onNewSubject, onNewAssignment, onNewExam, onSwitchTab }: any) {
  const { subjects = [], studyAssignments = [], studyExams = [] } = useAppStore();
  
  const pendingAssignments = studyAssignments.filter((a: any) => a.status !== 'Completed' && a.status !== 'Submitted');
  const upcomingExams = studyExams.filter((e: any) => {
    const d = new Date(e.date || e.examDate);
    return !isNaN(d.getTime()) && d >= new Date(Date.now() - 24 * 60 * 60 * 1000);
  });
  
  const avgProgress = subjects.length > 0 
    ? Math.round(subjects.reduce((sum: number, s: any) => sum + (Number(s.progress) || 0), 0) / subjects.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick Action Banner if no subjects */}
      {subjects.length === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Bắt đầu với Study OS
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Bạn chưa thêm môn học nào. Hãy thêm môn học đầu tiên để theo dõi tiến độ, bài tập và điểm số.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onNewSubject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Thêm Môn học Ngay
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Môn đang học" value={subjects.length} icon={<BookOpen className="w-5 h-5 text-blue-600" />} />
        <StatCard title="Bài tập chưa xong" value={pendingAssignments.length} icon={<FileCheck className="w-5 h-5 text-amber-600" />} />
        <StatCard title="Kỳ thi sắp tới" value={upcomingExams.length} icon={<Target className="w-5 h-5 text-rose-600" />} />
        <StatCard title="Tiến độ trung bình" value={`${avgProgress}%`} icon={<Activity className="w-5 h-5 text-emerald-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Subjects */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Tiến độ Môn học ({subjects.length})
              </h3>
              <button 
                type="button" 
                onClick={onNewSubject}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm môn
              </button>
            </div>
            
            {subjects.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">Chưa có môn học nào được tạo.</div>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject: any) => (
                  <div key={subject.id} className="group p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color || '#3b82f6' }}></div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{subject.name}</span>
                        {subject.code && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{subject.code}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                        <span>Mục tiêu: <strong className="text-slate-800 dark:text-slate-200">{subject.targetGrade ?? 8}</strong></span>
                        <span>Hiện tại: <strong className={Number(subject.currentGrade) >= Number(subject.targetGrade || 8) ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{subject.currentGrade || '-'}</strong></span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(Number(subject.progress) || 0, 100)}%`, backgroundColor: subject.color || '#3b82f6' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Risk Factors & Deadlines */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Việc cần chú ý
            </h3>
            <div className="space-y-3">
              {pendingAssignments.slice(0, 3).map((a: any) => (
                <div key={a.id} className="flex gap-3 p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/40">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Hạn chót: {a.dueDate ? new Date(a.dueDate).toLocaleDateString('vi-VN') : 'Chưa đặt'}</div>
                  </div>
                </div>
              ))}
              {upcomingExams.slice(0, 2).map((e: any) => (
                <div key={e.id} className="flex gap-3 p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  <Target className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{e.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Ngày thi: {e.date || e.examDate ? new Date(e.date || e.examDate).toLocaleDateString('vi-VN') : 'Sắp tới'}</div>
                  </div>
                </div>
              ))}
              {pendingAssignments.length === 0 && upcomingExams.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">Mọi bài tập và lịch thi đang trong tầm kiểm soát! 🎉</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 sm:gap-4">
      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{title}</div>
        <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">{value}</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// 2. SUBJECTS LIST
// -----------------------------------------------------
function SubjectsList({ onNewSubject, onEditSubject, onDeleteSubject }: any) {
  const { subjects = [] } = useAppStore();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Danh sách Môn học</h3>
          <p className="text-xs text-slate-500">Quản lý các môn học đang theo học, điểm số mục tiêu và tiến độ.</p>
        </div>
        <button 
          type="button" 
          onClick={onNewSubject}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Môn học
        </button>
      </div>
      
      {subjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300">Chưa có môn học nào</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Hãy bấm "Thêm Môn học" để khởi tạo môn học đầu tiên của bạn.</p>
          <button 
            type="button" 
            onClick={onNewSubject}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Thêm ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub: any) => (
            <div key={sub.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold" style={{ backgroundColor: `${sub.color || '#3b82f6'}20`, color: sub.color || '#3b82f6' }}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{sub.name}</h4>
                      <div className="text-xs font-mono text-slate-500">{sub.code || 'Môn học'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button 
                      type="button" 
                      onClick={() => onEditSubject(sub)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa môn "${sub.name}"?`)) onDeleteSubject(sub.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Xóa môn"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Tiến độ</span>
                    <span className="text-slate-900 dark:text-slate-200">{sub.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(Number(sub.progress) || 0, 100)}%`, backgroundColor: sub.color || '#3b82f6' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Mục tiêu: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{sub.targetGrade ?? 8}/10</span>
                </div>
                <div>
                  <span className="text-slate-500">Hiện tại: </span>
                  <span className={`font-bold ${Number(sub.currentGrade) >= Number(sub.targetGrade || 8) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {sub.currentGrade ? `${sub.currentGrade}/10` : 'Chưa có'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------
// 3. ASSIGNMENTS LIST
// -----------------------------------------------------
function AssignmentsList({ onNewAssignment, onEditAssignment, onDeleteAssignment, onToggleStatus }: any) {
  const { studyAssignments = [], subjects = [] } = useAppStore();
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Bài tập & Dự án môn học</h3>
          <p className="text-xs text-slate-500">Theo dõi deadline, bài tập lớn và đồ án.</p>
        </div>
        <button 
          type="button" 
          onClick={onNewAssignment}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Bài tập
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {studyAssignments.map((a: any) => {
          const sub = subjects.find((s: any) => s.id === a.subjectId);
          const isDone = a.status === 'Completed' || a.status === 'Đã xong';
          return (
            <div key={a.id} className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 items-start min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleStatus(a)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer
                    ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}
                >
                  {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div className="min-w-0">
                  <h4 className={`font-bold text-sm ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                    {a.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold" style={{ color: sub?.color || '#3b82f6' }}>
                      <BookOpen className="w-3.5 h-3.5" /> {sub?.name || 'Môn học chung'}
                    </span>
                    {a.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Hạn chót: {new Date(a.dueDate).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                    {a.weight && <span>Trọng số: {a.weight}%</span>}
                    {a.grade !== undefined && a.grade !== null && <span className="font-bold text-emerald-600">Điểm: {a.grade}/10</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider
                  ${isDone ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 
                    a.status === 'Late' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                  {isDone ? 'Đã xong' : (a.status || 'Chưa làm')}
                </span>
                <button 
                  type="button" 
                  onClick={() => onEditAssignment(a)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Sửa
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (confirm(`Bạn có chắc muốn xóa bài tập "${a.title}"?`)) onDeleteAssignment(a.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {studyAssignments.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">Chưa có bài tập nào được giao.</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------
// 4. EXAMS LIST
// -----------------------------------------------------
function ExamsList({ onNewExam, onEditExam, onDeleteExam, onCreateStudyTask }: any) {
  const { studyExams = [], subjects = [] } = useAppStore();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Lịch thi & Kiểm tra</h3>
          <p className="text-xs text-slate-500">Chuẩn bị chu đáo cho các bài kiểm tra giữa kỳ và cuối kỳ.</p>
        </div>
        <button 
          type="button" 
          onClick={onNewExam}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Kỳ thi
        </button>
      </div>

      {studyExams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300">Chưa có lịch thi nào</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Thêm các kỳ thi sắp tới để hệ thống tự động cảnh báo và tạo lịch ôn thi thông minh.</p>
          <button 
            type="button" 
            onClick={onNewExam}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Thêm ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studyExams.map((exam: any) => {
            const sub = subjects.find((s: any) => s.id === exam.subjectId);
            const examDateVal = exam.date || exam.examDate;
            const daysLeft = examDateVal ? Math.ceil((new Date(examDateVal).getTime() - Date.now()) / (1000 * 3600 * 24)) : null;
            
            return (
              <div key={exam.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3" /> Kỳ thi
                    </span>
                    <div className="flex items-center gap-2">
                      {daysLeft !== null && (
                        daysLeft > 0 ? (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">Còn {daysLeft} ngày</span>
                        ) : daysLeft === 0 ? (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md animate-pulse">Hôm nay!</span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Đã qua</span>
                        )
                      )}
                      <button 
                        type="button" 
                        onClick={() => onEditExam(exam)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Sửa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (confirm(`Bạn có chắc muốn xóa kỳ thi "${exam.title}"?`)) onDeleteExam(exam.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">{exam.title}</h4>
                  <p className="text-xs font-semibold mt-1" style={{ color: sub?.color || '#3b82f6' }}>{sub?.name || 'Môn học chung'}</p>
                  {examDateVal && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                      <Calendar className="w-3.5 h-3.5" /> Ngày thi: {new Date(examDateVal).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Trọng số (Weight):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{exam.weight || 30}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Điểm mục tiêu:</span>
                    <span className="font-bold text-blue-600">{exam.targetScore || 8}/10</span>
                  </div>
                  {exam.actualScore !== undefined && exam.actualScore !== null && (
                    <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Điểm thực tế:</span>
                      <span className={`font-black ${exam.actualScore >= (exam.targetScore || 8) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {exam.actualScore}/10
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="pt-2">
                  <button 
                    type="button" 
                    onClick={() => onCreateStudyTask(exam)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tạo Nhiệm Vụ Ôn Thi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------
// 5. MY GRADES DASHBOARD (HỒ SƠ ĐIỂM CÁ NHÂN)
// -----------------------------------------------------
function MyGradesDashboard({
  profile,
  subjects = [],
  onOpenSubjectDetail,
  onOpenForecastForSubject,
  onNewSubject,
  onOpenProfileSettings,
  onOpenSemesterModal,
  onChangeCurrentSemester
}: any) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'good' | 'improving' | 'at_risk' | 'insufficient_data'>('all');

  const currentSemester = profile.semesters.find((s: any) => s.id === profile.currentSemesterId) || profile.semesters[0] || {
    id: 'default',
    name: 'Học kỳ 1 (2024 - 2025)',
    year: '2024 - 2025',
    targetGpa: 8.0
  };

  // Subjects in current semester
  const semesterSubjects = subjects.filter((s: any) => {
    const rec = profile.subjectGrades?.[s.id];
    return !rec || !rec.semesterId || rec.semesterId === currentSemester.id;
  });

  const subjectIds = semesterSubjects.map((s: any) => s.id);
  const allSubjectIds = subjects.map((s: any) => s.id);

  // Analytics
  const semAnalytics = useMemo(() => {
    return calculateSemesterAnalytics(profile, currentSemester.id, subjectIds);
  }, [profile, currentSemester.id, subjects]);

  const cumulative = useMemo(() => {
    return calculateCumulativeGpa(profile, allSubjectIds);
  }, [profile, subjects]);

  const targetGpa = currentSemester.targetGpa || profile.targetOverallGpa || 8.0;
  const gpaProgress = targetGpa > 0 ? Math.min(Math.round((semAnalytics.gpa / targetGpa) * 100), 100) : 0;

  // Filtered list
  const displayedSubjects = semesterSubjects.filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const a = semAnalytics.subjectsAnalytics.find((item: any) => item.subjectId === s.id);
    return a ? a.status === statusFilter : statusFilter === 'insufficient_data';
  });

  return (
    <div className="space-y-6">
      {/* ACADEMIC PROFILE BANNER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
              <School className="w-3.5 h-3.5" />
              {profile.environment === 'DAI_HOC' ? 'Đại học (Tín chỉ)' : profile.environment === 'THPT' ? 'THPT (Thông tư 22)' : 'Hệ Tùy chỉnh'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Thang {profile.scaleMax}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Điểm qua môn: {profile.passingScore}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{profile.schoolName || 'Chưa đặt trường'}</span>
            <span className="text-slate-400 font-normal">•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-base">{profile.programName || 'Khối/Lớp'}</span>
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hồ sơ điểm cá nhân độc lập — dữ liệu nền tảng cho việc tính GPA, quản lý tiến độ và mô phỏng dự báo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Semester pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {profile.semesters.map((sem: any) => (
              <button
                key={sem.id}
                type="button"
                onClick={() => onChangeCurrentSemester(sem.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  sem.id === currentSemester.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {sem.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onOpenSemesterModal}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Thêm học kỳ mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenProfileSettings}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" /> Cài đặt hồ sơ
          </button>
        </div>
      </div>

      {/* KPI DASHBOARD SUMMARY ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Semester GPA */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Điểm TB Học kỳ ({currentSemester.name?.split('(')[0]?.trim() || 'Kỳ này'})</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {semAnalytics.gpa > 0 ? semAnalytics.gpa.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-400">/{profile.scaleMax}</span>
          </div>
          <div className="text-xs flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Mục tiêu: <strong className="text-blue-600">{targetGpa.toFixed(1)}</strong></span>
            <span>{semAnalytics.gradedCredits}/{semAnalytics.totalCredits} TC</span>
          </div>
        </div>

        {/* Card 2: Cumulative GPA */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Điểm TB Tích lũy (Toàn khóa)</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
              {cumulative.gpa > 0 ? cumulative.gpa.toFixed(2) : '--'}
            </span>
            <span className="text-xs font-semibold text-slate-400">/{profile.scaleMax}</span>
          </div>
          <div className="text-xs flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Tổng cộng: <strong>{cumulative.totalCredits} TC</strong></span>
            <span>{cumulative.totalSubjects} môn học</span>
          </div>
        </div>

        {/* Card 3: Target Progress */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Tiến độ Mục tiêu Kỳ</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {gpaProgress}%
            </span>
            <span className="text-xs font-semibold text-slate-400">hoàn thành</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full transition-all ${
                gpaProgress >= 90 ? 'bg-emerald-500' : gpaProgress >= 70 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${gpaProgress}%` }}
            />
          </div>
        </div>

        {/* Card 4: Status Count Chips */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-bold">
            Tổng hợp môn học trong kỳ ({semesterSubjects.length})
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'good' ? 'all' : 'good')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'good' ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              <span>🟢 Đạt tốt</span>
              <span>{semAnalytics.goodCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'improving' ? 'all' : 'improving')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'improving' ? 'bg-amber-200 dark:bg-amber-900 text-amber-900' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
              }`}
            >
              <span>🟡 Cần nỗ lực</span>
              <span>{semAnalytics.improvingCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'at_risk' ? 'all' : 'at_risk')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'at_risk' ? 'bg-rose-200 dark:bg-rose-900 text-rose-900' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              }`}
            >
              <span>🔴 Nguy cơ</span>
              <span>{semAnalytics.atRiskCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'insufficient_data' ? 'all' : 'insufficient_data')}
              className={`p-1.5 rounded-lg text-left transition cursor-pointer flex items-center justify-between ${
                statusFilter === 'insufficient_data' ? 'bg-slate-300 dark:bg-slate-700 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>⚪ Chưa có điểm</span>
              <span>{semAnalytics.insufficientCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBJECT GRADES TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Table Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm môn học theo tên hoặc mã môn..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
              >
                Xóa lọc
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNewSubject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Thêm Môn học mới
          </button>
        </div>

        {displayedSubjects.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">Chưa có môn học nào phù hợp với bộ lọc trong kỳ này.</p>
            <button
              type="button"
              onClick={onNewSubject}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer"
            >
              Thêm môn học ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3 text-center">Tín chỉ / Hệ số</th>
                  <th className="py-3 px-3">Điểm quá trình hiện tại</th>
                  <th className="py-3 px-3 text-center">Mục tiêu</th>
                  <th className="py-3 px-3 text-center">Dự báo</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {displayedSubjects.map((sub: any) => {
                  const record = profile.subjectGrades?.[sub.id];
                  const analytics = record
                    ? calculateSubjectAnalytics(record, profile.scaleMax, profile.passingScore)
                    : null;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Name & Code */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color || '#3b82f6' }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{sub.name}</div>
                            {sub.code && (
                              <span className="text-[10px] font-mono text-slate-400">{sub.code}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          {record?.credits || 1} {profile.environment === 'DAI_HOC' ? 'TC' : 'HS'}
                        </span>
                      </td>

                      {/* Current Grade & Progress */}
                      <td className="py-3.5 px-3">
                        {analytics && analytics.completedWeight > 0 ? (
                          <div className="space-y-1">
                            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                              {analytics.currentWeightedGrade.toFixed(1)}{' '}
                              <span className="text-[11px] font-normal text-slate-400">/{profile.scaleMax}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Đã có {analytics.completedWeight}% trọng số
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Chưa có điểm</span>
                        )}
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {record?.targetGrade || sub.targetGrade || 8.0}
                      </td>

                      {/* Projected */}
                      <td className="py-3.5 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                        {analytics && analytics.completedWeight > 0 ? analytics.projectedGrade.toFixed(1) : '--'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${analytics?.statusColor || 'bg-slate-100 text-slate-600'}`}>
                          {analytics?.statusLabel || 'Chưa có điểm'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenSubjectDetail(sub)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Nhập điểm & Chi tiết môn học"
                          >
                            <Edit3 className="w-3 h-3" /> Chi tiết & Điểm
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenForecastForSubject(sub.id)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition cursor-pointer"
                            title="Mô phỏng tại Grade Forecast"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL: SUBJECT GRADE DETAIL (QUẢN LÝ ĐIỂM CHI TIẾT MÔN)
// -----------------------------------------------------
function SubjectGradeDetailModal({
  subject,
  record,
  profile,
  onClose,
  onSaveRecord,
  onOpenForecast
}: any) {
  const defaultSchema = useMemo(() => {
    return JSON.parse(JSON.stringify(GRADE_PRESETS[profile.environment || 'THPT'].schema));
  }, [profile.environment]);

  const [schema, setSchema] = useState<GradingSchema>(() => {
    return record?.schema ? JSON.parse(JSON.stringify(record.schema)) : defaultSchema;
  });

  const [credits, setCredits] = useState<number>(record?.credits || 1);
  const [targetGrade, setTargetGrade] = useState<number>(record?.targetGrade || subject.targetGrade || 8.0);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(record?.semesterId || profile.currentSemesterId);
  const [newScoreInput, setNewScoreInput] = useState<{ [compId: string]: string }>({});

  const analytics = useMemo(() => {
    const currentRec: SubjectGradeRecord = {
      subjectId: subject.id,
      semesterId: selectedSemesterId,
      credits,
      schema,
      targetGrade
    };
    return calculateSubjectAnalytics(currentRec, profile.scaleMax, profile.passingScore);
  }, [subject.id, selectedSemesterId, credits, schema, targetGrade, profile]);

  const handleAddScore = (compId: string) => {
    const valStr = newScoreInput[compId]?.trim();
    if (!valStr) return;
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > profile.scaleMax) {
      return alert(`Điểm phải nằm trong khoảng từ 0 đến ${profile.scaleMax}`);
    }

    setSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          return { ...c, scores: [...c.scores, val] };
        }
        return c;
      })
    }));

    setNewScoreInput(prev => ({ ...prev, [compId]: '' }));
  };

  const handleRemoveScore = (compId: string, sIdx: number) => {
    setSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          const nextScores = [...c.scores];
          nextScores.splice(sIdx, 1);
          return { ...c, scores: nextScores };
        }
        return c;
      })
    }));
  };

  const handleAddComponent = () => {
    const id = 'comp_' + Date.now();
    const newComp: GradeComponent = {
      id,
      name: `Cột điểm ${schema.components.length + 1}`,
      shortCode: `C${schema.components.length + 1}`,
      weight: 10,
      scores: [],
      isTargetExam: false
    };
    setSchema(prev => ({
      ...prev,
      components: [...prev.components, newComp]
    }));
  };

  const handleRemoveComponent = (id: string) => {
    if (schema.components.length <= 1) return;
    setSchema(prev => {
      const remaining = prev.components.filter(c => c.id !== id);
      if (!remaining.some(c => c.isTargetExam) && remaining.length > 0) {
        remaining[remaining.length - 1].isTargetExam = true;
      }
      return { ...prev, components: remaining };
    });
  };

  const handleSaveAndClose = () => {
    onSaveRecord({
      semesterId: selectedSemesterId,
      credits: Number(credits) || 1,
      targetGrade: Number(targetGrade) || 8.0,
      schema
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: subject.color || '#3b82f6' }}
            />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                {subject.name} {subject.code ? `(${subject.code})` : ''}
              </h3>
              <p className="text-xs text-slate-400">
                Quản lý hồ sơ điểm thật • Cập nhật các cột kiểm tra và điểm số thực tế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick config bar: Semester, Credits, Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Học kỳ
              </label>
              <select
                value={selectedSemesterId}
                onChange={e => setSelectedSemesterId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                {profile.semesters.map((sem: any) => (
                  <option key={sem.id} value={sem.id}>{sem.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Số tín chỉ / Hệ số môn
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={credits}
                onChange={e => setCredits(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Điểm mục tiêu (1 - {profile.scaleMax})
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max={profile.scaleMax}
                value={targetGrade}
                onChange={e => setTargetGrade(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600 dark:text-blue-400 text-center"
              />
            </div>
          </div>

          {/* Actionable Coaching Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Đánh giá tình trạng môn học
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${analytics.statusColor}`}>
                {analytics.statusLabel}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {analytics.actionAdvice}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-blue-100 dark:border-blue-900/40 text-slate-500">
              <span>Điểm quá trình: <strong className="text-blue-600 dark:text-blue-400">{analytics.completedWeight > 0 ? analytics.currentWeightedGrade.toFixed(1) : '--'}</strong></span>
              <span>Đã hoàn thành: <strong className="text-slate-800 dark:text-slate-200">{analytics.completedWeight}%</strong> trọng số</span>
              <span>Dự báo tổng kết: <strong className="text-purple-600 dark:text-purple-400">{analytics.projectedGrade.toFixed(1)}</strong></span>
            </div>
          </div>

          {/* Grade Components and Scores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Các thành phần điểm & Điểm thực tế đã có
              </h4>
              <span className="text-[11px] text-slate-400">
                Tổng trọng số: {getTotalWeight(schema.components).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-3">
              {schema.components.map((comp) => {
                const compAvg = comp.scores.length > 0
                  ? (comp.scores.reduce((a, b) => a + b, 0) / comp.scores.length).toFixed(1)
                  : null;

                return (
                  <div
                    key={comp.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      comp.isTargetExam
                        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Component Identity */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={e => {
                            const val = e.target.value;
                            setSchema(prev => ({
                              ...prev,
                              components: prev.components.map(c => c.id === comp.id ? { ...c, name: val } : c)
                            }));
                          }}
                          className="px-2 py-1 text-xs font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-blue-500 min-w-[140px]"
                        />

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-xs font-bold">
                          <span className="text-[10px] text-slate-400">Trọng số:</span>
                          <input
                            type="number"
                            value={comp.weight}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setSchema(prev => ({
                                ...prev,
                                components: prev.components.map(c => c.id === comp.id ? { ...c, weight: val } : c)
                              }));
                            }}
                            className="w-10 text-center bg-transparent border-none text-blue-600 dark:text-blue-400 font-bold"
                          />
                          <span className="text-[10px] text-slate-400">%</span>
                        </div>

                        {comp.isTargetExam && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white">
                            Đích dự báo
                          </span>
                        )}
                      </div>

                      {/* Right: Real Scores chips & Add Score */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Scores chips */}
                        <div className="flex flex-wrap items-center gap-1">
                          {comp.scores.map((score, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {score}
                              <button
                                type="button"
                                onClick={() => handleRemoveScore(comp.id, sIdx)}
                                className="text-blue-600 hover:text-rose-600 ml-0.5 cursor-pointer"
                                title="Xóa con điểm này"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Input & add score */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={profile.scaleMax}
                            value={newScoreInput[comp.id] || ''}
                            onChange={e => setNewScoreInput(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddScore(comp.id);
                              }
                            }}
                            placeholder={`0-${profile.scaleMax}`}
                            className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddScore(comp.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                          >
                            + Điểm
                          </button>
                        </div>

                        {compAvg && (
                          <span className="text-[11px] font-semibold text-slate-400 pl-1">
                            (TB: <span className="font-bold text-slate-800 dark:text-slate-200">{compAvg}</span>)
                          </span>
                        )}

                        {schema.components.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Xóa cột điểm này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddComponent}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm loại điểm mới cho môn này
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenForecast}
            className="w-full sm:w-auto px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" /> Mở sang Grade Forecast để mô phỏng What-If
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="flex-1 sm:flex-none px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Lưu Hồ Sơ Điểm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL: PROFILE SETTINGS (CÀI ĐẶT HỒ SƠ HỌC TẬP)
// -----------------------------------------------------
function ProfileSettingsModal({ profile, onClose, onSaveProfile }: any) {
  const [schoolName, setSchoolName] = useState(profile.schoolName || '');
  const [programName, setProgramName] = useState(profile.programName || '');
  const [environment, setEnvironment] = useState<EducationEnvironment>(profile.environment || 'THPT');
  const [scaleMax, setScaleMax] = useState<number>(profile.scaleMax || 10);
  const [passingScore, setPassingScore] = useState<number>(profile.passingScore || 5.0);
  const [targetOverallGpa, setTargetOverallGpa] = useState<number>(profile.targetOverallGpa || 8.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      schoolName: schoolName.trim(),
      programName: programName.trim(),
      environment,
      scaleMax: Number(scaleMax) || 10,
      passingScore: Number(passingScore) || 5.0,
      targetOverallGpa: Number(targetOverallGpa) || 8.0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" /> Cài đặt Hồ sơ Học tập Cá nhân
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên trường / Cơ sở đào tạo
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="Ví dụ: THPT Chuyên hoặc Đại học Bách Khoa"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Khối / Lớp / Chương trình học
            </label>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="Ví dụ: Khối 12 hoặc Kỹ thuật phần mềm K21"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Môi trường giáo dục
              </label>
              <select
                value={environment}
                onChange={e => setEnvironment(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="THPT">THPT (Thông tư 22)</option>
                <option value="DAI_HOC">Đại học (Tín chỉ)</option>
                <option value="CUSTOM">Hệ Tùy chỉnh</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Thang điểm tối đa
              </label>
              <select
                value={scaleMax}
                onChange={e => setScaleMax(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="10">Thang 10 (Việt Nam)</option>
                <option value="100">Thang 100 (Quốc tế)</option>
                <option value="4">Thang 4 (GPA Tín chỉ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Điểm tối thiểu qua môn
              </label>
              <input
                type="number"
                step="0.5"
                value={passingScore}
                onChange={e => setPassingScore(parseFloat(e.target.value) || 5.0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mục tiêu GPA chung
              </label>
              <input
                type="number"
                step="0.1"
                value={targetOverallGpa}
                onChange={e => setTargetOverallGpa(parseFloat(e.target.value) || 8.0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL: SEMESTER (THÊM HỌC KỲ MỚI)
// -----------------------------------------------------
function SemesterModal({ onClose, onSaveSemester }: any) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('2024 - 2025');
  const [targetGpa, setTargetGpa] = useState<number>(8.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên học kỳ (ví dụ: Học kỳ 2)');
    onSaveSemester({
      id: 'sem_' + Date.now(),
      name: name.trim(),
      year: year.trim(),
      isCurrent: true,
      targetGpa: Number(targetGpa) || 8.0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Thêm Học kỳ Mới
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên học kỳ
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ví dụ: Học kỳ 2 (2024 - 2025)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Năm học
            </label>
            <input
              type="text"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="Ví dụ: 2024 - 2025"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mục tiêu GPA cho kỳ này
            </label>
            <input
              type="number"
              step="0.1"
              value={targetGpa}
              onChange={e => setTargetGpa(parseFloat(e.target.value) || 8.0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Tạo Học kỳ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// 6. GRADE FORECAST (What-if Dynamic Engine & Simulation)
// -----------------------------------------------------
function GradeForecast({
  onNewSubject,
  preselectedSubjectId,
  profile,
  onCommitScoreToProfile
}: any) {
  const { subjects = [], updateSubject } = useAppStore();
  const [selectedSubId, setSelectedSubId] = useState(preselectedSubjectId || subjects[0]?.id || '');
  const [targetScore, setTargetScore] = useState<number>(8.0);
  const [newScoreInput, setNewScoreInput] = useState<{ [compId: string]: string }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync if preselected subject changes
  useEffect(() => {
    if (preselectedSubjectId) {
      setSelectedSubId(preselectedSubjectId);
    }
  }, [preselectedSubjectId]);

  const sub = subjects.find((s: any) => s.id === selectedSubId) || subjects[0];

  // Helper to get initial schema for a subject
  const getInitialSchema = (subjectId: string): GradingSchema => {
    if (profile?.subjectGrades?.[subjectId]?.schema) {
      return JSON.parse(JSON.stringify(profile.subjectGrades[subjectId].schema));
    }
    if (typeof window !== 'undefined' && subjectId) {
      const saved = localStorage.getItem(`lifeos_grade_schema_${subjectId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved schema:', e);
        }
      }
    }
    return JSON.parse(JSON.stringify(GRADE_PRESETS.THPT.schema));
  };

  const [schema, setSchema] = useState<GradingSchema>(() => getInitialSchema(selectedSubId));

  // Sync schema and target when selected subject changes
  useEffect(() => {
    if (sub) {
      if (sub.targetGrade) {
        setTargetScore(Number(sub.targetGrade));
      }
      const loaded = getInitialSchema(sub.id);
      setSchema(loaded);
    }
  }, [selectedSubId, profile]);

  // Persist schema to localStorage
  const updateSchema = (updater: (prev: GradingSchema) => GradingSchema) => {
    setSchema(prev => {
      const next = updater(prev);
      if (typeof window !== 'undefined' && sub?.id) {
        localStorage.setItem(`lifeos_grade_schema_${sub.id}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Switch preset
  const handleSelectPreset = (env: EducationEnvironment) => {
    const preset = GRADE_PRESETS[env];
    if (preset) {
      const newSchema = JSON.parse(JSON.stringify(preset.schema));
      updateSchema(() => newSchema);
      if (newSchema.scaleMax === 100 && targetScore <= 10) {
        setTargetScore(80);
      } else if (newSchema.scaleMax === 10 && targetScore > 10) {
        setTargetScore(8.0);
      }
    }
  };

  // Component management
  const handleAddComponent = () => {
    updateSchema(prev => {
      const id = 'comp_' + Date.now();
      const newComp: GradeComponent = {
        id,
        name: `Cột điểm ${prev.components.length + 1}`,
        shortCode: `C${prev.components.length + 1}`,
        weight: 10,
        scores: [],
        isTargetExam: false
      };
      return {
        ...prev,
        environment: 'CUSTOM',
        components: [...prev.components, newComp]
      };
    });
  };

  const handleRemoveComponent = (id: string) => {
    if (schema.components.length <= 1) return;
    updateSchema(prev => {
      const remaining = prev.components.filter(c => c.id !== id);
      if (!remaining.some(c => c.isTargetExam) && remaining.length > 0) {
        remaining[remaining.length - 1].isTargetExam = true;
      }
      return {
        ...prev,
        environment: 'CUSTOM',
        components: remaining
      };
    });
  };

  const handleUpdateComponent = (id: string, updates: Partial<GradeComponent>) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
  };

  const handleSetTargetComponent = (id: string) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => ({
        ...c,
        isTargetExam: c.id === id
      }))
    }));
  };

  const handleAddScoreToComponent = (compId: string) => {
    const valStr = newScoreInput[compId]?.trim();
    if (!valStr) return;
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > schema.scaleMax) return;

    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          return { ...c, scores: [...c.scores, val] };
        }
        return c;
      })
    }));

    setNewScoreInput(prev => ({ ...prev, [compId]: '' }));
  };

  const handleRemoveScoreFromComponent = (compId: string, scoreIndex: number) => {
    updateSchema(prev => ({
      ...prev,
      components: prev.components.map(c => {
        if (c.id === compId) {
          const nextScores = [...c.scores];
          nextScores.splice(scoreIndex, 1);
          return { ...c, scores: nextScores };
        }
        return c;
      })
    }));
  };

  const handleNormalizeWeights = () => {
    updateSchema(prev => ({
      ...prev,
      components: normalizeWeights(prev.components)
    }));
  };

  // Find target component
  const targetComp = schema.components.find(c => c.isTargetExam) || schema.components[schema.components.length - 1];
  const targetCompId = targetComp?.id || '';

  // Calculations & Validations
  const totalWeight = getTotalWeight(schema.components);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;
  const validationIssues = validateGradingSchema(schema);
  const forecastResult = solveForecast(schema, targetScore, targetCompId);
  const scenarios = generateScenarios(schema, targetCompId, targetScore);
  const naturalFormula = generateNaturalFormula(schema);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-7 space-y-7">
      {/* Simulation Notice Banner */}
      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between gap-3 text-xs text-purple-900 dark:text-purple-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span>
            <strong>Chế độ mô phỏng What-If:</strong> Thử nghiệm các mức điểm thi và trọng số mà không làm thay đổi điểm thật trong hồ sơ <strong>"Điểm của tôi"</strong>.
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg sm:text-xl flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Mô phỏng & Dự báo Điểm số (Grade Forecast)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống tính điểm đa môi trường (THPT, Đại học, Thực hành, Hệ 100) — dự báo chính xác điểm số cần đạt để đạt mục tiêu.
          </p>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Môn học:</span>
            <select
              value={selectedSubId}
              onChange={e => setSelectedSubId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {subjects.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <GraduationCap className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-sm">Bạn cần thêm ít nhất một môn học để sử dụng công cụ dự báo điểm.</p>
          <button
            type="button"
            onClick={onNewSubject}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Thêm Môn học ngay
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {/* TIER 1: ENVIRONMENT PRESETS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" /> 1. Chọn Môi trường Đào tạo (Template có sẵn)
              </label>
              <span className="text-[11px] text-slate-400">Tự động cấu hình chuẩn theo quy định</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {(Object.keys(GRADE_PRESETS) as EducationEnvironment[]).map(envKey => {
                const preset = GRADE_PRESETS[envKey];
                const isActive = schema.environment === envKey;
                return (
                  <button
                    key={envKey}
                    type="button"
                    onClick={() => handleSelectPreset(envKey)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center justify-between mb-1">
                      <span>{preset.name.split('(')[0].trim()}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIER 2: FORMULA BUILDER & COMPONENT CUSTOMIZER */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-500" /> 2. Cấu trúc Điểm & Trọng số (Tùy chỉnh linh hoạt)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thêm bớt cột điểm, nhập các bài kiểm tra đã có, và chọn 1 bài thi làm mục tiêu dự báo.
                </p>
              </div>

              {/* Weight balance badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isWeightValid
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  Tổng trọng số: {totalWeight.toFixed(0)}%
                  {isWeightValid ? ' ✓' : ' ⚠️'}
                </span>

                {!isWeightValid && (
                  <button
                    type="button"
                    onClick={handleNormalizeWeights}
                    className="px-2 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/40 transition cursor-pointer flex items-center gap-1"
                    title="Tự động chia lại tỷ lệ để tổng trọng số tròn 100%"
                  >
                    <RotateCcw className="w-3 h-3" /> Chuẩn hóa 100%
                  </button>
                )}
              </div>
            </div>

            {/* Validation issue alert if any */}
            {validationIssues.filter(i => i.type === 'error').length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationIssues.filter(i => i.type === 'error')[0].message}</span>
              </div>
            )}

            {/* Component Cards / Rows */}
            <div className="space-y-3">
              {schema.components.map((comp) => {
                const compAverage = comp.scores.length > 0
                  ? (comp.scores.reduce((a, b) => a + b, 0) / comp.scores.length).toFixed(1)
                  : null;

                return (
                  <div
                    key={comp.id}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                      comp.isTargetExam
                        ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Component Identity & Target Toggle */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={comp.name}
                          onChange={e => handleUpdateComponent(comp.id, { name: e.target.value })}
                          className="px-2.5 py-1 text-xs font-bold bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 min-w-[150px]"
                          placeholder="Tên thành phần"
                        />

                        {/* Target badge/selector */}
                        <button
                          type="button"
                          onClick={() => handleSetTargetComponent(comp.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                            comp.isTargetExam
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-900/50'
                          }`}
                          title="Chọn thành phần này làm bài thi cần dự báo điểm"
                        >
                          <Target className="w-3 h-3" />
                          {comp.isTargetExam ? 'Đang là đích dự báo' : 'Chọn làm đích'}
                        </button>

                        {/* Weight Slider & Input */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Trọng số:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={comp.weight}
                            onChange={e => handleUpdateComponent(comp.id, { weight: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-12 text-center text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-blue-600 dark:text-blue-400"
                          />
                          <span className="text-[11px] font-semibold text-slate-400">%</span>
                        </div>
                      </div>

                      {/* Right: Scores Chips & Add Score */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Display existing scores */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {comp.scores.map((score, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {score}
                              <button
                                type="button"
                                onClick={() => handleRemoveScoreFromComponent(comp.id, sIdx)}
                                className="text-blue-600 dark:text-blue-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 cursor-pointer"
                                title="Xóa điểm này"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* New Score Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={schema.scaleMax}
                            value={newScoreInput[comp.id] || ''}
                            onChange={e => setNewScoreInput(prev => ({ ...prev, [comp.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddScoreToComponent(comp.id);
                              }
                            }}
                            placeholder={`0-${schema.scaleMax}`}
                            className="w-16 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-bold text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddScoreToComponent(comp.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 rounded-lg transition cursor-pointer"
                            title="Thêm điểm vào cột này"
                          >
                            + Điểm
                          </button>
                        </div>

                        {/* Average indicator */}
                        {compAverage && (
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pl-1">
                            (TB: <span className="text-slate-700 dark:text-slate-200 font-bold">{compAverage}</span>)
                          </span>
                        )}

                        {/* Delete component button */}
                        {schema.components.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(comp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ml-1"
                            title="Xóa loại điểm này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions: Add Component + Natural Formula Preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddComponent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer self-start"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm loại điểm mới
              </button>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {showAdvanced ? 'Ẩn tùy chọn nâng cao' : 'Tùy chọn nâng cao (Thang điểm / Công thức tự do)'}
              </button>
            </div>

            {/* Real-time Natural Formula Preview */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0">Công thức trực quan:</span>
              <span className="font-mono text-[11px] sm:text-xs text-slate-800 dark:text-slate-200">{naturalFormula}</span>
            </div>

            {/* TIER 3: ADVANCED MODE (COLLAPSIBLE) */}
            {showAdvanced && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Cấu hình nâng cao & Thang điểm
                  </span>
                  <span className="text-[11px] text-slate-400">Dành cho các hệ đào tạo đặc thù</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Thang điểm tối đa
                    </label>
                    <select
                      value={schema.scaleMax}
                      onChange={e => updateSchema(prev => ({ ...prev, scaleMax: parseInt(e.target.value) || 10 }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    >
                      <option value="10">Thang điểm 10 (Việt Nam)</option>
                      <option value="100">Thang điểm 100 (Quốc tế/Percentage)</option>
                      <option value="4">Thang điểm 4 (GPA Tín chỉ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Điểm tối thiểu qua môn
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={schema.passingScore}
                      onChange={e => updateSchema(prev => ({ ...prev, passingScore: parseFloat(e.target.value) || 5.0 }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Phương thức tính
                    </label>
                    <select
                      value={schema.calculationMethod}
                      onChange={e => updateSchema(prev => ({ ...prev, calculationMethod: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                    >
                      <option value="weighted_average">Trung bình trọng số (Chuẩn)</option>
                      <option value="custom_formula">Công thức biểu thức tự do</option>
                    </select>
                  </div>
                </div>

                {schema.calculationMethod === 'custom_formula' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Biểu thức công thức (Sử dụng mã cột: {schema.components.map(c => c.shortCode).join(', ')})
                    </label>
                    <input
                      type="text"
                      value={schema.customFormula || ''}
                      onChange={e => updateSchema(prev => ({ ...prev, customFormula: e.target.value }))}
                      placeholder="Ví dụ: (TX * 0.2) + (GK * 0.3) + (CK * 0.5)"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FORECAST & WHAT-IF SIMULATION SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Goal Target Input & Solver Hero Card (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Target score selector */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Điểm tổng kết mục tiêu
                  </label>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {targetScore} / {schema.scaleMax}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={schema.scaleMax === 100 ? 40 : 1}
                    max={schema.scaleMax}
                    step={schema.scaleMax === 100 ? 1 : 0.1}
                    value={targetScore}
                    onChange={e => setTargetScore(parseFloat(e.target.value) || 0)}
                    className="flex-1 accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="number"
                    step={schema.scaleMax === 100 ? 1 : 0.1}
                    min="1"
                    max={schema.scaleMax}
                    value={targetScore}
                    onChange={e => setTargetScore(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-sm font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>

              {/* Backward Solver Hero Result */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dự báo điểm cần đạt
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      forecastResult.difficulty === 'already_safe'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : forecastResult.difficulty === 'easy'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : forecastResult.difficulty === 'moderate'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : forecastResult.difficulty === 'hard'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {forecastResult.difficulty === 'already_safe'
                      ? 'An toàn 🎉'
                      : forecastResult.difficulty === 'easy'
                      ? 'Dễ dàng 👍'
                      : forecastResult.difficulty === 'moderate'
                      ? 'Khả thi 🎯'
                      : forecastResult.difficulty === 'hard'
                      ? 'Thách thức cao 🔥'
                      : 'Không khả thi ⚠️'}
                  </span>
                </div>

                <div className="text-center py-2 space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Bài thi <span className="font-bold text-slate-800 dark:text-slate-100">{forecastResult.targetComponent.name}</span> cần tối thiểu:
                  </div>

                  {forecastResult.difficulty === 'already_safe' ? (
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      0.0 <span className="text-sm font-medium text-slate-400">/{schema.scaleMax} (Đã đủ điểm)</span>
                    </div>
                  ) : forecastResult.isAchievable ? (
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-400">
                      {forecastResult.requiredScore.toFixed(1)}{' '}
                      <span className="text-base font-normal text-slate-400">/{schema.scaleMax}</span>
                    </div>
                  ) : (
                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
                      {forecastResult.requiredScore.toFixed(1)}{' '}
                      <span className="text-sm font-normal text-slate-400">/{schema.scaleMax} (Vượt khung)</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 leading-relaxed px-2">
                    {forecastResult.advice}
                  </p>
                </div>

                {/* Commit Score to Real Profile Button */}
                {onCommitScoreToProfile && forecastResult.isAchievable && forecastResult.difficulty !== 'already_safe' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có muốn lưu điểm ${forecastResult.requiredScore.toFixed(1)} vào bài thi "${forecastResult.targetComponent.name}" của môn "${sub?.name}" trong hồ sơ Điểm của tôi?`)) {
                          onCommitScoreToProfile(sub?.id, forecastResult.requiredScore);
                        }
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu điểm {forecastResult.requiredScore.toFixed(1)} này vào hồ sơ thật
                    </button>
                  </div>
                )}

                {/* Stat pills */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Điểm quá trình đã có:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {forecastResult.currentComponentsAverage > 0
                        ? `${forecastResult.currentComponentsAverage.toFixed(1)} / ${schema.scaleMax}`
                        : 'Chưa có điểm'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block">Điểm tối đa có thể đạt:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {forecastResult.maxPossibleGrade.toFixed(1)} / {schema.scaleMax}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* WHAT-IF SCENARIO MATRIX (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" /> Ma trận Kịch bản Mô phỏng (What-If Simulation)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nếu bài thi <span className="font-semibold text-purple-600 dark:text-purple-400">{forecastResult.targetComponent.name}</span> được các mức điểm khác nhau:
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] font-bold">
                      <th className="py-2.5 px-3">Điểm {forecastResult.targetComponent.shortCode || 'Thi'}</th>
                      <th className="py-2.5 px-3">Điểm Tổng kết</th>
                      <th className="py-2.5 px-3">Xếp loại</th>
                      <th className="py-2.5 px-3 text-right">Mục tiêu ({targetScore})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {scenarios.map((sc, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          sc.passedTarget
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {sc.examScore.toFixed(schema.scaleMax === 100 ? 0 : 1)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">
                          {sc.finalGrade.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sc.colorClass}`}>
                            {sc.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {sc.passedTarget ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đạt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              Chưa đạt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span>💡 Thay đổi trọng số hoặc nhập điểm số ở trên để xem ma trận tự động tính lại.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL 1: SUBJECT
// -----------------------------------------------------
function SubjectModal({ subject, onClose, onSave }: any) {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [targetGrade, setTargetGrade] = useState(subject?.targetGrade ?? 8.5);
  const [currentGrade, setCurrentGrade] = useState(subject?.currentGrade ?? 7.5);
  const [progress, setProgress] = useState(subject?.progress ?? 50);
  const [color, setColor] = useState(subject?.color || '#3b82f6');

  const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên môn học');
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const finalName = trimmedCode && !trimmedName.includes(trimmedCode)
      ? `${trimmedName} (${trimmedCode})`
      : trimmedName;

    onSave({
      name: finalName,
      targetGrade: Number(targetGrade) || 8,
      currentGrade: Number(currentGrade) || 0,
      progress: Math.min(Math.max(Number(progress) || 0, 0), 100),
      color
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {subject ? 'Chỉnh sửa Môn học' : 'Thêm Môn học mới'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên môn học *</label>
            <input 
              type="text" 
              required
              placeholder="VD: Giải tích 1, Lập trình Web..."
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mã môn học</label>
            <input 
              type="text" 
              placeholder="VD: MAT101, IT202..."
              value={code} 
              onChange={e => setCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm mục tiêu (1-10)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                value={targetGrade} 
                onChange={e => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm hiện tại</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                value={currentGrade} 
                onChange={e => setCurrentGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <span>Tiến độ hoàn thành: {progress}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={progress} 
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Màu sắc nhận diện</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              {subject ? 'Lưu thay đổi' : 'Thêm Môn học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL 2: ASSIGNMENT
// -----------------------------------------------------
function AssignmentModal({ assignment, subjects = [], onClose, onSave }: any) {
  const [title, setTitle] = useState(assignment?.title || '');
  const [subjectId, setSubjectId] = useState(assignment?.subjectId || subjects[0]?.id || '');
  const [dueDate, setDueDate] = useState(assignment?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [weight, setWeight] = useState(assignment?.weight ?? 15);
  const [status, setStatus] = useState(assignment?.status || 'Chưa làm');
  const [grade, setGrade] = useState(assignment?.grade ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Vui lòng nhập tên bài tập');
    onSave({
      title: title.trim(),
      subjectId: subjectId || null,
      dueDate,
      status,
      grade: grade !== '' ? Number(grade) : null,
      estimatedHours: 2,
      actualHours: 0
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            {assignment ? 'Chỉnh sửa Bài tập' : 'Thêm Bài tập mới'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên bài tập / Đồ án *</label>
            <input 
              type="text" 
              required
              placeholder="VD: Bài tập lớn số 1, Đồ án giữa kỳ..."
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Môn học trực thuộc</label>
            <select 
              value={subjectId} 
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            >
              <option value="">-- Môn học chung --</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hạn nộp (Deadline)</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trọng số (% Weight)</label>
              <input 
                type="number" 
                min="0" 
                max="100"
                value={weight} 
                onChange={e => setWeight(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trạng thái</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              >
                <option value="Chưa làm">Chưa làm</option>
                <option value="Đang làm">Đang làm</option>
                <option value="Completed">Đã nộp / Hoàn thành</option>
                <option value="Late">Nộp muộn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm đạt được (nếu có)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                placeholder="VD: 9.0"
                value={grade} 
                onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              {assignment ? 'Lưu thay đổi' : 'Thêm Bài tập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// FORM MODAL 3: EXAM
// -----------------------------------------------------
function ExamModal({ exam, subjects = [], onClose, onSave }: any) {
  const [title, setTitle] = useState(exam?.title || '');
  const [subjectId, setSubjectId] = useState(exam?.subjectId || subjects[0]?.id || '');
  const [date, setDate] = useState(exam?.date || exam?.examDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [targetScore, setTargetScore] = useState(exam?.targetScore ?? 8.5);
  const [weight, setWeight] = useState(exam?.weight ?? 40);
  const [actualScore, setActualScore] = useState(exam?.actualScore ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Vui lòng nhập tên kỳ thi');
    onSave({
      title: title.trim(),
      subjectId: subjectId || null,
      examDate: date,
      targetScore: Number(targetScore) || 8,
      actualScore: actualScore !== '' ? Number(actualScore) : null,
      status: 'Upcoming'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-600" />
            {exam ? 'Chỉnh sửa Kỳ thi' : 'Thêm Kỳ thi mới'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tên kỳ thi *</label>
            <input 
              type="text" 
              required
              placeholder="VD: Thi Giữa kỳ, Thi Cuối kỳ, Vấn đáp..."
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Môn học</label>
            <select 
              value={subjectId} 
              onChange={e => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            >
              <option value="">-- Môn học chung --</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày thi</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Trọng số (% Weight)</label>
              <input 
                type="number" 
                min="0" 
                max="100"
                value={weight} 
                onChange={e => setWeight(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm mục tiêu</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                value={targetScore} 
                onChange={e => setTargetScore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm thi thực tế (sau thi)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0" 
                max="10"
                placeholder="VD: 8.5"
                value={actualScore} 
                onChange={e => setActualScore(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              {exam ? 'Lưu thay đổi' : 'Thêm Kỳ thi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
