import React from 'react';
import { useAppStore } from '../../lib/store';
import { BookOpen, Plus, Edit3, Trash2 } from 'lucide-react';

interface StudySubjectsTabProps {
  onNewSubject: () => void;
  onEditSubject: (sub: any) => void;
  onDeleteSubject: (id: string) => void;
}

export function StudySubjectsTab({
  onNewSubject,
  onEditSubject,
  onDeleteSubject
}: StudySubjectsTabProps) {
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
