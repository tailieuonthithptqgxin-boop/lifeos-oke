// High-capacity Client-side IndexedDB Storage Adapter for LifeOS
// Prevents QuotaExceededError for large datasets (10,000+ words, notes, logs)
// Fallbacks smoothly to localStorage if IndexedDB is unavailable or blocked

const DB_NAME = 'lifeos_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'lifeos_keyval';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const indexedDbStorage = {
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage
      try {
        localStorage.setItem(`lifeos_idb_${key}`, JSON.stringify(value));
      } catch (err) {
        console.warn(`[Storage] Failed to save key "${key}" to fallback storage:`, err);
      }
    }
  },

  async getItem<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          resolve(req.result !== undefined ? req.result : defaultValue);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem(`lifeos_idb_${key}`);
        if (raw) return JSON.parse(raw) as T;
      } catch {}
      return defaultValue;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      try {
        localStorage.removeItem(`lifeos_idb_${key}`);
      } catch {}
    }
  }
};
