import { User } from './types';
import { apiCall } from './apiClient';

/**
 * 🌟 LIFEOS GLOBAL USER SYNCHRONIZER (SINGLE SOURCE OF TRUTH)
 * Quy chuẩn kỹ thuật:
 * 1. Zero hardcoded UI - Mọi số liệu bắt đầu từ 0 thật sự.
 * 2. Một biến duy nhất (AppState.currentUser) - Hiển thị nhất quán 100% mọi màn hình.
 * 3. Thuật toán chuỗi ngày thật (Streak 🔥) chuẩn GMT+7 / Local Timezone.
 */

export const GLOBAL_SYNC_EVENT = 'lifeos-global-sync';
export const GLOBAL_SYNC_CHANNEL = 'lifeos_global_ui_sync';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(GLOBAL_SYNC_CHANNEL);
    broadcastChannel.addEventListener('message', (event) => {
      if (event.data?.type === 'LIFEOS_USER_SYNC' && event.data?.payload) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(GLOBAL_SYNC_EVENT, { detail: event.data.payload }));
        }
      }
    });
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Lấy ngày hôm nay theo định dạng chuẩn YYYY-MM-DD
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tính toán danh hiệu người dùng thật 100% dựa trên nỗ lực tích lũy
 */
export function computeBadgeLevel(streakDays: number, totalStudyMinutes: number): 'Tân Binh' | 'Chiến Binh' | 'Ngôi Sao' {
  if (streakDays >= 30 || totalStudyMinutes >= 1800) {
    return 'Ngôi Sao';
  }
  if (streakDays >= 7 || totalStudyMinutes >= 300) {
    return 'Chiến Binh';
  }
  return 'Tân Binh';
}

/**
 * Thuật toán tính Chuỗi ngày (Streak 🔥) thật 100%:
 * - So sánh ngày hiện tại với lastActiveDate
 * - Nếu là hôm qua (diff = 1 ngày) -> streak + 1
 * - Nếu chính là hôm nay (diff = 0 ngày) -> giữ nguyên, không cộng trùng
 * - Nếu gián đoạn > 1 ngày -> khởi tạo lại streak = 1 cho ngày mới
 */
export function calculateNextStreak(
  currentStreak: number = 0,
  lastActiveDate: string | null = null,
  todayStr: string = getLocalDateKey()
): { newStreak: number; newLastActiveDate: string; isStreakIncremented: boolean } {
  if (!lastActiveDate) {
    return {
      newStreak: 1,
      newLastActiveDate: todayStr,
      isStreakIncremented: true
    };
  }

  if (lastActiveDate === todayStr) {
    return {
      newStreak: Math.max(1, currentStreak),
      newLastActiveDate: todayStr,
      isStreakIncremented: false
    };
  }

  // Parse YYYY-MM-DD safely
  const [lYear, lMonth, lDay] = lastActiveDate.split('-').map(Number);
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const lastDate = new Date(lYear, lMonth - 1, lDay);
  const todayDate = new Date(tYear, tMonth - 1, tDay);

  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Hoàn thành liên tiếp sang ngày tiếp theo -> Cộng +1
    return {
      newStreak: Math.max(1, currentStreak) + 1,
      newLastActiveDate: todayStr,
      isStreakIncremented: true
    };
  } else if (diffDays <= 0) {
    // Cùng ngày hoặc đồng hồ lùi -> Giữ nguyên
    return {
      newStreak: Math.max(1, currentStreak),
      newLastActiveDate: todayStr,
      isStreakIncremented: false
    };
  } else {
    // Đã bỏ lỡ quá 1 ngày -> Chuỗi bị gián đoạn, bắt đầu lại từ ngày hôm nay = 1
    return {
      newStreak: 1,
      newLastActiveDate: todayStr,
      isStreakIncremented: true
    };
  }
}

/**
 * Trả về đối tượng người dùng chuẩn với đầy đủ chỉ số thật (Zero fake data)
 */
export function normalizeUserStats(rawUser: any): User {
  if (!rawUser) {
    return {
      id: '',
      name: 'Người dùng',
      email: '',
      role: 'User',
      plan: 'Free',
      status: 'Active',
      streakDays: 0,
      lastActiveDate: null,
      totalStudyMinutes: 0,
      todayStudyMinutes: 0,
      badgeLevel: 'Tân Binh',
      commissionBalance: 0,
      referredCount: 0,
      displayName: 'Người dùng'
    };
  }

  const streakDays = typeof rawUser.streakDays === 'number'
    ? rawUser.streakDays
    : (typeof rawUser.currentStreak === 'number' ? rawUser.currentStreak : 0);

  const totalStudyMinutes = typeof rawUser.totalStudyMinutes === 'number'
    ? rawUser.totalStudyMinutes
    : (typeof rawUser.total_study_minutes === 'number' ? rawUser.total_study_minutes : 0);

  const todayStudyMinutes = typeof rawUser.todayStudyMinutes === 'number'
    ? rawUser.todayStudyMinutes
    : 0;

  const commissionBalance = typeof rawUser.commissionBalance === 'number'
    ? rawUser.commissionBalance
    : (typeof rawUser.approvedReward === 'number' ? rawUser.approvedReward : 0);

  const referredCount = typeof rawUser.referredCount === 'number'
    ? rawUser.referredCount
    : (typeof rawUser.totalReferred === 'number' ? rawUser.totalReferred : 0);

  const displayName = rawUser.displayName || rawUser.name || rawUser.username || 'Bạn';
  const badgeLevel = computeBadgeLevel(streakDays, totalStudyMinutes);

  return {
    ...rawUser,
    streakDays,
    lastActiveDate: rawUser.lastActiveDate || null,
    totalStudyMinutes,
    todayStudyMinutes,
    badgeLevel,
    commissionBalance,
    referredCount,
    displayName
  };
}

/**
 * Đồng bộ toàn cục tất cả màn hình (Global UI Sync):
 * Ghi đè vào localStorage, phát sự kiện CustomEvent cho DOM nội bộ,
 * và gửi qua BroadcastChannel cho mọi tab trình duyệt đang mở.
 */
export function syncAllScreensUI(partialUser: Partial<User>): User {
  let currentUser: User | null = null;
  try {
    const raw = localStorage.getItem('lifeos_user');
    if (raw) currentUser = JSON.parse(raw);
  } catch {}

  const merged: User = normalizeUserStats({
    ...(currentUser || {}),
    ...partialUser
  });

  // Re-evaluate badge level
  merged.badgeLevel = computeBadgeLevel(merged.streakDays || 0, merged.totalStudyMinutes || 0);
  merged.displayName = merged.name || merged.username || 'Bạn';

  try {
    localStorage.setItem('lifeos_user', JSON.stringify(merged));
    localStorage.setItem('lifeos_unified_streak_days', String(merged.streakDays || 0));
    localStorage.setItem('lifeos_study_streak_days', String(merged.streakDays || 0));
  } catch {}

  // 1. Local window DOM CustomEvent
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GLOBAL_SYNC_EVENT, { detail: merged }));
  }

  // 2. Cross-tab BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'LIFEOS_USER_SYNC', payload: merged });
    } catch {}
  }

  // 3. Asynchronously sync to database in background
  if (merged.id) {
    apiCall('/api/user/unified-stats', 'POST', {
      streakDays: merged.streakDays,
      lastActiveDate: merged.lastActiveDate,
      totalStudyMinutes: merged.totalStudyMinutes,
      todayStudyMinutes: merged.todayStudyMinutes,
      badgeLevel: merged.badgeLevel
    }).catch(() => {
      // Background retry silently
    });
  }

  return merged;
}

/**
 * Ghi nhận hành động thực tế của người dùng (Học tập, Pomodoro, Thói quen, Công việc):
 * Tự động tính toán chuỗi ngày, cộng phút học và đồng bộ 100% giao diện toàn web.
 */
export function recordUserActivity(
  _activityType: 'study' | 'focus' | 'habit' | 'task' | 'vocab' | 'community' | 'finance',
  minutesAdded: number = 0
): User {
  let currentUser: User | null = null;
  try {
    const raw = localStorage.getItem('lifeos_user');
    if (raw) currentUser = JSON.parse(raw);
  } catch {}

  const user = normalizeUserStats(currentUser);
  const todayStr = getLocalDateKey();

  const { newStreak, newLastActiveDate } = calculateNextStreak(
    user.streakDays,
    user.lastActiveDate,
    todayStr
  );

  const nextTotalMinutes = (user.totalStudyMinutes || 0) + Math.max(0, minutesAdded);
  const nextTodayMinutes = (user.todayStudyMinutes || 0) + Math.max(0, minutesAdded);

  return syncAllScreensUI({
    streakDays: newStreak,
    lastActiveDate: newLastActiveDate,
    totalStudyMinutes: nextTotalMinutes,
    todayStudyMinutes: nextTodayMinutes
  });
}
