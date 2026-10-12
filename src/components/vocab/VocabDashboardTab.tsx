import React from 'react';
import {
  Play,
  Plus,
  Brain,
  ArrowRight
} from 'lucide-react';
import {
  LearningLanguage,
  VocabCollection,
  VocabWord,
  System3000Word,
  SystemChineseHskWord,
  SystemJapaneseJlptWord
} from '../../lib/vocabEngine';

interface VocabDashboardTabProps {
  activeLang: LearningLanguage;
  system3000Words: System3000Word[];
  systemChineseWords: SystemChineseHskWord[];
  systemJapaneseWords?: SystemJapaneseJlptWord[];
  analytics3000: any;
  analyticsChineseHsk: any;
  analyticsJapaneseJlpt?: any;
  langWords: VocabWord[];
  personalAnalytics: any;
  langCollections: VocabCollection[];
  combinedAnalytics: any;
  onStartStudy: (mode: any, source: string, queue: string) => void;
  onOpenAddWordModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const VocabDashboardTab: React.FC<VocabDashboardTabProps> = ({
  activeLang,
  system3000Words,
  systemChineseWords,
  systemJapaneseWords = [],
  analytics3000,
  analyticsChineseHsk,
  analyticsJapaneseJlpt,
  langWords,
  personalAnalytics,
  langCollections,
  combinedAnalytics,
  onStartStudy,
  onOpenAddWordModal,
  onNavigateTab
}) => {
  const isChinese = activeLang.id === 'zh';
  const isJapanese = activeLang.id === 'ja';
  const foreignLangShort = isChinese ? 'Trung' : isJapanese ? 'Nhật' : 'Anh';

  return (
    <div className="space-y-6">
      {/* Hero Callout */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white inline-block">
            Mục tiêu: {activeLang.dailyNewWordTarget} từ mới / ngày • {activeLang.dailyReviewTarget} lượt ôn
          </span>
          <h2 className="text-2xl sm:text-3xl font-black">
            Không gian học tập: {activeLang.name}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Tích hợp trọn vẹn bộ <strong>{isJapanese ? '7,847 từ vựng JLPT N5 - N1 chuẩn hoá' : isChinese ? '10,240 từ vựng HSK 1 - 9 chuẩn quốc tế' : '3000 từ thông dụng chuẩn từ tài liệu DOCX'}</strong> và <strong>kho từ vựng cá nhân riêng biệt</strong> của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('study')}
            className="px-5 py-3 bg-white hover:bg-slate-100 text-blue-700 font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Brain className="w-4 h-4 text-emerald-600" /> Chọn 4 Phương pháp Luyện tập 🎯
          </button>

          <button
            type="button"
            onClick={onOpenAddWordModal}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm từ cá nhân
          </button>
        </div>
      </div>

      {/* 4 DEDICATED PRACTICE METHODS QUICK LAUNCH DIRECTLY ON DASHBOARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                4 Phương pháp Luyện tập & Kiểm tra ({activeLang.name})
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                1 Chạm Bắt đầu
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bấm trực tiếp vào nút dưới từng phương pháp để bắt đầu học ngay lập tức:
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('study')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Tùy chỉnh sâu <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Method 1: Flashcard */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between gap-3 hover:shadow-md transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700">🎴</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-600 text-white uppercase">Flashcard</span>
              </div>
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                1. Flashcard: {foreignLangShort} → Việt
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Nhìn {isJapanese ? 'từ tiếng Nhật (Kanji/Hiragana)' : isChinese ? 'chữ Hán / Pinyin' : 'từ tiếng Anh'}, nhớ lại nghĩa tiếng Việt trước khi lật đáp án (Active Recall).
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy('flashcard', '3000', 'due')}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu {foreignLangShort} → Việt
            </button>
          </div>

          {/* Method 2: Reverse Flashcard */}
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col justify-between gap-3 hover:shadow-md transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700">🔄</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white uppercase">Đảo chiều</span>
              </div>
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                2. Đảo chiều: Việt → {foreignLangShort}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Hiển thị nghĩa tiếng Việt trước, nhớ lại {isJapanese ? 'từ tiếng Nhật (Kanji/Hiragana)' : isChinese ? 'chữ Hán / Pinyin' : 'từ tiếng Anh'} và phát âm chuẩn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy('flashcard_reverse', '3000', 'due')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu Đảo chiều
            </button>
          </div>

          {/* Method 3: Quiz */}
          <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col justify-between gap-3 hover:shadow-md transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700">📝</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white uppercase">Trắc nghiệm</span>
              </div>
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                3. Trắc nghiệm (Quiz 4 đáp án)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                4 lựa chọn ngẫu nhiên từ kho từ thật, 1 đáp án đúng, phản hồi đúng/sai tức thì.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy('quiz', '3000', 'due')}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu làm Quiz
            </button>
          </div>

          {/* Method 4: Spelling */}
          <div className="p-4 rounded-2xl border border-pink-200 dark:border-pink-900/60 bg-pink-50/40 dark:bg-pink-950/20 flex flex-col justify-between gap-3 hover:shadow-md transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-2xl p-2 rounded-xl bg-pink-100 dark:bg-pink-900/60 text-pink-700">✍️</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-pink-600 text-white uppercase">Gõ chính tả</span>
              </div>
              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                4. Luyện gõ chính tả (Spelling)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Ẩn mặt chữ {isJapanese ? 'tiếng Nhật' : isChinese ? 'Hán' : ''}, tự động phát âm loa, gõ {isJapanese ? 'Kanji / Hiragana' : isChinese ? 'chữ Hán / Pinyin' : 'từ vựng'} vào ô và kiểm tra chính xác.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartStudy('spelling', '3000', 'due')}
              className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Bắt đầu Luyện gõ
            </button>
          </div>
        </div>
      </div>

      {/* TWO DEDICATED SOURCE TILES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Tile 1: System Words (Oxford 3000 for EN, HSK 1-9 for ZH, JLPT N5-N1 for JA) */}
        {activeLang.id === 'ja' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl text-2xl">
                  🇯🇵
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Kho chuẩn JLPT N5 - N1
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Kho từ vựng JLPT N5 - N1
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Toàn bộ {systemJapaneseWords.length.toLocaleString()} từ vựng tiếng Nhật đầy đủ Kanji, Hiragana, âm Hán Việt và nghĩa tiếng Việt chuẩn hóa.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-medium">Tổng từ</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200">
                    {systemJapaneseWords.length.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-emerald-500 block font-medium">Đã thuộc</span>
                  <span className="text-base font-black text-emerald-600">
                    {analyticsJapaneseJlpt?.masteredCount || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-purple-500 block font-medium">Đang học</span>
                  <span className="text-base font-black text-purple-600">
                    {(analyticsJapaneseJlpt?.learningCount || 0) + (analyticsJapaneseJlpt?.reviewingCount || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('japaneseJlpt')}
                className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl transition cursor-pointer text-center"
              >
                Khám phá kho JLPT ({systemJapaneseWords.length.toLocaleString()} từ)
              </button>
              <button
                type="button"
                onClick={() => onStartStudy('flashcard', '3000', 'due')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Brain className="w-3.5 h-3.5" /> Học ngay
              </button>
            </div>
          </div>
        ) : activeLang.id === 'zh' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl text-2xl">
                  🏮
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  Kho chuẩn HSK 3.0
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Kho từ vựng HSK 1 - 9
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Toàn bộ 10,240 từ vựng tiếng Trung đầy đủ Hán tự, Pinyin thanh điệu chuẩn, từ loại và nghĩa tiếng Việt giàu ngữ cảnh.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-medium">Tổng từ</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200">
                    {systemChineseWords.length.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-emerald-500 block font-medium">Đã thuộc</span>
                  <span className="text-base font-black text-emerald-600">
                    {analyticsChineseHsk.masteredCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-purple-500 block font-medium">Đang học</span>
                  <span className="text-base font-black text-purple-600">
                    {analyticsChineseHsk.learningCount + analyticsChineseHsk.reviewingCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('chineseHsk')}
                className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition cursor-pointer text-center"
              >
                Khám phá kho HSK (10,240 từ)
              </button>
              <button
                type="button"
                onClick={() => onStartStudy('flashcard', '3000', 'due')}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Brain className="w-3.5 h-3.5" /> Học ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-2xl text-2xl">
                  🌟
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Nguồn chuẩn hệ thống
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  3000 Từ vựng Thông dụng nhất
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Trích xuất trực tiếp từ tài liệu DOCX. Gồm đầy đủ phiên âm, từ loại, nghĩa tiếng Việt và tiến độ học cá nhân của bạn.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block font-medium">Tổng từ</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200">
                    {system3000Words.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-emerald-500 block font-medium">Đã thuộc</span>
                  <span className="text-base font-black text-emerald-600">
                    {analytics3000.masteredCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  <span className="text-[10px] text-purple-500 block font-medium">Đang học</span>
                  <span className="text-base font-black text-purple-600">
                    {analytics3000.learningCount + analytics3000.reviewingCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab('oxford3000')}
                className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition cursor-pointer text-center"
              >
                Khám phá danh sách 3000 từ
              </button>
              <button
                type="button"
                onClick={() => onStartStudy('flashcard', '3000', 'due')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Brain className="w-3.5 h-3.5" /> Học ngay
              </button>
            </div>
          </div>
        )}

        {/* Tile 2: Personal Vocabulary */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-2xl text-2xl">
                👤
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Kho dữ liệu cá nhân
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Từ vựng cá nhân ({langWords.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Nơi bạn tự do thêm các từ vựng mới gặp khi đọc sách, làm đề thi hoặc xem phim; nhập/xuất CSV và phân nhóm theo chủ đề.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] text-slate-400 block font-medium">Từ cá nhân</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200">
                  {langWords.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] text-emerald-500 block font-medium">Đã thuộc</span>
                <span className="text-base font-black text-emerald-600">
                  {personalAnalytics.masteredCount}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <span className="text-[10px] text-blue-500 block font-medium">Bộ sưu tập</span>
                <span className="text-base font-black text-blue-600">
                  {langCollections.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('personal')}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center"
            >
              Quản lý từ vựng cá nhân
            </button>
            <button
              type="button"
              onClick={onOpenAddWordModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm từ
            </button>
          </div>
        </div>

      </div>

      {/* COMBINED KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Tổng kho từ vựng</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {combinedAnalytics.totalWords.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold">3000 từ chuẩn + cá nhân</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đang học theo chu kỳ</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {combinedAnalytics.learningCount + combinedAnalytics.reviewingCount}
          </div>
          <span className="text-[11px] text-slate-400">Thuật toán SM-2</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đã ghi nhớ vững</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {combinedAnalytics.masteredCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">{combinedAnalytics.masteryPercentage}% toàn bộ</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Tỷ lệ nhớ đúng</span>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">
            {combinedAnalytics.retentionRate}%
          </div>
          <span className="text-[11px] text-slate-400">{combinedAnalytics.totalReviewsCount} lượt phản hồi</span>
        </div>
      </div>

    </div>
  );
};
