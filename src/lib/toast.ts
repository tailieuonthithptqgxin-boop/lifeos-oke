import { soundEngine } from './soundEngine';
import { hapticEngine } from './hapticEngine';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const copy = [...this.toasts];
    this.listeners.forEach(fn => fn(copy));
  }

  public show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    // Play tactile sound & haptic
    try {
      if (type === 'success') {
        soundEngine.playSuccess();
        hapticEngine.trigger('success');
      } else if (type === 'error') {
        hapticEngine.trigger('heavy');
      } else {
        soundEngine.playPop();
        hapticEngine.trigger('light');
      }
    } catch {}

    // Limit to latest 4 toasts
    this.toasts = [newToast, ...this.toasts.slice(0, 3)];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public success(message: string, title?: string, duration: number = 4500): string {
    return this.show(message, 'success', title, duration);
  }

  public error(message: string, title?: string, duration: number = 5000): string {
    return this.show(message, 'error', title, duration);
  }

  public warning(message: string, title?: string, duration: number = 4500): string {
    return this.show(message, 'warning', title, duration);
  }

  public info(message: string, title?: string, duration: number = 4000): string {
    return this.show(message, 'info', title, duration);
  }

  public dismiss(id: string) {
    const beforeCount = this.toasts.length;
    this.toasts = this.toasts.filter(t => t.id !== id);
    if (this.toasts.length !== beforeCount) {
      this.notify();
    }
  }

  public clearAll() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();
