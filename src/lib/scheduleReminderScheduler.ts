// --------------------------------------------------------------------------
// Real-Time Schedule & Deadline Reminder Engine (Every 30 Seconds)
// 3 Golden Milestones: 2 Hours - 1 Hour - 30 Minutes Before
// Anti-Duplicate & Smart Catch-Up Persistence
// --------------------------------------------------------------------------

import { Event, Task } from './types';
import { unifiedNotificationEngine } from './unifiedNotificationEngine';

const STORAGE_FLAGS_KEY = 'lifeos_reminder_flags_v2';

interface ReminderFlagsMap {
  [key: string]: number; // key: `${id}_${milestone}` -> timestamp when fired
}

class ScheduleReminderScheduler {
  private timer: any = null;
  private isRunning = false;
  private flags: ReminderFlagsMap = {};
  private lastPruneDate = '';

  constructor() {
    this.loadFlags();
  }

  private loadFlags(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_FLAGS_KEY);
      if (raw) {
        this.flags = JSON.parse(raw);
      }
    } catch {
      this.flags = {};
    }
  }

  private saveFlags(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_FLAGS_KEY, JSON.stringify(this.flags));
    } catch {}
  }

  private pruneOldFlags(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastPruneDate === today) return;
    this.lastPruneDate = today;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let changed = false;
    for (const key of Object.keys(this.flags)) {
      if (this.flags[key] < oneDayAgo) {
        delete this.flags[key];
        changed = true;
      }
    }
    if (changed) this.saveFlags();
  }

  /**
   * Helper to parse event or task target time into a Date object
   */
  private getTargetDateTime(item: { date?: string; startTime?: string; dueDate?: string; dueTime?: string }): Date | null {
    const dateStr = item.date || item.dueDate;
    if (!dateStr) return null;

    const timeStr = item.startTime || item.dueTime || '23:59';
    const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));

    try {
      // dateStr can be YYYY-MM-DD or ISO string
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const [y, m, d] = cleanDate.split('-').map(n => parseInt(n, 10));
      if (!y || !m || !d) return null;

      const target = new Date(y, m - 1, d, hours || 0, minutes || 0, 0, 0);
      if (isNaN(target.getTime())) return null;
      return target;
    } catch {
      return null;
    }
  }

  /**
   * Starts the 30-second reminder sweep
   */
  start(getEventsAndTasks: () => { events: Event[]; tasks: Task[] }): void {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    // Run immediate sweep after 2s
    setTimeout(() => {
      this.sweep(getEventsAndTasks);
    }, 2000);

    // Run every 30 seconds
    this.timer = setInterval(() => {
      this.sweep(getEventsAndTasks);
    }, 30000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  /**
   * Core sweep algorithm for 3 golden milestones (2h, 1h, 30m)
   */
  sweep(getEventsAndTasks: () => { events: Event[]; tasks: Task[] }): void {
    this.pruneOldFlags();
    const { events = [], tasks = [] } = getEventsAndTasks();
    const now = Date.now();

    // 1. Process Calendar Events
    for (const ev of events) {
      if (!ev.id || ev.status === 'Cancelled' || ev.status === 'Completed' || ev.status === 'Đã xong') continue;
      const targetDate = this.getTargetDateTime(ev);
      if (!targetDate) continue;

      const diffMs = targetDate.getTime() - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      this.evaluateMilestones({
        id: ev.id,
        title: ev.title,
        startTime: ev.startTime,
        date: ev.date,
        notes: ev.description || ev.location,
        location: ev.location,
        isTask: false
      }, diffMinutes);
    }

    // 2. Process Core Tasks / Deadlines
    for (const task of tasks) {
      if (!task.id || task.status === 'Done' || task.status === 'Hoàn thành' || task.status === 'Completed') continue;
      const targetDate = this.getTargetDateTime(task);
      if (!targetDate) continue;

      const diffMs = targetDate.getTime() - now;
      const diffMinutes = Math.floor(diffMs / 60000);

      this.evaluateMilestones({
        id: task.id,
        title: task.title,
        startTime: task.dueTime || '23:59',
        date: task.dueDate,
        notes: task.notes || `Ưu tiên: ${task.priority || 'Bình thường'}`,
        isTask: true
      }, diffMinutes);
    }

    // 3. Luồng 3: Tự động cảnh báo bảo vệ chuỗi ngày kỷ luật (Streak 🔥) cuối ngày (sau 20:00)
    try {
      const currentHour = new Date().getHours();
      const todayStr = new Date().toISOString().split('T')[0];
      const streakWarnFlag = `streak_warn_${todayStr}`;
      if (currentHour >= 20 && !this.flags[streakWarnFlag]) {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('lifeos_swr_user') : null;
        let userObj: any = null;
        if (rawUser) {
          try { userObj = JSON.parse(rawUser); } catch {}
        }
        if (userObj && (userObj.todayStudyMinutes ?? 0) === 0 && (userObj.streakDays ?? 0) > 0) {
          this.flags[streakWarnFlag] = Date.now();
          this.saveFlags();
          unifiedNotificationEngine.notifyActivityReport({
            streakDays: userObj.streakDays ?? 1,
            todayStudyMinutes: 0,
            badgeLevel: userObj.badgeLevel || 'Chiến Binh'
          }, true);
        }
      }
    } catch {}
  }

  /**
   * Evaluates the 3 Golden Milestones with Catch-Up & Zero-Duplicate logic
   */
  private evaluateMilestones(
    item: {
      id: string;
      title: string;
      startTime?: string;
      date?: string;
      notes?: string;
      location?: string;
      isTask?: boolean;
    },
    diffMinutes: number
  ): void {
    if (diffMinutes < 0 || diffMinutes > 180) return; // Outside active window

    const flag2h = `${item.id}_2h`;
    const flag1h = `${item.id}_1h`;
    const flag30m = `${item.id}_30m`;

    // -------------------------------------------------------------
    // MỐC 1: TRƯỚC 2 GIỜ (Còn từ 61 đến 120 phút)
    // -------------------------------------------------------------
    if (diffMinutes <= 120 && diffMinutes > 60) {
      if (!this.flags[flag2h]) {
        this.flags[flag2h] = Date.now();
        this.saveFlags();
        unifiedNotificationEngine.notifyScheduleMilestone(item, '2h', diffMinutes);
      }
    }

    // -------------------------------------------------------------
    // MỐC 2: TRƯỚC 1 GIỜ (Còn từ 31 đến 60 phút)
    // Bao gồm cả trường hợp mở lại trình duyệt muộn (Smart Catch-Up)
    // -------------------------------------------------------------
    if (diffMinutes <= 60 && diffMinutes > 30) {
      if (!this.flags[flag1h]) {
        this.flags[flag1h] = Date.now();
        if (!this.flags[flag2h]) this.flags[flag2h] = Date.now(); // Mark earlier milestone passed
        this.saveFlags();
        unifiedNotificationEngine.notifyScheduleMilestone(item, '1h', diffMinutes);
      }
    }

    // -------------------------------------------------------------
    // MỐC 3: TRƯỚC 30 PHÚT - BÁO ĐỘNG KHẨN CẤP (Còn từ 0 đến 30 phút)
    // Bao gồm cả trường hợp mở lại trình duyệt muộn (Smart Catch-Up)
    // -------------------------------------------------------------
    if (diffMinutes <= 30 && diffMinutes >= 0) {
      if (!this.flags[flag30m]) {
        this.flags[flag30m] = Date.now();
        if (!this.flags[flag1h]) this.flags[flag1h] = Date.now();
        if (!this.flags[flag2h]) this.flags[flag2h] = Date.now();
        this.saveFlags();
        unifiedNotificationEngine.notifyScheduleMilestone(item, '30m', diffMinutes);
      }
    }
  }

  /**
   * Diagnostic Notification Milestone Trigger for Admin Verification (Kiểm thử hệ thống âm thanh & email)
   */
  triggerSimulation(
    milestone: '2h' | '1h' | '30m',
    customTitle?: string
  ): void {
    const minutesMap = { '2h': 120, '1h': 60, '30m': 30 };
    const testItem = {
      id: `diag_${Date.now()}`,
      title: customTitle || (milestone === '30m' ? 'Hạn nộp Đồ án & Báo cáo Tài chính' : 'Ca Học Giải Tích & Luyện Thi Nước Rút'),
      startTime: milestone === '30m' ? '23:59' : '15:00',
      date: new Date().toISOString().split('T')[0],
      notes: 'Kiểm thử hệ thống chuông báo và thông báo tức thì.',
      isTask: milestone === '30m'
    };

    unifiedNotificationEngine.notifyScheduleMilestone(testItem, milestone, minutesMap[milestone]);
  }
}

export const scheduleReminderScheduler = new ScheduleReminderScheduler();
