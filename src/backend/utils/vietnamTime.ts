/**
 * VIETNAM TIMEZONE (Asia/Ho_Chi_Minh - UTC+7) UTILITY
 * Eliminates all UTC 7-hour rollbacks across server crons, streaks, and reporting.
 */

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Returns YYYY-MM-DD for the given Date strictly in Vietnam timezone (UTC+7).
 */
export function getVietnamDateString(date: Date = new Date()): string {
  // Using en-CA produces ISO format YYYY-MM-DD directly
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/**
 * Returns YYYY-MM-DD for yesterday strictly in Vietnam timezone (UTC+7).
 */
export function getVietnamYesterdayString(date: Date = new Date()): string {
  // Shift by 24h before formatting in VN timezone
  const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  return getVietnamDateString(yesterday);
}

/**
 * Returns current Date object anchored to start of day in Vietnam timezone.
 */
export function getVietnamStartOfDay(dateStr?: string): Date {
  const targetDateStr = dateStr || getVietnamDateString();
  // 00:00:00 VN time is 17:00:00 UTC previous day (+07:00 offset)
  return new Date(`${targetDateStr}T00:00:00.000+07:00`);
}

/**
 * Returns current Date object anchored to end of day in Vietnam timezone.
 */
export function getVietnamEndOfDay(dateStr?: string): Date {
  const targetDateStr = dateStr || getVietnamDateString();
  return new Date(`${targetDateStr}T23:59:59.999+07:00`);
}
