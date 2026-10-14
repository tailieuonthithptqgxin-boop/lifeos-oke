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
