export type GenZMood = 'beast' | 'focus' | 'chill' | 'low_battery' | 'creative';

export interface MoodConfig {
  id: GenZMood;
  emoji: string;
  label: string;
  vibe: string;
  quote: string;
  colorClass: string;
  badgeBg: string;
}

export const MOOD_PRESETS: Record<GenZMood, MoodConfig> = {
  beast: {
    id: 'beast',
    emoji: '🔥',
    label: 'Beast Mode',
    vibe: 'Cày cuốc hết mình, không khoan nhượng',
    quote: '"Hôm nay ta không làm thì ngày mai deadline làm thịt ta."',
    colorClass: 'from-orange-500 to-rose-600',
    badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
  },
  focus: {
    id: 'focus',
    emoji: '⚡',
    label: 'Deep Focus',
    vibe: 'Tắt thông báo, khóa thế giới, bật Flow State',
    quote: '"Một phiên làm việc sâu giá trị hơn 10 tiếng ngồi lướt mạng."',
    colorClass: 'from-indigo-600 to-purple-600',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
  },
  chill: {
    id: 'chill',
    emoji: '☕',
    label: 'Chillin & Flow',
    vibe: 'Nhẹ nhàng làm từng việc, tận hưởng nhịp sống',
    quote: '"Chậm mà chắc, quan trọng là không bỏ cuộc giữa chừng."',
    colorClass: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  low_battery: {
    id: 'low_battery',
    emoji: '🔋',
    label: 'Low Battery (Sắp cạn pin)',
    vibe: 'Ưu tiên việc cốt lõi, nhớ tự thưởng và nghỉ ngơi',
    quote: '"Biết nghỉ ngơi đúng lúc cũng là một loại năng lực thượng thừa."',
    colorClass: 'from-amber-500 to-yellow-600',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  },
  creative: {
    id: 'creative',
    emoji: '✨',
    label: 'Creative Vibe',
    vibe: 'Đầu óc bay bổng, sẵn sàng cho ý tưởng đột phá',
    quote: '"Biến những suy nghĩ lộn xộn thành kiệt tác có hệ thống."',
    colorClass: 'from-fuchsia-500 to-pink-600',
    badgeBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'
  }
};

export function getTodayMood(): GenZMood {
  try {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`lifeos_mood_${today}`);
    if (saved && saved in MOOD_PRESETS) {
      return saved as GenZMood;
    }
  } catch {}
  return 'focus';
}

export function setTodayMood(mood: GenZMood): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`lifeos_mood_${today}`, mood);
  } catch {}
}
