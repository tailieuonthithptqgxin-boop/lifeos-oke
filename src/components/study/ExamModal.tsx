import React, { useState } from 'react';
import { Target, X } from 'lucide-react';

interface ExamModalProps {
  exam: any;
  subjects?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}

export function ExamModal({ exam, subjects = [], onClose, onSave }: ExamModalProps) {
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
