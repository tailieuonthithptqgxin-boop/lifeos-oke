import React, { useState, useEffect } from 'react';
import { FileCheck, X } from 'lucide-react';

interface AssignmentModalProps {
  assignment: any;
  subjects?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

export function AssignmentModal({ assignment, subjects = [], onClose, onSave }: AssignmentModalProps) {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in cursor-default"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
      >
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
