// Robust Client-side Offline Outbox Mutation Queue for LifeOS PWA
// Queues background mutations when offline, replays with retry when online

export interface OutboxMutation {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const OUTBOX_STORAGE_KEY = 'lifeos_offline_outbox_v1';
const listeners: Array<(count: number) => void> = [];

function getStoredOutbox(): OutboxMutation[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredOutbox(items: OutboxMutation[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    notify(items.length);
  } catch (err) {
    console.warn('[OfflineOutbox] Could not persist queue:', err);
  }
}

function notify(count: number) {
  listeners.forEach(fn => {
    try {
      fn(count);
    } catch {}
  });
}

export const offlineSyncQueue = {
  getPendingCount(): number {
    return getStoredOutbox().length;
  },

  enqueue(type: string, payload: any): void {
    const items = getStoredOutbox();
    const mutation: OutboxMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0
    };
    items.push(mutation);
    saveStoredOutbox(items);
    console.log(`📦 [OfflineOutbox] Enqueued mutation "${type}" (${items.length} pending).`);
  },

  async replayAll(executor: (item: OutboxMutation) => Promise<boolean>): Promise<number> {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return 0;
    }

    const items = getStoredOutbox();
    if (items.length === 0) return 0;

    console.log(`🔄 [OfflineOutbox] Replaying ${items.length} queued mutations...`);
    const remaining: OutboxMutation[] = [];
    let syncedCount = 0;

    for (const item of items) {
      try {
        const success = await executor(item);
        if (success) {
          syncedCount++;
        } else {
          item.retries += 1;
          if (item.retries < 5) {
            remaining.push(item);
          } else {
            console.warn(`⚠️ [OfflineOutbox] Dropping permanently failed mutation "${item.type}" after 5 retries.`, item);
          }
        }
      } catch (err) {
        item.retries += 1;
        if (item.retries < 5) remaining.push(item);
      }
    }

    saveStoredOutbox(remaining);
    return syncedCount;
  },

  subscribe(listener: (count: number) => void): () => void {
    listeners.push(listener);
    listener(getStoredOutbox().length);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }
};
