/**
 * Haptic Vibration Feedback Engine for LifeOS
 * Uses navigator.vibrate when available (Mobile browsers, PWAs, Android/iOS standalone)
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'celebrate' | 'warning';

class HapticEngine {
  private enabled: boolean = true;

  constructor() {
    try {
      const saved = localStorage.getItem('lifeos_haptic_enabled');
      this.enabled = saved !== null ? saved === 'true' : true;
    } catch {
      this.enabled = true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('lifeos_haptic_enabled', String(val));
    } catch {}
  }

  public trigger(type: HapticType = 'light') {
    if (!this.enabled || typeof window === 'undefined' || !navigator.vibrate) return;

    try {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(50);
          break;
        case 'success':
          // 2 crisp pulses: [pulse, pause, pulse]
          navigator.vibrate([20, 40, 35]);
          break;
        case 'celebrate':
          // Fanfare triple pulse
          navigator.vibrate([30, 50, 40, 60, 60]);
          break;
        case 'warning':
          navigator.vibrate([50, 40, 80]);
          break;
      }
    } catch (e) {
      // Ignore vibration permissions/vendor limitations silently
    }
  }
}

export const hapticEngine = new HapticEngine();
