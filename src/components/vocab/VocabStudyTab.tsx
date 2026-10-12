import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { VocabWord, LearningLanguage } from '../../lib/vocabEngine';

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
  activeLang?: LearningLanguage;
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
  onStartStudy,
  activeLang
}) => {
  const isChinese = activeLang?.id === 'zh';
  const isJapanese = activeLang?.id === 'ja';
  const foreignLangShort = isJapanese ? 'Nhật' : isChinese ? 'Trung' : 'Anh';

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
        
        {/* Step 1: Chọn phương pháp luyện tập (ĐẶT LÊN ĐẦU TIÊN) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
              1. Phương pháp luyện tập (Bấm nút trên từng ô để bắt đầu ngay)
            </label>
            <span className="text-[11px] text-emerald-600 font-bold hidden sm:inline">
              ✓ 1 Chạm để vào học tức thì
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Flashcard Anh -> Việt */}
            <div
              onClick={() => setStudyMode('flashcard')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'flashcard'
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700">🎴</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Flashcard: {foreignLangShort} → Việt
                    </h4>
                    {studyMode === 'flashcard' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Chủ động nhớ nghĩa trước khi lật đáp án (Active Recall)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('flashcard', studySource, studyTargetQueue, 20);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu học {foreignLangShort} → Việt
              </button>
            </div>

            {/* 2. Flashcard đảo chiều Việt -> Anh/Trung */}
            <div
              onClick={() => setStudyMode('flashcard_reverse')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'flashcard_reverse'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700">🔄</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Flashcard đảo chiều: Việt → {foreignLangShort}
                    </h4>
                    {studyMode === 'flashcard_reverse' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isJapanese
                      ? 'Nhìn nghĩa tiếng Việt, nhớ lại từ tiếng Nhật (Kanji/Hiragana) và phát âm'
                      : isChinese
                      ? 'Nhìn nghĩa tiếng Việt, nhớ lại chữ Hán/Pinyin và phát âm'
                      : 'Nhìn nghĩa tiếng Việt, nhớ lại từ tiếng Anh và phát âm'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('flashcard_reverse', studySource, studyTargetQueue, 20);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu học đảo chiều
              </button>
            </div>

            {/* 3. Trắc nghiệm 4 đáp án (Quiz) */}
            <div
              onClick={() => setStudyMode('quiz')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'quiz'
                  ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700">📝</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Trắc nghiệm 4 đáp án (Quiz)
                    </h4>
                    {studyMode === 'quiz' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    4 đáp án từ kho từ thật, 1 đáp án đúng, kiểm tra tức thì
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('quiz', studySource, studyTargetQueue, 20);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu làm Quiz
              </button>
            </div>

            {/* 4. Luyện gõ chính tả (Spelling) */}
            <div
              onClick={() => setStudyMode('spelling')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'spelling'
                  ? 'border-pink-600 bg-pink-50/70 dark:bg-pink-950/40 ring-2 ring-pink-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-700">✍️</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Luyện gõ chính tả (Spelling)
                    </h4>
                    {studyMode === 'spelling' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-pink-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isJapanese
                      ? 'Nghe phát âm tiếng Nhật và gõ chính xác Kanji hoặc Hiragana'
                      : isChinese
                      ? 'Nghe phát âm tiếng Trung và gõ chính xác Hán tự hoặc Pinyin'
                      : 'Nghe phát âm tự động và gõ chính xác mặt chữ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('spelling', studySource, studyTargetQueue, 20);
                }}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu luyện gõ từ
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Chọn nguồn từ vựng */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            2. Nguồn từ vựng muốn học
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
              <span className="font-bold text-xs block">
                {isJapanese ? '🌟 Kho chuẩn JLPT' : isChinese ? '🌟 Kho chuẩn HSK' : '🌟 3000 Từ chuẩn'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isJapanese ? 'JLPT N5 - N1 (7,847 từ)' : isChinese ? 'HSK 1 - 9 (10,240 từ)' : 'Tài liệu DOCX'}
              </span>
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

        {/* Step 3: Chọn nhóm từ mục tiêu */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
            3. Nhóm từ mục tiêu
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

        {/* Launch Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onStartStudy(studyMode, studySource, studyTargetQueue, 20)}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            {studyMode === 'flashcard'
              ? `BẮT ĐẦU: FLASHCARD ${foreignLangShort.toUpperCase()} → VIỆT`
              : studyMode === 'flashcard_reverse'
              ? `BẮT ĐẦU: FLASHCARD ĐẢO CHIỀU (VIỆT → ${foreignLangShort.toUpperCase()})`
              : studyMode === 'quiz'
              ? 'BẮT ĐẦU: TRẮC NGHIỆM 4 ĐÁP ÁN (QUIZ)'
              : 'BẮT ĐẦU: LUYỆN GÕ CHÍNH TẢ (SPELLING)'}
          </button>
        </div>

      </div>
    </div>
  );
};
