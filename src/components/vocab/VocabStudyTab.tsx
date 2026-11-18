import React from 'react';
import { Play, Sparkles, Shuffle } from 'lucide-react';
import { VocabWord, LearningLanguage } from '../../lib/vocabEngine';
import { ShuffleMode } from '../../lib/smartShuffleEngine';

export type StudyMode = 'flashcard' | 'flashcard_reverse' | 'listening' | 'quiz' | 'spelling' | 'fill_in_blank';

interface VocabStudyTabProps {
  studySource: '3000' | 'personal' | 'all';
  setStudySource: (val: '3000' | 'personal' | 'all') => void;
  studyTargetQueue: 'due' | 'new' | 'difficult' | 'all';
  setStudyTargetQueue: (val: 'due' | 'new' | 'difficult' | 'all') => void;
  shuffleMode?: ShuffleMode;
  setShuffleMode?: (mode: ShuffleMode) => void;
  studyMode: StudyMode;
  setStudyMode: (val: StudyMode) => void;
  langWords: VocabWord[];
  useDedicatedFocusMode: boolean;
  setUseDedicatedFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  onStartStudy: (mode: StudyMode, source: '3000' | 'personal' | 'all', queue: 'due' | 'new' | 'difficult' | 'all', count?: number, shuffleMode?: ShuffleMode) => void;
  activeLang?: LearningLanguage;
}

export const VocabStudyTab: React.FC<VocabStudyTabProps> = ({
  studySource,
  setStudySource,
  studyTargetQueue,
  setStudyTargetQueue,
  shuffleMode = 'smart_review',
  setShuffleMode,
  studyMode,
  setStudyMode,
  langWords,
  useDedicatedFocusMode,
  setUseDedicatedFocusMode,
  onStartStudy,
  activeLang
}) => {
  const [selectedBatchSize, setSelectedBatchSize] = React.useState<number>(20);
  const [internalShuffle, setInternalShuffle] = React.useState<ShuffleMode>(shuffleMode);
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
        {/* Step 0: Chọn số lượng từ mỗi phiên (Micro-Session Size) */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Số lượng từ mỗi phiên học
            </label>
            <span className="text-[11px] text-slate-400">
              Định dạng phiên ngắn (Micro-Session) tối ưu ghi nhớ
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {[10, 15, 20, 25].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedBatchSize(size)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedBatchSize === size
                    ? 'bg-[#8387F5] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {size} từ
              </button>
            ))}
          </div>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                  onStartStudy('flashcard', studySource, studyTargetQueue, selectedBatchSize, internalShuffle);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu học {foreignLangShort} → Việt ({selectedBatchSize} từ)
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
                  onStartStudy('flashcard_reverse', studySource, studyTargetQueue, selectedBatchSize, internalShuffle);
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu học đảo chiều ({selectedBatchSize} từ)
              </button>
            </div>

            {/* 3. Active Recall: Điền từ & Nhớ mặt chữ */}
            <div
              onClick={() => setStudyMode('spelling')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'spelling'
                  ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700">✍️</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Active Recall: Điền từ & Gợi nhớ
                    </h4>
                    {studyMode === 'spelling' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Ẩn từ gốc, xem nghĩa tiếng Việt + loại từ + mặt nạ ký tự để tự nhớ và gõ chính xác.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('spelling', studySource, studyTargetQueue, selectedBatchSize, internalShuffle);
                }}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu luyện điền từ ({selectedBatchSize} từ)
              </button>
            </div>

            {/* 4. Trắc nghiệm 4 đáp án (Quiz phản xạ) */}
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
                    4 đáp án nghĩa tiếng Việt, 1 đáp án đúng, kiểm tra phản xạ tốc độ trên điện thoại.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('quiz', studySource, studyTargetQueue, selectedBatchSize, internalShuffle);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu làm Quiz ({selectedBatchSize} từ)
              </button>
            </div>

            {/* 5. Luyện nghe Audio-First (Bắt âm native) */}
            <div
              onClick={() => setStudyMode('listening')}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                studyMode === 'listening'
                  ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 ring-2 ring-cyan-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl p-2 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700">🎧</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Luyện Nghe: Audio-First
                    </h4>
                    {studyMode === 'listening' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-600 text-white">
                        ✓ Đang chọn
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Nghe âm thanh chuẩn 1.0x / 0.75x và tự nhận diện từ. Tuyệt đối không lộ trước đáp án!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartStudy('listening', studySource, studyTargetQueue, selectedBatchSize, internalShuffle);
                }}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu luyện nghe ({selectedBatchSize} từ)
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
              <span className="text-[10px] text-slate-400">Tất cả từ có sẵn</span>
            </button>
          </div>
        </div>

        {/* Step 3.5: Cơ chế Xáo trộn Thông minh (Smart Random Shuffle) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5 text-purple-600" />
              Cơ chế Xáo trộn & Phân bổ (Smart Random)
            </label>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
              ✓ Anti-Repetition
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'smart_review', label: '🧠 Ôn thông minh', desc: 'Ưu tiên từ yếu' },
              { id: 'random', label: '🎲 Ngẫu nhiên', desc: 'Xáo trộn đều' },
              { id: 'new_words', label: '🌱 Từ mới', desc: 'Nạp từ chưa học' },
              { id: 'mixed', label: '⚡ Kết hợp', desc: '30% mới + 70% ôn' },
              { id: 'mistakes', label: '🔥 Hay sai', desc: 'Tập trung từ yếu' }
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setInternalShuffle(s.id as ShuffleMode);
                  if (setShuffleMode) setShuffleMode(s.id as ShuffleMode);
                }}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  internalShuffle === s.id
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <span className="text-xs font-bold block">{s.label}</span>
                <span className="text-[10px] text-slate-400">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Chế độ tập trung Dedicated Focus Mode & Nhạc YouTube Lo-Fi */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/60 dark:border-indigo-800/50">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> 
              Phòng Học Focus Toàn Màn Hình + Nhạc YouTube (Khuyên dùng)
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Giao diện không xao nhãng, tích hợp nghe nhạc YouTube Lo-Fi, phím tắt thông minh và đồng hồ theo dõi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseDedicatedFocusMode(prev => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
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

        {/* Launch Button with Lobby Preview & Glowing Pulse */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              Focus Chamber Không Gian 3D
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedBatchSize} từ • ~{Math.max(2, Math.round(selectedBatchSize * 0.4))} phút
            </span>
          </div>

          <button
            type="button"
            onClick={() => onStartStudy(studyMode, studySource, studyTargetQueue, selectedBatchSize, internalShuffle)}
            className="w-full relative group overflow-hidden py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] transition-all duration-300 transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <Play className="w-5 h-5 fill-current transition-transform group-hover:scale-110" />
            <span>
              {studyMode === 'flashcard'
                ? `BẮT ĐẦU LUYỆN TẬP: FOCUS CHAMBER (${selectedBatchSize} TỪ)`
                : studyMode === 'flashcard_reverse'
                ? `BẮT ĐẦU: FLASHCARD ĐẢO CHIỀU (${selectedBatchSize} TỪ)`
                : studyMode === 'quiz'
                ? `BẮT ĐẦU: TRẮC NGHIỆM 4 ĐÁP ÁN (${selectedBatchSize} TỪ)`
                : `BẮT ĐẦU: LUYỆN GÕ CHÍNH TẢ (${selectedBatchSize} TỪ)`}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 ml-1">
              ~{Math.max(2, Math.round(selectedBatchSize * 0.4))}p
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
