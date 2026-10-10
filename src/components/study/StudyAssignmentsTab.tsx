import React from 'react';
import { useAppStore } from '../../lib/store';
import { Plus, Check, BookOpen, Calendar, Trash2 } from 'lucide-react';

interface StudyAssignmentsTabProps {
  onNewAssignment: () => void;
  onEditAssignment: (a: any) => void;
  onDeleteAssignment: (id: string) => void;
  onToggleStatus: (a: any) => void;
}

export function StudyAssignmentsTab({
  onNewAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onToggleStatus
}: StudyAssignmentsTabProps) {
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
