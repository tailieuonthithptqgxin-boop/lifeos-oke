import React, { useState, useEffect, useMemo } from 'react';
import { 
  Languages, Volume2, Sparkles, Brain, Flame, RotateCcw, CheckCircle2, 
  XCircle, ArrowLeft, ArrowRight, Play, Check, Eye, EyeOff, Shuffle, 
  Download, Upload, Plus, Trash2, Edit3, Search, Filter, BookOpen, 
  Bookmark, Star, Calendar, Clock, BarChart2, TrendingUp, Layers, 
  HelpCircle, Settings, ChevronRight, ChevronDown, Award, Globe, 
  ThumbsUp, ThumbsDown, X, RefreshCw, CheckSquare, ShieldCheck, Activity
} from 'lucide-react';
import {
  MasteryState,
  LearningLanguage,
  VocabCollection,
  VocabWord,
  VocabUserData,
  System3000Word,
  UserWordProgress,
  PRESET_LANGUAGES,
  loadVocabData,
  saveVocabData,
  calculateNextReview,
  buildStudyQueues,
  calculateLanguageAnalytics,
  speakWord,
  getInitialCollectionsAndWords,
  exportWordsToCsv,
  exportWordsToJson,
  parseWordsFromCsv,
  getSystem3000Words,
  systemWordToVocabWord,
  calculate3000Analytics,
  calculateCombinedAnalytics,
  buildUnifiedStudyQueues,
  recordReviewOutcome,
  toggleBookmark3000Word,
  set3000WordState,
  save3000WordNotes,
  buildTodayStudyPlan
} from '../../lib/vocabEngine';

import { Oxford3000Tab } from './Oxford3000Tab';
import { PersonalVocabTab } from './PersonalVocabTab';
import { MyCollectionsTab } from './MyCollectionsTab';
import { WordDetailModal } from './WordDetailModal';
import { AddToCollectionModal } from './AddToCollectionModal';
import { VocabAuditTab } from './VocabAuditTab';
import { TodayStudyTab } from './TodayStudyTab';
import { MemoryDashboardTab } from './MemoryDashboardTab';
import { DedicatedVocabFocusView } from './DedicatedVocabFocusView';
import { isEquivalentAnswer } from '../../lib/vocabVerificationEngine';

interface VocabMasterViewProps {
  currentUser?: any;
}

type VocabTab = 'dashboard' | 'today' | 'memory' | 'oxford3000' | 'personal' | 'collections' | 'study' | 'audit' | 'settings';
type StudyMode = 'flashcard' | 'flashcard_reverse' | 'quiz' | 'spelling' | 'fill_in_blank' | 'listening';

export function VocabMasterView({ currentUser }: VocabMasterViewProps) {
  const userId = currentUser?.id || 'current_user';

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

  const [activeTab, setActiveTab] = useState<VocabTab>('dashboard');

  // Modals & Selections
  const [showLanguageOnboarding, setShowLanguageOnboarding] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Detail Modal & Bookmark Modal
  const [detailWord, setDetailWord] = useState<VocabWord | null>(null);
  const [bookmarkingWordIds, setBookmarkingWordIds] = useState<string[]>([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  // Active Language Workspace
  const activeLang = useMemo(() => {
    return vocabData.languages.find(l => l.id === vocabData.activeLanguageId) || vocabData.languages[0];
  }, [vocabData.languages, vocabData.activeLanguageId]);

  const langCollections: VocabCollection[] = useMemo(() => {
    return (vocabData.collections && vocabData.collections[activeLang.id]) || [];
  }, [vocabData.collections, activeLang.id]);

  const langWords: VocabWord[] = useMemo(() => {
    return (vocabData.words && vocabData.words[activeLang.id]) || [];
  }, [vocabData.words, activeLang.id]);

  // System 3000 words extracted from official DOCX
  const system3000Words: System3000Word[] = useMemo(() => {
    return getSystem3000Words();
  }, []);

  const progress3000 = useMemo(() => {
    return vocabData.system3000Progress || {};
  }, [vocabData.system3000Progress]);

  // Combined Analytics
  const combinedAnalytics = useMemo(() => {
    if (activeLang.id === 'en') {
      return calculateCombinedAnalytics(langWords, progress3000);
    }
    return calculateLanguageAnalytics(langWords);
  }, [activeLang.id, langWords, progress3000]);

  // Analytics specifically for 3000
  const analytics3000 = useMemo(() => {
    return calculate3000Analytics(progress3000);
  }, [progress3000]);

  // Analytics specifically for personal words
  const personalAnalytics = useMemo(() => {
    return calculateLanguageAnalytics(langWords);
  }, [langWords]);

  // Unified Pool of all available words for active language
  const allCombinedWords: VocabWord[] = useMemo(() => {
    const list: VocabWord[] = [...langWords];
    if (activeLang.id === 'en') {
      list.push(...system3000Words.map(w => systemWordToVocabWord(w, progress3000[w.id])));
    }
    return list;
  }, [langWords, activeLang.id, system3000Words, progress3000]);

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
  const [studyMode, setStudyMode] = useState<StudyMode>('flashcard');
  const [studyQueue, setStudyQueue] = useState<VocabWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [useDedicatedFocusMode, setUseDedicatedFocusMode] = useState<boolean>(true);
  const [sessionStats, setSessionStats] = useState<{ reviewed: number; passed: number; again: number }>({
    reviewed: 0,
    passed: 0,
    again: 0
  });

  // Quiz / Spelling States
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingChecked, setSpellingChecked] = useState(false);

  // Switch Language Workspace
  const handleSwitchLanguage = (langId: string) => {
    updateVocabData(prev => ({
      ...prev,
      activeLanguageId: langId
    }));
    setSelectedCollectionId('all');
    setStudySessionActive(false);
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
    maxCards: number = 20
  ) => {
    const unifiedQueues = buildUnifiedStudyQueues(langWords, progress3000, source);
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
      alert('Chưa có từ vựng nào trong danh sách được chọn.');
      return;
    }

    // Shuffle and slice
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, maxCards);

    setStudyQueue(shuffled);
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setSessionCompleted(false);
    setSessionStats({ reviewed: 0, passed: 0, again: 0 });
    setQuizSelectedOption(null);
    setSpellingInput('');
    setSpellingChecked(false);
    setStudyMode(mode);
    setStudySessionActive(true);
    setActiveTab('study');
  };

  // Launch Study with explicit pre-selected words
  const handleStartStudyExplicit = (wordsToStudy: VocabWord[], mode: StudyMode = 'flashcard') => {
    if (wordsToStudy.length === 0) return;
    setStudyQueue(wordsToStudy);
    setCurrentCardIndex(0);
    setIsAnswerRevealed(false);
    setSessionCompleted(false);
    setSessionStats({ reviewed: 0, passed: 0, again: 0 });
    setQuizSelectedOption(null);
    setSpellingInput('');
    setSpellingChecked(false);
    setStudyMode(mode);
    setStudySessionActive(true);
    setActiveTab('study');
  };

  // SM-2 Review Rating (Unified for 3000 and Personal words)
  const handleRateReview = (rating: 1 | 2 | 3 | 4) => {
    const currentWord = studyQueue[currentCardIndex];
    if (!currentWord) return;

    // Persist SM-2 calculation using unified engine
    updateVocabData(prev => recordReviewOutcome(prev, currentWord.id, rating, studyMode));

    // Update session live stats
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      passed: rating >= 3 ? prev.passed + 1 : prev.passed,
      again: rating === 1 ? prev.again + 1 : prev.again
    }));

    // Advance to next card or complete
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

  // Quiz Option Picked
  const handleSelectQuizOption = (option: string) => {
    setQuizSelectedOption(option);
    setIsAnswerRevealed(true);
  };

  // Spelling Check
  const handleCheckSpelling = () => {
    setSpellingChecked(true);
    setIsAnswerRevealed(true);
  };

  // Personal Word CRUD Handlers
  const handleSaveWord = (wordData: Partial<VocabWord>) => {
    const today = new Date().toISOString().split('T')[0];

    updateVocabData(prev => {
      const currentWords = prev.words[activeLang.id] || [];

      if (editingWord) {
        // Edit existing
        const updated = currentWords.map(w => {
          if (w.id !== editingWord.id) return w;
          return {
            ...w,
            ...wordData,
            updatedAt: new Date().toISOString()
          };
        });
        return {
          ...prev,
          words: { ...prev.words, [activeLang.id]: updated }
        };
      } else {
        // Create new
        const newWord: VocabWord = {
          id: 'word_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          languageId: activeLang.id,
          collectionId: wordData.collectionId || langCollections[0]?.id || 'default_col',
          term: wordData.term || '',
          phonetic: wordData.phonetic,
          partOfSpeech: wordData.partOfSpeech || 'noun',
          meaning: wordData.meaning || '',
          exampleSentence: wordData.exampleSentence,
          exampleTranslation: wordData.exampleTranslation,
          collocations: wordData.collocations || [],
          mnemonic: wordData.mnemonic,
          notes: wordData.notes,
          isFavorite: false,
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
          words: { ...prev.words, [activeLang.id]: [newWord, ...currentWords] }
        };
      }
    });

    setShowWordModal(false);
    setEditingWord(null);
  };

  const handleDeleteWord = (wordId: string) => {
    updateVocabData(prev => {
      const currentWords = prev.words[activeLang.id] || [];
      return {
        ...prev,
        words: {
          ...prev.words,
          [activeLang.id]: currentWords.filter(w => w.id !== wordId)
        }
      };
    });
  };

  const handleToggleFavorite = (wordId: string) => {
    updateVocabData(prev => {
      const currentWords = prev.words[activeLang.id] || [];
      return {
        ...prev,
        words: {
          ...prev.words,
          [activeLang.id]: currentWords.map(w => w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w)
        }
      };
    });
  };

  // Collection Handlers
  const handleSaveCollection = (colData: Partial<VocabCollection>) => {
    const newCol: VocabCollection = {
      id: 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      languageId: activeLang.id,
      title: colData.title || 'Bộ từ mới',
      description: colData.description,
      icon: colData.icon || '📚',
      color: colData.color || '#3b82f6',
      tags: colData.tags || [],
      systemWordIds: [],
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
      const currentCols = prev.collections[activeLang.id] || [];
      return {
        ...prev,
        collections: {
          ...prev.collections,
          [activeLang.id]: currentCols.filter(c => c.id !== colId)
        }
      };
    });
  };

  // Bookmark 3000 Words to personal collection
  const handleSaveBookmark3000 = (collectionId: string) => {
    updateVocabData(prev => {
      let next = prev;
      for (const wId of bookmarkingWordIds) {
        next = toggleBookmark3000Word(next, wId, collectionId);
      }
      return next;
    });
    alert(`🎉 Đã lưu ${bookmarkingWordIds.length} từ vào bộ sưu tập cá nhân thành công!`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      
      {/* 1. TOP HEADER & WORKSPACE SWITCHER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl p-2 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-xs">
            {activeLang.flag}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Vocabulary Master
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {activeLang.name}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hệ thống học từ vựng thông minh, đa nguồn & Spaced Repetition (SM-2) cá nhân hóa.
            </p>
          </div>
        </div>

        {/* Language selector & quick actions */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {vocabData.languages.map(lang => (
            <button
              key={lang.id}
              type="button"
              onClick={() => handleSwitchLanguage(lang.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                lang.id === activeLang.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowLanguageOnboarding(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition cursor-pointer"
            title="Thêm ngôn ngữ học mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => { setActiveTab('dashboard'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'dashboard' && !studySessionActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Tổng quan
        </button>

        {/* Today's Study Plan Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('today'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'today' && !studySessionActive
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Học hôm nay</span>
          {todayStudyPlan.totalToStudy > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {todayStudyPlan.totalToStudy}
            </span>
          )}
        </button>

        {/* Memory & Forgetting Curve Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('memory'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'memory' && !studySessionActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Trí nhớ & Đường cong</span>
        </button>

        {/* 3000 Oxford Words Tab (Featured for English) */}
        {activeLang.id === 'en' && (
          <button
            type="button"
            onClick={() => { setActiveTab('oxford3000'); setStudySessionActive(false); }}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'oxford3000' && !studySessionActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> 3000 Từ thông dụng
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              3,522 từ
            </span>
          </button>
        )}

        {/* Personal Vocabulary Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('personal'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'personal' && !studySessionActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bookmark className="w-4 h-4" /> Từ vựng cá nhân
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {langWords.length}
          </span>
        </button>

        {/* Collections Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('collections'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'collections' && !studySessionActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Bộ sưu tập của tôi
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {langCollections.length}
          </span>
        </button>

        {/* Study Center Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('study'); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'study' || studySessionActive
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Brain className="w-4 h-4" /> Phiên học & Ôn tập
          {combinedAnalytics.dueTodayCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
              {combinedAnalytics.dueTodayCount} đến hạn
            </span>
          )}
        </button>

        {/* Quality Audit & Verification Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('audit'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit' && !studySessionActive
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Kiểm định chất lượng</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Audit
          </span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('settings'); setStudySessionActive(false); }}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings' && !studySessionActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Cài đặt
        </button>
      </div>

      {/* 3. MAIN CONTENT BODY */}

      {/* ACTIVE STUDY SESSION RUNNER: DEDICATED FOCUS MODE OR STANDARD MODE */}
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
            isRevealed={isAnswerRevealed}
            isCompleted={sessionCompleted}
            stats={sessionStats}
            quizSelectedOption={quizSelectedOption}
            spellingInput={spellingInput}
            spellingChecked={spellingChecked}
            onReveal={() => setIsAnswerRevealed(true)}
            onRate={handleRateReview}
            onSelectQuizOption={handleSelectQuizOption}
            onSpellingChange={setSpellingInput}
            onCheckSpelling={handleCheckSpelling}
            onExitSession={() => setStudySessionActive(false)}
            onRestartSession={() => handleStartStudy(studyMode, studySource, studyTargetQueue)}
          />
        )
      )}

      {/* TAB A: DASHBOARD */}
      {!studySessionActive && activeTab === 'dashboard' && (
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
                Tích hợp trọn vẹn bộ <strong>3000 từ thông dụng chuẩn từ tài liệu DOCX</strong> và <strong>kho từ vựng cá nhân riêng biệt</strong> của bạn.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleStartStudy('flashcard', '3000', 'due')}
                className="px-5 py-3 bg-white hover:bg-slate-100 text-blue-700 font-black text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Ôn tập ngay hôm nay
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingWord(null);
                  setShowWordModal(true);
                }}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-2xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Thêm từ cá nhân
              </button>
            </div>
          </div>

          {/* TWO DEDICATED SOURCE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tile 1: 3000 Common Words */}
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
                  onClick={() => setActiveTab('oxford3000')}
                  className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  Khám phá danh sách 3000 từ
                </button>
                <button
                  type="button"
                  onClick={() => handleStartStudy('flashcard', '3000', 'due')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Brain className="w-3.5 h-3.5" /> Học ngay
                </button>
              </div>
            </div>

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
                  onClick={() => setActiveTab('personal')}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer text-center"
                >
                  Quản lý từ vựng cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingWord(null);
                    setShowWordModal(true);
                  }}
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
      )}

      {/* TAB A.1: TODAY'S STUDY PLAN */}
      {!studySessionActive && activeTab === 'today' && (
        <TodayStudyTab
          activeLang={activeLang}
          allWords={allCombinedWords}
          onStartStudyBatch={(words, mode) => handleStartStudyExplicit(words, mode)}
          onOpenWordDetail={(w) => setDetailWord(w)}
        />
      )}

      {/* TAB A.2: MEMORY DASHBOARD & FORGETTING CURVE */}
      {!studySessionActive && activeTab === 'memory' && (
        <MemoryDashboardTab
          activeLang={activeLang}
          allWords={allCombinedWords}
          onStartStudyWords={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onOpenWordDetail={(w) => setDetailWord(w)}
        />
      )}

      {/* TAB B: 3000 OXFORD / COMMON WORDS */}
      {!studySessionActive && activeTab === 'oxford3000' && (
        <Oxford3000Tab
          systemWords={system3000Words}
          progressMap={progress3000}
          collections={langCollections}
          onOpenWordDetail={(w) => setDetailWord(w)}
          onOpenAddToCollection={(ids) => {
            setBookmarkingWordIds(ids);
            setShowBookmarkModal(true);
          }}
          onStartStudyWords={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onQuickMarkState={(wordId, state) => {
            updateVocabData(prev => set3000WordState(prev, wordId, state));
          }}
        />
      )}

      {/* TAB C: PERSONAL VOCABULARY */}
      {!studySessionActive && activeTab === 'personal' && (
        <PersonalVocabTab
          words={langWords}
          collections={langCollections}
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={setSelectedCollectionId}
          onNewWord={() => {
            setEditingWord(null);
            setShowWordModal(true);
          }}
          onEditWord={(w) => {
            setEditingWord(w);
            setShowWordModal(true);
          }}
          onDeleteWord={handleDeleteWord}
          onToggleFavorite={handleToggleFavorite}
          onOpenWordDetail={(w) => setDetailWord(w)}
          onOpenImport={() => setShowImportModal(true)}
          onStartStudyPersonal={(words) => handleStartStudyExplicit(words, 'flashcard')}
          onNewCollection={() => setShowNewCollectionModal(true)}
        />
      )}

      {/* TAB D: MY COLLECTIONS */}
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
        />
      )}

      {/* TAB E: STUDY CONFIGURATION LAUNCHER */}
      {!studySessionActive && activeTab === 'study' && (
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
                onClick={() => handleStartStudy(studyMode, studySource, studyTargetQueue, 20)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-sm rounded-2xl shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> BẮT ĐẦU PHIÊN HỌC NGAY
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB F: QUALITY AUDIT & VERIFICATION */}
      {!studySessionActive && activeTab === 'audit' && (
        <VocabAuditTab
          systemWords={system3000Words}
          personalWords={langWords}
          userData={vocabData}
          onUpdateUserData={updateVocabData}
          onOpenWordDetail={(w) => setDetailWord(w)}
        />
      )}

      {/* TAB G: SETTINGS */}
      {!studySessionActive && activeTab === 'settings' && (
        <VocabSettingsTab
          activeLang={activeLang}
          onUpdateSettings={(updates: Partial<LearningLanguage>) => {
            updateVocabData(prev => ({
              ...prev,
              languages: prev.languages.map(l => l.id === activeLang.id ? { ...l, ...updates } : l)
            }));
            alert('Đã lưu cấu hình học tập cho ngôn ngữ này!');
          }}
          onDeleteLanguage={() => {
            if (vocabData.languages.length <= 1) {
              return alert('Bạn cần giữ ít nhất 1 ngôn ngữ trong hệ thống!');
            }
            if (confirm(`Bạn có chắc muốn xóa không gian học "${activeLang.name}" và toàn bộ từ vựng thuộc ngôn ngữ này?`)) {
              updateVocabData(prev => {
                const remaining = prev.languages.filter(l => l.id !== activeLang.id);
                return {
                  ...prev,
                  activeLanguageId: remaining[0].id,
                  languages: remaining
                };
              });
            }
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
            const today = new Date().toISOString().split('T')[0];
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
            alert(`🎉 Đã nhập thành công ${newWords.length} từ vựng mới vào kho từ cá nhân!`);
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

    </div>
  );
}

// ==============================================================================
// SUB-SCREEN 1: STUDY SESSION ENGINE (FLASHCARD / ACTIVE RECALL / SPELLING / QUIZ)
// ==============================================================================
function StudySessionScreen({
  activeLang,
  words,
  currentIndex,
  mode,
  isRevealed,
  isCompleted,
  stats,
  quizSelectedOption,
  spellingInput,
  spellingChecked,
  onReveal,
  onRate,
  onSelectQuizOption,
  onSpellingChange,
  onCheckSpelling,
  onExitSession,
  onRestartSession
}: any) {
  const currentWord = words[currentIndex];

  // Options for Quiz mode
  const quizOptions = useMemo(() => {
    if (!currentWord || mode !== 'quiz') return [];
    const wrongOptions = words
      .filter((w: any) => w.id !== currentWord.id)
      .map((w: any) => w.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [currentWord.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
  }, [currentWord, mode, words]);

  if (isCompleted || !currentWord) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-xl mx-auto space-y-6 shadow-xl my-6">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            Hoàn thành Phiên học Xuất sắc!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống đã tự động lưu tiến độ và lên lịch ôn ngắt quãng cho từng từ vựng.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Đã ôn</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.reviewed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-emerald-500 block uppercase">Nhớ tốt</span>
            <span className="text-2xl font-black text-emerald-600">{stats.passed}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-rose-500 block uppercase">Cần ôn thêm</span>
            <span className="text-2xl font-black text-rose-600">{stats.again}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onExitSession}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Quay về Dashboard
          </button>
          <button
            type="button"
            onClick={onRestartSession}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Tiếp tục Ôn tập
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Session Top Bar */}
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onExitSession}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Thoát phiên
        </button>

        <span className="font-bold text-slate-600 dark:text-slate-400">
          Từ {currentIndex + 1} / {words.length} ({progressPercent}%)
        </span>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
          {mode === 'flashcard_reverse' 
            ? 'Flashcard Việt → Anh' 
            : mode === 'quiz' 
            ? 'Trắc nghiệm' 
            : mode === 'spelling' 
            ? 'Luyện chính tả' 
            : mode === 'fill_in_blank'
            ? 'Điền từ vào ngữ cảnh'
            : 'Flashcard Anh → Việt'}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
        <div className="bg-purple-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* FLASHCARD CARD CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 min-h-[380px] flex flex-col justify-between">
        
        {/* CARD FRONT: Normal vs Reverse */}
        <div className="text-center space-y-3 pt-2">
          {currentWord.partOfSpeech && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-mono">
              {currentWord.partOfSpeech}
            </span>
          )}

          {mode === 'flashcard_reverse' ? (
            /* REVERSE FLASHCARD: Show Vietnamese Meaning first */
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Nghĩa tiếng Việt
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {currentWord.meaning}
              </h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                Hãy nhớ lại từ tiếng Anh tương ứng và cách phát âm trước khi lật mặt sau!
              </p>
            </div>
          ) : (
            /* NORMAL FLASHCARD: Show English Term first */
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentWord.term}
                </h2>

                <button
                  type="button"
                  onClick={() => speakWord(currentWord.term, activeLang.speechVoiceCode)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition cursor-pointer"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>

              {currentWord.phonetic && (
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                  {currentWord.phonetic}
                </p>
              )}
            </div>
          )}
        </div>

        {/* MODE SPECIFIC INTERACTIONS */}

        {/* 1. QUIZ MODE INTERACTION */}
        {mode === 'quiz' && !isRevealed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4">
            {quizOptions.map((opt: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuizOption(opt)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 text-left font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* 2. SPELLING MODE INTERACTION */}
        {mode === 'spelling' && !isRevealed && (
          <div className="space-y-3 py-4 max-w-md mx-auto w-full">
            <p className="text-xs text-center text-slate-500">
              Nghĩa: <strong className="text-slate-800 dark:text-slate-200">{currentWord.meaning}</strong>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={spellingInput}
                onChange={e => onSpellingChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCheckSpelling();
                }}
                placeholder="Gõ từ vựng tiếng Anh..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-center focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={onCheckSpelling}
                className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {/* 3. FILL IN THE BLANK INTERACTION */}
        {mode === 'fill_in_blank' && !isRevealed && (
          <div className="space-y-4 py-4 max-w-lg mx-auto w-full text-center">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-sm">
              {currentWord.exampleSentence ? (
                <p className="font-semibold text-slate-900 dark:text-slate-100 italic leading-relaxed">
                  "{currentWord.exampleSentence.replace(new RegExp(`\\b${currentWord.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '[ ______ ]')}"
                </p>
              ) : (
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Hãy nhớ lại từ thích hợp cho ngữ cảnh: <strong>[ ______ ]</strong>
                </p>
              )}
              {currentWord.exampleTranslation && (
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">
                  → {currentWord.exampleTranslation}
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Gợi ý nghĩa: <strong className="text-slate-800 dark:text-slate-200">{currentWord.meaning}</strong>
            </p>

            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={spellingInput}
                onChange={e => onSpellingChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onCheckSpelling();
                }}
                placeholder="Điền từ tiếng Anh còn thiếu..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-center focus:outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={onCheckSpelling}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </div>
        )}

        {/* BACK OF CARD (REVEALED) */}
        {isRevealed ? (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            
            {mode === 'flashcard_reverse' ? (
              /* REVEALED IN REVERSE MODE: Show Term + Pronunciation */
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {currentWord.term}
                  </h3>
                  <button
                    type="button"
                    onClick={() => speakWord(currentWord.term, activeLang.speechVoiceCode)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {currentWord.phonetic && (
                  <p className="font-mono text-sm text-slate-400">{currentWord.phonetic}</p>
                )}
              </div>
            ) : (
              /* REVEALED IN NORMAL MODE: Show Meaning */
              <div className="text-center space-y-1">
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentWord.meaning}
                </div>
              </div>
            )}

            {/* Quiz Result Indicator */}
            {mode === 'quiz' && quizSelectedOption && (() => {
              const res = isEquivalentAnswer(quizSelectedOption, currentWord.meaning, currentWord.secondaryMeanings);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Bạn đã chọn chính xác!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Đáp án đúng là: ${currentWord.meaning}`}
                </div>
              );
            })()}

            {/* Spelling Result Indicator */}
            {mode === 'spelling' && spellingChecked && (() => {
              const res = isEquivalentAnswer(spellingInput, currentWord.term);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Gõ chính tả hoàn toàn chính xác!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Từ đúng là: "${currentWord.term}"`}
                </div>
              );
            })()}

            {/* Fill-in-the-blank Result Indicator */}
            {mode === 'fill_in_blank' && spellingChecked && (() => {
              const res = isEquivalentAnswer(spellingInput, currentWord.term);
              return (
                <div className={`p-3 rounded-xl text-center text-xs font-bold ${
                  res.isMatch
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {res.isMatch
                    ? (res.isExact ? '🎉 Bạn đã điền chính xác từ vào câu!' : `🎉 ${res.feedback}`)
                    : `✕ Chưa chính xác! Từ cần điền là: "${currentWord.term}"`}
                </div>
              );
            })()}

            {/* Example sentence if available */}
            {currentWord.exampleSentence && (
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentWord.exampleSentence}
                </div>
                {currentWord.exampleTranslation && (
                  <div className="text-slate-500 dark:text-slate-400 italic">
                    {currentWord.exampleTranslation}
                  </div>
                )}
              </div>
            )}

            {/* Mnemonic / Personal Notes */}
            {(currentWord.mnemonic || currentWord.notes) && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Ghi chú / Mẹo:</strong> {currentWord.mnemonic || currentWord.notes}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* NOT REVEALED YET */
          <div className="text-center py-6">
            {(mode === 'flashcard' || mode === 'flashcard_reverse' || (mode === 'fill_in_blank' && !spellingChecked)) && (
              <button
                type="button"
                onClick={onReveal}
                className="px-6 py-3 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition cursor-pointer flex items-center gap-2 mx-auto"
              >
                <Eye className="w-4 h-4" /> Hiện đáp án & Nghĩa chi tiết
              </button>
            )}
          </div>
        )}

        {/* 4 SM-2 SPACED REPETITION RATING BUTTONS */}
        {isRevealed && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              Đánh giá mức độ ghi nhớ (Thuật toán SM-2)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onRate(1)}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔴</span>
                <span className="block font-black">Quên (Again)</span>
                <span className="text-[10px] text-rose-500">Ôn lại ngày mai</span>
              </button>

              <button
                type="button"
                onClick={() => onRate(2)}
                className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟠</span>
                <span className="block font-black">Khó (Hard)</span>
                <span className="text-[10px] text-amber-500">Ôn sau 1-2 ngày</span>
              </button>

              <button
                type="button"
                onClick={() => onRate(3)}
                className="p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🟢</span>
                <span className="block font-black">Nhớ tốt (Good)</span>
                <span className="text-[10px] text-emerald-600">Tăng khoảng cách</span>
              </button>

              <button
                type="button"
                onClick={() => onRate(4)}
                className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100 text-blue-800 dark:text-blue-300 font-bold text-xs transition cursor-pointer text-center"
              >
                <span className="block text-base">🔵</span>
                <span className="block font-black">Dễ dàng (Easy)</span>
                <span className="text-[10px] text-blue-600">Nhảy vọt ngày ôn</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ==============================================================================
// MODAL: WORD ADD / EDIT MODAL (FOR PERSONAL VOCABULARY)
// ==============================================================================
function WordModal({ activeLang, collections, editingWord, onClose, onSave }: any) {
  const [term, setTerm] = useState(editingWord?.term || '');
  const [phonetic, setPhonetic] = useState(editingWord?.phonetic || '');
  const [partOfSpeech, setPartOfSpeech] = useState(editingWord?.partOfSpeech || 'noun');
  const [meaning, setMeaning] = useState(editingWord?.meaning || '');
  const [exampleSentence, setExampleSentence] = useState(editingWord?.exampleSentence || '');
  const [exampleTranslation, setExampleTranslation] = useState(editingWord?.exampleTranslation || '');
  const [collocations, setCollocations] = useState(editingWord?.collocations?.join(', ') || '');
  const [mnemonic, setMnemonic] = useState(editingWord?.mnemonic || '');
  const [notes, setNotes] = useState(editingWord?.notes || '');
  const [collectionId, setCollectionId] = useState(editingWord?.collectionId || collections[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !meaning.trim()) {
      return alert('Vui lòng nhập Từ vựng và Định nghĩa nghĩa chính!');
    }

    onSave({
      term: term.trim(),
      phonetic: phonetic.trim(),
      partOfSpeech,
      meaning: meaning.trim(),
      exampleSentence: exampleSentence.trim(),
      exampleTranslation: exampleTranslation.trim(),
      collocations: collocations.split(',').map(s => s.trim()).filter(Boolean),
      mnemonic: mnemonic.trim(),
      notes: notes.trim(),
      collectionId
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {editingWord ? 'Chỉnh sửa từ vựng cá nhân' : `Thêm từ vựng mới (${activeLang.name})`}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Từ hoặc Cụm từ *
              </label>
              <input
                type="text"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Ví dụ: Resilient, take action..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phiên âm (IPA)
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={e => setPhonetic(e.target.value)}
                placeholder="/rɪˈzɪl.jənt/"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Từ loại (Part of Speech)
              </label>
              <select
                value={partOfSpeech}
                onChange={e => setPartOfSpeech(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="noun">Danh từ (n.)</option>
                <option value="verb">Động từ (v.)</option>
                <option value="adjective">Tính từ (adj.)</option>
                <option value="adverb">Trạng từ (adv.)</option>
                <option value="prep.">Giới từ (prep.)</option>
                <option value="conj.">Liên từ (conj.)</option>
                <option value="phrase">Cụm từ / Thành ngữ</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bộ sưu tập cá nhân
              </label>
              <select
                value={collectionId}
                onChange={e => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                {collections.map((col: any) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nghĩa tiếng Việt *
            </label>
            <textarea
              rows={2}
              value={meaning}
              onChange={e => setMeaning(e.target.value)}
              placeholder="Giải thích nghĩa rõ ràng, tự nhiên..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Câu ví dụ ngữ cảnh
            </label>
            <input
              type="text"
              value={exampleSentence}
              onChange={e => setExampleSentence(e.target.value)}
              placeholder="She remained resilient in difficult times..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dịch nghĩa câu ví dụ
            </label>
            <input
              type="text"
              value={exampleTranslation}
              onChange={e => setExampleTranslation(e.target.value)}
              placeholder="Bản dịch tiếng Việt của câu ví dụ..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cụm từ hay gặp (Collocations)
              </label>
              <input
                type="text"
                value={collocations}
                onChange={e => setCollocations(e.target.value)}
                placeholder="phân cách bởi dấu phẩy"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mẹo nhớ (Mnemonic)
              </label>
              <input
                type="text"
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="Mẹo nhớ gợi ý..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú cá nhân & Ngữ cảnh đã gặp
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Gặp trong đề thi thử hoặc sách..."
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
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingWord ? 'Cập nhật từ vựng' : 'Lưu vào kho từ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==============================================================================
// MODAL: NEW COLLECTION MODAL
// ==============================================================================
function NewCollectionModal({ onClose, onSave }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');

  const icons = ['📚', '🎓', '💼', '✈️', '🌸', '🏮', '🔥', '💡', '🌟', '🏆', '🎯', '📖'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return alert('Vui lòng nhập tên bộ từ vựng!');
    onSave({ title: title.trim(), description: description.trim(), icon });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Tạo Bộ sưu tập mới
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
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
}

// ==============================================================================
// MODAL: IMPORT CSV MODAL
// ==============================================================================
function ImportExportModal({ activeLang, collections, onClose, onImport }: any) {
  const [csvText, setCsvText] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState(collections[0]?.id || '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!csvText.trim()) return alert('Vui lòng dán nội dung CSV hoặc tải tệp lên!');
    const words = parseWordsFromCsv(csvText, activeLang.id, targetCollectionId);
    if (words.length === 0) {
      return alert('Không thể tìm thấy dòng từ vựng hợp lệ. Hãy kiểm tra định dạng CSV!');
    }
    onImport(words);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Nhập danh sách từ vựng cá nhân từ CSV
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn bộ sưu tập đích
            </label>
            <select
              value={targetCollectionId}
              onChange={e => setTargetCollectionId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            >
              {collections.map((col: any) => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tải lên tệp .csv (hoặc dán bên dưới)
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung CSV (Định dạng: Term, Phonetic, POS, Meaning...)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`"Term","Phonetic","PartOfSpeech","Meaning"\n"Resilient","/rɪˈzɪl.jənt/","adjective","Kiên cường, bền bỉ"\n"Serendipity","/ˌser.ənˈdɪp.ə.ti/","noun","Sự tình cờ may mắn"`}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
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
              type="button"
              onClick={handleProcessImport}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Tiến hành Nhập dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// MODAL: LANGUAGE ONBOARDING ("BẠN MUỐN HỌC NGÔN NGỮ NÀO?")
// ==============================================================================
function LanguageOnboardingModal({ existingLanguages, onClose, onSelectLanguage }: any) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [dailyTarget, setDailyTarget] = useState(10);

  const availablePresets = useMemo(() => {
    return PRESET_LANGUAGES.filter(p => {
      const alreadyAdded = existingLanguages.some((el: any) => el.id === p.id);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bạn muốn học thêm ngôn ngữ nào?
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm ngôn ngữ (Tiếng Pháp, Đức, Hàn, Nhật...)"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
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
}

// ==============================================================================
// TAB: WORKSPACE SETTINGS TAB
// ==============================================================================
function VocabSettingsTab({ activeLang, onUpdateSettings, onDeleteLanguage }: any) {
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
}
