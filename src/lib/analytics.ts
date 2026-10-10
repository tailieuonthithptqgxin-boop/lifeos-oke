/**
 * Product Growth & Analytics Tracker for LifeOS
 * Collects key product funnel events, activation milestones, and feature adoption metrics.
 * Safely persists to localStorage and can dispatch to backend analytics pipelines.
 */

export type AnalyticsEventType =
  | 'user_registered'
  | 'user_logged_in'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'first_meaningful_action'
  | 'task_created'
  | 'task_completed'
  | 'habit_checked'
  | 'focus_session_completed'
  | 'vocab_reviewed'
  | 'finance_tx_added'
  | 'checkout_viewed'
  | 'subscription_upgrade_clicked'
  | 'payment_proof_submitted'
  | 'feature_adopted'
  | 'streak_celebrated'
  | 'template_applied';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  userId?: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export interface FunnelMetrics {
  totalEvents: number;
  hasActivated: boolean;
  firstActionType?: string;
  firstActionAt?: string;
  onboardingTimeMs?: number;
  featuresUsed: Record<string, number>;
}

const STORAGE_KEY = 'lifeos_analytics_events';
const METRICS_KEY = 'lifeos_funnel_metrics';

export const analytics = {
  track(type: AnalyticsEventType, properties?: Record<string, any>, userId?: string): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      userId,
      properties: properties || {},
      timestamp: new Date().toISOString()
    };

    // 1. Append to local log (capped at last 500 events to prevent unbounded growth)
    try {
      const existingStr = localStorage.getItem(STORAGE_KEY);
      const list: AnalyticsEvent[] = existingStr ? JSON.parse(existingStr) : [];
      list.push(event);
      if (list.length > 500) {
        list.splice(0, list.length - 500);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Analytics storage failure:', e);
    }

    // 2. Update funnel & activation milestones
    this.updateFunnelMetrics(event);

    return event;
  },

  getEvents(): AnalyticsEvent[] {
    try {
      const str = localStorage.getItem(STORAGE_KEY);
      return str ? JSON.parse(str) : [];
    } catch {
      return [];
    }
  },

  getFunnelMetrics(): FunnelMetrics {
    try {
      const str = localStorage.getItem(METRICS_KEY);
      if (str) return JSON.parse(str);
    } catch {}

    return {
      totalEvents: 0,
      hasActivated: false,
      featuresUsed: {}
    };
  },

  updateFunnelMetrics(event: AnalyticsEvent) {
    try {
      const metrics = this.getFunnelMetrics();
      metrics.totalEvents += 1;

      // Track feature adoption counts
      const feat = event.properties?.feature || event.type;
      metrics.featuresUsed[feat] = (metrics.featuresUsed[feat] || 0) + 1;

      // Check for first meaningful action
      const activationEvents: AnalyticsEventType[] = [
        'task_created',
        'task_completed',
        'habit_checked',
        'finance_tx_added',
        'focus_session_completed',
        'vocab_reviewed',
        'template_applied'
      ];

      if (!metrics.hasActivated && activationEvents.includes(event.type)) {
        metrics.hasActivated = true;
        metrics.firstActionType = event.type;
        metrics.firstActionAt = event.timestamp;
      }

      localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    } catch (e) {
      console.warn('Funnel metrics update error:', e);
    }
  }
};
