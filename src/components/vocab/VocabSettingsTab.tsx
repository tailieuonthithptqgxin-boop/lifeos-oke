import React, { useState } from 'react';
import { LearningLanguage } from '../../lib/vocabEngine';

interface VocabSettingsTabProps {
  activeLang: LearningLanguage;
  onUpdateSettings: (settings: Partial<LearningLanguage>) => void;
  onDeleteLanguage: () => void;
}

export const VocabSettingsTab: React.FC<VocabSettingsTabProps> = ({
  activeLang,
  onUpdateSettings,
  onDeleteLanguage
}) => {
  const [newWordsTarget, setNewWordsTarget] = useState(activeLang.dailyNewWordTarget || 10);
  const [reviewTarget, setReviewTarget] = useState(activeLang.dailyReviewTarget || 30);
  const [level, setLevel] = useState(activeLang.level || 'intermediate');
  const [explanationLang, setExplanationLang] = useState(activeLang.explanationLanguage || 'vi');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      dailyNewWordTarget: Number(newWordsTarget) || 10,
      dailyReviewTarget: Number(reviewTarget) || 30,
      level,
      explanationLanguage: explanationLang
    });
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <span className="text-3xl">{activeLang.flag}</span>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">
            Cài đặt Không gian học: {activeLang.name}
          </h4>
          <p className="text-xs text-slate-400">
            Tùy chỉnh mục tiêu hàng ngày, trình độ và ngôn ngữ giải nghĩa.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Số từ mới mỗi ngày
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={newWordsTarget}
              onChange={e => setNewWordsTarget(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Giới hạn lượt ôn mỗi ngày
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={reviewTarget}
              onChange={e => setReviewTarget(parseInt(e.target.value) || 30)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Trình độ hiện tại
          </label>
          <select
            value={level}
            onChange={e => setLevel(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="beginner">Cơ bản / Bắt đầu (Beginner)</option>
            <option value="intermediate">Trung cấp (Intermediate)</option>
            <option value="advanced">Nâng cao (Advanced)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Ngôn ngữ dùng để giải nghĩa
          </label>
          <select
            value={explanationLang}
            onChange={e => setExplanationLang(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English (Tiếng Anh)</option>
          </select>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onDeleteLanguage}
            className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold transition cursor-pointer"
          >
            Xóa ngôn ngữ này
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Lưu cài đặt
          </button>
        </div>
      </form>
    </div>
  );
};
