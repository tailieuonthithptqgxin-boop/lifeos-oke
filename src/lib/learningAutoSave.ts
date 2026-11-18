/**
 * Universal Learning Auto-Save & Instant Recovery Engine
 * 
 * Provides:
 * 1. Zero data-loss real-time persistence (localStorage) for all study sessions,
 *    flashcards, quizzes, note drafts, and exam entries.
 * 2. Instant state recovery after F5, browser reload, network drop, or tab re-opening.
 * 3. Learning Lock (isLearningSessionActive) to prevent background reloads or session kicks.
 */

export interface VocabSessionState {
  studySessionActive: boolean;
  activeLangId?: string;
  studyMode: string;
  studyQueue: any[];
  currentCardIndex: number;
  isAnswerRevealed: boolean;
  sessionStats: { reviewed: number; passed: number; again: number };
  spellingInput?: string;
  quizSelectedOption?: string | null;
  savedAt: number;
}

export interface NoteDraft {
  id?: string;
  title: string;
  content: string;
  type?: string;
  category?: string;
  tags?: string[];
  checklists?: any[];
  sections?: any[];
  savedAt: number;
}

export interface ExamDraft {
  title: string;
  subjectId?: string;
  date?: string;
  targetScore?: number;
  actualScore?: string | number;
  savedAt: number;
}

export const STORAGE_KEYS = {
  VOCAB_SESSION: 'lifeos_vocab_session_state',
  NOTE_DRAFT: 'lifeos_note_editor_draft',
  EXAM_DRAFT: 'lifeos_exam_modal_draft',
  ACTIVE_STUDY_LOCK: 'lifeos_active_study_lock',
  CURRENT_VIEW: 'lifeos_current_view'
} as const;

/**
 * Checks whether user is currently in the middle of any active learning activity
 * (active flashcard/quiz session, Pomodoro running, note writing, or study desk).
 */
export function isLearningSessionActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. Check vocabulary session
    const vocabRaw = localStorage.getItem(STORAGE_KEYS.VOCAB_SESSION);
    if (vocabRaw) {
      const vocab = JSON.parse(vocabRaw);
      if (vocab && vocab.studySessionActive && Array.isArray(vocab.studyQueue) && vocab.studyQueue.length > 0) {
        return true;
      }
    }

    // 2. Check active note drafting
    const noteRaw = localStorage.getItem(STORAGE_KEYS.NOTE_DRAFT);
    if (noteRaw) {
      const note = JSON.parse(noteRaw);
      if (note && ((note.title && note.title.trim().length > 0) || (note.content && note.content.trim().length > 0))) {
        return true;
      }
    }

    // 3. Check Pomodoro timer
    const pomoRaw = localStorage.getItem('lifeos_pomodoro_runtime_v2');
    if (pomoRaw) {
      const pomo = JSON.parse(pomoRaw);
      if (pomo && pomo.isRunning && pomo.phase !== 'IDLE') {
        return true;
      }
    }

    // 4. Check virtual study desk
    const deskRaw = localStorage.getItem('lifeos_active_study_desk_v2');
    if (deskRaw) {
      const desk = JSON.parse(deskRaw);
      if (desk && desk.roomId) {
        return true;
      }
    }
  } catch {
    // storage parsing safe
  }
  return false;
}

// ----------------------------------------------------------------------------
// 1. Vocabulary Study Session Persistence & Recovery
// ----------------------------------------------------------------------------

export function saveVocabSessionState(state: Partial<VocabSessionState>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: VocabSessionState = {
      studySessionActive: Boolean(state.studySessionActive),
      activeLangId: state.activeLangId,
      studyMode: state.studyMode || 'flashcard',
      studyQueue: Array.isArray(state.studyQueue) ? state.studyQueue : [],
      currentCardIndex: typeof state.currentCardIndex === 'number' ? state.currentCardIndex : 0,
      isAnswerRevealed: Boolean(state.isAnswerRevealed),
      sessionStats: state.sessionStats || { reviewed: 0, passed: 0, again: 0 },
      spellingInput: state.spellingInput || '',
      quizSelectedOption: state.quizSelectedOption || null,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.VOCAB_SESSION, JSON.stringify(payload));
  } catch (e) {
    console.warn('[AutoSave] Failed to save vocab session:', e);
  }
}

export function loadVocabSessionState(): VocabSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCAB_SESSION);
    if (!raw) return null;
    const parsed: VocabSessionState = JSON.parse(raw);
    // Ignore sessions older than 24 hours to prevent stale ghost sessions
    if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000)) {
      clearVocabSessionState();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearVocabSessionState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.VOCAB_SESSION);
  } catch {}
}

// ----------------------------------------------------------------------------
// 2. Note Draft Persistence & Recovery
// ----------------------------------------------------------------------------

export function saveNoteDraft(draft: Partial<NoteDraft>): void {
  if (typeof window === 'undefined') return;
  try {
    if (!draft.title && !draft.content) {
      clearNoteDraft();
      return;
    }
    const payload: NoteDraft = {
      id: draft.id,
      title: draft.title || '',
      content: draft.content || '',
      type: draft.type || 'Normal',
      category: draft.category || 'Tổng hợp',
      tags: draft.tags || [],
      checklists: draft.checklists || [],
      sections: draft.sections || [],
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.NOTE_DRAFT, JSON.stringify(payload));
  } catch (e) {
    console.warn('[AutoSave] Failed to save note draft:', e);
  }
}

export function loadNoteDraft(): NoteDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTE_DRAFT);
    if (!raw) return null;
    const parsed: NoteDraft = JSON.parse(raw);
    // Check if draft has actual substance
    if (parsed && (parsed.title?.trim() || parsed.content?.trim())) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearNoteDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.NOTE_DRAFT);
  } catch {}
}

// ----------------------------------------------------------------------------
// 3. Exam Draft Persistence & Recovery
// ----------------------------------------------------------------------------

export function saveExamDraft(draft: Partial<ExamDraft>): void {
  if (typeof window === 'undefined') return;
  try {
    if (!draft.title) {
      clearExamDraft();
      return;
    }
    const payload: ExamDraft = {
      title: draft.title || '',
      subjectId: draft.subjectId,
      date: draft.date,
      targetScore: draft.targetScore,
      actualScore: draft.actualScore,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.EXAM_DRAFT, JSON.stringify(payload));
  } catch (e) {
    console.warn('[AutoSave] Failed to save exam draft:', e);
  }
}

export function loadExamDraft(): ExamDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_DRAFT);
    if (!raw) return null;
    const parsed: ExamDraft = JSON.parse(raw);
    if (parsed && parsed.title?.trim()) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearExamDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.EXAM_DRAFT);
  } catch {}
}

// ----------------------------------------------------------------------------
// 4. View State Auto-Preservation
// ----------------------------------------------------------------------------

export function getSavedActiveView(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_VIEW);
  } catch {
    return null;
  }
}

export function setSavedActiveView(view: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_VIEW, view);
  } catch {}
}
