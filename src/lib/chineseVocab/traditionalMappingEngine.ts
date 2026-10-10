// ==============================================================================
// CHINESE VOCABULARY MASTER — TRADITIONAL & SIMPLIFIED MAPPING ENGINE
// ==============================================================================
// Reliable Academic Simplified (简体) <-> Traditional (繁體) Character and Word Mappings.
// Explicitly handles 1-to-many polysemous mappings without destructive character substitution.

import { TraditionalVariant } from './types';

// High-frequency HSK vocabulary and character mapping table
export const VERIFIED_TRADITIONAL_MAP: Record<string, TraditionalVariant> = {
  // Common HSK 1 - HSK 3 core words
  '爱': { simplified: '爱', traditional: '愛', isOneToMany: false },
  '学习': { simplified: '学习', traditional: '學習', isOneToMany: false },
  '学校': { simplified: '学校', traditional: '學校', isOneToMany: false },
  '中国': { simplified: '中国', traditional: '中國', isOneToMany: false },
  '汉语': { simplified: '汉语', traditional: '漢語', isOneToMany: false },
  '老师': { simplified: '老师', traditional: '老師', isOneToMany: false },
  '学生': { simplified: '学生', traditional: '學生', isOneToMany: false },
  '电脑': { simplified: '电脑', traditional: '電腦', isOneToMany: false },
  '电视': { simplified: '电视', traditional: '電視', isOneToMany: false },
  '电影': { simplified: '电影', traditional: '電影', isOneToMany: false },
  '电话': { simplified: '电话', traditional: '電話', isOneToMany: false },
  '书': { simplified: '书', traditional: '書', isOneToMany: false },
  '买': { simplified: '买', traditional: '買', isOneToMany: false },
  '卖': { simplified: '卖', traditional: '賣', isOneToMany: false },
  '听': { simplified: '听', traditional: '聽', isOneToMany: false },
  '说': { simplified: '说', traditional: '說', isOneToMany: false },
  '读': { simplified: '读', traditional: '讀', isOneToMany: false },
  '写': { simplified: '写', traditional: '寫', isOneToMany: false },
  '话': { simplified: '话', traditional: '話', isOneToMany: false },
  '语': { simplified: '语', traditional: '語', isOneToMany: false },
  '开': { simplified: '开', traditional: '開', isOneToMany: false },
  '关': { simplified: '关', traditional: '關', isOneToMany: false },
  '门': { simplified: '门', traditional: '門', isOneToMany: false },
  '间': { simplified: '间', traditional: '間', isOneToMany: false },
  '见': { simplified: '见', traditional: '見', isOneToMany: false },
  '会': { simplified: '会', traditional: '會', isOneToMany: false },
  '这': { simplified: '这', traditional: '這', isOneToMany: false },
  '那': { simplified: '那', traditional: '那', isOneToMany: false },
  '个': { simplified: '个', traditional: '個', isOneToMany: false },
  '们': { simplified: '们', traditional: '們', isOneToMany: false },
  '欢': { simplified: '欢', traditional: '歡', isOneToMany: false },
  '喜欢': { simplified: '喜欢', traditional: '喜歡', isOneToMany: false },
  '认识': { simplified: '认识', traditional: '認識', isOneToMany: false },
  '高兴': { simplified: '高兴', traditional: '高興', isOneToMany: false },
  '谢谢': { simplified: '谢谢', traditional: '謝謝', isOneToMany: false },
  '对不起': { simplified: '对不起', traditional: '對不起', isOneToMany: false },
  '没关系': { simplified: '没关系', traditional: '沒關係', isOneToMany: false },
  '关系': { simplified: '关系', traditional: '關係', isOneToMany: false },
  '时候': { simplified: '时候', traditional: '時候', isOneToMany: false },
  '时间': { simplified: '时间', traditional: '時間', isOneToMany: false },
  '小时': { simplified: '小时', traditional: '小時', isOneToMany: false },
  '分钟': { simplified: '分钟', traditional: '分鐘', isOneToMany: false },
  '飞机': { simplified: '飞机', traditional: '飛機', isOneToMany: false },
  '机场': { simplified: '机场', traditional: '機場', isOneToMany: false },
  '车': { simplified: '车', traditional: '車', isOneToMany: false },
  '车站': { simplified: '车站', traditional: '車站', isOneToMany: false },
  '饭店': { simplified: '饭店', traditional: '飯店', isOneToMany: false },
  '商店': { simplified: '商店', traditional: '商店', isOneToMany: false },
  '医院': { simplified: '医院', traditional: '醫院', isOneToMany: false },
  '医生': { simplified: '医生', traditional: '醫生', isOneToMany: false },
  '钱': { simplified: '钱', traditional: '錢', isOneToMany: false },
  '块': { simplified: '块', traditional: '塊', isOneToMany: false },
  '东': { simplified: '东', traditional: '東', isOneToMany: false },
  '西': { simplified: '西', traditional: '西', isOneToMany: false },
  '东西': { simplified: '东西', traditional: '東西', isOneToMany: false },
  '红': { simplified: '红', traditional: '紅', isOneToMany: false },
  '绿': { simplified: '绿', traditional: '綠', isOneToMany: false },
  '蓝': { simplified: '蓝', traditional: '藍', isOneToMany: false },
  '白': { simplified: '白', traditional: '白', isOneToMany: false },
  '黑': { simplified: '黑', traditional: '黑', isOneToMany: false },
  '黄': { simplified: '黄', traditional: '黃', isOneToMany: false },
  '给': { simplified: '给', traditional: '給', isOneToMany: false },
  '找': { simplified: '找', traditional: '找', isOneToMany: false },
  '等': { simplified: '等', traditional: '等', isOneToMany: false },
  '问': { simplified: '问', traditional: '問', isOneToMany: false },
  '问题': { simplified: '问题', traditional: '問題', isOneToMany: false },
  '题': { simplified: '题', traditional: '題', isOneToMany: false },
  '难': { simplified: '难', traditional: '難', isOneToMany: false },
  '简单': { simplified: '简单', traditional: '簡單', isOneToMany: false },
  '容易': { simplified: '容易', traditional: '容易', isOneToMany: false },
  '帮助': { simplified: '帮助', traditional: '幫助', isOneToMany: false },
  '介绍': { simplified: '介绍', traditional: '介紹', isOneToMany: false },
  '准备': { simplified: '准备', traditional: '準備', isOneToMany: false },
  '运动': { simplified: '运动', traditional: '運動', isOneToMany: false },
  '跑步': { simplified: '跑步', traditional: '跑步', isOneToMany: false },
  '游泳': { simplified: '游泳', traditional: '游泳', isOneToMany: false },
  '身体': { simplified: '身体', traditional: '身體', isOneToMany: false },
  '眼睛': { simplified: '眼睛', traditional: '眼睛', isOneToMany: false },
  '生病': { simplified: '生病', traditional: '生病', isOneToMany: false },
  '药': { simplified: '药', traditional: '藥', isOneToMany: false },
  '环境': { simplified: '环境', traditional: '環境', isOneToMany: false },
  '保护': { simplified: '保护', traditional: '保護', isOneToMany: false },
  '经济': { simplified: '经济', traditional: '經濟', isOneToMany: false },
  '文化': { simplified: '文化', traditional: '文化', isOneToMany: false },
  '社会': { simplified: '社会', traditional: '社會', isOneToMany: false },
  '发展': { simplified: '发展', traditional: '發展', isOneToMany: false },
  '国际': { simplified: '国际', traditional: '國際', isOneToMany: false },
  '国家': { simplified: '国家', traditional: '國家', isOneToMany: false },
  '政府': { simplified: '政府', traditional: '政府', isOneToMany: false },
  '政治': { simplified: '政治', traditional: '政治', isOneToMany: false },

  // Notable 1-to-many mapping characters (phân biệt ngữ cảnh cẩn thận)
  '发': { 
    simplified: '发', 
    traditional: '發', 
    isOneToMany: true, 
    note: 'Trong "phát triển/xuất phát" viết là 發 (fā); trong "tóc/tóc tai" viết là 髮 (fà: 头发 -> 頭髮)' 
  },
  '头发': { simplified: '头发', traditional: '頭髮', isOneToMany: false, note: 'Tóc: dùng chữ 髮' },
  '出发': { simplified: '出发', traditional: '出發', isOneToMany: false, note: 'Xuất phát: dùng chữ 發' },
  '面': { 
    simplified: '面', 
    traditional: '麵', 
    isOneToMany: true, 
    note: 'Mì/bột mì viết là 麵 (麪); mặt/bề mặt viết là 面 (bảo toàn nguyên tự)' 
  },
  '面条': { simplified: '面条', traditional: '麵條', isOneToMany: false, note: 'Mì sợi: dùng chữ 麵' },
  '后面': { simplified: '后面', traditional: '後面', isOneToMany: false, note: 'Phía sau: 后 -> 後' },
  '皇后': { simplified: '皇后', traditional: '皇后', isOneToMany: true, note: 'Hoàng hậu: giữ nguyên chữ 后 (không đổi thành 後)' },
  '钟': { 
    simplified: '钟', 
    traditional: '鐘', 
    isOneToMany: true, 
    note: 'Đồng hồ/chuông dùng 鐘 (鐘錶/分鐘); tình cảm đắm say/họ Chung dùng 鍾 (鍾愛/鍾姓)' 
  },
  '钟表': { simplified: '钟表', traditional: '鐘錶', isOneToMany: false },
  '复': { 
    simplified: '复', 
    traditional: '復', 
    isOneToMany: true, 
    note: 'Phục hồi/lặp lại: 復 (復習/恢復); phức tạp: 複 (複雜); bao phủ/lật đổ: 覆 (覆蓋)' 
  },
  '复习': { simplified: '复习', traditional: '複習', isOneToMany: false, note: 'Ôn tập: dùng 複' },
  '复杂': { simplified: '复杂', traditional: '複雜', isOneToMany: false, note: 'Phức tạp: dùng 複' },
  '恢复': { simplified: '恢复', traditional: '恢復', isOneToMany: false, note: 'Khôi phục: dùng 復' },
  '历': { 
    simplified: '历', 
    traditional: '歷', 
    isOneToMany: true, 
    note: 'Lịch sử/trải qua: 歷 (歷史/經歷); lịch năm tháng: 曆 (日曆/日曆)' 
  },
  '历史': { simplified: '历史', traditional: '歷史', isOneToMany: false },
  '日历': { simplified: '日历', traditional: '日曆', isOneToMany: false }
};

// Single Character Mapping Dictionary (for safe multi-character compounding)
const CHAR_MAP: Record<string, string> = {
  '爱': '愛', '学': '學', '国': '國', '汉': '漢', '语': '語', '师': '師', '生': '生',
  '电': '電', '脑': '腦', '视': '視', '影': '影', '话': '話', '书': '書', '买': '買',
  '卖': '賣', '听': '聽', '说': '說', '读': '讀', '写': '寫', '开': '開', '关': '關',
  '门': '門', '间': '間', '见': '見', '会': '會', '这': '這', '个': '個', '们': '們',
  '欢': '歡', '喜': '喜', '认': '認', '识': '識', '高': '高', '兴': '興', '谢': '謝',
  '对': '對', '系': '係', '时': '時', '候': '候', '分': '分', '钟': '鐘',
  '飞': '飛', '机': '機', '场': '場', '车': '車', '站': '站', '饭': '飯', '店': '店',
  '医': '醫', '钱': '錢', '块': '塊', '东': '東', '给': '給', '问': '問', '题': '題',
  '难': '難', '简': '簡', '单': '單', '帮': '幫', '助': '助', '绍': '紹', '备': '備',
  '运': '運', '动': '動', '体': '體', '药': '藥', '环': '環', '境': '境', '护': '護',
  '经': '經', '济': '濟', '社': '社', '展': '展', '际': '際', '家': '家', '府': '府',
  '条': '條', '表': '錶', '杂': '雜', '历': '歷', '史': '史'
};

/**
 * Look up verified traditional variant for a word
 */
export function getTraditionalVariant(simplified: string): TraditionalVariant | undefined {
  if (!simplified || !simplified.trim()) return undefined;
  const clean = simplified.trim();

  // 1. Direct word map lookup
  if (VERIFIED_TRADITIONAL_MAP[clean]) {
    return VERIFIED_TRADITIONAL_MAP[clean];
  }

  // 2. Safe character-by-character conversion if all characters have direct mapping
  let hasTransformed = false;
  let traditionalComp = '';
  for (const ch of clean) {
    if (CHAR_MAP[ch]) {
      traditionalComp += CHAR_MAP[ch];
      if (CHAR_MAP[ch] !== ch) hasTransformed = true;
    } else {
      traditionalComp += ch;
    }
  }

  if (hasTransformed) {
    return {
      simplified: clean,
      traditional: traditionalComp,
      isOneToMany: false,
      note: 'Ghép từ các bộ ký tự phồn thể chuẩn xác minh'
    };
  }

  return undefined;
}

/**
 * Format Hanzi for display according to user script preference
 */
export function renderChineseScript(
  word: { term: string; traditionalTerm?: string },
  mode: 'simplified' | 'traditional' | 'both' = 'simplified'
): {
  primary: string;
  secondary?: string;
  badge?: string;
} {
  const trad = word.traditionalTerm || getTraditionalVariant(word.term)?.traditional;

  switch (mode) {
    case 'traditional':
      return {
        primary: trad || word.term,
        secondary: trad && trad !== word.term ? `Giản thể: ${word.term}` : undefined,
        badge: '繁體'
      };
    case 'both':
      return {
        primary: word.term,
        secondary: trad && trad !== word.term ? `繁: ${trad}` : undefined,
        badge: '简/繁'
      };
    case 'simplified':
    default:
      return {
        primary: word.term,
        secondary: trad && trad !== word.term ? `Phồn thể: ${trad}` : undefined,
        badge: '简体'
      };
  }
}
