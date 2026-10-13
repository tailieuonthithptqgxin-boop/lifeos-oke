/**
 * Gen Z Aesthetic Vibe Theme Engine for LifeOS
 */

export type VibeThemeId = 'cyber_emerald' | 'matcha_latte' | 'midnight_neon' | 'retro_pixel';

export interface VibeThemeConfig {
  id: VibeThemeId;
  name: string;
  emoji: string;
  vibe: string;
  accentColor: string;
  bgGradient: string;
  cardBorder: string;
  badgeBg: string;
  description: string;
}

export const VIBE_THEMES: Record<VibeThemeId, VibeThemeConfig> = {
  cyber_emerald: {
    id: 'cyber_emerald',
    name: 'Cyber Emerald',
    emoji: '⚡',
    vibe: 'Năng Lượng & Lực Chiến',
    accentColor: '#10b981',
    bgGradient: 'from-slate-950 via-slate-900 to-emerald-950/40',
    cardBorder: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Tone xanh ngọc công nghệ, kích thích tối đa năng lượng chinh phục mục tiêu'
  },
  matcha_latte: {
    id: 'matcha_latte',
    name: 'Matcha Latte',
    emoji: '🍵',
    vibe: 'Chữa Lành & Thư Thái',
    accentColor: '#84cc16',
    bgGradient: 'from-stone-950 via-slate-900 to-lime-950/40',
    cardBorder: 'border-lime-500/30',
    badgeBg: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
    description: 'Tone xanh bơ matcha ấm áp, xoa dịu lo âu, hoàn hảo cho việc học tập nhẹ nhàng'
  },
  midnight_neon: {
    id: 'midnight_neon',
    name: 'Midnight Neon',
    emoji: '🌌',
    vibe: 'Cú Đêm & Cyberpunk',
    accentColor: '#a855f7',
    bgGradient: 'from-slate-950 via-purple-950/40 to-indigo-950/40',
    cardBorder: 'border-purple-500/30',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Tone tím than huyền bí neon, tạo không gian Deep Work hoàn hảo cho cú đêm'
  },
  retro_pixel: {
    id: 'retro_pixel',
    name: 'Retro Pixel',
    emoji: '🕹️',
    vibe: 'Hoài Niệm 8-Bit',
    accentColor: '#f59e0b',
    bgGradient: 'from-slate-950 via-amber-950/30 to-slate-900',
    cardBorder: 'border-amber-500/30',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Tone vàng hổ phách Game Boy cổ điển, mang lại cảm hứng RPG hoài niệm'
  }
};

class VibeThemeEngine {
  private currentTheme: VibeThemeId = 'cyber_emerald';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lifeos_vibe_theme') as VibeThemeId;
        if (saved && VIBE_THEMES[saved]) {
          this.currentTheme = saved;
        }
      } catch {}
      this.applyTheme(this.currentTheme);
    }
  }

  public getTheme(): VibeThemeId {
    return this.currentTheme;
  }

  public getConfig(): VibeThemeConfig {
    return VIBE_THEMES[this.currentTheme] || VIBE_THEMES.cyber_emerald;
  }

  public setTheme(theme: VibeThemeId) {
    if (!VIBE_THEMES[theme]) return;
    this.currentTheme = theme;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lifeos_vibe_theme', theme);
      } catch {}
      this.applyTheme(theme);
      window.dispatchEvent(new CustomEvent('lifeos:vibe-theme-changed', { detail: { theme } }));
    }
  }

  private applyTheme(theme: VibeThemeId) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-vibe-theme', theme);
  }
}

export const vibeThemeEngine = new VibeThemeEngine();
