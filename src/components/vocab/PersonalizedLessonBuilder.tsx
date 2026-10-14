import React, { useState, useMemo, useEffect } from 'react';
import {
  Brain, Sparkles, Filter, CheckSquare, Square, Play, RotateCcw,
  Clock, Hash, Star, AlertCircle, Lightbulb, Pin, Search, ChevronRight,
  Layers, Volume2, Settings2, Shuffle, Check, ArrowRight, Eye, Bookmark,
  HelpCircle, ListOrdered, X
} from 'lucide-react';
import {
  VocabWord,
  VocabCollection,
  LearningLanguage,
  VocabUserData,
  UserLearningPreferences,
  speakWord,
  toggleWordDifficult,
  toggleWordReviewLater,
  toggleUniversalFavorite,
  addToLearningQueue,
  removeFromLearningQueue,
  saveUserLearningPreferences,
  DEFAULT_LEARNING_PREFERENCES
} from '../../lib/vocabEngine';
import { useAppStore } from '../../lib/store';

export type StudyMode = 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank';

interface PersonalizedLessonBuilderProps {
  activeLang: LearningLanguage;
  allWords: VocabWord[];
  collections: VocabCollection[];
  userData: VocabUserData;
  onUpdateUserData: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onStartStudyExplicit: (words: VocabWord[], mode: StudyMode, durationMinutes?: number) => void;
  onOpenUniversalSearch: () => void;
  onOpenWordDetail: (word: VocabWord) => void;
}

export const PersonalizedLessonBuilder: React.FC<PersonalizedLessonBuilderProps> = ({
  activeLang,
  allWords = [],
  collections = [],
  userData,
  onUpdateUserData,
  onStartStudyExplicit,
  onOpenUniversalSearch,
  onOpenWordDetail
}) => {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const userPrefs = userData?.learningPreferences || DEFAULT_LEARNING_PREFERENCES;
  const learningQueueIds = userData?.learningQueue || [];

  // Filter & Search states
  const [sourceFilter, setSourceFilter] = useState<'all' | 'system' | 'personal' | 'collection'>('all');
  const [selectedColId, setSelectedColId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'weak' | 'favorite' | 'difficult' | 'reviewLater' | 'queue'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Step 3 & 4 States: Mode, Count, Duration
  const [selectedMode, setSelectedMode] = useState<StudyMode>(
    (userPrefs.preferredModes?.[0] as StudyMode) || 'flashcard'
  );
  const [selectedWordCount, setSelectedWordCount] = useState<number>(userPrefs.defaultCount || 20);
  const [customCountInput, setCustomCountInput] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(userPrefs.defaultDurationMinutes || 15);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  // Selected word IDs (User Selection Checklist)
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());

  // Smart Recommendation / Surprise Me state
  const [recommendation, setRecommendation] = useState<{
    words: VocabWord[];
    reason: string;
  } | null>(null);

  // Filter words based on current criteria
  const filteredWords = useMemo(() => {
    let result = [...allWords];

    // Source Filter
    if (sourceFilter === 'system') {
      result = result.filter(w => w.id.startsWith('word_3000_') || w.id.startsWith('zh_hsk_') || w.id.startsWith('ja_jlpt_'));
    } else if (sourceFilter === 'personal') {
      result = result.filter(w => !w.id.startsWith('word_3000_') && !w.id.startsWith('zh_hsk_') && !w.id.startsWith('ja_jlpt_'));
    } else if (sourceFilter === 'collection' && selectedColId !== 'all') {
      result = result.filter(w => w.collectionId === selectedColId);
    }

    // Status Filter
    const today = new Date().toISOString().split('T')[0];
    if (statusFilter === 'new') {
      result = result.filter(w => w.state === 'new');
    } else if (statusFilter === 'weak') {
      result = result.filter(w => w.lapses >= 1 || (w.state !== 'new' && w.nextReviewAt <= today) || w.state === 'difficult');
    } else if (statusFilter === 'favorite') {
      result = result.filter(w => w.isFavorite);
    } else if (statusFilter === 'difficult') {
      result = result.filter(w => w.isDifficult || w.state === 'difficult');
    } else if (statusFilter === 'reviewLater') {
      result = result.filter(w => w.reviewLater);
    } else if (statusFilter === 'queue') {
      const qSet = new Set(learningQueueIds);
      result = result.filter(w => qSet.has(w.id));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(w => 
        w.term.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        (w.phonetic && w.phonetic.toLowerCase().includes(q)) ||
        (w.furigana && w.furigana.toLowerCase().includes(q)) ||
        (w.hanViet && w.hanViet.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allWords, sourceFilter, selectedColId, statusFilter, searchQuery, learningQueueIds]);

  // Initial selection: Auto-select first N candidate words if none selected yet
  useEffect(() => {
    if (filteredWords.length > 0 && selectedWordIds.size === 0) {
      const initialBatch = filteredWords.slice(0, Math.min(filteredWords.length, selectedWordCount));
      setSelectedWordIds(new Set(initialBatch.map(w => w.id)));
    }
  }, [filteredWords.length]);

  // Toggle single word
  const toggleSelectWord = (wordId: string) => {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  // Select all currently filtered words
  const handleSelectAllFiltered = () => {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      filteredWords.forEach(w => next.add(w.id));
      return next;
    });
  };

  // Deselect all currently filtered words
  const handleDeselectAllFiltered = () => {
    setSelectedWordIds(prev => {
      const next = new Set(prev);
      filteredWords.forEach(w => next.delete(w.id));
      return next;
    });
  };

  // Random pick N words from filtered
  const handlePickRandom = (count: number) => {
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(shuffled.length, count));
    setSelectedWordIds(new Set(picked.map(w => w.id)));
  };

  // Surprise Me / Smart Recommendation
  const handleSurpriseMe = () => {
    const today = new Date().toISOString().split('T')[0];
    // Priority: 1. Hay sai (lapses >= 1), 2. Đến hạn (nextReviewAt <= today), 3. Yêu thích (favorite), 4. Từ mới (new)
    const weakPool = allWords.filter(w => w.lapses >= 1 || w.state === 'difficult');
    const duePool = allWords.filter(w => w.state !== 'new' && w.nextReviewAt <= today);
    const favPool = allWords.filter(w => w.isFavorite);
    const newPool = allWords.filter(w => w.state === 'new');

    let smartPick: VocabWord[] = [];
    let reasonText = isVi ? 'Ưu tiên từ hay quên và từ cần ôn hôm nay' : 'Prioritizing weak and due review words';

    if (weakPool.length >= 5) {
      smartPick = [...weakPool].sort(() => Math.random() - 0.5).slice(0, selectedWordCount);
      reasonText = isVi 
        ? `Tập trung vào ${smartPick.length} từ bạn đang hay nhầm lẫn nhất để củng cố trí nhớ dài hạn!` 
        : `Focusing on ${smartPick.length} words you struggle with most to reinforce long-term memory!`;
    } else if (duePool.length > 0) {
      smartPick = [...duePool].sort(() => Math.random() - 0.5).slice(0, selectedWordCount);
      reasonText = isVi 
        ? `Hệ thống SM-2 chọn lọc ${smartPick.length} từ đến hạn ôn tập vàng theo đường cong quên!` 
        : `SM-2 selected ${smartPick.length} words reaching optimal review interval on the forgetting curve!`;
    } else if (favPool.length > 0) {
      smartPick = [...favPool].sort(() => Math.random() - 0.5).slice(0, selectedWordCount);
      reasonText = isVi
        ? `Luyện tập các từ bạn đã gắn dấu yêu thích ⭐`
        : `Practicing words you marked as favorites ⭐`;
    } else {
      smartPick = [...newPool, ...allWords].sort(() => Math.random() - 0.5).slice(0, selectedWordCount);
      reasonText = isVi 
        ? `Gợi ý ngẫu nhiên ${smartPick.length} từ vựng mới để mở rộng vốn từ hôm nay!` 
        : `Random smart recommendation of ${smartPick.length} words to expand your vocabulary!`;
    }

    setRecommendation({
      words: smartPick,
      reason: reasonText
    });
  };

  const handleApplyRecommendation = (startImmediately: boolean = false) => {
    if (!recommendation) return;
    const newSelected = new Set(recommendation.words.map(w => w.id));
    setSelectedWordIds(newSelected);
    if (startImmediately) {
      onStartStudyExplicit(recommendation.words, selectedMode, selectedDuration);
    }
    setRecommendation(null);
  };

  // Launch Study Session
  const handleLaunchSession = () => {
    const chosenWords = allWords.filter(w => selectedWordIds.has(w.id));
    if (chosenWords.length === 0) {
      alert(isVi ? 'Vui lòng chọn ít nhất 1 từ để bắt đầu phiên học!' : 'Please select at least 1 word to start study session!');
      return;
    }

    // Save preferences if opted in
    if (saveAsDefault) {
      const updatedPrefs: UserLearningPreferences = {
        preferredTopics: [sourceFilter],
        preferredDifficulty: 'all',
        preferredModes: [selectedMode],
        defaultCount: chosenWords.length,
        defaultDurationMinutes: selectedDuration
      };
      onUpdateUserData(prev => saveUserLearningPreferences(prev, updatedPrefs));
    }

    onStartStudyExplicit(chosenWords, selectedMode, selectedDuration);
  };

  const handleSpeech = (e: React.MouseEvent, word: VocabWord) => {
    e.stopPropagation();
    const isJa = activeLang.id === 'ja';
    const isZh = activeLang.id === 'zh';
    const voice = activeLang.speechVoiceCode || (isJa ? 'ja-JP' : isZh ? 'zh-CN' : 'en-US');
    const textToSpeak = isJa && word.furigana ? word.furigana : word.term;
    speakWord(textToSpeak, voice);
  };

  const selectedCount = selectedWordIds.size;
  const isChinese = activeLang.id === 'zh';
  const isJapanese = activeLang.id === 'ja';
  const foreignLangShort = isJapanese ? (isVi ? 'Nhật' : 'JA') : isChinese ? (isVi ? 'Trung' : 'ZH') : (isVi ? 'Anh' : 'EN');

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & FREEDOM PHILOSOPHY CALLOUT */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" />
                {isVi ? 'Phòng Tự Chọn Bài Học' : 'Personalized Learning Room'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                {isVi ? '100% Quyền Tự Chọn' : '100% User Choice'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isVi ? 'Học những gì bạn muốn, theo cách của bạn' : 'Study what you want, how you want'}
            </h3>
            <p className="text-xs sm:text-sm text-purple-100 font-medium">
              {isVi 
                ? 'Không ép buộc theo giáo trình cứng nhắc. Tự do tích chọn từng từ vựng, chủ đề, phương pháp và thời lượng học theo ý thích.' 
                : 'No forced linear curriculum. Freely select individual words, topics, study methods, and session duration to fit your pace.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSurpriseMe}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>{isVi ? '✨ Gợi ý thông minh cho tôi' : '✨ Surprise Me'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenUniversalSearch}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white font-bold text-xs rounded-2xl border border-white/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{isVi ? 'Tìm kiếm từ toàn năng' : 'Universal Search'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SMART RECOMMENDATION BANNER (SURPRISE ME RESULT) */}
      {recommendation && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 shadow-md space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl p-2 rounded-2xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 shrink-0">
                💡
              </span>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                  {isVi ? 'Gợi ý thông minh dành riêng cho bạn' : 'Smart Recommendation For You'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {recommendation.reason}
                </p>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {isVi ? 'Các từ được chọn:' : 'Selected words:'}
                  </span>
                  {recommendation.words.slice(0, 8).map(w => (
                    <span key={w.id} className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200">
                      {w.term}
                    </span>
                  ))}
                  {recommendation.words.length > 8 && (
                    <span className="text-xs font-bold text-slate-400">
                      +{recommendation.words.length - 8} {isVi ? 'từ khác' : 'more'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRecommendation(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 flex items-center gap-2 flex-wrap justify-end border-t border-amber-200 dark:border-amber-900/60">
            <button
              type="button"
              onClick={() => setRecommendation(null)}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition cursor-pointer"
            >
              {isVi ? 'Bỏ qua gợi ý' : 'Dismiss'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyRecommendation(false)}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer shadow-xs"
            >
              {isVi ? 'Tùy chỉnh danh sách này' : 'Customize This List'}
            </button>
            <button
              type="button"
              onClick={() => handleApplyRecommendation(true)}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isVi ? 'Bắt đầu học ngay' : 'Start Immediately'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. STEP-BY-STEP INTERACTIVE LESSON BUILDER (REQUIREMENT 134.14) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: SOURCE SELECTION & WORD PICKER CHECKLIST (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">

          {/* STEP 1: CHỌN NGUỒN TỪ & TIÊU CHÍ */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                <span>{isVi ? 'Nguồn từ vựng & Bộ lọc' : 'Vocabulary Source & Filter'}</span>
              </label>
              <span className="text-xs font-bold text-slate-400">
                {filteredWords.length} {isVi ? 'từ khả dụng' : 'available words'}
              </span>
            </div>

            {/* Source Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sourceFilter === 'all'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isVi ? 'Tất cả kho từ' : 'All Dictionaries'}
              </button>

              <button
                type="button"
                onClick={() => setSourceFilter('system')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sourceFilter === 'system'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isJapanese ? 'JLPT N5-N1' : isChinese ? 'HSK 1-6' : '3000 Oxford'}
              </button>

              <button
                type="button"
                onClick={() => setSourceFilter('personal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  sourceFilter === 'personal'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isVi ? 'Từ cá nhân tự thêm' : 'Personal Words'}
              </button>

              {collections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSourceFilter('collection')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    sourceFilter === 'collection'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isVi ? 'Bộ sưu tập' : 'Collections'} ({collections.length})
                </button>
              )}
            </div>

            {/* Collection Dropdown if sourceFilter is 'collection' */}
            {sourceFilter === 'collection' && (
              <div className="pt-1">
                <select
                  value={selectedColId}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">{isVi ? '-- Chọn bộ sưu tập --' : '-- Select collection --'}</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.icon || '📚'} {c.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status / Category Filters */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1">{isVi ? 'Trạng thái:' : 'Status:'}</span>
              {[
                { id: 'all', label: isVi ? 'Tất cả' : 'All' },
                { id: 'weak', label: isVi ? 'Từ đang yếu / Cần ôn' : 'Weak / Due' },
                { id: 'new', label: isVi ? 'Chưa học' : 'Unlearned' },
                { id: 'favorite', label: isVi ? 'Yêu thích ⭐' : 'Favorites ⭐' },
                { id: 'difficult', label: isVi ? 'Từ khó 💡' : 'Difficult 💡' },
                { id: 'reviewLater', label: isVi ? 'Cần ôn lại 📌' : 'Review Later 📌' },
                { id: 'queue', label: isVi ? `Hàng đợi (${learningQueueIds.length})` : `Queue (${learningQueueIds.length})` }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 ring-1 ring-purple-400'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Instant Search Bar */}
            <div className="relative pt-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Tìm nhanh theo từ, nghĩa, phát âm trong danh sách...' : 'Quick search by term, meaning, phonetic...'}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* STEP 2: DANH SÁCH TỪ TƯƠNG TÁC (INTERACTIVE CHECKLIST) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isVi ? 'Danh sách từ học (Tích chọn tự do)' : 'Word Checklist (Pick Freely)'}
                </h4>
              </div>

              {/* Master selection actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  {isVi ? 'Chọn tất cả' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  {isVi ? 'Bỏ chọn' : 'Deselect'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePickRandom(selectedWordCount)}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>{isVi ? `Chọn ngẫu nhiên ${selectedWordCount}` : `Random ${selectedWordCount}`}</span>
                </button>
              </div>
            </div>

            {/* Selected counter banner */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-extrabold text-violet-600 dark:text-violet-400">
                {isVi ? `Đã chọn: ${selectedCount} từ` : `Selected: ${selectedCount} words`}
              </span>
              <span className="text-slate-400">
                {filteredWords.length} {isVi ? 'từ hiển thị' : 'words shown'}
              </span>
            </div>

            {/* Word Checklist Scroll Area */}
            <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredWords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <p>{isVi ? 'Không tìm thấy từ vựng nào khớp với bộ lọc hiện tại.' : 'No vocabulary matching current filters.'}</p>
                  <button
                    type="button"
                    onClick={() => { setSourceFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg cursor-pointer"
                  >
                    {isVi ? 'Đặt lại bộ lọc' : 'Reset filters'}
                  </button>
                </div>
              ) : (
                filteredWords.map((word) => {
                  const isChecked = selectedWordIds.has(word.id);
                  const isWeak = word.lapses >= 1 || word.state === 'difficult';

                  return (
                    <div
                      key={word.id}
                      onClick={() => toggleSelectWord(word.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/30 ring-1 ring-violet-400/50 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
                      }`}
                    >
                      {/* Left: Checkbox + Term + Meaning */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSelectWord(word.id); }}
                          className="mt-0.5 text-violet-600 dark:text-violet-400 shrink-0 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 fill-violet-600 text-white" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                              {word.term}
                            </span>
                            {(word.phonetic || word.furigana || word.hanViet) && (
                              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">
                                [{word.furigana || word.phonetic || word.hanViet}]
                              </span>
                            )}
                            {word.partOfSpeech && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                {word.partOfSpeech}
                              </span>
                            )}
                            {isWeak && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                {isVi ? 'Hay quên' : 'Weak'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                            {word.meaning}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick actions (Speech, Favorite, Difficult, Detail) */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleSpeech(e, word)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                          title="Phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateUserData(prev => toggleUniversalFavorite(prev, word.id))}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            word.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 hover:text-amber-500'
                          }`}
                          title={isVi ? 'Yêu thích' : 'Favorite'}
                        >
                          <Star className={`w-4 h-4 ${word.isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateUserData(prev => toggleWordDifficult(prev, word.id))}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            word.isDifficult ? 'text-amber-500 font-bold' : 'text-slate-300 hover:text-amber-500'
                          }`}
                          title={isVi ? 'Đánh dấu từ khó 💡' : 'Mark difficult 💡'}
                        >
                          <Lightbulb className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenWordDetail(word)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 transition cursor-pointer"
                          title={isVi ? 'Xem chi tiết' : 'View details'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MODES, COUNT, DURATION, LAUNCH (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">

          {/* STEP 3: CHỌN HÌNH THỨC HỌC (REQUIREMENT 134.5) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isVi ? 'Phương pháp luyện tập' : 'Learning Mode'}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'flashcard',
                  icon: '🎴',
                  title: isVi ? `Flashcard: ${foreignLangShort} → Việt` : `Flashcard: ${foreignLangShort} → Target`,
                  desc: isVi ? 'Nhớ nghĩa trước khi lật đáp án (Active Recall)' : 'Recall meaning before flipping card'
                },
                {
                  id: 'flashcard_reverse',
                  icon: '🔄',
                  title: isVi ? `Flashcard đảo: Việt → ${foreignLangShort}` : `Reverse Flashcard: Target → ${foreignLangShort}`,
                  desc: isVi ? 'Nhìn nghĩa tiếng Việt, nhớ lại từ ngoại ngữ' : 'See meaning, produce foreign word'
                },
                {
                  id: 'quiz',
                  icon: '🎯',
                  title: isVi ? 'Trắc nghiệm 4 đáp án (Quiz)' : 'Multiple Choice Quiz',
                  desc: isVi ? 'Chọn 1 trong 4 đáp án đúng, rèn phản xạ nhanh' : 'Select from 4 options, test recognition'
                },
                {
                  id: 'spelling',
                  icon: '⌨️',
                  title: isVi ? 'Gõ chính tả & Viết từ (Spelling)' : 'Spelling & Typing Practice',
                  desc: isVi ? 'Nghe phát âm hoặc nhìn nghĩa rồi tự gõ chính xác' : 'Type exact word from audio or meaning'
                }
              ].map(mode => (
                <div
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id as StudyMode)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    selectedMode === mode.id
                      ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40 ring-1 ring-violet-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mode.icon}</span>
                    <div>
                      <h5 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                        {mode.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {mode.desc}
                      </p>
                    </div>
                  </div>
                  {selectedMode === mode.id && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-600 text-white shrink-0">
                      ✓ {isVi ? 'Chọn' : 'Active'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 4: THIẾT LẬP SỐ LƯỢNG & THỜI LƯỢNG (REQUIREMENT 134.6 & 134.7) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {isVi ? 'Số lượng & Thời gian học' : 'Quantity & Duration'}
              </h4>
            </div>

            {/* Word Count Selection (134.6) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                {isVi ? 'Số từ cho phiên học này:' : 'Words for this session:'}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[5, 10, 15, 20, 30, 50].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setSelectedWordCount(cnt);
                      setCustomCountInput('');
                      handlePickRandom(cnt);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      selectedWordCount === cnt && !customCountInput
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cnt} {isVi ? 'từ' : 'words'}
                  </button>
                ))}
              </div>

              {/* Custom Word Count Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">{isVi ? 'Hoặc nhập số tùy chỉnh:' : 'Or custom number:'}</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={customCountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCountInput(val);
                    const n = parseInt(val, 10);
                    if (!isNaN(n) && n > 0) {
                      setSelectedWordCount(n);
                      handlePickRandom(n);
                    }
                  }}
                  placeholder="Ví dụ: 7, 12, 25..."
                  className="w-28 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Duration Timer Selection (134.7) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isVi ? 'Thời lượng phiên học:' : 'Session duration:'}</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { mins: 5, label: isVi ? '5 phút' : '5m' },
                  { mins: 10, label: isVi ? '10 phút' : '10m' },
                  { mins: 15, label: isVi ? '15 phút' : '15m' },
                  { mins: 20, label: isVi ? '20 phút' : '20m' },
                  { mins: 30, label: isVi ? '30 phút' : '30m' },
                  { mins: 0, label: isVi ? 'Không giới hạn ∞' : 'Unlimited ∞' }
                ].map(dur => (
                  <button
                    key={dur.mins}
                    type="button"
                    onClick={() => setSelectedDuration(dur.mins)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      selectedDuration === dur.mins
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Save as default preference */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="saveDefaultPref"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 cursor-pointer"
              />
              <label htmlFor="saveDefaultPref" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                {isVi ? 'Lưu làm cấu hình mặc định cho các phiên sau' : 'Save as default settings for future sessions'}
              </label>
            </div>
          </div>

          {/* STEP 5: PROMINENT START BUTTON (REQUIREMENT 134.18) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <button
              type="button"
              onClick={handleLaunchSession}
              disabled={selectedCount === 0}
              className="w-full py-4 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-purple-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {isVi ? `Bắt đầu học ${selectedCount} từ đã chọn` : `Start Learning ${selectedCount} Selected Words`}
              </span>
            </button>

            {selectedCount === 0 && (
              <p className="text-center text-xs text-rose-500 font-bold">
                {isVi ? 'Hãy tích chọn ít nhất 1 từ ở danh sách bên trái để bắt đầu!' : 'Please check at least 1 word on the left to start!'}
              </p>
            )}

            {selectedCount > 0 && (
              <p className="text-center text-[11px] text-slate-400">
                {isVi 
                  ? `Phiên học sẽ chỉ học đúng ${selectedCount} từ bạn đã chọn, không bị ép học từ ngoài ý muốn.` 
                  : `Session will study only these ${selectedCount} chosen words. Zero forced curriculum.`}
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
