/**
 * Companion Event Bus
 * Decouples views from companion implementation while enabling rich real-time triggers.
 */

import { CompanionMood } from '../companionEngine';

export type CompanionEventType = 
  | 'focus_start'
  | 'focus_pause'
  | 'focus_complete'
  | 'vocab_correct'
  | 'vocab_incorrect'
  | 'vocab_complete'
  | 'habit_complete'
  | 'custom_message'
  | 'mood_change';

export interface CompanionEventPayload {
  type: CompanionEventType;
  mood?: CompanionMood;
  message?: string;
  category?: string;
}

type CompanionEventListener = (payload: CompanionEventPayload) => void;

class CompanionEventBus {
  private listeners: Set<CompanionEventListener> = new Set();

  subscribe(listener: CompanionEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(payload: CompanionEventPayload): void {
    this.listeners.forEach(fn => {
      try {
        fn(payload);
      } catch (err) {
        console.error('Error in companion listener:', err);
      }
    });
  }

  emitFocusStart(): void {
    this.emit({ type: 'focus_start', mood: 'focus', category: 'focusStart' });
  }

  emitFocusPause(): void {
    this.emit({ type: 'focus_pause', mood: 'thinking', category: 'focusPaused' });
  }

  emitFocusComplete(): void {
    this.emit({ type: 'focus_complete', mood: 'celebrate', category: 'focusCompleted' });
  }

  emitVocabCorrect(): void {
    this.emit({ type: 'vocab_correct', mood: 'celebrate', category: 'vocabCorrect' });
  }

  emitVocabIncorrect(): void {
    this.emit({ type: 'vocab_incorrect', mood: 'encourage', category: 'vocabIncorrect' });
  }

  emitVocabComplete(): void {
    this.emit({ type: 'vocab_complete', mood: 'achievement', category: 'vocabRoundCompleted' });
  }

  emitMessage(message: string, mood?: CompanionMood): void {
    this.emit({ type: 'custom_message', message, mood });
  }
}

export const companionEventBus = new CompanionEventBus();
