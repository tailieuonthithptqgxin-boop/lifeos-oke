import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { VocabWord } from '../../lib/vocabEngine';

export type StudyMode = 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank' | 'listening';

interface VocabStudyTabProps {
  studySource: '3000' | 'personal' | 'all';
  setStudySource: (val: '3000' | 'personal' | 'all') => void;
  studyTargetQueue: 'due' | 'new' | 'difficult' | 'all';
  setStudyTargetQueue: (val: 'due' | 'new' | 'difficult' | 'all') => void;
  studyMode: StudyMode;
  setStudyMode: (val: StudyMode) => void;
  langWords: VocabWord[];
  useDedicatedFocusMode: boolean;
  setUseDedicatedFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  onStartStudy: (mode: StudyMode, source: '3000' | 'personal' | 'all', queue: 'due' | 'new' | 'difficult' | 'all', count?: number) => void;
}

export const VocabStudyTab: React.FC<VocabStudyTabProps> = ({
  studySource,
  setStudySource,
  studyTargetQueue,
  setStudyTargetQueue,
  studyMode,
  setStudyMode,
  langWords,
  useDedicatedFocusMode,
  setUseDedicatedFocusMode,
  onStartStudy
}) => {
  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
      <div className="text-center space-y-2">
        <span className="text-3xl p-3 bg-purple-100 dark:bg-purple-950/60 text-purple-600 rounded-2xl inline-block">
          🧠
        </span>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
          Trung tâm Thiết lập Phiên học
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Tùy chỉnh nguồn từ vựng, nhóm mục tiêu và phương pháp luyện tập ngắt quãng khoa học.
        </p>
      </div>

      <div className="space-y-5 pt-2">
        
        {/* Step 1: Chọn nguồn từ vựng */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            1. Nguồn từ vựng muốn học
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStudySource('3000')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studySource === '3000'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold text-xs block">🌟 3000 Từ chuẩn</span>
              <span className="text-[11px] text-slate-400">Tài liệu DOCX</span>
            </button>

            <button
              type="button"
              onClick={() => setStudySource('personal')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studySource === 'personal'
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold text-xs block">👤 Từ vựng cá nhân</span>
              <span className="text-[11px] text-slate-400">{langWords.length} từ đã thêm</span>
            </button>

            <button
              type="button"
              onClick={() => setStudySource('all')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studySource === 'all'
                  ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-bold text-xs block">⚡ Kết hợp cả hai</span>
              <span className="text-[11px] text-slate-400">Toàn bộ kho từ</span>
            </button>
          </div>
        </div>

        {/* Step 2: Chọn nhóm từ mục tiêu */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            2. Nhóm từ mục tiêu
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setStudyTargetQueue('due')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studyTargetQueue === 'due'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs block">⏰ Đến hạn ôn</span>
              <span className="text-[10px] text-slate-400">Ưu tiên Spaced Rep</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyTargetQueue('new')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studyTargetQueue === 'new'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs block">🌱 Từ mới</span>
              <span className="text-[10px] text-slate-400">Nạp từ chưa học</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyTargetQueue('difficult')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studyTargetQueue === 'difficult'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs block">🔥 Hay quên</span>
              <span className="text-[10px] text-slate-400">Củng cố điểm yếu</span>
            </button>

            <button
              type="button"
              onClick={() => setStudyTargetQueue('all')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                studyTargetQueue === 'all'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 font-bold text-purple-900 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="text-xs block">📚 Toàn bộ</span>
              <span className="text-[10px] text-slate-400">Xáo trộn ngẫu nhiên</span>
            </button>
          </div>
        </div>

        {/* Step 3: Chọn phương pháp luyện tập */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            3. Phương pháp luyện tập
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setStudyMode('flashcard')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                studyMode === 'flashcard'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">🎴</span>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Flashcard: Anh → Việt
                </h4>
                <p className="text-[11px] text-slate-400">
                  Chủ động nhớ nghĩa trước khi lật đáp án (Active Recall)
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode('flashcard_reverse')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                studyMode === 'flashcard_reverse'
                  ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">🔄</span>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Flashcard đảo chiều: Việt → Anh
                </h4>
                <p className="text-[11px] text-slate-400">
                  Nhìn nghĩa tiếng Việt, nhớ lại từ tiếng Anh và phát âm
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode('quiz')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                studyMode === 'quiz'
                  ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">📝</span>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Trắc nghiệm 4 đáp án (Quiz)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Chọn nhanh nghĩa đúng trong 4 phương án
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStudyMode('spelling')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                studyMode === 'spelling'
                  ? 'border-pink-600 bg-pink-50/60 dark:bg-pink-950/40'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">✍️</span>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                  Luyện gõ chính tả (Spelling)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Nghe phát âm và gõ chính xác mặt chữ tiếng Anh
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 4: Chế độ tập trung Dedicated Focus Mode */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Dedicated Vocab Focus Mode (Khuyên dùng)
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Giao diện toàn màn hình không xao nhãng, tích hợp YouTube Lo-Fi và phím tắt thông minh.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseDedicatedFocusMode(prev => !prev)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              useDedicatedFocusMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useDedicatedFocusMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Launch Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onStartStudy(studyMode, studySource, studyTargetQueue, 20)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-sm rounded-2xl shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" /> BẮT ĐẦU PHIÊN HỌC NGAY
          </button>
        </div>

      </div>
    </div>
  );
};
