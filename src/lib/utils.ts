import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US').format(amount) + ' ₫';
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    const val = Number((amount / 1_000_000_000).toFixed(1));
    return `${val}B ₫`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    const val = Number((amount / 1_000_000).toFixed(1));
    return `${val}M ₫`;
  }
  if (Math.abs(amount) >= 1_000) {
    const val = Number((amount / 1_000).toFixed(0));
    return `${val}K ₫`;
  }
  return `${amount} ₫`;
}

export function formatDate(date: Date | string | number | null | undefined, locale?: string): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    const loc = locale === 'vi' ? 'vi-VN' : 'en-US';
    return new Intl.DateTimeFormat(loc, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(d);
  } catch (e) {
    return String(date);
  }
}

/**
 * Returns YYYY-MM-DD string in user's local timezone (e.g., Vietnam GMT+7),
 * preventing the 1-day rollback bug caused by .toISOString().split('T')[0]
 * between 00:00 and 07:00 local time.
 */
export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts any Date or ISO timestamp string into local YYYY-MM-DD key.
 */
export function toLocalDateKey(dateOrIso?: Date | string | number | null): string {
  if (!dateOrIso) return formatLocalDateKey(new Date());
  const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '';
  return formatLocalDateKey(d);
}

/**
 * Robust JSON parser that NEVER throws, protecting against corrupted storage,
 * malicious inputs, and invalid serialized structures.
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    const parsed = JSON.parse(value);
    return (parsed !== null && parsed !== undefined) ? parsed : fallback;
  } catch {
    return fallback;
  }
}


