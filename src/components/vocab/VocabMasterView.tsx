import React, { useState, useMemo, useEffect } from 'react';
import { companionContextEngine } from '../../lib/companion/companionContextEngine';
import { 
  BarChart2, Calendar, Activity, BookOpen, Bookmark, Layers, 
  Brain, ShieldCheck, Settings, Plus, Headphones, Music, Sparkles, RotateCcw, X
} from 'lucide-react';
import {
  LearningLanguage,
  VocabCollection,
  VocabWord,
  VocabUserData,
  UserWordProgress,
  System3000Word,
  SystemChineseHskWord,
  SystemJapaneseJlptWord,
  loadVocabData,
  saveVocabData,
  calculateLanguageAnalytics,
  getInitialCollectionsAndWords,
  getSystem3000Words,
  systemWordToVocabWord,
  getSystemChineseWords,
  systemChineseWordToVocabWord,
  getSystemJapaneseWords,
  systemJapaneseWordToVocabWord,
  calculate3000Analytics,
  calculateChineseHskAnalytics,
  calculateJapaneseJlptAnalytics,
  calculateCombinedAnalytics,
  buildUnifiedStudyQueues,
  recordReviewOutcome,
  toggleBookmark3000Word,
  set3000WordState,
  save3000WordNotes,
  buildTodayStudyPlan,
  toggleWordDifficult
} from '../../lib/vocabEngine';

import { Oxford3000Tab } from './Oxford3000Tab';
import { ChineseHskTab } from './ChineseHskTab';
import { JapaneseJlptTab } from './JapaneseJlptTab';
import { PersonalVocabTab } from './PersonalVocabTab';
import { MyCollectionsTab } from './MyCollectionsTab';
import { WordDetailModal } from './WordDetailModal';
import { AddToCollectionModal } from './AddToCollectionModal';
import { VocabAuditTab } from './VocabAuditTab';
import { ChineseQualityControlView } from './chinese/ChineseQualityControlView';
import { JapaneseQualityControlView } from './japanese/JapaneseQualityControlView';
import { TodayStudyTab } from './TodayStudyTab';
import { MemoryDashboardTab } from './MemoryDashboardTab';
import { DedicatedVocabFocusView } from './DedicatedVocabFocusView';

import { StudySessionScreen } from './StudySessionScreen';
import { WordModal } from './WordModal';
import { NewCollectionModal } from './NewCollectionModal';
import { ImportExportModal } from './ImportExportModal';
import { LanguageOnboardingModal } from './LanguageOnboardingModal';
import { VocabSettingsTab } from './VocabSettingsTab';
import { VocabDashboardTab } from './VocabDashboardTab';
import { VocabStudyTab, StudyMode } from './VocabStudyTab';
import { PersonalizedLessonBuilder } from './PersonalizedLessonBuilder';
import { buildSmartShuffledSession, ShuffleMode } from '../../lib/smartShuffleEngine';
import { UniversalSearchModal } from './UniversalSearchModal';
import { useAppStore } from '../../lib/store';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { formatLocalDateKey } from '../../lib/utils';
import { saveVocabSessionState, loadVocabSessionState, clearVocabSessionState } from '../../lib/learningAutoSave';

interface VocabMasterViewProps {
  currentUser?: any;
}

type VocabTab = 'dashboard' | 'today' | 'focus' | 'memory' | 'oxford3000' | 'chineseHsk' | 'japaneseJlpt' | 'personal' | 'collections' | 'study' | 'audit' | 'settings';

export function VocabMasterView({ currentUser }: VocabMasterViewProps) {
  const userId = currentUser?.id || 'current_user';
  const { language } = useAppStore();
  const isVi = language === 'vi';

  // Persistence State
  const [vocabData, setVocabData] = useState<VocabUserData>(() => loadVocabData(userId));

  // Sync to localStorage
  const updateVocabData = (updater: (prev: VocabUserData) => VocabUserData) => {
    setVocabData(prev => {
      const next = updater(prev);
      saveVocabData(next);
      return next;
    });
  };

  const [activeTab, setActiveTab] = useState<VocabTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_vocab_active_tab') as any;
        if (saved && ['dashboard', 'today', 'focus', 'memory', 'oxford3000', 'chineseHsk', 'japaneseJlpt', 'personal', 'collections', 'study', 'audit', 'settings'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'today';
  });

  useEffect(() => {
    try {
      localStorage.setItem('lifeos_vocab_active_tab', activeTab);
    } catch {}
    companionContextEngine.setLiveContext({ viewId: 'study', activeTab });
  }, [activeTab]);

  // Modals & Selections
  const [showLanguageOnboarding, setShowLanguageOnboarding] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUniversalSearchModal, setShowUniversalSearchModal] = useState(false);
  const [studyDurationMinutes, setStudyDurationMinutes] = useState(15);

  // Detail Modal & Bookmark Modal
  const [detailWord, setDetailWord] = useState<VocabWord | null>(null);
  const [bookmarkingWordIds, setBookmarkingWordIds] = useState<string[]>([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  // Non-intrusive floating toast state & Undo word state
  const [vocabToast, setVocabToast] = useState<string | null>(null);
  const [undoWord, setUndoWord] = useState<{ langId: string; word: VocabWord } | null>(null);
  const undoWordTimeoutRef = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      if (undoWordTimeoutRef.current) clearTimeout(undoWordTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!vocabToast) return;
    const t = setTimeout(() => setVocabToast(null), 4000);
    return () => clearTimeout(t);
  }, [vocabToast]);

  const isAnyVocabModalOpen = !!(
    showLanguageOnboarding ||
    showWordModal ||
    showNewCollectionModal ||
    showImportModal ||
    showUniversalSearchModal ||
    showBookmarkModal ||
    detailWord
  );
  useBodyScrollLock(isAnyVocabModalOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (detailWord) setDetailWord(null);
        else if (showBookmarkModal) setShowBookmarkModal(false);
        else if (showUniversalSearchModal) setShowUniversalSearchModal(false);
        else if (showWordModal) { setShowWordModal(false); setEditingWord(null); }
        else if (showNewCollectionModal) setShowNewCollectionModal(false);
        else if (showImportModal) setShowImportModal(false);
        else if (showLanguageOnboarding) setShowLanguageOnboarding(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailWord, showBookmarkModal, showUniversalSearchModal, showWordModal, showNewCollectionModal, showImportModal, showLanguageOnboarding]);

  // Active Language Workspace
  const activeLang = useMemo(() => {
    return (vocabData?.languages || []).find(l => l.id === vocabData?.activeLanguageId) || vocabData?.languages?.[0] || {
      id: 'en',
      name: 'Tiếng Anh',
      originalName: 'English',
      flag: '🇬🇧',
      code: 'en',
      speechVoiceCode: 'en-US',
      level: 'intermediate',
      dailyNewWordTarget: 10,
      dailyReviewTarget: 30,
      explanationLanguage: 'vi',
      createdAt: new Date().toISOString()
    };
  }, [vocabData?.languages, vocabData?.activeLanguageId]);

  const langCollections: VocabCollection[] = useMemo(() => {
    return (vocabData?.collections && activeLang && vocabData.collections[activeLang.id]) || [];
  }, [vocabData?.collections, activeLang?.id]);

  const langWords: VocabWord[] = useMemo(() => {
    return (vocabData?.words && activeLang && vocabData.words[activeLang.id]) || [];
  }, [vocabData?.words, activeLang?.id]);

  // System 3000 words extracted from official DOCX
  const system3000Words: System3000Word[] = useMemo(() => {
    return getSystem3000Words() || [];
  }, []);

  const progress3000 = useMemo(() => {
    return vocabData?.system3000Progress || {};
  }, [vocabData?.system3000Progress]);

  // System Chinese HSK words (10,240 words)
  const systemChineseWords: SystemChineseHskWord[] = useMemo(() => {
    return getSystemChineseWords() || [];
  }, []);

  const progressChinese = useMemo(() => {
    return vocabData?.systemChineseHskProgress || {};
  }, [vocabData?.systemChineseHskProgress]);

  // System Japanese JLPT words (7,847 words)
  const systemJapaneseWords: SystemJapaneseJlptWord[] = useMemo(() => {
    return getSystemJapaneseWords() || [];
  }, []);

  const progressJapanese = useMemo(() => {
    return vocabData?.systemJapaneseJlptProgress || {};
  }, [vocabData?.systemJapaneseJlptProgress]);

  // Combined Analytics
  const combinedAnalytics = useMemo(() => {
    if (activeLang?.id === 'en') {
      return calculateCombinedAnalytics(langWords, progress3000, 'en');
    }
    if (activeLang?.id === 'zh') {
      return calculateCombinedAnalytics(langWords, progressChinese, 'zh');
    }
    if (activeLang?.id === 'ja') {
      return calculateCombinedAnalytics(langWords, progressJapanese, 'ja');
    }
    return calculateLanguageAnalytics(langWords);
  }, [activeLang?.id, langWords, progress3000, progressChinese, progressJapanese]);

  // Analytics specifically for 3000
  const analytics3000 = useMemo(() => {
    return calculate3000Analytics(progress3000);
  }, [progress3000]);

  // Analytics specifically for Chinese HSK
  const analyticsChineseHsk = useMemo(() => {
    return calculateChineseHskAnalytics(progressChinese);
  }, [progressChinese]);

  // Analytics specifically for Japanese JLPT
  const analyticsJapaneseJlpt = useMemo(() => {
    return calculateJapaneseJlptAnalytics(progressJapanese);
  }, [progressJapanese]);

  // Analytics specifically for personal words
  const personalAnalytics = useMemo(() => {
    return calculateLanguageAnalytics(langWords);
  }, [langWords]);

  // Unified Pool of all available words for active language
  const allCombinedWords: VocabWord[] = useMemo(() => {
    const list: VocabWord[] = [...(langWords || [])];
    if (activeLang?.id === 'en') {
      list.push(...(system3000Words || []).map(w => systemWordToVocabWord(w, progress3000?.[w.id])));
    } else if (activeLang?.id === 'zh') {
      list.push(...(systemChineseWords || []).map(w => systemChineseWordToVocabWord(w, progressChinese?.[w.id])));
    } else if (activeLang?.id === 'ja') {
      list.push(...(systemJapaneseWords || []).map(w => systemJapaneseWordToVocabWord(w, progressJapanese?.[w.id])));
    }
    return list;
  }, [langWords, activeLang?.id, system3000Words, progress3000, systemChineseWords, progressChinese, systemJapaneseWords, progressJapanese]);

  // Today's Study Plan computed dynamically
  const todayStudyPlan = useMemo(() => {
    return buildTodayStudyPlan(
      allCombinedWords, 
      activeLang.dailyNewWordTarget || 10, 
      activeLang.dailyReviewTarget || 30
    );
  }, [allCombinedWords, activeLang.dailyNewWordTarget, activeLang.dailyReviewTarget]);

  // Study Session States
  const [studySessionActive, setStudySessionActive] = useState(false);
  const [studySource, setStudySource] = useState<'3000' | 'personal' | 'all'>('3000');
  const [studyTargetQueue, setStudyTargetQueue] = useState<'due' | 'difficult' | 'new' | 'all'>('due');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('smart_review');
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [studyQueue, setStudyQueue] = useState<VocabWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [useDedicatedFocusMode, setUseDedicatedFocusMode] = useState<boolean>(false);
  const [sessionStats, setSessionStats] = useState<{ reviewed: number; passed: number; again: number }>({
    reviewed: 0,
    passed: 0,
    again: 0
  });

  // Quiz / Spelling States
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingChecked, setSpellingChecked] = useState(false);
  const [completedBatchIndices, setCompletedBatchIndices] = useState<number[]>([]);
  const [completedBatchesStats, setCompletedBatchesStats] = useState<Record<number, { accuracy: number; total: number }>>({});
  const [currentActiveBatchIndex, setCurrentActiveBatchIndex] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // AUTO-SAVE & INSTANT RECOVERY ENGINE: Zero data loss across F5 or reloads
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const saved = loadVocabSessionState();
    if (saved && saved.studySessionActive && Array.isArray(saved.studyQueue) && saved.studyQueue.length > 0) {
      setStudySessionActive(true);
      setStudyQueue(saved.studyQueue);
      setCurrentCardIndex(saved.currentCardIndex || 0);
      setStudyMode((saved.studyMode as StudyMode) || 'flashcard');
      setIsAnswerRevealed(saved.isAnswerRevealed || false);
      if (saved.sessionStats) setSessionStats(saved.sessionStats);
      if (saved.spellingInput) setSpellingInput(saved.spellingInput);
      if (saved.quizSelectedOption) setQuizSelectedOption(saved.quizSelectedOption);
      console.log('✅ [AutoSave] Khôi phục thành công phiên học từ vựng dở dang tại thẻ #', (saved.currentCardIndex || 0) + 1);
    }
  }, []);

  useEffect(() => {
    if (studySessionActive && studyQueue.length > 0 && !sessionCompleted) {
      saveVocabSessionState({
        studySessionActive: true,
        studyQueue,
        currentCardIndex,
        studyMode,
        isAnswerRevealed,
        sessionStats,
        spellingInput,
        quizSelectedOption,
        activeLangId: activeLang?.id,
        savedAt: Date.now()
      });
    } else if (!studySessionActive || sessionCompleted) {
      clearVocabSessionState();
    }
  }, [studySessionActive, studyQueue, currentCardIndex, studyMode, isAnswerRevealed, sessionStats, spellingInput, quizSelectedOption, sessionCompleted, activeLang?.id]);

  // Switch Language Workspace
  const handleSwitchLanguage = (langId: string) => {
    updateVocabData(prev => ({
      ...prev,
      activeLanguageId: langId
    }));
    setSelectedCollectionId('all');
    setStudySessionActive(false);

    if (langId === 'ja' && (activeTab === 'oxford3000' || activeTab === 'chineseHsk')) {
      setActiveTab('japaneseJlpt');
    } else if (langId === 'zh' && (activeTab === 'oxford3000' || activeTab === 'japaneseJlpt')) {
      setActiveTab('chineseHsk');
    } else if (langId === 'en' && (activeTab === 'chineseHsk' || activeTab === 'japaneseJlpt')) {
      setActiveTab('oxford3000');
    }
  };

  // Add Language
  const handleAddLanguage = (newLang: LearningLanguage) => {
    updateVocabData(prev => {
      const existing = prev.languages.some(l => l.id === newLang.id);
      if (existing) return { ...prev, activeLanguageId: newLang.id };

      const starter = getInitialCollectionsAndWords(newLang.id);

      return {
        ...prev,
        activeLanguageId: newLang.id,
        languages: [...prev.languages, newLang],
        collections: {
          ...prev.collections,
          [newLang.id]: starter.collections
        },
        words: {
          ...prev.words,
          [newLang.id]: starter.words
        }
      };
    });
    setShowLanguageOnboarding(false);
  };

  // Launch Study Session with custom or calculated queue
  const handleStartStudy = (
    mode: StudyMode = 'flashcard',
    source: '3000' | 'personal' | 'all' = '3000',
    targetQueue: 'due' | 'difficult' | 'new' | 'all' = 'due',
    maxCards: number = 20,
    customShuffleMode?: ShuffleMode
  ) => {
    const activeProgress = activeLang.id === 'zh' ? progressChinese : activeLang.id === 'ja' ? progressJapanese : progress3000;
    const unifiedQueues = buildUnifiedStudyQueues(langWords, activeProgress, source, selectedCollectionId, activeLang.id);
    let pool: VocabWord[] = [];

    if (targetQueue === 'due') {
      pool = unifiedQueues.dueWords.length > 0 ? unifiedQueues.dueWords : unifiedQueues.allWords;
    } else if (targetQueue === 'difficult') {
      pool = unifiedQueues.difficultWords.length > 0 ? unifiedQueues.difficultWords : unifiedQueues.allWords;
    } else if (targetQueue === 'new') {
      pool = unifiedQueues.newWords.length > 0 ? unifiedQueues.newWords : unifiedQueues.allWords;
    } else {
      pool = unifiedQueues.allWords;
    }

    if (pool.length === 0) {
      setVocabToast('Chưa có từ vựng nào trong danh sách được chọn.');
      return;
    }

    // If pool has fewer cards than requested maxCards, backfill from allWords so session length matches user choice
    if (pool.length < maxCards && Array.isArray(unifiedQueues.allWords)) {
      const poolIds = new Set(pool.map(w => w.id));
      for (const w of unifiedQueues.allWords) {
        if (!poolIds.has(w.id)) {
          pool.push(w);
          if (pool.length >= maxCards) break;
        }
      }
    }

    // Smart Random Shuffle with memory-urgency weighting and anti-repetition
    const effectiveShuffleMode: ShuffleMode = customShuffleMode || (
      targetQueue === 'new' ? 'new_words' :
      targetQueue === 'difficult' ? 'mistakes' :
      shuffleMode
    );
    setShuffleMode(effectiveShuffleMode);

    const shuffled = buildSmartShuffledSession(pool, {
      mode: effectiveShuffleMode,
      maxCards,
      todayIso: new Date().toISOString().split('T')[0]
    });

    setStudyQueue(shuffled);
    setStudyMode(mode);
    setStudySource(source);
    setStudyTargetQueue(targetQueue);
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setSessionCompleted(false);
    setQuizSelectedOption(null);
    setSpellingInput('');
    setSpellingChecked(false);
    setSessionStats({ reviewed: 0, passed: 0, again: 0 });
    setStudySessionActive(true);
  };

  const handleStartStudyExplicit = (
    wordsToStudy: VocabWord[], 
    mode: StudyMode = 'flashcard', 
    durationMinutes?: number,
    customShuffleMode?: ShuffleMode
  ) => {
    if (!wordsToStudy || wordsToStudy.length === 0) {
      setVocabToast(isVi ? 'Danh sách từ trống.' : 'Word list is empty.');
      return;
    }
    if (durationMinutes !== undefined) {
      setStudyDurationMinutes(durationMinutes);
    }
    const effectiveShuffle = customShuffleMode || shuffleMode;
    if (customShuffleMode) {
      setShuffleMode(customShuffleMode);
    }

    // Always shuffle incoming word lists via Smart Random Engine (Never DB/Alphabetical order)
    const shuffled = buildSmartShuffledSession(wordsToStudy, {
      mode: effectiveShuffle,
      todayIso: new Date().toISOString().split('T')[0]
    });

    setStudyQueue(shuffled);
    setStudyMode(mode);
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setSessionCompleted(false);
    setQuizSelectedOption(null);
    setSpellingInput('');
    setSpellingChecked(false);
    setSessionStats({ reviewed: 0, passed: 0, again: 0 });
    setStudySessionActive(true);
  };

  const handleReshuffleSession = (newMode?: ShuffleMode) => {
    if (!studyQueue || studyQueue.length === 0) return;
    const modeToUse = newMode || shuffleMode;
    if (newMode) setShuffleMode(newMode);

    // Keep reviewed cards, re-shuffle remaining cards using requested mode with anti-repetition
    const reviewed = studyQueue.slice(0, currentCardIndex);
    const unreviewed = studyQueue.slice(currentCardIndex);

    const freshShuffled = buildSmartShuffledSession(unreviewed, {
      mode: modeToUse,
      todayIso: new Date().toISOString().split('T')[0]
    });

    setStudyQueue([...reviewed, ...freshShuffled]);
    setVocabToast(isVi ? `Đã xáo trộn lại ${freshShuffled.length} từ còn lại theo cơ chế ${modeToUse}!` : `Reshuffled remaining ${freshShuffled.length} words!`);
  };

  // Grade Card with SM-2 Spaced Repetition Algorithm
  const handleRateReview = (rating: 1 | 2 | 3 | 4) => {
    const currentWord = studyQueue[currentCardIndex];
    if (!currentWord) return;

    updateVocabData(prev => recordReviewOutcome(prev, currentWord.id, rating, studyMode));

    // Sync to PostgreSQL backend
    fetch('/api/vocab/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordId: currentWord.id,
        languageId: activeLang.id,
        term: currentWord.term,
        meaning: currentWord.meaning,
        phonetic: currentWord.phonetic,
        partOfSpeech: currentWord.partOfSpeech,
        exerciseType: studyMode,
        rating,
        isCorrect: rating >= 3
      })
    }).catch(err => console.warn('Vocab review backend sync warning:', err));

    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      passed: rating >= 3 ? prev.passed + 1 : prev.passed,
      again: rating < 3 ? prev.again + 1 : prev.again
    }));

    // QUY TẮC CỐT LÕI: "Sai phải học lại trong phiên"
    // Nếu bấm Chưa thuộc hoặc làm sai trắc nghiệm/chính tả -> Hệ thống TỰ ĐỘNG đưa từ đó về CUỐI hàng đợi của phiên học!
    if (rating < 3) {
      setStudyQueue(prev => [...prev, currentWord]);
    }

    if (currentCardIndex + 1 < studyQueue.length || rating < 3) {
      setCurrentCardIndex(prev => prev + 1);
      setIsAnswerRevealed(false);
      setQuizSelectedOption(null);
      setSpellingInput('');
      setSpellingChecked(false);
    } else {
      setSessionCompleted(true);
      setCompletedBatchIndices(prev => Array.from(new Set([...prev, currentActiveBatchIndex])));
      const reviewed = sessionStats.reviewed + 1;
      const passed = rating >= 3 ? sessionStats.passed + 1 : sessionStats.passed;
      const accuracy = reviewed > 0 ? Math.round((passed / reviewed) * 100) : 100;
      setCompletedBatchesStats(prev => ({
        ...prev,
        [currentActiveBatchIndex]: { accuracy, total: reviewed }
      }));

      // Cộng phút học vào User profile & Feature Analytics
      const estimatedMinutes = Math.max(1, Math.round(reviewed * 0.5));
      fetch('/api/admin/feature-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'vocab_master',
          action: 'complete_session',
          mode: studyMode,
          cardCount: reviewed,
          accuracy,
          minutes: estimatedMinutes
        })
      }).catch(() => {});
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex + 1 < studyQueue.length) {
      setCurrentCardIndex(prev => prev + 1);
      setIsAnswerRevealed(false);
      setQuizSelectedOption(null);
      setSpellingInput('');
      setSpellingChecked(false);
    } else {
      setSessionCompleted(true);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsAnswerRevealed(false);
      setQuizSelectedOption(null);
      setSpellingInput('');
      setSpellingChecked(false);
    }
  };

  const handleSelectQuizOption = (option: string) => {
    setQuizSelectedOption(option);
    setIsAnswerRevealed(true);
  };

  const handleCheckSpelling = () => {
    setSpellingChecked(true);
    setIsAnswerRevealed(true);
  };

  const handleSaveWord = (wordData: Partial<VocabWord>) => {
    const today = formatLocalDateKey(new Date());

    updateVocabData(prev => {
      const currentList = prev.words[activeLang.id] || [];

      if (editingWord) {
        return {
          ...prev,
          words: {
            ...prev.words,
            [activeLang.id]: currentList.map(w => 
              w.id === editingWord.id 
                ? { ...w, ...wordData, updatedAt: new Date().toISOString() } 
                : w
            )
          }
        };
      }

      const newWord: VocabWord = {
        id: 'word_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        languageId: activeLang.id,
        collectionId: wordData.collectionId || langCollections[0]?.id || 'default_col',
        term: wordData.term || '',
        phonetic: wordData.phonetic,
        partOfSpeech: wordData.partOfSpeech || 'noun',
        meaning: wordData.meaning || '',
        exampleSentence: wordData.exampleSentence,
        exampleTranslation: wordData.exampleTranslation,
        collocations: wordData.collocations || [],
        synonyms: wordData.synonyms || [],
        antonyms: wordData.antonyms || [],
        mnemonic: wordData.mnemonic,
        notes: wordData.notes,
        state: 'new',
        repetitionCount: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        nextReviewAt: today,
        reviewLogs: [],
        lapses: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        ...prev,
        words: {
          ...prev.words,
          [activeLang.id]: [newWord, ...currentList]
        }
      };
    });

    setShowWordModal(false);
    setEditingWord(null);
  };

  const handleDeleteWord = (wordId: string) => {
    const target = (langWords || []).find(w => w.id === wordId);
    if (!target) return;
    if (undoWordTimeoutRef.current) clearTimeout(undoWordTimeoutRef.current);
    setUndoWord({ langId: activeLang.id, word: target });

    updateVocabData(prev => ({
      ...prev,
      words: {
        ...prev.words,
        [activeLang.id]: (prev.words[activeLang.id] || []).filter(w => w.id !== wordId)
      }
    }));

    undoWordTimeoutRef.current = setTimeout(() => {
      setUndoWord(null);
    }, 5000);
  };

  const handleRestoreWord = () => {
    if (!undoWord) return;
    if (undoWordTimeoutRef.current) clearTimeout(undoWordTimeoutRef.current);
    updateVocabData(prev => ({
      ...prev,
      words: {
        ...prev.words,
        [undoWord.langId]: [undoWord.word, ...(prev.words[undoWord.langId] || [])]
      }
    }));
    setUndoWord(null);
    setVocabToast('Đã khôi phục từ vựng!');
  };

  const handleToggleFavorite = (wordId: string) => {
    updateVocabData(prev => ({
      ...prev,
      words: {
        ...prev.words,
        [activeLang.id]: (prev.words[activeLang.id] || []).map(w => {
          if (w.id === wordId) {
            return { ...w, isFavorite: !w.isFavorite };
          }
          return w;
        })
      }
    }));
  };

  const handleSaveCollection = (colData: Partial<VocabCollection>) => {
    const newCol: VocabCollection = {
      id: 'col_' + Date.now(),
      languageId: activeLang.id,
      title: colData.title || 'Bộ từ mới',
      description: colData.description,
      icon: colData.icon || '📚',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateVocabData(prev => ({
      ...prev,
      collections: {
        ...prev.collections,
        [activeLang.id]: [...(prev.collections[activeLang.id] || []), newCol]
      }
    }));

    setShowNewCollectionModal(false);
  };

  const handleDeleteCollection = (colId: string) => {
    updateVocabData(prev => {
      const remainingCols = (prev.collections[activeLang.id] || []).filter(c => c.id !== colId);
      const targetColId = remainingCols[0]?.id || 'default_col';

      return {
        ...prev,
        collections: {
          ...prev.collections,
          [activeLang.id]: remainingCols
        },
        words: {
          ...prev.words,
          [activeLang.id]: (prev.words[activeLang.id] || []).map(w => 
            w.collectionId === colId ? { ...w, collectionId: targetColId } : w
          )
        }
      };
    });
    setVocabToast('Đã xóa bộ sưu tập. Các từ vựng đã được gom về nhóm mặc định.');
  };

  const handleSaveBookmark3000 = (collectionId: string) => {
    updateVocabData(prev => {
      let next = prev;
      for (const wId of bookmarkingWordIds) {
        next = toggleBookmark3000Word(next, wId, collectionId);
      }
      return next;
    });
    setVocabToast(`🎉 Đã lưu ${bookmarkingWordIds.length} từ vào bộ sưu tập cá nhân thành công!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] sm:pb-12 overflow-x-hidden">
      
      {/* 1. TOP HEADER & WORKSPACE SWITCHER */}
      <div className="bg-white dark:bg-[#141E30] rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            {activeLang.flag}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Vocabulary Master
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {activeLang.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              {isVi 
                ? 'Hệ thống học từ vựng thông minh, đa nguồn & Spaced Repetition (SM-2) cá nhân hóa' 
                : 'Intelligent, multi-source vocabulary engine & personalized Spaced Repetition (SM-2)'}
            </p>
          </div>
        </div>

        {/* Language selector & quick actions */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Universal Search Quick Button */}
          <button
            type="button"
            onClick={() => setShowUniversalSearchModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 shadow-2xs"
            title={isVi ? 'Tìm kiếm từ vựng toàn năng' : 'Universal Vocabulary Search'}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{isVi ? 'Tra từ' : 'Search'}</span>
          </button>

          {(vocabData?.languages || []).map(lang => (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleSwitchLanguage(lang.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                lang.id === activeLang?.id
                  ? 'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                  : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowLanguageOnboarding(true)}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title={isVi ? 'Thêm ngôn ngữ học mới' : 'Add new learning language'}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS (SCIENTIFIC & CLEAN SEGMENTED CONTROL) */}
      <div className="bg-slate-100/90 dark:bg-[#141E30]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#E2E8F0] dark:border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs touch-pan-x overscroll-x-contain py-1">
        
        {/* GROUP 1: HỌC TẬP & LUYỆN TẬP (STUDY & PRACTICE) */}
        
        {/* Personalized Learning Room Tab (Featured Requirement 134) */}
        <button
          type="button"
          onClick={() => { setActiveTab('study'); setStudySessionActive(false); }}
          className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'study' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Brain className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isVi ? 'Tự chọn bài học' : 'Custom Lesson'}</span>
          {combinedAnalytics.dueTodayCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold">
              {combinedAnalytics.dueTodayCount}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Today's Study Plan Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('today'); setStudySessionActive(false); }}
          className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'today' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{isVi ? 'Học hôm nay' : "Today's Study"}</span>
          {todayStudyPlan.totalToStudy > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
              {todayStudyPlan.totalToStudy}
            </span>
          )}
        </button>

        {/* Dedicated Vocab Focus Room Tab with YouTube Music */}
        <button
          type="button"
          onClick={() => { setActiveTab('focus'); setStudySessionActive(false); }}
          className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'focus' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Headphones className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{isVi ? 'Phòng Focus + Nhạc' : 'Focus + Music'}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-0.5">
            <Music className="w-2.5 h-2.5" /> YT
          </span>
        </button>

        {/* Memory & Forgetting Curve Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('memory'); setStudySessionActive(false); }}
          className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'memory' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{isVi ? 'Đường cong trí nhớ' : 'Memory Curve'}</span>
        </button>

        {/* DIVIDER 1 */}
        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* GROUP 2: KHO TỪ VỰNG & BỘ SƯU TẬP (DICTIONARIES & SETS) */}

        {/* Standard Language Dictionary (Oxford 3000 / HSK 1-6 / JLPT N5-N1) */}
        {activeLang.id === 'en' && (
          <button
            type="button"
            onClick={() => { setActiveTab('oxford3000'); setStudySessionActive(false); }}
            className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'oxford3000' && !studySessionActive
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Oxford 3000</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              3,522
            </span>
          </button>
        )}

        {activeLang.id === 'zh' && (
          <button
            type="button"
            onClick={() => { setActiveTab('chineseHsk'); setStudySessionActive(false); }}
            className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'chineseHsk' && !studySessionActive
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-rose-500 shrink-0" />
            <span>HSK 1-6</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              10,240
            </span>
          </button>
        )}

        {activeLang.id === 'ja' && (
          <button
            type="button"
            onClick={() => { setActiveTab('japaneseJlpt'); setStudySessionActive(false); }}
            className={`h-9 px-3.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'japaneseJlpt' && !studySessionActive
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>JLPT N5-N1</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              7,847
            </span>
          </button>
        )}

        {/* Personal Vocabulary Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('personal'); setStudySessionActive(false); }}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'personal' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-200/80 dark:border-purple-800/60 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Bookmark className="w-4 h-4 text-pink-500 shrink-0" />
          <span>{isVi ? 'Từ của tôi' : 'My Words'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-slate-700 text-purple-700 dark:text-purple-300">
            {langWords.length}
          </span>
        </button>

        {/* Collections Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('collections'); setStudySessionActive(false); }}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'collections' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-200/80 dark:border-purple-800/60 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4 text-violet-500 shrink-0" />
          <span>{isVi ? 'Bộ sưu tập' : 'Collections'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-slate-700 text-purple-700 dark:text-purple-300">
            {langCollections.length}
          </span>
        </button>

        {/* DIVIDER 2 */}
        <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* GROUP 3: TỔNG QUAN & HỆ THỐNG (INSIGHTS & SYSTEM) */}

        {/* Dashboard Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('dashboard'); setStudySessionActive(false); }}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dashboard' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-200/80 dark:border-purple-800/60 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-teal-500 shrink-0" />
          <span>{isVi ? 'Tổng quan' : 'Overview'}</span>
        </button>

        {/* Quality Audit & Verification Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('audit'); setStudySessionActive(false); }}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-200/80 dark:border-emerald-800/60 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{isVi ? 'Kiểm định' : 'Audit'}</span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('settings'); setStudySessionActive(false); }}
          className={`h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'settings' && !studySessionActive
              ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs border border-blue-200/80 dark:border-blue-800/60 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{isVi ? 'Cài đặt' : 'Settings'}</span>
        </button>
      </div>

      {/* 3. MAIN CONTENT BODY */}

      {/* ACTIVE STUDY SESSION RUNNER: DEDICATED FOCUS MODE OR STANDARD STUDY SESSION */}
      {studySessionActive && (
        useDedicatedFocusMode ? (
          <DedicatedVocabFocusView
            topicTitle={`Phiên học: ${activeLang.name} (${studyQueue.length} từ)`}
            words={studyQueue}
            activeLang={activeLang}
            onExit={() => setStudySessionActive(false)}
            onUpdateWordProgress={(wordId, rating) => {
              updateVocabData(prev => recordReviewOutcome(prev, wordId, rating, studyMode));
            }}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <StudySessionScreen
            activeLang={activeLang}
            words={studyQueue}
            currentIndex={currentCardIndex}
            mode={studyMode}
            shuffleMode={shuffleMode}
            onShuffleModeChange={(mode) => setShuffleMode(mode)}
            onReshuffleSession={handleReshuffleSession}
            isRevealed={isAnswerRevealed}
            isCompleted={sessionCompleted}
            stats={sessionStats}
            quizSelectedOption={quizSelectedOption}
            spellingInput={spellingInput}
            spellingChecked={spellingChecked}
            distractorPool={allCombinedWords}
            durationMinutes={studyDurationMinutes}
            onReveal={() => setIsAnswerRevealed(true)}
            onRate={handleRateReview}
            onNextCard={handleNextCard}
            onPrevCard={handlePrevCard}
            onSelectQuizOption={handleSelectQuizOption}
            onSpellingChange={setSpellingInput}
            onCheckSpelling={handleCheckSpelling}
            onExitSession={() => {
              clearVocabSessionState();
              setStudySessionActive(false);
            }}
            onRestartSession={() => handleStartStudy(studyMode, studySource, studyTargetQueue)}
            onToggleFavorite={handleToggleFavorite}
            onToggleDifficult={(wordId) => updateVocabData(prev => toggleWordDifficult(prev, wordId))}
            onSkipWord={handleNextCard}
            onRemoveWordFromSession={(wordId) => setStudyQueue(prev => prev.filter(w => w.id !== wordId))}
            onReviewMistakes={(mistakeWords) => handleStartStudyExplicit(mistakeWords, studyMode)}
            onEndSessionEarly={() => setSessionCompleted(true)}
          />
        )
      )}

      {/* TAB A: DASHBOARD */}
      {!studySessionActive && activeTab === 'dashboard' && (
        <VocabDashboardTab
          activeLang={activeLang}
          system3000Words={system3000Words}
          systemChineseWords={systemChineseWords}
          systemJapaneseWords={systemJapaneseWords}
          analytics3000={analytics3000}
          analyticsChineseHsk={analyticsChineseHsk}
          analyticsJapaneseJlpt={analyticsJapaneseJlpt}
          langWords={langWords}
          personalAnalytics={personalAnalytics}
          langCollections={langCollections}
          combinedAnalytics={combinedAnalytics}
          onStartStudy={handleStartStudy}
          onOpenAddWordModal={() => {
            setEditingWord(null);
            setShowWordModal(true);
          }}
          onNavigateTab={tab => setActiveTab(tab)}
        />
      )}

      {/* TAB A.1: TODAY'S STUDY PLAN */}
      {!studySessionActive && activeTab === 'today' && (
        <TodayStudyTab
          activeLang={activeLang}
          allWords={allCombinedWords}
          completedBatchIndices={completedBatchIndices}
          completedBatchesStats={completedBatchesStats}
          onStartStudyBatch={(words, mode, shuffle) => {
            setCurrentActiveBatchIndex(0);
            handleStartStudyExplicit(words, mode, undefined, shuffle);
          }}
          onOpenWordDetail={(word) => setDetailWord(word)}
          onLookupWord={() => setShowUniversalSearchModal(true)}
          onShareToCommunity={(stats) => {
            fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `🏆 Tôi vừa nâng cấp Tháp Trí Nhớ trên Vocabulary Master! Đạt ${stats?.level5_mastered || 0} từ thành thạo (Tầng 5). Cùng học và nhận thưởng nhé!`,
                category: 'achievement'
              })
            }).then(() => {
              setVocabToast('Đã đăng thành tích lên Cộng đồng thành công!');
            }).catch(() => {});
          }}
        />
      )}

      {/* TAB A.2: DEDICATED VOCAB FOCUS ROOM WITH YOUTUBE MUSIC */}
      {!studySessionActive && activeTab === 'focus' && (
        <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-2xl min-h-[600px] flex flex-col">
          <DedicatedVocabFocusView
            topicTitle={`Phòng Học Focus: ${activeLang.name} (${(todayStudyPlan.totalToStudy > 0 ? todayStudyPlan.dueTodayWords : allCombinedWords).slice(0, 20).length} từ)`}
            words={(todayStudyPlan.totalToStudy > 0 && todayStudyPlan.dueTodayWords.length > 0 
              ? todayStudyPlan.dueTodayWords 
              : allCombinedWords
            ).slice(0, 20)}
            activeLang={activeLang}
            onExit={() => setActiveTab('today')}
            onUpdateWordProgress={(wordId, rating) => {
              updateVocabData(prev => recordReviewOutcome(prev, wordId, rating, 'flashcard'));
            }}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
      )}

      {/* TAB A.2: MEMORY DASHBOARD & FORGETTING CURVE */}
      {!studySessionActive && activeTab === 'memory' && (
        <MemoryDashboardTab
          activeLang={activeLang}
          allWords={allCombinedWords}
          onStartStudyWords={(words, mode) => handleStartStudyExplicit(words, mode || 'flashcard')}
          onOpenWordDetail={(word) => setDetailWord(word)}
        />
      )}

      {/* TAB B: 3000 WORDS (FOR ENGLISH) */}
      {!studySessionActive && activeTab === 'oxford3000' && (
        <Oxford3000Tab
          systemWords={system3000Words}
          progressMap={progress3000}
          collections={langCollections}
          onOpenWordDetail={(word) => setDetailWord(word)}
          onOpenAddToCollection={(wordIds) => {
            setBookmarkingWordIds(wordIds);
            setShowBookmarkModal(true);
          }}
          onStartStudyWords={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onQuickMarkState={(wordId, state) => updateVocabData(prev => set3000WordState(prev, wordId, state))}
        />
      )}

      {/* TAB B.1: CHINESE HSK VOCABULARY (10,240 WORDS FOR CHINESE) */}
      {!studySessionActive && activeLang.id === 'zh' && activeTab === 'chineseHsk' && (
        <ChineseHskTab
          systemWords={systemChineseWords}
          progressMap={progressChinese}
          collections={langCollections}
          userData={vocabData}
          onUpdateUserData={updateVocabData}
          onOpenWordDetail={(word) => setDetailWord(word)}
          onOpenAddToCollection={(wordIds) => {
            setBookmarkingWordIds(wordIds);
            setShowBookmarkModal(true);
          }}
          onStartStudyWords={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onQuickMarkState={(wordId, state) => {
            updateVocabData(prev => {
              const currentHskProgress = prev.systemChineseHskProgress || {};
              const existing: UserWordProgress = currentHskProgress[wordId] || {
                wordId,
                state: 'new' as const,
                repetitionCount: 0,
                easeFactor: 2.5,
                intervalDays: 0,
                nextReviewAt: formatLocalDateKey(new Date()),
                reviewLogs: [],
                lapses: 0,
                updatedAt: new Date().toISOString()
              };
              return {
                ...prev,
                systemChineseHskProgress: {
                  ...currentHskProgress,
                  [wordId]: { ...existing, state, updatedAt: new Date().toISOString() }
                }
              };
            });
          }}
        />
      )}

      {/* TAB B.2: JAPANESE JLPT VOCABULARY (7,847 WORDS FOR JAPANESE) */}
      {!studySessionActive && activeLang.id === 'ja' && activeTab === 'japaneseJlpt' && (
        <JapaneseJlptTab
          systemWords={systemJapaneseWords}
          progressMap={progressJapanese}
          collections={langCollections}
          userData={vocabData}
          onUpdateUserData={updateVocabData}
          onOpenWordDetail={(word) => setDetailWord(word)}
          onOpenAddToCollection={(wordIds) => {
            setBookmarkingWordIds(wordIds);
            setShowBookmarkModal(true);
          }}
          onStartStudyWords={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onQuickMarkState={(wordId, state) => updateVocabData(prev => set3000WordState(prev, wordId, state))}
        />
      )}

      {/* TAB C: PERSONAL VOCABULARY */}
      {!studySessionActive && activeTab === 'personal' && (
        <PersonalVocabTab
          words={langWords}
          collections={langCollections}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={setSelectedCollectionId}
          onNewWord={() => { setEditingWord(null); setShowWordModal(true); }}
          onEditWord={(w) => { setEditingWord(w); setShowWordModal(true); }}
          onDeleteWord={handleDeleteWord}
          onToggleFavorite={handleToggleFavorite}
          onOpenWordDetail={(w) => setDetailWord(w)}
          onOpenImport={() => setShowImportModal(true)}
          onStartStudyPersonal={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onNewCollection={() => setShowNewCollectionModal(true)}
        />
      )}

      {/* TAB D: COLLECTIONS (MY VOCABULARY SETS) */}
      {!studySessionActive && activeTab === 'collections' && (
        <MyCollectionsTab
          collections={langCollections}
          personalWords={langWords}
          systemWords={system3000Words}
          progressMap={progress3000}
          onNewCollection={() => setShowNewCollectionModal(true)}
          onOpenCollection={(colId) => {
            setSelectedCollectionId(colId);
            setActiveTab('personal');
          }}
          onStartStudyCollection={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onDeleteCollection={handleDeleteCollection}
          onDuplicateCollection={(colId) => {
            const targetCol = langCollections.find(c => c.id === colId);
            if (!targetCol) return;
            const newCol: VocabCollection = {
              ...targetCol,
              id: 'col_' + Date.now(),
              title: `${targetCol.title} (Copy)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            updateVocabData(prev => ({
              ...prev,
              collections: {
                ...prev.collections,
                [activeLang.id]: [...(prev.collections[activeLang.id] || []), newCol]
              }
            }));
          }}
        />
      )}

      {/* TAB E: PERSONALIZED LESSON BUILDER (REQUIREMENT 134) */}
      {!studySessionActive && activeTab === 'study' && (
        <PersonalizedLessonBuilder
          activeLang={activeLang}
          allWords={allCombinedWords}
          collections={langCollections}
          userData={vocabData}
          onUpdateUserData={updateVocabData}
          onStartStudyExplicit={(words, mode, duration) => {
            handleStartStudyExplicit(words, mode, duration);
          }}
          onOpenUniversalSearch={() => setShowUniversalSearchModal(true)}
          onOpenWordDetail={(word) => setDetailWord(word)}
        />
      )}

      {/* TAB F: QUALITY AUDIT & VERIFICATION */}
      {!studySessionActive && activeTab === 'audit' && (
        activeLang.id === 'ja' ? (
          <JapaneseQualityControlView
            systemWords={systemJapaneseWords}
            personalWords={langWords}
            userData={vocabData}
            onUpdateUserData={updateVocabData}
            onOpenWordDetail={(w) => setDetailWord(w)}
          />
        ) : activeLang.id === 'zh' ? (
          <ChineseQualityControlView
            systemWords={systemChineseWords}
            personalWords={langWords}
            userData={vocabData}
            onUpdateUserData={updateVocabData}
          />
        ) : (
          <VocabAuditTab
            systemWords={system3000Words}
            personalWords={langWords}
            userData={vocabData}
            onUpdateUserData={updateVocabData}
            onOpenWordDetail={(w) => setDetailWord(w)}
          />
        )
      )}

      {/* TAB G: SETTINGS */}
      {!studySessionActive && activeTab === 'settings' && (
        <VocabSettingsTab
          activeLang={activeLang}
          onUpdateSettings={(updates: Partial<LearningLanguage>) => {
            updateVocabData(prev => ({
              ...prev,
              languages: (prev.languages || []).map(l => l.id === activeLang?.id ? { ...l, ...updates } : l)
            }));
            setVocabToast('Đã lưu cấu hình học tập cho ngôn ngữ này!');
          }}
          onDeleteLanguage={() => {
            if ((vocabData?.languages || []).length <= 1) {
              setVocabToast('Bạn cần giữ ít nhất 1 ngôn ngữ trong hệ thống!');
              return;
            }
            updateVocabData(prev => {
              const remaining = (prev.languages || []).filter(l => l.id !== activeLang?.id);
              return {
                ...prev,
                activeLanguageId: remaining[0].id,
                languages: remaining
              };
            });
            setVocabToast(`Đã xóa không gian học "${activeLang.name}".`);
          }}
        />
      )}

      {/* MODALS */}
      
      {/* 1. Language Onboarding Modal */}
      {showLanguageOnboarding && (
        <LanguageOnboardingModal
          existingLanguages={vocabData.languages}
          onClose={() => setShowLanguageOnboarding(false)}
          onSelectLanguage={handleAddLanguage}
        />
      )}

      {/* 2. Word Add / Edit Modal (for Personal Vocabulary) */}
      {showWordModal && (
        <WordModal
          activeLang={activeLang}
          collections={langCollections}
          editingWord={editingWord}
          onClose={() => { setShowWordModal(false); setEditingWord(null); }}
          onSave={handleSaveWord}
        />
      )}

      {/* 3. New Collection Modal */}
      {showNewCollectionModal && (
        <NewCollectionModal
          onClose={() => setShowNewCollectionModal(false)}
          onSave={handleSaveCollection}
        />
      )}

      {/* 4. Import / Export Modal */}
      {showImportModal && (
        <ImportExportModal
          activeLang={activeLang}
          collections={langCollections}
          onClose={() => setShowImportModal(false)}
          onImport={(importedWords: any[]) => {
            const today = formatLocalDateKey(new Date());
            const newWords: VocabWord[] = importedWords.map((w: any) => ({
              id: 'word_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
              languageId: activeLang.id,
              collectionId: w.collectionId || langCollections[0]?.id || 'default_col',
              term: w.term || '',
              phonetic: w.phonetic,
              partOfSpeech: w.partOfSpeech || 'noun',
              meaning: w.meaning || '',
              exampleSentence: w.exampleSentence,
              exampleTranslation: w.exampleTranslation,
              collocations: w.collocations || [],
              synonyms: w.synonyms || [],
              antonyms: w.antonyms || [],
              state: 'new',
              repetitionCount: 0,
              easeFactor: 2.5,
              intervalDays: 0,
              nextReviewAt: today,
              reviewLogs: [],
              lapses: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));

            updateVocabData(prev => ({
              ...prev,
              words: {
                ...prev.words,
                [activeLang.id]: [...newWords, ...(prev.words[activeLang.id] || [])]
              }
            }));

            setShowImportModal(false);
            setVocabToast(`🎉 Đã nhập thành công ${newWords.length} từ vựng mới vào kho từ cá nhân!`);
          }}
        />
      )}

      {/* 5. Word Detail Modal (Full view with Spaced Repetition stats & notes) */}
      {detailWord && (
        <WordDetailModal
          word={detailWord}
          isSystemWord={detailWord.id.startsWith('word_3000_')}
          collections={langCollections}
          bookmarkedCollectionIds={progress3000[detailWord.id]?.bookmarkedCollectionIds || []}
          onClose={() => setDetailWord(null)}
          onSaveNotes={(notes) => {
            if (detailWord.id.startsWith('word_3000_')) {
              updateVocabData(prev => save3000WordNotes(prev, detailWord.id, notes));
            } else {
              updateVocabData(prev => ({
                ...prev,
                words: {
                  ...prev.words,
                  [activeLang.id]: (prev.words[activeLang.id] || []).map(w => w.id === detailWord.id ? { ...w, notes } : w)
                }
              }));
            }
          }}
          onToggleBookmark={(colId) => {
            if (detailWord.id.startsWith('word_3000_')) {
              updateVocabData(prev => toggleBookmark3000Word(prev, detailWord.id, colId));
            }
          }}
          onMarkState={(state) => {
            if (detailWord.id.startsWith('word_3000_')) {
              updateVocabData(prev => set3000WordState(prev, detailWord.id, state));
            } else {
              updateVocabData(prev => ({
                ...prev,
                words: {
                  ...prev.words,
                  [activeLang.id]: (prev.words[activeLang.id] || []).map(w => w.id === detailWord.id ? { ...w, state } : w)
                }
              }));
            }
          }}
          onStartStudy={(w) => handleStartStudyExplicit([w], 'flashcard')}
        />
      )}

      {/* 6. Add To Collection Modal */}
      {showBookmarkModal && (
        <AddToCollectionModal
          wordIds={bookmarkingWordIds}
          wordsCount={bookmarkingWordIds.length}
          collections={langCollections}
          onClose={() => {
            setShowBookmarkModal(false);
            setBookmarkingWordIds([]);
          }}
          onSaveBookmark={handleSaveBookmark3000}
          onOpenNewCollection={() => setShowNewCollectionModal(true)}
        />
      )}

      {/* 7. Universal Vocabulary Search Modal (Requirement 134.3) */}
      <UniversalSearchModal
        isOpen={showUniversalSearchModal}
        onClose={() => setShowUniversalSearchModal(false)}
        activeLang={activeLang}
        collections={langCollections}
        userData={vocabData}
        onUpdateUserData={updateVocabData}
        onStartStudySingle={(word) => handleStartStudyExplicit([word], 'flashcard')}
        onOpenWordDetail={(word) => setDetailWord(word)}
      />

      {/* Floating Undo & Notification Toasts */}
      {undoWord && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium min-w-0 flex-1 truncate">
            Đã xóa từ <strong>"{undoWord.word.term}"</strong>
          </span>
          <button
            onClick={handleRestoreWord}
            className="px-3.5 py-1.5 min-h-[38px] bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0 active:scale-95"
          >
            Hoàn tác (5s)
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoWordTimeoutRef.current) clearTimeout(undoWordTimeoutRef.current);
              setUndoWord(null);
            }}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg shrink-0"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {vocabToast && !undoWord && (
        <div className="fixed bottom-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:bottom-6 right-4 sm:right-6 z-50 max-w-[calc(100vw-2rem)] flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium min-w-0 flex-1">{vocabToast}</span>
          <button
            type="button"
            onClick={() => setVocabToast(null)}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg ml-1 shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
