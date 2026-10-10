/**
 * AI Study Companion Engine
 * Architecture:
 * - Mascot profiles (Lumi, Kitsu, Nova) with customizable accessories
 * - State management (greeting, focus, thinking, encourage, celebrate, resting, error)
 * - Intelligent dialogue generator with debounce, anti-repetition memory & context awareness
 * - Real user settings persistence (frequency, audio, bubble, mascot choice, quiet mode, position)
 * - Unlocks & milestone rewards integration (XP & level connection)
 */

export type CompanionMascotId = 'lumi' | 'kitsu' | 'nova';

export type CompanionMood = 
  | 'greeting' 
  | 'focus' 
  | 'idle'
  | 'thinking' 
  | 'celebrate' 
  | 'encourage' 
  | 'resting' 
  | 'achievement';

export type InteractionFrequency = 'minimal' | 'moderate' | 'chatty';

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
}

export interface CompanionSettings {
  enabled: boolean;
  mascotId: CompanionMascotId;
  frequency: InteractionFrequency;
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
    title: 'Ngọn Đèn Tinh Thần',
    description: 'Bé đom đóm tri thức phát sáng dịu nhẹ, luôn bên bạn những đêm học tập miệt mài.',
    avatar: '💡',
    themeColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.35)',
    quote: 'Chỉ cần bạn bước một bước nhỏ, mình sẽ thắp sáng phần còn lại!',
    unlockedLevel: 1
  },
  kitsu: {
    id: 'kitsu',
    name: 'Kitsu',
    title: 'Hồ Ly Kỷ Luật',
    description: 'Cáo nhỏ thông thái thích đọc sách, tràn đầy năng lượng và kiên trì không bỏ cuộc.',
    avatar: '🦊',
    themeColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.35)',
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
  showSpeechBubble: true,
  soundEnabled: true,
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

export const COMPANION_DIALOGUES: Record<CompanionMascotId, CompanionDialoguePool> = {
  lumi: {
    greeting: [
      'Chào bạn! Hôm nay chúng mình lại cùng nhau tiến bộ nhé!',
      'Lumi đã sẵn sàng! Bạn muốn chinh phục nội dung nào trước?',
      'Một ngày tuyệt vời để nạp thêm kiến thức mới!'
    ],
    focusStart: [
      'Vào phiên tập trung rồi, mình sẽ giữ yên lặng để bạn làm việc thật tốt nhé.',
      'Hít thở sâu một hơi nào! Mình luôn đồng hành cùng bạn.',
      'Không gian yên tĩnh bắt đầu, bạn làm rất tốt!'
    ],
    focusMaintain: [
      'Dòng chảy tập trung của bạn thật tuyệt vời...',
      'Cứ bình tĩnh từng bước một nhé.',
      'Bạn đang đi đúng hướng rồi!'
    ],
    focusPaused: [
      'Nghỉ tay chớp mắt chút xíu rồi chúng mình tiếp tục nhé.',
      'Cần uống ngụm nước không bạn? Mình đợi bạn quay lại.',
      'Tạm dừng một nhịp để nạp lại năng lượng nào.'
    ],
    focusCompleted: [
      'Tuyệt vời quá! Phiên tập trung đã hoàn thành trọn vẹn!',
      'Chúc mừng bạn! Cảm giác hoàn thành thật là dễ chịu đúng không?',
      'Bạn vừa tiến một bước lớn trong hành trình hôm nay!'
    ],
    vocabCorrect: [
      'Chính xác rồi! Trí nhớ của bạn thật đáng nể!',
      'Chuẩn xác! Cứ giữ vững phong độ này nhé.',
      'Từ này đã vào sâu trong bộ nhớ dài hạn rồi đó!'
    ],
    vocabIncorrect: [
      'Không sao cả, sai sót là một phần để nhớ sâu hơn mà!',
      'Gặp lại lần nữa là nhớ ngay thôi, đừng nản lòng nhé!',
      'Mỗi lần ôn lại là một lần não bộ củng cố liên kết!'
    ],
    vocabRoundCompleted: [
      'Hoan hô! Bạn đã ôn xong toàn bộ danh sách từ hôm nay!',
      'Xuất sắc! Bộ từ vựng đã được hoàn thành gọn gàng.',
      'Thành quả học từ hôm nay rất đáng tự hào!'
    ],
    breakTime: [
      'Đến lúc thả lỏng mắt và duỗi người rồi bạn ơi.',
      'Nghỉ ngơi chất lượng sẽ giúp phiên sau hiệu quả hơn gấp đôi!'
    ],
    idleReminder: [
      'Bạn vẫn ở đó chứ? Khi nào sẵn sàng thì chúng mình học tiếp nhé.',
      'Nghỉ ngơi xong thì bấm tiếp tục nha!'
    ],
    levelUp: [
      'Woa! Bạn vừa lên cấp mới! Bạn đỉnh thật sự!',
      'Thành tựu mới mở khóa! Lumi rất tự hào về bạn!'
    ]
  },
  kitsu: {
    greeting: [
      'Kitsu chào bạn! Đã đến giờ rèn luyện kỷ luật rồi!',
      'Sách vở đã mở, tâm trí đã sẵn sàng chưa bạn ơi?',
      'Cùng biến hôm nay thành một ngày năng suất vượt bậc nào!'
    ],
    focusStart: [
      'Bắt đầu chế độ tập trung cao độ! Không xao nhãng!',
      'Kitsu sẽ đứng gác cho bạn làm việc thật hiệu quả.',
      'Tập trung tối đa, kết quả tối ưu!'
    ],
    focusMaintain: [
      'Phong độ của bạn đang rất cao, giữ vững nhé!',
      'Sự kiên trì đang tạo nên phép màu đấy.',
      'Từng phút giây đều có giá trị!'
    ],
    focusPaused: [
      'Tạm nghỉ một chút, nhưng đừng lướt mạng xã hội nhé!',
      'Nghỉ ngơi đúng lúc để duy trì sự dẻo dai nào.',
      'Uống nước và vươn vai thư giãn chút thôi bạn nhé.'
    ],
    focusCompleted: [
      'Hoàn thành xuất sắc! Kỷ luật của bạn thật đáng ngưỡng mộ!',
      'Mục tiêu đã được chinh phục! Làm tốt lắm!',
      'Cảm giác chiến thắng chính mình thật tuyệt!'
    ],
    vocabCorrect: [
      'Đúng chuẩn! Phản xạ từ vựng cực kỳ nhanh!',
      'Chính xác! Não bộ của bạn đang hoạt động hết công suất!',
      'Rất tốt! Thêm một từ được thu phục!'
    ],
    vocabIncorrect: [
      'Không vấn đề gì! Kitsu sẽ ghi nhớ từ này để cùng bạn ôn lại.',
      'Đừng lo lắng, cao thủ nào cũng từng ôn từ nhiều lần!',
      'Bình tĩnh nhìn lại nghĩa và thử lại nhé!'
    ],
    vocabRoundCompleted: [
      'Chiến thắng giòn giã! Bạn đã chinh phục trọn vẹn danh sách từ!',
      'Kitsu ấn tượng với sự bền bỉ của bạn hôm nay!',
      'Hoàn tất phiên ôn luyện một cách đầy tự hào!'
    ],
    breakTime: [
      'Hạ hỏa chút xíu nào, cho mắt nghỉ 5 phút nhé!',
      'Đứng dậy đi lại một vòng để máu lưu thông tốt hơn nào!'
    ],
    idleReminder: [
      'Kitsu đang đợi bạn trở lại võ đài tri thức đây!',
      'Nạp đủ năng lượng rồi thì chúng mình tăng tốc tiếp nhé!'
    ],
    levelUp: [
      'Cột mốc mới được thiết lập! Đẳng cấp đã nâng tầm!',
      'Chúc mừng bạn thăng hạng! Phong độ tuyệt đỉnh!'
    ]
  },
  nova: {
    greeting: [
      'Trạm không gian Nova đã kết nối! Chào mừng phi hành gia!',
      'Sẵn sàng khởi động hành trình khám phá hôm nay chưa?',
      'Tọa độ mục tiêu đã định vị, chúng ta cùng bay nào!'
    ],
    focusStart: [
      'Đang vào vùng không trọng lực Focus Mode. Giữ yên lặng...',
      'Mọi động cơ tập trung đã kích hoạt! Chúc bạn bay êm!',
      'Tách khỏi mọi nhiễu loạn bên ngoài, bắt đầu Deep Work.'
    ],
    focusMaintain: [
      'Quỹ đạo tập trung đang cực kỳ ổn định...',
      'Năng lượng học tập đang ở mức tối đa!',
      'Tiến độ đang tăng tốc đều đặn.'
    ],
    focusPaused: [
      'Tạm dừng chuyến bay để tiếp nhiên liệu nhé.',
      'Bảo trì năng lượng một lát rồi kích hoạt lại nào.',
      'Thở đều và kiểm tra lại trạng thái trước khi cất cánh tiếp.'
    ],
    focusCompleted: [
      'Hạ cánh an toàn! Một phiên tập trung siêu thành công!',
      'Nhiệm vụ đã hoàn thành trọn vẹn! Bạn làm quá tuyệt!',
      'Ghi nhận thành tích bay xuất sắc vào nhật ký không gian!'
    ],
    vocabCorrect: [
      'Tín hiệu chuẩn xác! Ghi nhận từ vựng thành công!',
      'Phát hiện đáp án đúng 100%! Cực kỳ nhạy bén!',
      'Chuẩn xác tuyệt đối, tiếp tục giữ đà nào!'
    ],
    vocabIncorrect: [
      'Tín hiệu lệch nhẹ, điều chỉnh lại bộ nhớ và thử lại nhé!',
      'Không sao cả, trạm không gian sẽ lưu từ này để quét lại.',
      'Mỗi lỗi sai là một dữ liệu quý để nâng cấp phản xạ!'
    ],
    vocabRoundCompleted: [
      'Nhiệm vụ quét từ vựng hôm nay đã hoàn tất 100%!',
      'Kho dữ liệu ngôn ngữ của bạn vừa mở rộng thêm một bậc!',
      'Thành quả phi thường! Chúc mừng phi hành gia!'
    ],
    breakTime: [
      'Ngắt kết nối màn hình để bảo dưỡng thị lực 5 phút nhé.',
      'Thời gian nghỉ ngơi để não bộ sắp xếp lại dữ liệu.'
    ],
    idleReminder: [
      'Tàu đang ở chế độ chờ, sẵn sàng khi bạn phát lệnh tiếp tục!',
      'Nghỉ ngơi xong thì ấn nút bay tiếp nhé!'
    ],
    levelUp: [
      'Cảnh báo thăng cấp! Bạn vừa mở khóa tầng quỹ đạo mới!',
      'Thành tựu vũ trụ đã được mở! Xin chúc mừng!'
    ]
  }
};

class CompanionEngineService {
  private recentMessages: string[] = [];
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
   * Intelligently picks a contextual message, avoiding recent repeats
   */
  pickMessage(
    mascotId: CompanionMascotId, 
    context: keyof CompanionDialoguePool
  ): string {
    const pool = COMPANION_DIALOGUES[mascotId]?.[context] || COMPANION_DIALOGUES.lumi[context] || [];
    if (pool.length === 0) return 'Cố gắng lên nhé!';

    // Filter out recently spoken messages
    const candidates = pool.filter(msg => !this.recentMessages.includes(msg));
    const chosen = candidates.length > 0 
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : pool[Math.floor(Math.random() * pool.length)];

    // Track in anti-repetition memory (keep last 4)
    this.recentMessages.push(chosen);
    if (this.recentMessages.length > 4) {
      this.recentMessages.shift();
    }

    return chosen;
  }

  /**
   * Checks if an interaction should be spoken based on frequency settings
   */
  canTriggerInteraction(settings: CompanionSettings, isUrgentEvent: boolean = false): boolean {
    if (!settings.enabled || settings.quietMode) return false;
    if (isUrgentEvent) return true;

    const now = Date.now();
    const minDelay = settings.frequency === 'minimal' 
      ? 45000 
      : (settings.frequency === 'moderate' ? 20000 : 8000);

    if (now - this.lastTriggerTime < minDelay) {
      return false;
    }

    this.lastTriggerTime = now;
    return true;
  }
}

export const companionEngine = new CompanionEngineService();
