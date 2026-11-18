import React from 'react';
import { useAppStore } from '../../lib/store';
import { BookOpen, Sparkles, Plus, FileCheck, Target, Activity, AlertTriangle, Clock } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface StudyOverviewTabProps {
  onNewSubject: () => void;
  onNewAssignment: () => void;
  onNewExam: () => void;
  onSwitchTab: (tab: any) => void;
}

export function StudyOverviewTab({
  onNewSubject,
  onNewAssignment,
  onNewExam,
  onSwitchTab
}: StudyOverviewTabProps) {
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Thêm Môn học Ngay
          </button>
        </div>
      )}

      {/* 4 Interactive Bento KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => {
            soundEngine.playPop();
            onSwitchTab('subjects');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">Môn đang học</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">{subjects.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Bấm để quản lý môn</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            onSwitchTab('assignments');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400">Bài tập chưa xong</span>
            <FileCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">{pendingAssignments.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Bấm để xem danh sách</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            onSwitchTab('exams');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400">Kỳ thi sắp tới</span>
            <Target className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{upcomingExams.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Bấm để xem lịch thi</span>
        </div>

        <div 
          onClick={() => {
            soundEngine.playPop();
            onSwitchTab('my-grades');
          }}
          className="bg-white dark:bg-[#141E30] p-4 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] shadow-xs cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-all active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">Tiến độ trung bình</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{avgProgress}%</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${avgProgress}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Active Subjects */}
          <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
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
          <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
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
