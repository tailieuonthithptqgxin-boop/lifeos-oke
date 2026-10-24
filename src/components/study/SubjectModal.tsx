import React, { useState, useEffect } from 'react';
import { BookOpen, X } from 'lucide-react';

interface SubjectModalProps {
  subject: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function SubjectModal({ subject, onClose, onSave }: SubjectModalProps) {
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
