/**
 * Companion Telemetry & Quality Tracking Engine
 * Records thumbs up/down user feedback and logs unknown/low-confidence queries for developer audit.
 */

export interface MessageFeedback {
  messageId: string;
  rating: 'up' | 'down';
  timestamp: number;
  userQuery?: string;
  assistantResponse?: string;
  viewId?: string;
  note?: string;
}

export interface UnknownQuestionLog {
  id: string;
  query: string;
  viewId: string;
  activeTab?: string;
  confidenceScore: 'HIGH' | 'MEDIUM' | 'LOW';
  fallbackReason: string;
  timestamp: number;
  userRole?: string;
}

const STORAGE_KEY_FEEDBACK = 'lifeos_companion_feedback_v1';
const STORAGE_KEY_UNKNOWN = 'lifeos_companion_unknown_queries_v1';

/**
 * Sanitizes telemetry inputs by redacting tokens, emails, and limiting text size.
 */
function sanitizeTelemetryText(raw?: string): string | undefined {
  if (!raw) return undefined;
  let text = raw.trim().slice(0, 300);
  text = text.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, '[REDACTED_JWT]');
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  text = text.replace(/(?:api[_-]?key|secret|token|password)[\s:=]+["']?[a-zA-Z0-9-_]{8,}["']?/gi, '[REDACTED_SECRET]');
  return text;
}

class CompanionTelemetry {
  private feedbackList: MessageFeedback[] = [];
  private unknownQuestions: UnknownQuestionLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedFeedback = localStorage.getItem(STORAGE_KEY_FEEDBACK);
        if (storedFeedback) {
          this.feedbackList = JSON.parse(storedFeedback);
        }

        const storedUnknown = localStorage.getItem(STORAGE_KEY_UNKNOWN);
        if (storedUnknown) {
          this.unknownQuestions = JSON.parse(storedUnknown);
        }
      }
    } catch {
      // Ignore storage errors in test or SSR environment
    }
  }

  private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(this.feedbackList.slice(-50)));
        localStorage.setItem(STORAGE_KEY_UNKNOWN, JSON.stringify(this.unknownQuestions.slice(-50)));
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Records thumbs up/down feedback on an assistant message with sanitization
   */
  recordFeedback(params: {
    messageId: string;
    rating: 'up' | 'down';
    userQuery?: string;
    assistantResponse?: string;
    viewId?: string;
    note?: string;
  }) {
    const existingIndex = this.feedbackList.findIndex(f => f.messageId === params.messageId);
    const item: MessageFeedback = {
      messageId: params.messageId,
      rating: params.rating,
      timestamp: Date.now(),
      userQuery: sanitizeTelemetryText(params.userQuery),
      assistantResponse: sanitizeTelemetryText(params.assistantResponse),
      viewId: params.viewId,
      note: sanitizeTelemetryText(params.note)
    };

    if (existingIndex >= 0) {
      this.feedbackList[existingIndex] = item;
    } else {
      this.feedbackList.push(item);
    }

    this.persist();
    return item;
  }

  /**
   * Logs a query where confidence was low or where the assistant had to rely on a fallback
   */
  recordUnknownQuestion(params: {
    query: string;
    viewId: string;
    activeTab?: string;
    confidenceScore: 'HIGH' | 'MEDIUM' | 'LOW';
    fallbackReason: string;
    userRole?: string;
  }) {
    const item: UnknownQuestionLog = {
      id: `unk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      query: sanitizeTelemetryText(params.query) || '',
      viewId: params.viewId,
      activeTab: params.activeTab,
      confidenceScore: params.confidenceScore,
      fallbackReason: sanitizeTelemetryText(params.fallbackReason) || '',
      timestamp: Date.now(),
      userRole: params.userRole
    };

    this.unknownQuestions.push(item);
    this.persist();
    return item;
  }

  getFeedbackHistory(): MessageFeedback[] {
    return [...this.feedbackList];
  }

  getUnknownQuestions(): UnknownQuestionLog[] {
    return [...this.unknownQuestions];
  }

  clearTelemetry() {
    this.feedbackList = [];
    this.unknownQuestions = [];
    this.persist();
  }
}

export const companionTelemetry = new CompanionTelemetry();
