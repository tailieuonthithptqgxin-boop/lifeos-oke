/**
 * Streak Freeze & Rest Day Engine for LifeOS
 * Prevents burnout, protects streaks during sickness or mental health rest days.
 * Includes Streak Resurrection Challenge (24h second chance).
 */

export interface StreakShieldStatus {
  freezeCount: number;
  isRestDayActive: boolean;
  date: string;
}

export interface ResurrectionStatus {
  isPending: boolean;
  lostStreak: number;
  deadline: string; // ISO string 24h
}

class StreakFreezeEngine {
  private getStorageKey(userId?: string): string {
    return `lifeos_streak_freezes_${userId || 'guest'}`;
  }

  private getRestDayKey(userId?: string, dateStr?: string): string {
    const today = dateStr || new Date().toISOString().split('T')[0];
    return `lifeos_rest_day_${userId || 'guest'}_${today}`;
  }

  private getResurrectionKey(userId?: string): string {
    return `lifeos_resurrection_${userId || 'guest'}`;
  }

  public getFreezeCount(userId?: string): number {
    if (typeof window === 'undefined') return 2;
    try {
      const saved = localStorage.getItem(this.getStorageKey(userId));
      return saved !== null ? parseInt(saved, 10) : 2; // Default 2 freezes for newcomers
    } catch {
      return 2;
    }
  }

  public addFreeze(count: number = 1, userId?: string): number {
    const current = this.getFreezeCount(userId);
    const updated = Math.min(10, current + count);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(userId), String(updated));
      } catch {}
    }
    return updated;
  }

  public consumeFreeze(userId?: string): boolean {
    const current = this.getFreezeCount(userId);
    if (current <= 0) return false;
    const updated = current - 1;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(userId), String(updated));
      } catch {}
    }
    return true;
  }

  public isRestDayActive(userId?: string, dateStr?: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(this.getRestDayKey(userId, dateStr)) === 'true';
    } catch {
      return false;
    }
  }

  public toggleRestDay(userId?: string, dateStr?: string): boolean {
    const current = this.isRestDayActive(userId, dateStr);
    const updated = !current;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getRestDayKey(userId, dateStr), String(updated));
      } catch {}
    }
    return updated;
  }

  public getStatus(userId?: string): StreakShieldStatus {
    const today = new Date().toISOString().split('T')[0];
    return {
      freezeCount: this.getFreezeCount(userId),
      isRestDayActive: this.isRestDayActive(userId, today),
      date: today
    };
  }

  // --- STREAK RESURRECTION CHALLENGE METHODS ---

  public getResurrectionStatus(userId?: string): ResurrectionStatus {
    if (typeof window === 'undefined') {
      return { isPending: false, lostStreak: 0, deadline: '' };
    }
    try {
      const raw = localStorage.getItem(this.getResurrectionKey(userId));
      if (!raw) return { isPending: false, lostStreak: 0, deadline: '' };
      const parsed = JSON.parse(raw);
      if (parsed.isPending && new Date(parsed.deadline).getTime() > Date.now()) {
        return parsed;
      }
      return { isPending: false, lostStreak: 0, deadline: '' };
    } catch {
      return { isPending: false, lostStreak: 0, deadline: '' };
    }
  }

  public markStreakAtRisk(lostStreak: number, userId?: string): void {
    if (typeof window === 'undefined' || lostStreak <= 1) return;
    try {
      const deadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      const status: ResurrectionStatus = {
        isPending: true,
        lostStreak,
        deadline
      };
      localStorage.setItem(this.getResurrectionKey(userId), JSON.stringify(status));
    } catch {}
  }

  public completeResurrection(userId?: string): number {
    const status = this.getResurrectionStatus(userId);
    const restored = Math.max(2, status.lostStreak + 1);
    this.dismissResurrection(userId);
    // Also update retention profile streak
    try {
      const retKey = `lifeos_retention_${userId || 'guest'}`;
      const saved = localStorage.getItem(retKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.streak = restored;
        if (restored > (parsed.bestStreak || 0)) {
          parsed.bestStreak = restored;
        }
        localStorage.setItem(retKey, JSON.stringify(parsed));
      }
    } catch {}
    return restored;
  }

  public dismissResurrection(userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.getResurrectionKey(userId));
    } catch {}
  }
}

export const streakFreezeEngine = new StreakFreezeEngine();
