import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { AcademicSemester } from '../../lib/gradeEngine';

interface SemesterModalProps {
  onClose: () => void;
  onSaveSemester: (newSem: AcademicSemester) => void;
}

export function SemesterModal({ onClose, onSaveSemester }: SemesterModalProps) {
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
