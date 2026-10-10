/**
 * AI Study Companion Engine
 * Architecture:
 * - Mascot profiles (Lumi - Starlight Buddy, Kitsu, Nova) with customizable accessories
 * - State management (greeting, focus, thinking, motivate, encourage, celebrate, resting, achievement)
 * - Continuous live animation integration with 60 FPS micro-physics
 * - 120+ Contextual quotes repository with sliding-window anti-repeat engine
 * - 2-3 minute randomized motivation cycle
 * - Focus modes: 'normal' (2-3m), 'quiet' (6-10m, silent), 'minimal' (events only), 'off'
 */

import { quoteEngine, QuoteCategory, MOTIVATIONAL_QUOTES_POOL } from './companionQuotes';

export type CompanionMascotId = 'lumi' | 'bunny' | 'cat' | 'bear' | 'fox' | 'panda' | 'kitsu' | 'nova';

export type CompanionMood = 
  | 'greeting' 
  | 'focus' 
  | 'idle'
  | 'thinking' 
  | 'celebrate' 
  | 'motivate'
  | 'encourage' 
  | 'resting' 
  | 'achievement';

export type InteractionFrequency = 'minimal' | 'moderate' | 'chatty';

export type CompanionFocusMode = 'normal' | 'quiet' | 'minimal' | 'off';

export interface CompanionAccessory {
  id: string;
  name: string;
  icon: string;
  requiredLevel: number;
}

export interface CompanionProfile {
  id: CompanionMascotId;
  name: string;
  title: string;
  description: string;
  avatar: string;
  themeColor: string;
  glowColor: string;
  quote: string;
  unlockedLevel: number;
  imageReference?: string;
  traits?: string[];
  badge?: string;
}

export interface CompanionSettings {
  enabled: boolean;
  mascotId: CompanionMascotId;
  frequency: InteractionFrequency;
  focusCompanionMode: CompanionFocusMode;
  showSpeechBubble: boolean;
  soundEnabled: boolean;
  quietMode: boolean; // Absolute silence mode for deep focus
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'docked-focus';
  size: 'compact' | 'normal' | 'prominent';
  equippedAccessoryId?: string;
}

export const MASCOT_PROFILES: Record<CompanionMascotId, CompanionProfile> = {
  lumi: {
    id: 'lumi',
    name: 'Lumi',
    title: 'Bé Sao Nhỏ Đồng Hành',
    description: 'Bé bông ấm áp giữ ngôi sao may mắn, luôn chuyển động nhẹ nhàng và tiếp sức cho bạn trong mỗi phiên học.',
    avatar: '⭐',
    themeColor: '#f97316',
    glowColor: 'rgba(251, 146, 60, 0.45)',
    quote: 'Chỉ cần bạn bước thêm một bước, Lumi sẽ thắp sáng ngôi sao cùng bạn!',
    unlockedLevel: 1,
    imageReference: '/assets/mascot/lumi_reference.png',
    badge: 'Chữa lành & Ấm áp',
    traits: ['Ân cần', 'Ấm áp', 'Cổ vũ bền bỉ']
  },
  bunny: {
    id: 'bunny',
    name: 'Bunny',
    title: 'Thỏ Ngọc Năng Lượng',
    description: 'Bé thỏ siêu tươi vui với cà rốt may mắn, luôn tiếp thêm 200% năng lượng chiến đấu cho bạn.',
    avatar: '🐰',
    themeColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    quote: 'Năng lượng 100%! Bật chế độ tập trung và chiến đấu thôi nào bạn ơiii! 🥕',
    unlockedLevel: 1,
    badge: 'Năng động & Tràn trề sinh lực',
    traits: ['Nhiệt huyết', 'Vui tính', 'Nhắc uống nước']
  },
  cat: {
    id: 'cat',
    name: 'Miu',
    title: 'Mèo Thiền Định',
    description: 'Bé mèo xám điềm đạm đeo chuông nhỏ, đôi mắt lim dim thông thái, giúp bạn loại bỏ mọi xao nhãng.',
    avatar: '🐱',
    themeColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    quote: 'Tâm tĩnh như nước, tập trung tuyệt đối vào khoảnh khắc này.',
    unlockedLevel: 1,
    badge: 'Tĩnh tâm & Sâu sắc',
    traits: ['Điềm đạm', 'Deep work', 'Chống xao nhãng']
  },
  bear: {
    id: 'bear',
    name: 'Kuma',
    title: 'Gấu Nâu Kiên Trì',
    description: 'Bé gấu nâu mũm mĩm ôm hũ mật ong, điểm tựa vững chãi giúp bạn vượt qua mọi kỳ thi và mục tiêu lớn.',
    avatar: '🐻',
    themeColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    quote: 'Chậm mà chắc, từng bước một, không có ngọn núi nào là không thể vượt qua!',
    unlockedLevel: 1,
    badge: 'Vững vàng & Bền bỉ',
    traits: ['Kiên định', 'Chắc chắn', 'Đáng tin cậy']
  },
  fox: {
    id: 'fox',
    name: 'Kitsu',
    title: 'Cáo Cam Thông Thái',
    description: 'Cáo nhỏ lanh lợi cầm sách, chuyên gia chiến lược học Spaced Repetition và tối ưu thời gian.',
    avatar: '🦊',
    themeColor: '#ea580c',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    quote: 'Học thông minh hơn, ghi nhớ sâu hơn với phương pháp khoa học!',
    unlockedLevel: 1,
    badge: 'Chiến lược gia học tập',
    traits: ['Spaced Repetition', 'Mẹo ghi nhớ', 'Sắc sảo']
  },
  panda: {
    id: 'panda',
    name: 'Bao',
    title: 'Gấu Trúc Thư Thái',
    description: 'Bé gấu trúc hiền lành ôm cành trúc xanh, giúp bạn giữ tinh thần cân bằng, chống kiệt sức và luôn vui vẻ.',
    avatar: '🐼',
    themeColor: '#0d9488',
    glowColor: 'rgba(13, 148, 136, 0.35)',
    quote: 'Học là hành trình cả đời, hãy giữ cho tâm hồn luôn mỉm cười và thảnh thơi~',
    unlockedLevel: 1,
    badge: 'Cân bằng & Chống Burnout',
    traits: ['Thư thái', 'Anti-burnout', 'Hài hòa']
  },
  kitsu: {
    id: 'kitsu',
    name: 'Kitsu',
    title: 'Hồ Ly Kỷ Luật',
    description: 'Cáo nhỏ thông thái thích đọc sách, tràn đầy năng lượng và kiên trì không bỏ cuộc.',
    avatar: '🦊',
    themeColor: '#ea580c',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    quote: 'Kỷ luật hôm nay là tự do của ngày mai!',
    unlockedLevel: 1
  },
  nova: {
    id: 'nova',
    name: 'Nova',
    title: 'Phi Hành Gia Tập Trung',
    description: 'Người bạn vũ trụ mang năng lượng Deep Work, giúp bạn bay qua mọi deadline.',
    avatar: '🚀',
    themeColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.35)',
    quote: 'Mục tiêu ở phía trước, cùng vươn tới các vì sao nào!',
    unlockedLevel: 2
  }
};

export const COMPANION_ACCESSORIES: CompanionAccessory[] = [
  { id: 'none', name: 'Mặc định', icon: '✨', requiredLevel: 1 },
  { id: 'grad_cap', name: 'Mũ Cử Nhân', icon: '🎓', requiredLevel: 2 },
  { id: 'glasses', name: 'Kính Trí Tuệ', icon: '👓', requiredLevel: 3 },
  { id: 'crown', name: 'Vương Miện Siêu Trí Nhớ', icon: '👑', requiredLevel: 4 },
  { id: 'medal', name: 'Huy Chương Kỷ Luật', icon: '🏅', requiredLevel: 5 }
];

export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: true,
  mascotId: 'lumi',
  frequency: 'moderate',
  focusCompanionMode: 'normal',
  showSpeechBubble: true,
  soundEnabled: false, // Default off per user instruction: "Không tự động phát âm thanh nếu người dùng chưa bật"
  quietMode: false,
  position: 'bottom-right',
  size: 'normal'
};

export interface CompanionDialoguePool {
  greeting: string[];
  focusStart: string[];
  focusMaintain: string[];
  focusPaused: string[];
  focusCompleted: string[];
  vocabCorrect: string[];
  vocabIncorrect: string[];
  vocabRoundCompleted: string[];
  breakTime: string[];
  idleReminder: string[];
  levelUp: string[];
}

class CompanionEngineService {
  private lastTriggerTime: number = 0;

  getSettingsKey(userId?: string): string {
    return `lifeos_companion_settings_${userId || 'guest'}`;
  }

  getSettings(userId?: string): CompanionSettings {
    if (typeof window === 'undefined') return DEFAULT_COMPANION_SETTINGS;
    try {
      const saved = localStorage.getItem(this.getSettingsKey(userId));
      if (saved) {
        return { ...DEFAULT_COMPANION_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading companion settings:', e);
    }
    return DEFAULT_COMPANION_SETTINGS;
  }

  saveSettings(settings: Partial<CompanionSettings>, userId?: string): CompanionSettings {
    const current = this.getSettings(userId);
    const updated = { ...current, ...settings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.getSettingsKey(userId), JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving companion settings:', e);
      }
    }
    return updated;
  }

  /**
   * Intelligently picks a contextual message using the 120+ quotes anti-repeat engine
   */
  pickMessage(
    mascotId: CompanionMascotId, 
    context: keyof CompanionDialoguePool | QuoteCategory
  ): string {
    // Map legacy dialogue pool keys to new rich quote categories
    const categoryMap: Record<string, QuoteCategory> = {
      greeting: 'restart',
      focusStart: 'start',
      focusMaintain: 'flow',
      focusPaused: 'endurance',
      focusCompleted: 'victory',
      vocabCorrect: 'micro_progress',
      vocabIncorrect: 'mistake',
      vocabRoundCompleted: 'victory',
      breakTime: 'endurance',
      idleReminder: 'restart',
      levelUp: 'victory',
      start: 'start',
      flow: 'flow',
      endurance: 'endurance',
      obstacle: 'obstacle',
      mistake: 'mistake',
      micro_progress: 'micro_progress',
      finishing: 'finishing',
      victory: 'victory',
      restart: 'restart',
      surprise: 'surprise'
    };

    const targetCategory = categoryMap[context as string] || 'flow';
    const quote = quoteEngine.getRandomQuote(targetCategory);
    return quote.text;
  }

  /**
   * Gets a randomized periodic quote for the 2-3 minute background cycle
   */
  getPeriodicMotivationQuote(sessionMinutes: number = 0): string {
    return quoteEngine.getContextualQuote({
      event: 'periodic',
      sessionDurationMinutes: sessionMinutes
    }).text;
  }

  /**
   * Checks if an interaction should be spoken based on frequency settings
   */
  canTriggerInteraction(settings: CompanionSettings, isUrgentEvent: boolean = false): boolean {
    if (!settings.enabled || settings.focusCompanionMode === 'off') return false;
    if (settings.quietMode || settings.focusCompanionMode === 'quiet') {
      return isUrgentEvent;
    }
    if (settings.focusCompanionMode === 'minimal') {
      return isUrgentEvent;
    }
    if (isUrgentEvent) return true;

    const now = Date.now();
    const minDelay = settings.frequency === 'minimal' 
      ? 180000 
      : (settings.frequency === 'moderate' ? 120000 : 90000);

    if (now - this.lastTriggerTime < minDelay) {
      return false;
    }

    this.lastTriggerTime = now;
    return true;
  }
}

export const companionEngine = new CompanionEngineService();
export { quoteEngine, MOTIVATIONAL_QUOTES_POOL };
