import React, { useState, useMemo, useEffect } from 'react';
import { companionContextEngine } from '../../lib/companion/companionContextEngine';
import { 
  BarChart2, Calendar, Activity, BookOpen, Bookmark, Layers, 
  Brain, ShieldCheck, Settings, Plus
} from 'lucide-react';
import {
  LearningLanguage,
  VocabCollection,
  VocabWord,
  VocabUserData,
  UserWordProgress,
  System3000Word,
  SystemChineseHskWord,
  loadVocabData,
  saveVocabData,
  calculateLanguageAnalytics,
  getInitialCollectionsAndWords,
  getSystem3000Words,
  systemWordToVocabWord,
  getSystemChineseWords,
  systemChineseWordToVocabWord,
  calculate3000Analytics,
  calculateChineseHskAnalytics,
  calculateCombinedAnalytics,
  buildUnifiedStudyQueues,
  recordReviewOutcome,
  toggleBookmark3000Word,
  set3000WordState,
  save3000WordNotes,
  buildTodayStudyPlan
} from '../../lib/vocabEngine';

import { Oxford3000Tab } from './Oxford3000Tab';
import { ChineseHskTab } from './ChineseHskTab';
import { PersonalVocabTab } from './PersonalVocabTab';
import { MyCollectionsTab } from './MyCollectionsTab';
import { WordDetailModal } from './WordDetailModal';
import { AddToCollectionModal } from './AddToCollectionModal';
import { VocabAuditTab } from './VocabAuditTab';
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

interface VocabMasterViewProps {
  currentUser?: any;
}

type VocabTab = 'dashboard' | 'today' | 'memory' | 'oxford3000' | 'chineseHsk' | 'personal' | 'collections' | 'study' | 'audit' | 'settings';

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

  useEffect(() => {
    companionContextEngine.setLiveContext({ viewId: 'study', activeTab });
  }, [activeTab]);

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

  // System Chinese HSK words (10,240 words)
  const systemChineseWords: SystemChineseHskWord[] = useMemo(() => {
    return getSystemChineseWords();
  }, []);

  const progressChinese = useMemo(() => {
    return vocabData.systemChineseHskProgress || {};
  }, [vocabData.systemChineseHskProgress]);

  // Combined Analytics
  const combinedAnalytics = useMemo(() => {
    if (activeLang.id === 'en') {
      return calculateCombinedAnalytics(langWords, progress3000, 'en');
    }
    if (activeLang.id === 'zh') {
      return calculateCombinedAnalytics(langWords, progressChinese, 'zh');
    }
    return calculateLanguageAnalytics(langWords);
  }, [activeLang.id, langWords, progress3000, progressChinese]);

  // Analytics specifically for 3000
  const analytics3000 = useMemo(() => {
    return calculate3000Analytics(progress3000);
  }, [progress3000]);

  // Analytics specifically for Chinese HSK
  const analyticsChineseHsk = useMemo(() => {
    return calculateChineseHskAnalytics(progressChinese);
  }, [progressChinese]);

  // Analytics specifically for personal words
  const personalAnalytics = useMemo(() => {
    return calculateLanguageAnalytics(langWords);
  }, [langWords]);

  // Unified Pool of all available words for active language
  const allCombinedWords: VocabWord[] = useMemo(() => {
    const list: VocabWord[] = [...langWords];
    if (activeLang.id === 'en') {
      list.push(...system3000Words.map(w => systemWordToVocabWord(w, progress3000[w.id])));
    } else if (activeLang.id === 'zh') {
      list.push(...systemChineseWords.map(w => systemChineseWordToVocabWord(w, progressChinese[w.id])));
    }
    return list;
  }, [langWords, activeLang.id, system3000Words, progress3000, systemChineseWords, progressChinese]);

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
    const activeProgress = activeLang.id === 'zh' ? progressChinese : progress3000;
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
      alert('Chưa có từ vựng nào trong danh sách được chọn.');
      return;
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, maxCards);

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

  const handleStartStudyExplicit = (wordsToStudy: VocabWord[], mode: StudyMode = 'flashcard') => {
    if (!wordsToStudy || wordsToStudy.length === 0) {
      alert('Danh sách từ trống.');
      return;
    }
    setStudyQueue(wordsToStudy);
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

  const handleSelectQuizOption = (option: string) => {
    setQuizSelectedOption(option);
    setIsAnswerRevealed(true);
  };

  const handleCheckSpelling = () => {
    setSpellingChecked(true);
    setIsAnswerRevealed(true);
  };

  const handleSaveWord = (wordData: Partial<VocabWord>) => {
    const today = new Date().toISOString().split('T')[0];

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
    if (!confirm('Bạn có chắc chắn muốn xóa từ vựng này khỏi kho từ cá nhân?')) return;

    updateVocabData(prev => ({
      ...prev,
      words: {
        ...prev.words,
        [activeLang.id]: (prev.words[activeLang.id] || []).filter(w => w.id !== wordId)
      }
    }));
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
    if (!confirm('Xóa bộ sưu tập này? Các từ thuộc bộ sưu tập sẽ được chuyển về nhóm Mặc định.')) return;

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
  };

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
      <div className="card-cute bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-purple-100/80 dark:border-purple-900/40 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/60 shadow-xs animate-wiggle">
            {activeLang.flag}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Vocabulary Master
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/50">
                {activeLang.name} ✨
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Hệ thống học từ vựng thông minh, đa nguồn & Spaced Repetition (SM-2) cá nhân hóa chill chill 🌸
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
              className={`btn-squishy px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                lang.id === activeLang.id
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/25'
                  : 'bg-white/80 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-purple-100/60 dark:border-slate-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowLanguageOnboarding(true)}
            className="btn-squishy p-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-bold transition-all cursor-pointer border border-purple-200/50"
            title="Thêm ngôn ngữ học mới"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => { setActiveTab('dashboard'); setStudySessionActive(false); }}
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'dashboard' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
          }`}
        >
          <BarChart2 className="w-4 h-4" /> Tổng quan
        </button>

        {/* Today's Study Plan Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('today'); setStudySessionActive(false); }}
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'today' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
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
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'memory' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Trí nhớ & SM-2 🧠</span>
        </button>

        {/* 3000 Oxford Words Tab (Featured for English) */}
        {activeLang.id === 'en' && (
          <button
            type="button"
            onClick={() => { setActiveTab('oxford3000'); setStudySessionActive(false); }}
            className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'oxford3000' && !studySessionActive
                ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
            }`}
          >
            <BookOpen className="w-4 h-4" /> 3000 Từ Oxford
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              3,522 từ ✨
            </span>
          </button>
        )}

        {/* Chinese HSK Vocabulary Tab (Featured for Chinese) */}
        {activeLang.id === 'zh' && (
          <button
            type="button"
            onClick={() => { setActiveTab('chineseHsk'); setStudySessionActive(false); }}
            className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'chineseHsk' && !studySessionActive
                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-rose-500" />
            <span>Kho từ HSK 1-6</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              10,240 từ 🌸
            </span>
          </button>
        )}

        {/* Personal Vocabulary Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('personal'); setStudySessionActive(false); }}
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'personal' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
          }`}
        >
          <Bookmark className="w-4 h-4" /> Từ vựng của tôi
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300">
            {langWords.length}
          </span>
        </button>

        {/* Collections Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('collections'); setStudySessionActive(false); }}
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'collections' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
          }`}
        >
          <Layers className="w-4 h-4" /> Bộ sưu tập
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300">
            {langCollections.length}
          </span>
        </button>

        {/* Study Center Tab */}
        <button
          type="button"
          onClick={() => { setActiveTab('study'); setStudySessionActive(false); }}
          className={`btn-squishy px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'study' && !studySessionActive
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/70 dark:hover:bg-slate-800 hover:text-purple-700'
          }`}
        >
          <Brain className="w-4 h-4 text-emerald-400" />
          <span>4 Phương pháp Luyện tập 🎯</span>
          {combinedAnalytics.dueTodayCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
              {combinedAnalytics.dueTodayCount} đến hạn
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hidden sm:inline">
              Quiz • Gõ từ
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

      {/* ACTIVE STUDY SESSION RUNNER: ALL 4 MODES POWERED BY STUDY SESSION SCREEN */}
      {studySessionActive && (
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
            distractorPool={allCombinedWords}
            onReveal={() => setIsAnswerRevealed(true)}
            onRate={handleRateReview}
            onSelectQuizOption={handleSelectQuizOption}
            onSpellingChange={setSpellingInput}
            onCheckSpelling={handleCheckSpelling}
            onExitSession={() => setStudySessionActive(false)}
            onRestartSession={() => handleStartStudy(studyMode, studySource, studyTargetQueue)}
          />
      )}

      {/* TAB A: DASHBOARD */}
      {!studySessionActive && activeTab === 'dashboard' && (
        <VocabDashboardTab
          activeLang={activeLang}
          system3000Words={system3000Words}
          systemChineseWords={systemChineseWords}
          analytics3000={analytics3000}
          analyticsChineseHsk={analyticsChineseHsk}
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
          onStartStudyBatch={(words, mode) => handleStartStudyExplicit(words, mode)}
          onOpenWordDetail={(word) => setDetailWord(word)}
        />
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
                nextReviewAt: new Date().toISOString().split('T')[0],
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

      {/* TAB D: COLLECTIONS */}
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

      {/* TAB E: STUDY SESSION CONFIGURATION */}
      {!studySessionActive && activeTab === 'study' && (
        <VocabStudyTab
          studySource={studySource}
          setStudySource={setStudySource}
          studyTargetQueue={studyTargetQueue}
          setStudyTargetQueue={setStudyTargetQueue}
          studyMode={studyMode}
          setStudyMode={setStudyMode}
          langWords={langWords}
          useDedicatedFocusMode={useDedicatedFocusMode}
          setUseDedicatedFocusMode={setUseDedicatedFocusMode}
          onStartStudy={handleStartStudy}
          activeLang={activeLang}
        />
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
