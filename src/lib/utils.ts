import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    const val = Number((amount / 1_000_000_000).toFixed(1));
    return `${val} tỷ ₫`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    const val = Number((amount / 1_000_000).toFixed(1));
    return `${val} tr ₫`;
  }
  if (Math.abs(amount) >= 1_000) {
    const val = Number((amount / 1_000).toFixed(0));
    return `${val}k ₫`;
  }
  return `${amount} ₫`;
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).format(d);
  } catch (e) {
    return String(date);
  }
}
