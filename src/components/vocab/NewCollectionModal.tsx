import React, { useState, useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { VocabCollection } from '../../lib/vocabEngine';
import { soundEngine } from '../../lib/soundEngine';

interface NewCollectionModalProps {
  onClose: () => void;
  onSave: (colData: Partial<VocabCollection>) => void;
}

export const NewCollectionModal: React.FC<NewCollectionModalProps> = ({
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const icons = ['📚', '🎓', '💼', '✈️', '🌸', '🏮', '🔥', '💡', '🌟', '🏆', '🎯', '📖'];

  const isFormDirty = title.trim().length > 0;

  const triggerShake = () => {
    soundEngine.playPop();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSafeDismiss = () => {
    if (isFormDirty) {
      triggerShake();
      return;
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên bộ từ vựng!');
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), icon });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFormDirty) triggerShake();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFormDirty]);

  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          handleSafeDismiss();
        }
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs cursor-default animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-[#141E30] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden transition-transform ${
          isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''
        }`}
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Tạo Bộ sưu tập mới
          </h3>
          <button type="button" onClick={handleSafeDismiss} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-between animate-fade-in">
              <span>{errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="p-1 hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Biểu tượng (Icon)
            </label>
            <div className="flex flex-wrap gap-2">
              {icons.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 rounded-xl text-lg transition ${
                    icon === ic ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-600' : 'bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên bộ từ vựng *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ví dụ: IELTS Reading Vocab, Unit 1..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Bộ từ theo giáo trình hoặc mục tiêu học..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Tạo bộ sưu tập
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
