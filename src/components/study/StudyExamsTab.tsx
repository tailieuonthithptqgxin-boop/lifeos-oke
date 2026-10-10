import React from 'react';
import { useAppStore } from '../../lib/store';
import { Target, Plus, Edit3, Trash2, Calendar } from 'lucide-react';

interface StudyExamsTabProps {
  onNewExam: () => void;
  onEditExam: (exam: any) => void;
  onDeleteExam: (id: string) => void;
  onCreateStudyTask: (exam: any) => void;
}

export function StudyExamsTab({
  onNewExam,
  onEditExam,
  onDeleteExam,
  onCreateStudyTask
}: StudyExamsTabProps) {
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
