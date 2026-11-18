import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Globe, Search, ChevronRight, X } from 'lucide-react';
import { PRESET_LANGUAGES, LearningLanguage } from '../../lib/vocabEngine';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface LanguageOnboardingModalProps {
  existingLanguages: LearningLanguage[];
  onClose: () => void;
  onSelectLanguage: (newLang: LearningLanguage) => void;
}

export const LanguageOnboardingModal: React.FC<LanguageOnboardingModalProps> = ({
  existingLanguages,
  onClose,
  onSelectLanguage
}) => {
  useBodyScrollLock(true);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [dailyTarget, setDailyTarget] = useState(10);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const availablePresets = useMemo(() => {
    return PRESET_LANGUAGES.filter(p => {
      const alreadyAdded = existingLanguages.some(el => el.id === p.id);
      if (alreadyAdded) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.originalName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [existingLanguages, search]);

  const handleSelect = (preset: any) => {
    onSelectLanguage({
      id: preset.id,
      name: preset.name,
      originalName: preset.originalName,
      flag: preset.flag,
      code: preset.code,
      speechVoiceCode: preset.speechVoiceCode,
      level,
      dailyNewWordTarget: dailyTarget,
      dailyReviewTarget: dailyTarget * 3,
      explanationLanguage: 'vi',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div 
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
      onClick={(e) => {
        if (mouseDownTargetRef.current === e.currentTarget && e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs cursor-default"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-modal-enter transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bạn muốn học thêm ngôn ngữ nào?
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-9 h-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[85dvh] sm:max-h-[75vh] overflow-y-auto text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm ngôn ngữ (Tiếng Pháp, Đức, Hàn, Nhật...)"
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Trình độ khởi điểm
              </label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="beginner">Cơ bản (Beginner)</option>
                <option value="intermediate">Trung cấp (Intermediate)</option>
                <option value="advanced">Nâng cao (Advanced)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mục tiêu từ mới / ngày
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={dailyTarget}
                onChange={e => setDailyTarget(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Danh sách ngôn ngữ được hỗ trợ
            </span>

            <div className="grid grid-cols-1 gap-2">
              {availablePresets.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handleSelect(preset)}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                      {preset.flag}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 transition">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {preset.originalName} • {preset.writingSystem}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition inline-flex items-center gap-0.5">
                    Chọn <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
