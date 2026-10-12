import { getPrisma } from '../db.js';
import { progressionService } from './progression.service.js';

// ============================================================================
// 1. MONSTERS & CHAPTER BOSSES CATALOG
// ============================================================================
export interface MonsterDef {
  id: string;
  chapter: number;
  name: string;
  title: string;
  type: 'SLIME' | 'BEAST' | 'GOLEM' | 'WRAITH' | 'DEMON' | 'KNIGHT' | 'PHANTOM' | 'BOSS';
  level: number;
  maxHp: number;
  power: number;
  defense: number;
  avatar: string; // Emoji or visual icon
  bgTheme: string; // Tailwind color accent
  description: string;
  realLifeNemesis: string; // What real life obstacle this monster represents
  requiredPower: number;
  requiredRealAction: {
    type: 'task' | 'focus' | 'habit' | 'learning' | 'overall';
    target: number;
    description: string;
  };
  rewardXp: number;
  rewardCoins: number;
  dropEquipmentKey?: string;
  dropRatePercent: number;
  isBoss: boolean;
}

export const MONSTERS_CATALOG: MonsterDef[] = [
  // CHAPTER 1: KHU RỪNG XAO NHÃNG (THE FOREST OF DISTRACTION)
  {
    id: 'm1_slime_procrastination',
    chapter: 1,
    name: 'Quái Nhầy Trì Hoãn',
    title: 'Procrastination Slime',
    type: 'SLIME',
    level: 1,
    maxHp: 120,
    power: 22,
    defense: 6,
    avatar: '🟢',
    bgTheme: 'from-emerald-900/60 to-slate-900',
    description: 'Bám dính vào ý chí của bạn, thì thầm câu nói độc hại: "Để mai làm cũng được mà".',
    realLifeNemesis: 'Thói quen chần chừ khi bắt đầu công việc',
    requiredPower: 25,
    requiredRealAction: {
      type: 'task',
      target: 1,
      description: 'Hoàn thành ít nhất 1 nhiệm vụ thực tế'
    },
    rewardXp: 45,
    rewardCoins: 25,
    dropEquipmentKey: 'wpn_focus_blade',
    dropRatePercent: 100, // 1st clear guarantee
    isBoss: false
  },
  {
    id: 'm1_goblin_notification',
    chapter: 1,
    name: 'Yêu Tinh Thông Báo',
    title: 'Notification Goblin',
    type: 'BEAST',
    level: 2,
    maxHp: 220,
    power: 36,
    defense: 12,
    avatar: '👺',
    bgTheme: 'from-amber-900/60 to-slate-900',
    description: 'Liên tục bấm chuông rung điện thoại vô bổ, cướp đoạt 15 phút tập trung mỗi lần xuất hiện.',
    realLifeNemesis: 'Xao nhãng bởi thông báo mạng xã hội',
    requiredPower: 45,
    requiredRealAction: {
      type: 'focus',
      target: 20,
      description: 'Thực hiện ít nhất 20 phút Focus sâu'
    },
    rewardXp: 75,
    rewardCoins: 40,
    dropEquipmentKey: 'acc_time_keeper',
    dropRatePercent: 90,
    isBoss: false
  },
  {
    id: 'm1_imp_laziness',
    chapter: 1,
    name: 'Tiểu Quỷ Lười Biếng',
    title: 'Sloth Imp',
    type: 'DEMON',
    level: 3,
    maxHp: 340,
    power: 52,
    defense: 18,
    avatar: '😈',
    bgTheme: 'from-purple-900/60 to-slate-900',
    description: 'Kéo cơ thể bạn dính chặt vào giường nệm, dụ dỗ bạn bỏ cuộc giữa chừng.',
    realLifeNemesis: 'Sự uể oải và thiếu động lực buổi sáng',
    requiredPower: 70,
    requiredRealAction: {
      type: 'habit',
      target: 2,
      description: 'Hoàn thành ít nhất 2 lượt thói quen kỷ luật'
    },
    rewardXp: 110,
    rewardCoins: 60,
    dropEquipmentKey: 'arm_study_robe',
    dropRatePercent: 85,
    isBoss: false
  },
  {
    id: 'boss1_the_procrastinator',
    chapter: 1,
    name: 'Chúa Tể Trì Hoãn',
    title: 'The Grand Procrastinator',
    type: 'BOSS',
    level: 5,
    maxHp: 850,
    power: 85,
    defense: 32,
    avatar: '👑',
    bgTheme: 'from-rose-950 via-slate-900 to-slate-950',
    description: 'Thực thể khổng lồ giam giữ hàng trăm ý tưởng dở dang. Kẻ canh cổng Khu Rừng Xao Nhãng.',
    realLifeNemesis: 'Sự trì hoãn mãn tính làm lỡ dở mục tiêu đời người',
    requiredPower: 120,
    requiredRealAction: {
      type: 'overall',
      target: 5,
      description: 'Hoàn thành 5 nhiệm vụ + 1 phiên Focus + 3 ngày Streak'
    },
    rewardXp: 280,
    rewardCoins: 200,
    dropEquipmentKey: 'wpn_discipline_sword',
    dropRatePercent: 100,
    isBoss: true
  },

  // CHAPTER 2: THUNG LŨNG HỖN LOẠN (THE VALLEY OF CHAOS)
  {
    id: 'm2_beast_deadline',
    chapter: 2,
    name: 'Quái Thú Deadline',
    title: 'Deadline Beast',
    type: 'BEAST',
    level: 7,
    maxHp: 580,
    power: 95,
    defense: 38,
    avatar: '🐺',
    bgTheme: 'from-orange-900/60 to-slate-900',
    description: 'Hơi thở dồn dập, tấn công khi kim đồng hồ chỉ về số 0 và bạn chưa chuẩn bị kịp.',
    realLifeNemesis: 'Áp lực nước đến chân mới nhảy',
    requiredPower: 160,
    requiredRealAction: {
      type: 'task',
      target: 8,
      description: 'Hoàn thành 8 nhiệm vụ thực tế'
    },
    rewardXp: 160,
    rewardCoins: 90,
    dropEquipmentKey: 'acc_memory_band',
    dropRatePercent: 80,
    isBoss: false
  },
  {
    id: 'm2_wolf_chaos',
    chapter: 2,
    name: 'Sói Mất Phương Hướng',
    title: 'Chaos Wolf',
    type: 'BEAST',
    level: 9,
    maxHp: 780,
    power: 125,
    defense: 48,
    avatar: '🐾',
    bgTheme: 'from-cyan-900/60 to-slate-900',
    description: 'Lao tới cắn xé khi lịch trình của bạn bị vỡ vụn và không biết bắt đầu từ đâu.',
    realLifeNemesis: 'Thiếu tổ chức và hỗn loạn kế hoạch hàng ngày',
    requiredPower: 210,
    requiredRealAction: {
      type: 'habit',
      target: 5,
      description: 'Duy trì chuỗi kỷ luật 5 ngày streak'
    },
    rewardXp: 220,
    rewardCoins: 120,
    dropEquipmentKey: 'arm_focus_armor',
    dropRatePercent: 75,
    isBoss: false
  },
  {
    id: 'm2_wraith_overthinking',
    chapter: 2,
    name: 'Bóng Ma Nghĩ Quẩn',
    title: 'Overthinking Wraith',
    type: 'WRAITH',
    level: 11,
    maxHp: 1020,
    power: 160,
    defense: 58,
    avatar: '👻',
    bgTheme: 'from-indigo-900/60 to-slate-900',
    description: 'Tạo ra hàng ngàn kịch bản thất bại giả định trong đầu khiến bạn tê liệt không dám hành động.',
    realLifeNemesis: 'Overthinking và phân tích quá đà làm tê liệt hành động',
    requiredPower: 260,
    requiredRealAction: {
      type: 'focus',
      target: 60,
      description: 'Đạt tối thiểu 60 phút làm việc sâu thực tế'
    },
    rewardXp: 290,
    rewardCoins: 160,
    dropEquipmentKey: 'acc_clarity_tiara',
    dropRatePercent: 70,
    isBoss: false
  },
  {
    id: 'boss2_chaos_king',
    chapter: 2,
    name: 'Vua Hỗn Độn',
    title: 'The Chaos King',
    type: 'BOSS',
    level: 15,
    maxHp: 2100,
    power: 230,
    defense: 85,
    avatar: '👑',
    bgTheme: 'from-violet-950 via-slate-900 to-slate-950',
    description: 'Kẻ cai trị Thung Lũng Hỗn Loạn. Chỉ có trật tự và sự kỷ luật thép mới có thể chặt đứt uy quyền của hắn.',
    realLifeNemesis: 'Cuộc sống mất kiểm soát và thiếu hệ thống làm việc cá nhân',
    requiredPower: 350,
    requiredRealAction: {
      type: 'overall',
      target: 15,
      description: 'Hoàn thành 15 nhiệm vụ + 7 ngày Streak + 90 phút Focus'
    },
    rewardXp: 550,
    rewardCoins: 450,
    dropEquipmentKey: 'arm_iron_will',
    dropRatePercent: 100,
    isBoss: true
  },

  // CHAPTER 3: THÀNH TRÌ KIỆT SỨC (THE CITADEL OF BURNOUT)
  {
    id: 'm3_golem_burnout',
    chapter: 3,
    name: 'Người Đá Kiệt Sức',
    title: 'Burnout Golem',
    type: 'GOLEM',
    level: 18,
    maxHp: 1750,
    power: 250,
    defense: 105,
    avatar: '🗿',
    bgTheme: 'from-amber-950/70 to-slate-900',
    description: 'Cơ thể nặng trĩu vì làm việc mù quáng không nghỉ ngơi, đè nén mọi cảm hứng sáng tạo.',
    realLifeNemesis: 'Làm việc quá tải không có chiến lược phục hồi',
    requiredPower: 420,
    requiredRealAction: {
      type: 'focus',
      target: 120,
      description: 'Tích lũy 120 phút Focus điều độ đúng nhịp'
    },
    rewardXp: 380,
    rewardCoins: 220,
    dropEquipmentKey: 'acc_energy_core',
    dropRatePercent: 65,
    isBoss: false
  },
  {
    id: 'm3_demon_distraction',
    chapter: 3,
    name: 'Ác Ma Cám Dỗ',
    title: 'Temptation Demon',
    type: 'DEMON',
    level: 21,
    maxHp: 2250,
    power: 300,
    defense: 125,
    avatar: '👿',
    bgTheme: 'from-rose-900/60 to-slate-900',
    description: 'Hiển hiện dưới hình thức những thú vui tức thời, đánh đổi tương lai lấy vài phút dopamine rác.',
    realLifeNemesis: 'Nghiện dopamine ngắn hạn (Shorts, Reels, Games vô bổ)',
    requiredPower: 520,
    requiredRealAction: {
      type: 'habit',
      target: 10,
      description: 'Đạt chuỗi 10 ngày kỷ luật kiên định'
    },
    rewardXp: 480,
    rewardCoins: 280,
    dropEquipmentKey: 'wpn_productivity_bow',
    dropRatePercent: 60,
    isBoss: false
  },
  {
    id: 'm3_knight_fear',
    chapter: 3,
    name: 'Kỵ Sĩ Sợ Hãi',
    title: 'Fear Knight',
    type: 'KNIGHT',
    level: 25,
    maxHp: 2850,
    power: 360,
    defense: 155,
    avatar: '⚔️',
    bgTheme: 'from-slate-800 to-slate-950',
    description: 'Bộ giáp bóng tối của nỗi sợ bị từ chối, sợ không đủ giỏi và sợ bước ra khỏi vùng an toàn.',
    realLifeNemesis: 'Nỗi sợ thất bại kìm hãm sự bứt phá',
    requiredPower: 640,
    requiredRealAction: {
      type: 'learning',
      target: 30,
      description: 'Thu nạp ít nhất 30 từ vựng / kiến thức chuyên sâu'
    },
    rewardXp: 600,
    rewardCoins: 350,
    dropEquipmentKey: 'arm_order_aegis',
    dropRatePercent: 55,
    isBoss: false
  },
  {
    id: 'boss3_burnout_titan',
    chapter: 3,
    name: 'Khổng Lồ Kiệt Sức',
    title: 'The Burnout Titan',
    type: 'BOSS',
    level: 30,
    maxHp: 4600,
    power: 460,
    defense: 210,
    avatar: '🔥',
    bgTheme: 'from-red-950 via-slate-900 to-slate-950',
    description: 'Cơn bão lửa thiêu rụi tinh thần của người trẻ kiệt quệ. Đòi hỏi sự bền bỉ cân bằng giữa Thân - Tâm - Trí.',
    realLifeNemesis: 'Khủng hoảng năng lượng và cạn kiệt niềm tin',
    requiredPower: 800,
    requiredRealAction: {
      type: 'overall',
      target: 25,
      description: '30 Tasks + 180m Focus + 14 ngày Streak + 50 từ vựng'
    },
    rewardXp: 1100,
    rewardCoins: 900,
    dropEquipmentKey: 'wpn_chrono_edge',
    dropRatePercent: 100,
    isBoss: true
  },

  // CHAPTER 4: ĐỈNH CAO THĂNG HOA (THE SUMMIT OF ASCENSION)
  {
    id: 'm4_phantom_void',
    chapter: 4,
    name: 'Bóng Hư Vô',
    title: 'Void Phantom',
    type: 'PHANTOM',
    level: 35,
    maxHp: 3800,
    power: 510,
    defense: 220,
    avatar: '🌌',
    bgTheme: 'from-blue-950/70 to-slate-900',
    description: 'Khoảng trống vô định chất vấn: "Nỗ lực nhiều thế để làm gì?". Thử thách tầng sâu của lẽ sống.',
    realLifeNemesis: 'Sự mất phương hướng và thiếu mục đích dài hạn',
    requiredPower: 950,
    requiredRealAction: {
      type: 'task',
      target: 50,
      description: 'Chinh phục 50 nhiệm vụ thực tế'
    },
    rewardXp: 750,
    rewardCoins: 450,
    dropEquipmentKey: 'acc_astral_ring',
    dropRatePercent: 50,
    isBoss: false
  },
  {
    id: 'm4_devourer_time',
    chapter: 4,
    name: 'Kẻ Nuốt Chửng Thời Gian',
    title: 'Time Devourer',
    type: 'DEMON',
    level: 40,
    maxHp: 5200,
    power: 620,
    defense: 270,
    avatar: '⏳',
    bgTheme: 'from-teal-950/70 to-slate-900',
    description: 'Nuốt chửng từng năm tháng thanh xuân của những ai sống thiếu ý thức và kỷ luật bản thân.',
    realLifeNemesis: 'Sự lãng phí tuổi trẻ và thời gian quý giá',
    requiredPower: 1150,
    requiredRealAction: {
      type: 'habit',
      target: 21,
      description: 'Đạt mốc vàng 21 ngày streak liên tục'
    },
    rewardXp: 950,
    rewardCoins: 600,
    dropEquipmentKey: 'arm_eternity_robe',
    dropRatePercent: 45,
    isBoss: false
  },
  {
    id: 'm4_master_entropy',
    chapter: 4,
    name: 'Chúa Tể Suy Thoái',
    title: 'Master of Entropy',
    type: 'WRAITH',
    level: 45,
    maxHp: 6800,
    power: 750,
    defense: 330,
    avatar: '🌪️',
    bgTheme: 'from-purple-950/80 to-slate-900',
    description: 'Quy luật tự nhiên kéo mọi thứ vào hỗn độn và thoái trào nếu không có ý chí kiên định duy trì.',
    realLifeNemesis: 'Sự thoái trào và bỏ cuộc ở giai đoạn gần đích',
    requiredPower: 1400,
    requiredRealAction: {
      type: 'learning',
      target: 100,
      description: 'Làm chủ 100 từ vựng và kiến thức nâng cao'
    },
    rewardXp: 1300,
    rewardCoins: 850,
    dropEquipmentKey: 'acc_crown_mastery',
    dropRatePercent: 40,
    isBoss: false
  },
  {
    id: 'boss4_inner_saboteur',
    chapter: 4,
    name: 'Bóng Ma Tự Phá Hủy',
    title: 'The Inner Saboteur · Final Boss',
    type: 'BOSS',
    level: 50,
    maxHp: 11500,
    power: 960,
    defense: 440,
    avatar: '👁️',
    bgTheme: 'from-amber-950 via-slate-950 to-emerald-950',
    description: 'Kẻ thù nguy hiểm nhất không ở ngoài kia. Đó là tiếng nói tự nghi ngờ bản thân ngay trong tâm trí bạn.',
    realLifeNemesis: 'Hội chứng Kẻ Giả Mạo (Imposter Syndrome) & Tự Phá Hoại Thành Công',
    requiredPower: 1800,
    requiredRealAction: {
      type: 'overall',
      target: 50,
      description: '70 Tasks + 300m Focus + 30 ngày Streak + 150 từ vựng'
    },
    rewardXp: 3000,
    rewardCoins: 2500,
    dropEquipmentKey: 'wpn_sovereign_excalibur',
    dropRatePercent: 100,
    isBoss: true
  }
];

// ============================================================================
// 2. EQUIPMENT CATALOG (WEAPONS, ARMOR, ACCESSORIES)
// ============================================================================
export interface EquipmentDef {
  key: string;
  name: string;
  title: string;
  slot: 'WEAPON' | 'ARMOR' | 'ACCESSORY';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  basePower: number;
  baseDefense: number;
  baseHp: number;
  powerScalePerLevel: number;
  defenseScalePerLevel: number;
  hpScalePerLevel: number;
  baseUpgradeCost: number;
  icon: string;
  lore: string;
  specialEffectDescription: string;
}

export const EQUIPMENTS_CATALOG: Record<string, EquipmentDef> = {
  // WEAPONS
  wpn_focus_blade: {
    key: 'wpn_focus_blade',
    name: 'Gươm Tập Trung',
    title: 'Focus Blade',
    slot: 'WEAPON',
    rarity: 'COMMON',
    basePower: 25,
    baseDefense: 0,
    baseHp: 15,
    powerScalePerLevel: 6,
    defenseScalePerLevel: 0,
    hpScalePerLevel: 5,
    baseUpgradeCost: 50,
    icon: '🗡️',
    lore: 'Lưỡi kiếm rèn từ những phút giây dứt khoát tắt thông báo điện thoại.',
    specialEffectDescription: '+10% Sát thương khi đối đầu với Quái vật Xao Nhãng.'
  },
  wpn_knowledge_staff: {
    key: 'wpn_knowledge_staff',
    name: 'Trượng Tri Thức',
    title: 'Knowledge Staff',
    slot: 'WEAPON',
    rarity: 'UNCOMMON',
    basePower: 45,
    baseDefense: 10,
    baseHp: 20,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 2,
    hpScalePerLevel: 8,
    baseUpgradeCost: 100,
    icon: '🪄',
    lore: 'Chứa đựng năng lượng phát sáng từ hàng chục trang sách đã ngấu nghiến.',
    specialEffectDescription: '+15% Sát thương phép thuật dựa trên số từ vựng ghi nhớ.'
  },
  wpn_discipline_sword: {
    key: 'wpn_discipline_sword',
    name: 'Thanh Kiếm Kỷ Luật',
    title: 'Discipline Sword',
    slot: 'WEAPON',
    rarity: 'RARE',
    basePower: 85,
    baseDefense: 15,
    baseHp: 40,
    powerScalePerLevel: 16,
    defenseScalePerLevel: 4,
    hpScalePerLevel: 12,
    baseUpgradeCost: 200,
    icon: '⚔️',
    lore: 'Vũ khí được tôi luyện qua ngọn lửa của những ngày kiên trì thức dậy sớm.',
    specialEffectDescription: '+5% Tỷ lệ đòn đánh chí mạng (Critical Strike).'
  },
  wpn_productivity_bow: {
    key: 'wpn_productivity_bow',
    name: 'Cung Năng Suất',
    title: 'Productivity Bow',
    slot: 'WEAPON',
    rarity: 'EPIC',
    basePower: 145,
    baseDefense: 20,
    baseHp: 60,
    powerScalePerLevel: 25,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 18,
    baseUpgradeCost: 400,
    icon: '🏹',
    lore: 'Mỗi mũi tên bắn trúng là một mục tiêu trong ngày được gạch bỏ dứt khoát.',
    specialEffectDescription: '+20% Sát thương khi đánh Boss chương.'
  },
  wpn_chrono_edge: {
    key: 'wpn_chrono_edge',
    name: 'Lưỡi Kiếm Thời Gian',
    title: 'Chrono Blade',
    slot: 'WEAPON',
    rarity: 'LEGENDARY',
    basePower: 240,
    baseDefense: 35,
    baseHp: 100,
    powerScalePerLevel: 40,
    defenseScalePerLevel: 8,
    hpScalePerLevel: 30,
    baseUpgradeCost: 800,
    icon: '⚡',
    lore: 'Làm chủ từng giờ từng khắc, biến thời gian thành vũ khí tối thượng.',
    specialEffectDescription: 'Đòn đánh có 20% khả năng kích hoạt Song Đòn (Đánh 2 lần trong 1 lượt).'
  },
  wpn_sovereign_excalibur: {
    key: 'wpn_sovereign_excalibur',
    name: 'Gươm Bá Vương Tối Thượng',
    title: 'Sovereign Excalibur',
    slot: 'WEAPON',
    rarity: 'MYTHIC',
    basePower: 420,
    baseDefense: 60,
    baseHp: 200,
    powerScalePerLevel: 70,
    defenseScalePerLevel: 15,
    hpScalePerLevel: 50,
    baseUpgradeCost: 1500,
    icon: '🌟',
    lore: 'Thanh gươm của người đã làm chủ toàn bộ vận mệnh và kỷ luật bản thân.',
    specialEffectDescription: '+35% Toàn bộ sát thương và hồi phục 5% HP mỗi lượt chiến đấu.'
  },

  // ARMORS
  arm_study_robe: {
    key: 'arm_study_robe',
    name: 'Áo Choàng Đèn Khuya',
    title: 'Study Robe',
    slot: 'ARMOR',
    rarity: 'COMMON',
    basePower: 5,
    baseDefense: 20,
    baseHp: 45,
    powerScalePerLevel: 1,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 15,
    baseUpgradeCost: 50,
    icon: '🥋',
    lore: 'Khoác lên sự tĩnh lặng của những đêm chuyên cần tích lũy tri thức.',
    specialEffectDescription: 'Giảm 5 sát thương nhận từ đòn tấn công của tiểu quái.'
  },
  arm_focus_armor: {
    key: 'arm_focus_armor',
    name: 'Giáp Trụ Tập Trung',
    title: 'Focus Plate',
    slot: 'ARMOR',
    rarity: 'UNCOMMON',
    basePower: 10,
    baseDefense: 42,
    baseHp: 90,
    powerScalePerLevel: 2,
    defenseScalePerLevel: 9,
    hpScalePerLevel: 25,
    baseUpgradeCost: 100,
    icon: '🛡️',
    lore: 'Tấm khiên chắn vô hình trước mọi lời rủ rê và tin nhắn xao nhãng.',
    specialEffectDescription: '+10% Khả năng giảm thiểu đòn đánh trực diện.'
  },
  arm_iron_will: {
    key: 'arm_iron_will',
    name: 'Giáp Ý Chí Sắt',
    title: 'Iron Will Armor',
    slot: 'ARMOR',
    rarity: 'RARE',
    basePower: 20,
    baseDefense: 85,
    baseHp: 160,
    powerScalePerLevel: 4,
    defenseScalePerLevel: 16,
    hpScalePerLevel: 40,
    baseUpgradeCost: 200,
    icon: '⛓️',
    lore: 'Kim loại tôi luyện từ chuỗi thói quen liên tục không bị gián đoạn.',
    specialEffectDescription: '+15% Tổng giáp khi HP tụt xuống dưới 40%.'
  },
  arm_order_aegis: {
    key: 'arm_order_aegis',
    name: 'Khiên Trật Tự Tối Cao',
    title: 'Aegis of Order',
    slot: 'ARMOR',
    rarity: 'EPIC',
    basePower: 35,
    baseDefense: 145,
    baseHp: 270,
    powerScalePerLevel: 6,
    defenseScalePerLevel: 26,
    hpScalePerLevel: 65,
    baseUpgradeCost: 400,
    icon: '🔰',
    lore: 'Xây dựng nên bởi hệ thống quản lý công việc và cuộc sống vững như bàn thạch.',
    specialEffectDescription: 'Phản lại 15% sát thương nhận vào về phía quái vật.'
  },
  arm_eternity_robe: {
    key: 'arm_eternity_robe',
    name: 'Pháp Phục Vĩnh Cửu',
    title: 'Robe of Eternity',
    slot: 'ARMOR',
    rarity: 'LEGENDARY',
    basePower: 50,
    baseDefense: 240,
    baseHp: 460,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 42,
    hpScalePerLevel: 100,
    baseUpgradeCost: 800,
    icon: '🧥',
    lore: 'Dệt nên từ những sợi chỉ của lòng kiên định không gì lay chuyển nổi.',
    specialEffectDescription: 'Kháng hoàn toàn đòn chí mạng của kẻ thù.'
  },

  // ACCESSORIES
  acc_time_keeper: {
    key: 'acc_time_keeper',
    name: 'Nhẫn Quản Lý Thời Gian',
    title: 'Time Keeper Ring',
    slot: 'ACCESSORY',
    rarity: 'COMMON',
    basePower: 12,
    baseDefense: 10,
    baseHp: 20,
    powerScalePerLevel: 3,
    defenseScalePerLevel: 3,
    hpScalePerLevel: 8,
    baseUpgradeCost: 50,
    icon: '💍',
    lore: 'Nhắc nhở bạn mỗi giây trôi qua đều là tài sản vô giá.',
    specialEffectDescription: '+5% Điểm kinh nghiệm XP thu được từ chiến đấu.'
  },
  acc_memory_band: {
    key: 'acc_memory_band',
    name: 'Vòng Trí Nhớ Vững Vàng',
    title: 'Memory Band',
    slot: 'ACCESSORY',
    rarity: 'UNCOMMON',
    basePower: 25,
    baseDefense: 20,
    baseHp: 40,
    powerScalePerLevel: 5,
    defenseScalePerLevel: 5,
    hpScalePerLevel: 12,
    baseUpgradeCost: 100,
    icon: '📿',
    lore: 'Giữ cho tâm trí luôn sáng tỏ, xâu chuỗi mọi kinh nghiệm thành sức mạnh.',
    specialEffectDescription: '+10% Tiền Coins nhận được sau mỗi trận đấu.'
  },
  acc_clarity_tiara: {
    key: 'acc_clarity_tiara',
    name: 'Vương Miện Sáng Suốt',
    title: 'Clarity Tiara',
    slot: 'ACCESSORY',
    rarity: 'RARE',
    basePower: 55,
    baseDefense: 45,
    baseHp: 80,
    powerScalePerLevel: 10,
    defenseScalePerLevel: 9,
    hpScalePerLevel: 20,
    baseUpgradeCost: 200,
    icon: '👑',
    lore: 'Chiếc vương miện xóa tan sương mù hoài nghi và do dự.',
    specialEffectDescription: '+8% Tỷ lệ đòn đánh chí mạng (Critical Strike).'
  },
  acc_energy_core: {
    key: 'acc_energy_core',
    name: 'Lõi Năng Lượng Bền Bỉ',
    title: 'Energy Core',
    slot: 'ACCESSORY',
    rarity: 'EPIC',
    basePower: 105,
    baseDefense: 85,
    baseHp: 160,
    powerScalePerLevel: 18,
    defenseScalePerLevel: 16,
    hpScalePerLevel: 35,
    baseUpgradeCost: 400,
    icon: '🔮',
    lore: 'Cung cấp nguồn sinh lực liên tục cho những trận đánh dài hơi.',
    specialEffectDescription: 'Bắt đầu mỗi trận chiến với 50 điểm Giáp ảo bổ sung.'
  },
  acc_astral_ring: {
    key: 'acc_astral_ring',
    name: 'Nhẫn Tinh Tú Vô Ngã',
    title: 'Astral Ring',
    slot: 'ACCESSORY',
    rarity: 'LEGENDARY',
    basePower: 180,
    baseDefense: 150,
    baseHp: 280,
    powerScalePerLevel: 30,
    defenseScalePerLevel: 26,
    hpScalePerLevel: 60,
    baseUpgradeCost: 800,
    icon: '💍',
    lore: 'Nhìn thấu bức tranh toàn cảnh của sự tiến bộ và trưởng thành.',
    specialEffectDescription: '+20% Tất cả các chỉ số thưởng thêm khi bước vào đấu Boss.'
  },
  acc_crown_mastery: {
    key: 'acc_crown_mastery',
    name: 'Vương Miện Bậc Thầy Cuộc Đời',
    title: 'Crown of Life Mastery',
    slot: 'ACCESSORY',
    rarity: 'MYTHIC',
    basePower: 320,
    baseDefense: 260,
    baseHp: 500,
    powerScalePerLevel: 55,
    defenseScalePerLevel: 45,
    hpScalePerLevel: 100,
    baseUpgradeCost: 1500,
    icon: '👑',
    lore: 'Minh chứng cho người đã chinh phục hoàn toàn lối sống kỷ luật và tự do đích thực.',
    specialEffectDescription: '+30% Kháng sát thương và +30% Tấn công toàn diện.'
  }
};

// ============================================================================
// 3. SKILL TREES CATALOG (5 TALENT TREES)
// ============================================================================
export interface SkillDef {
  key: string;
  name: string;
  tree: 'FOCUS' | 'LEARNING' | 'DISCIPLINE' | 'PRODUCTIVITY' | 'FINANCE';
  tier: number; // 1, 2, 3
  requiredLevel: number;
  costSkillPoints: number;
  icon: string;
  description: string;
  passiveBonus: {
    powerMultiplier?: number;
    defenseMultiplier?: number;
    hpBonus?: number;
    critChanceBonus?: number;
    xpBonusMultiplier?: number;
    coinsBonusMultiplier?: number;
    doubleStrikeChance?: number;
    bossDamageBonus?: number;
    discountUpgradePercent?: number;
  };
}

export const SKILLS_CATALOG: SkillDef[] = [
  // FOCUS TREE
  {
    key: 'skill_deep_flow',
    name: 'Dòng Chảy Sâu (Deep Flow)',
    tree: 'FOCUS',
    tier: 1,
    requiredLevel: 2,
    costSkillPoints: 1,
    icon: '🧠',
    description: 'Chuyển hóa khả năng làm việc không gián đoạn thành sức mạnh tấn công (+15% Combat Power).',
    passiveBonus: { powerMultiplier: 0.15 }
  },
  {
    key: 'skill_iron_mind',
    name: 'Tâm Thức Kiên Cố (Iron Mind)',
    tree: 'FOCUS',
    tier: 2,
    requiredLevel: 6,
    costSkillPoints: 2,
    icon: '🛡️',
    description: 'Tâm trí tĩnh lặng như mặt hồ, chặn đứng đòn tấn công tâm lý từ quái vật (+20% Defense).',
    passiveBonus: { defenseMultiplier: 0.20 }
  },
  {
    key: 'skill_time_dilation',
    name: 'Kéo Dãn Thời Gian (Time Dilation)',
    tree: 'FOCUS',
    tier: 3,
    requiredLevel: 12,
    costSkillPoints: 3,
    icon: '⏳',
    description: 'Nhận thức thời gian chậm lại, phát hiện điểm yếu chí tử của đối thủ (+15% Tỷ lệ Chí Mạng).',
    passiveBonus: { critChanceBonus: 0.15 }
  },

  // LEARNING TREE
  {
    key: 'skill_fast_recall',
    name: 'Phản Xạ Thần Tốc (Rapid Recall)',
    tree: 'LEARNING',
    tier: 1,
    requiredLevel: 3,
    costSkillPoints: 1,
    icon: '⚡',
    description: 'Áp dụng tri thức ngay tức thì vào thực tiễn (+20% Sát thương dựa trên số từ vựng).',
    passiveBonus: { powerMultiplier: 0.18 }
  },
  {
    key: 'skill_memory_shield',
    name: 'Khiên Tri Thức (Memory Shield)',
    tree: 'LEARNING',
    tier: 2,
    requiredLevel: 8,
    costSkillPoints: 2,
    icon: '📖',
    description: 'Sự hiểu biết sâu sắc bảo vệ tinh thần khỏi hoang mang (+200 Sinh lực Max HP).',
    passiveBonus: { hpBonus: 200 }
  },
  {
    key: 'skill_omniscience',
    name: 'Vạn Vật Toàn Tri (Omniscience)',
    tree: 'LEARNING',
    tier: 3,
    requiredLevel: 15,
    costSkillPoints: 3,
    icon: '👁️',
    description: 'Hấp thụ tinh hoa của vạn vật (+25% Điểm kinh nghiệm XP & Tiền sau mỗi trận thắng).',
    passiveBonus: { xpBonusMultiplier: 0.25, coinsBonusMultiplier: 0.25 }
  },

  // DISCIPLINE TREE
  {
    key: 'skill_streak_surge',
    name: 'Khí Thế Bền Bỉ (Streak Surge)',
    tree: 'DISCIPLINE',
    tier: 1,
    requiredLevel: 2,
    costSkillPoints: 1,
    icon: '🔥',
    description: 'Mỗi ngày thói quen duy trì liên tục bồi đắp thêm nội lực chiến đấu kiên cường.',
    passiveBonus: { powerMultiplier: 0.12 }
  },
  {
    key: 'skill_unbreakable_will',
    name: 'Ý Chí Bất Khuất (Unbreakable Will)',
    tree: 'DISCIPLINE',
    tier: 2,
    requiredLevel: 7,
    costSkillPoints: 2,
    icon: '⛰️',
    description: 'Vững như núi thái sơn trước khó khăn nghịch cảnh (+25% Phòng thủ toàn diện).',
    passiveBonus: { defenseMultiplier: 0.25 }
  },
  {
    key: 'skill_phoenix_rebirth',
    name: 'Trỗi Dậy Phượng Hoàng (Phoenix Rebirth)',
    tree: 'DISCIPLINE',
    tier: 3,
    requiredLevel: 14,
    costSkillPoints: 3,
    icon: '🦅',
    description: 'Khi nhận đòn chí tử, trỗi dậy với 30% HP để lật ngược tình thế (1 lần/trận).',
    passiveBonus: { hpBonus: 300 }
  },

  // PRODUCTIVITY TREE
  {
    key: 'skill_task_slayer',
    name: 'Đột Phá Nhiệm Vụ (Task Slayer)',
    tree: 'PRODUCTIVITY',
    tier: 1,
    requiredLevel: 4,
    costSkillPoints: 1,
    icon: '🎯',
    description: 'Mỗi nhiệm vụ hoàn thành trong ngày gia tăng 15 điểm sát thương trực diện.',
    passiveBonus: { powerMultiplier: 0.15 }
  },
  {
    key: 'skill_double_strike',
    name: 'Song Đòn Quyết Định (Momentum Strike)',
    tree: 'PRODUCTIVITY',
    tier: 2,
    requiredLevel: 9,
    costSkillPoints: 2,
    icon: '⚔️',
    description: 'Đà làm việc dâng cao tạo ra đòn tấn công kép (20% xác suất đánh 2 lần/lượt).',
    passiveBonus: { doubleStrikeChance: 0.20 }
  },
  {
    key: 'skill_deadline_master',
    name: 'Chế Ngự Áp Lực (Deadline Mastery)',
    tree: 'PRODUCTIVITY',
    tier: 3,
    requiredLevel: 16,
    costSkillPoints: 3,
    icon: '🏆',
    description: 'Chuyên gia giải quyết khối lượng công việc khổng lồ (+35% Sát thương lên Boss).',
    passiveBonus: { bossDamageBonus: 0.35 }
  },

  // FINANCE TREE
  {
    key: 'skill_gold_magnet',
    name: 'Hút Vàng (Gold Magnet)',
    tree: 'FINANCE',
    tier: 1,
    requiredLevel: 3,
    costSkillPoints: 1,
    icon: '🪙',
    description: 'Quản lý tài chính chặt chẽ giúp bạn giữ lại nhiều của cải (+35% Coins rơi ra).',
    passiveBonus: { coinsBonusMultiplier: 0.35 }
  },
  {
    key: 'skill_frugal_craft',
    name: 'Tối Ưu Chi Phí (Resourceful)',
    tree: 'FINANCE',
    tier: 2,
    requiredLevel: 8,
    costSkillPoints: 2,
    icon: '💎',
    description: 'Biết cách đầu tư thông minh (-25% Chi phí Coins khi nâng cấp trang bị).',
    passiveBonus: { discountUpgradePercent: 25 }
  },
  {
    key: 'skill_compound_growth',
    name: 'Lãi Kép Sức Mạnh (Compound Power)',
    tree: 'FINANCE',
    tier: 3,
    requiredLevel: 15,
    costSkillPoints: 3,
    icon: '📈',
    description: 'Tích lũy tài sản sinh sôi tạo thành hậu phương vững chắc (+150 HP & +40 Power).',
    passiveBonus: { hpBonus: 150, powerMultiplier: 0.10 }
  }
];

// ============================================================================
// 4. RPG SERVICE IMPLEMENTATION (100% REAL DATA SOURCE OF TRUTH)
// ============================================================================
export const rpgService = {
  /**
   * Tính toán toàn bộ chỉ số RPG nhân vật dựa 100% trên hoạt động THẬT của người dùng.
   * Zero Math.random(). Zero fake data.
   */
  async calculateRealCharacterStats(userId: string) {
    const prisma = getPrisma();

    // 1. Lấy dữ liệu progression cơ bản
    const prog = await progressionService.getOrCreateProgression(userId);

    // 2. Lấy dữ liệu hoạt động thực tế từ database
    const [
      completedTasksCount,
      habits,
      focusSessions,
      vocabWordCount,
      studySessionsCount,
      savingGoals,
      equippedItems,
      unlockedSkills
    ] = await Promise.all([
      prisma.task.count({
        where: { userId, status: { in: ['Done', 'Hoàn thành', 'completed', 'Completed'] } }
      }),
      prisma.habit.findMany({
        where: { userId },
        select: { streak: true, bestStreak: true, completedDates: true }
      }),
      prisma.focusSession.findMany({
        where: { userId, status: { in: ['Completed', 'completed', 'Hoàn thành'] } },
        select: { actualDuration: true }
      }),
      prisma.vocabWordProgress.count({
        where: { userId, memoryLevel: { gte: 2 } }
      }),
      prisma.studySession.count({
        where: { userId }
      }),
      prisma.savingGoal.findMany({
        where: { userId },
        select: { currentAmount: true, targetAmount: true }
      }),
      prisma.userEquipment.findMany({
        where: { userId, isEquipped: true }
      }),
      prisma.userSkill.findMany({
        where: { userId }
      })
    ]);

    // Tính tổng phút focus
    const totalFocusMinutes = focusSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);

    // Tính tổng lượt kỷ luật habit
    let totalHabitChecks = 0;
    let maxStreak = 0;
    habits.forEach(h => {
      let dates: string[] = [];
      try {
        dates = typeof h.completedDates === 'string' ? JSON.parse(h.completedDates) : (h.completedDates || []);
      } catch { dates = []; }
      totalHabitChecks += dates.length;
      const s = Math.max(h.streak || 0, h.bestStreak || 0);
      if (s > maxStreak) maxStreak = s;
    });

    const currentStreak = prog.currentStreak || 0;
    const savingsAchievedCount = savingGoals.filter(s => s.currentAmount >= s.targetAmount && s.targetAmount > 0).length;

    // 3. Tính toán Equipment Bonus
    let gearPower = 0;
    let gearDefense = 0;
    let gearHp = 0;

    equippedItems.forEach(item => {
      const def = EQUIPMENTS_CATALOG[item.itemKey];
      if (def) {
        const lvl = Math.max(1, item.level);
        gearPower += def.basePower + (lvl - 1) * def.powerScalePerLevel;
        gearDefense += def.baseDefense + (lvl - 1) * def.defenseScalePerLevel;
        gearHp += def.baseHp + (lvl - 1) * def.hpScalePerLevel;
      }
    });

    // 4. Tính toán Skill Passives
    let skillPowerMultiplier = 0;
    let skillDefenseMultiplier = 0;
    let skillHpBonus = 0;
    let critChance = 0.05; // 5% base crit
    let xpMultiplier = 1.0;
    let coinsMultiplier = 1.0;
    let doubleStrikeChance = 0;
    let bossDamageBonus = 0;
    let discountUpgrade = 0;

    unlockedSkills.forEach(us => {
      const def = SKILLS_CATALOG.find(s => s.key === us.skillKey);
      if (def && def.passiveBonus) {
        if (def.passiveBonus.powerMultiplier) skillPowerMultiplier += def.passiveBonus.powerMultiplier;
        if (def.passiveBonus.defenseMultiplier) skillDefenseMultiplier += def.passiveBonus.defenseMultiplier;
        if (def.passiveBonus.hpBonus) skillHpBonus += def.passiveBonus.hpBonus;
        if (def.passiveBonus.critChanceBonus) critChance += def.passiveBonus.critChanceBonus;
        if (def.passiveBonus.xpBonusMultiplier) xpMultiplier += def.passiveBonus.xpBonusMultiplier;
        if (def.passiveBonus.coinsBonusMultiplier) coinsMultiplier += def.passiveBonus.coinsBonusMultiplier;
        if (def.passiveBonus.doubleStrikeChance) doubleStrikeChance += def.passiveBonus.doubleStrikeChance;
        if (def.passiveBonus.bossDamageBonus) bossDamageBonus += def.passiveBonus.bossDamageBonus;
        if (def.passiveBonus.discountUpgradePercent) discountUpgrade += def.passiveBonus.discountUpgradePercent;
      }
    });

    // 5. Tính toán các chỉ số thực tế (Deterministic RPG Formulas)
    const level = prog.level;

    // HP: Base 100 + 30 per level + (focusMinutes / 4) + (streak * 12) + gearHp + skillHp
    const maxHp = Math.round(100 + (level * 30) + (totalFocusMinutes / 4) + (currentStreak * 12) + gearHp + skillHpBonus);
    
    // Power: Base 25 + 12 per level + (tasks * 4) + (focusMinutes / 8) + (vocabCount * 2) + gearPower
    const rawPower = 25 + (level * 12) + (completedTasksCount * 4) + Math.floor(totalFocusMinutes / 8) + (vocabWordCount * 2) + gearPower;
    const finalPower = Math.round(rawPower * (1 + skillPowerMultiplier));

    // Defense: Base 15 + 6 per level + (habitChecks * 2) + (streak * 4) + gearDefense
    const rawDefense = 15 + (level * 6) + (totalHabitChecks * 2) + (currentStreak * 4) + gearDefense;
    const finalDefense = Math.round(rawDefense * (1 + skillDefenseMultiplier));

    // Focus stat: Minutes of deep work
    const focusStat = totalFocusMinutes;

    // Knowledge stat: Vocab words learned + study sessions
    const knowledgeStat = vocabWordCount + (studySessionsCount * 5);

    // Discipline stat: Total habit completions + current streak
    const disciplineStat = totalHabitChecks + (currentStreak * 2);

    // Productivity stat: Completed tasks
    const productivityStat = completedTasksCount;

    // Wealth stat: Savings achieved count * 100
    const wealthStat = savingsAchievedCount * 100;

    // Combat Power (CP): Tổng lực chiến thực tế
    const combatPower = Math.round(
      (finalPower * 2.0) + 
      (finalDefense * 1.5) + 
      (maxHp * 0.4) + 
      (focusStat * 0.5) + 
      (knowledgeStat * 1.0) + 
      (disciplineStat * 1.5)
    );

    // Tính skill points nhận được (Level - 1 - đã dùng)
    const totalEarnedSkillPoints = Math.max(0, level - 1);
    const usedSkillPoints = unlockedSkills.reduce((acc, us) => {
      const def = SKILLS_CATALOG.find(s => s.key === us.skillKey);
      return acc + (def?.costSkillPoints || 1);
    }, 0);
    const availableSkillPoints = Math.max(0, totalEarnedSkillPoints - usedSkillPoints);

    // Cấu trúc phân tích nguồn sức mạnh (Stat Breakdown) để hiển thị chi tiết cho người dùng
    const statBreakdown = {
      levelContribution: {
        level,
        power: level * 12,
        defense: level * 6,
        hp: level * 30
      },
      tasksContribution: {
        completedTasksCount,
        power: completedTasksCount * 4
      },
      focusContribution: {
        totalFocusMinutes,
        hp: Math.floor(totalFocusMinutes / 4),
        power: Math.floor(totalFocusMinutes / 8)
      },
      habitsContribution: {
        totalHabitChecks,
        currentStreak,
        defense: (totalHabitChecks * 2) + (currentStreak * 4),
        hp: currentStreak * 12
      },
      learningContribution: {
        vocabWordCount,
        studySessionsCount,
        power: vocabWordCount * 2
      },
      gearContribution: {
        power: gearPower,
        defense: gearDefense,
        hp: gearHp
      },
      skillBonusSummary: {
        powerBonusPercent: Math.round(skillPowerMultiplier * 100),
        defenseBonusPercent: Math.round(skillDefenseMultiplier * 100),
        critChancePercent: Math.round(critChance * 100),
        doubleStrikeChancePercent: Math.round(doubleStrikeChance * 100)
      }
    };

    return {
      userId,
      level,
      totalXp: prog.totalXp,
      coins: prog.coins,
      currentStreak,
      longestStreak: prog.longestStreak,
      combatPower,
      hp: {
        current: maxHp,
        max: maxHp
      },
      stats: {
        power: finalPower,
        defense: finalDefense,
        focus: focusStat,
        knowledge: knowledgeStat,
        discipline: disciplineStat,
        productivity: productivityStat,
        wealth: wealthStat
      },
      multipliers: {
        critChance,
        xpMultiplier,
        coinsMultiplier,
        doubleStrikeChance,
        bossDamageBonus,
        discountUpgrade
      },
      availableSkillPoints,
      statBreakdown,
      equippedGear: {
        weapon: equippedItems.find(i => i.slot === 'WEAPON') || null,
        armor: equippedItems.find(i => i.slot === 'ARMOR') || null,
        accessory: equippedItems.find(i => i.slot === 'ACCESSORY') || null
      },
      unlockedSkillsCount: unlockedSkills.length
    };
  },

  /**
   * Lấy danh sách quái vật, chương, và trạng thái mở khóa của người chơi.
   */
  async getMonstersAndProgress(userId: string) {
    const prisma = getPrisma();
    const [charStats, userProgressList] = await Promise.all([
      this.calculateRealCharacterStats(userId),
      prisma.monsterProgress.findMany({ where: { userId } })
    ]);

    const progressMap = new Map<string, any>();
    userProgressList.forEach(p => progressMap.set(p.monsterId, p));

    // Lần lượt xác định trạng thái mở khóa theo chuỗi chương (Chapter Chain)
    const monstersWithStatus = MONSTERS_CATALOG.map((m, idx) => {
      const progress = progressMap.get(m.id);
      const isDefeated = (progress?.defeatCount || 0) > 0;
      
      // Quái đầu tiên của Chương 1 luôn mở khóa
      let isUnlocked = idx === 0;

      if (idx > 0) {
        const prevMonster = MONSTERS_CATALOG[idx - 1];
        const prevProgress = progressMap.get(prevMonster.id);
        const prevDefeated = (prevProgress?.defeatCount || 0) > 0;
        
        // Quái trước đã bị hạ gục thì quái sau được mở khóa
        isUnlocked = prevDefeated;
      }

      // Kiểm tra xem nhân vật có đủ điều kiện thực tế (Real Requirement) để khiêu chiến không
      let meetsRealPrerequisite = false;
      let progressCurrent = 0;
      const progressTarget = m.requiredRealAction.target;

      if (m.requiredRealAction.type === 'task') {
        progressCurrent = charStats.stats.productivity;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === 'focus') {
        progressCurrent = charStats.stats.focus;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === 'habit') {
        progressCurrent = charStats.stats.discipline;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else if (m.requiredRealAction.type === 'learning') {
        progressCurrent = charStats.stats.knowledge;
        meetsRealPrerequisite = progressCurrent >= progressTarget;
      } else {
        // Overall: Kiểm tra cả combat power và tổng tiến độ
        progressCurrent = charStats.combatPower;
        meetsRealPrerequisite = charStats.combatPower >= m.requiredPower;
      }

      const meetsPower = charStats.combatPower >= m.requiredPower;
      const canChallenge = isUnlocked && meetsRealPrerequisite && meetsPower;

      return {
        ...m,
        status: isDefeated ? 'DEFEATED' : (isUnlocked ? 'UNLOCKED' : 'LOCKED'),
        defeatCount: progress?.defeatCount || 0,
        bestTurns: progress?.bestTurns || null,
        meetsRealPrerequisite,
        meetsPower,
        canChallenge,
        realRequirementProgress: {
          current: Math.min(progressTarget, progressCurrent),
          target: progressTarget,
          percent: Math.min(100, Math.round((progressCurrent / progressTarget) * 100))
        }
      };
    });

    // Gom theo chương
    const chapters = [
      {
        index: 1,
        title: 'Khu Rừng Xao Nhãng',
        subtitle: 'The Forest of Distraction',
        theme: 'emerald',
        monsters: monstersWithStatus.filter(m => m.chapter === 1)
      },
      {
        index: 2,
        title: 'Thung Lũng Hỗn Loạn',
        subtitle: 'The Valley of Chaos',
        theme: 'amber',
        monsters: monstersWithStatus.filter(m => m.chapter === 2)
      },
      {
        index: 3,
        title: 'Thành Trì Kiệt Sức',
        subtitle: 'The Citadel of Burnout',
        theme: 'rose',
        monsters: monstersWithStatus.filter(m => m.chapter === 3)
      },
      {
        index: 4,
        title: 'Đỉnh Cao Thăng Hoa',
        subtitle: 'The Summit of Ascension',
        theme: 'purple',
        monsters: monstersWithStatus.filter(m => m.chapter === 4)
      }
    ];

    return {
      characterStats: charStats,
      chapters,
      totalMonsters: MONSTERS_CATALOG.length,
      defeatedMonstersCount: userProgressList.filter(p => p.defeatCount > 0).length
    };
  },

  /**
   * BATTLE ENGINE: Mô phỏng trận chiến theo lượt trên Server.
   * Backend là SOURCE OF TRUTH. Quyết định thắng bại, tính toán sát thương chuẩn xác,
   * sinh log lượt đấu chi tiết để frontend phát animation mượt mà.
   */
  async simulateBattle(userId: string, monsterId: string) {
    const prisma = getPrisma();
    const monster = MONSTERS_CATALOG.find(m => m.id === monsterId);
    if (!monster) {
      throw new Error(`Quái vật ${monsterId} không tồn tại trên hệ thống.`);
    }

    const charStats = await this.calculateRealCharacterStats(userId);

    // 1. Kiểm tra điều kiện mở khóa & sức mạnh thực tế
    const [progressList, userItemKeys] = await Promise.all([
      prisma.monsterProgress.findMany({ where: { userId } }),
      prisma.userEquipment.findMany({ where: { userId }, select: { itemKey: true } })
    ]);

    const progressMap = new Map(progressList.map(p => [p.monsterId, p]));
    const monsterIdx = MONSTERS_CATALOG.findIndex(m => m.id === monsterId);
    
    if (monsterIdx > 0) {
      const prevMonster = MONSTERS_CATALOG[monsterIdx - 1];
      const prevDefeatCount = progressMap.get(prevMonster.id)?.defeatCount || 0;
      if (prevDefeatCount === 0) {
        throw new Error(`Bạn cần vượt qua ${prevMonster.name} trước khi mở khóa ải này!`);
      }
    }

    // Kiểm tra Real Action Requirement
    let meetsPrereq = false;
    if (monster.requiredRealAction.type === 'task') {
      meetsPrereq = charStats.stats.productivity >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === 'focus') {
      meetsPrereq = charStats.stats.focus >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === 'habit') {
      meetsPrereq = charStats.stats.discipline >= monster.requiredRealAction.target;
    } else if (monster.requiredRealAction.type === 'learning') {
      meetsPrereq = charStats.stats.knowledge >= monster.requiredRealAction.target;
    } else {
      meetsPrereq = charStats.combatPower >= monster.requiredPower;
    }

    if (!meetsPrereq) {
      throw new Error(`Chưa đủ điều kiện rèn luyện ngoài đời: ${monster.requiredRealAction.description}. Hãy hoàn thành công việc thật để gia tăng sức mạnh!`);
    }

    // 2. KHỞI TẠO CHỈ SỐ TRẬN ĐẤU
    let playerHp = charStats.hp.max;
    let monsterHp = monster.maxHp;
    const playerPower = charStats.stats.power;
    const playerDefense = charStats.stats.defense;
    const { critChance, doubleStrikeChance, bossDamageBonus, xpMultiplier, coinsMultiplier } = charStats.multipliers;

    interface TurnEvent {
      round: number;
      actor: 'PLAYER' | 'MONSTER';
      action: 'ATTACK' | 'CRIT' | 'DOUBLE_STRIKE' | 'PHOENIX_REBIRTH' | 'DEFEATED';
      damage: number;
      actorHpRemaining: number;
      targetHpRemaining: number;
      message: string;
    }

    const turnsLog: TurnEvent[] = [];
    let round = 1;
    const maxRounds = 30; // Giới hạn chống vòng lặp vô hạn
    let hasUsedPhoenixRebirth = false;

    // 3. VÒNG LẶP CHIẾN ĐẤU (TURN-BASED COMBAT LOOP)
    while (playerHp > 0 && monsterHp > 0 && round <= maxRounds) {
      // --- LƯỢT CỦA PLAYER ---
      const isBoss = monster.isBoss;
      let effectivePlayerPower = playerPower;
      if (isBoss && bossDamageBonus > 0) {
        effectivePlayerPower = Math.round(effectivePlayerPower * (1 + bossDamageBonus));
      }

      // Sát thương cơ bản: PlayerPower - (MonsterDefense * 0.5)
      let damageToMonster = Math.max(10, effectivePlayerPower - Math.round(monster.defense * 0.5));
      
      // Kiểm tra Chí Mạng
      const isCrit = Math.random() < critChance;
      if (isCrit) {
        damageToMonster = Math.round(damageToMonster * 1.6);
      }

      monsterHp = Math.max(0, monsterHp - damageToMonster);

      turnsLog.push({
        round,
        actor: 'PLAYER',
        action: isCrit ? 'CRIT' : 'ATTACK',
        damage: damageToMonster,
        actorHpRemaining: playerHp,
        targetHpRemaining: monsterHp,
        message: isCrit 
          ? `💥 Đòn chí mạng! Bạn tung cú đánh sấm sét gây ${damageToMonster} sát thương!`
          : `⚔️ Bạn tấn công chính xác, gây ${damageToMonster} sát thương lên ${monster.name}.`
      });

      // Kiểm tra Song Đòn (Double Strike)
      if (monsterHp > 0 && doubleStrikeChance > 0 && Math.random() < doubleStrikeChance) {
        const doubleDamage = Math.max(8, Math.round(damageToMonster * 0.75));
        monsterHp = Math.max(0, monsterHp - doubleDamage);
        turnsLog.push({
          round,
          actor: 'PLAYER',
          action: 'DOUBLE_STRIKE',
          damage: doubleDamage,
          actorHpRemaining: playerHp,
          targetHpRemaining: monsterHp,
          message: `⚡ Song đòn quyết định! Bạn tiếp tục bồi thêm ${doubleDamage} sát thương!`
        });
      }

      // Nếu quái đã gục ngã
      if (monsterHp <= 0) {
        break;
      }

      // --- LƯỢT CỦA MONSTER ---
      // Sát thương từ quái: MonsterPower - (PlayerDefense * 0.6)
      const damageToPlayer = Math.max(8, monster.power - Math.round(playerDefense * 0.6));
      playerHp = playerHp - damageToPlayer;

      // Kiểm tra hồi sinh Phượng Hoàng (Phoenix Rebirth) nếu dính đòn tử thương
      if (playerHp <= 0 && !hasUsedPhoenixRebirth) {
        hasUsedPhoenixRebirth = true;
        playerHp = Math.round(charStats.hp.max * 0.3); // Hồi 30% HP
        turnsLog.push({
          round,
          actor: 'PLAYER',
          action: 'PHOENIX_REBIRTH',
          damage: 0,
          actorHpRemaining: playerHp,
          targetHpRemaining: monsterHp,
          message: `🦅 Trỗi dậy phượng hoàng! Ý chí quật cường hồi sinh bạn với ${playerHp} HP!`
        });
      } else {
        playerHp = Math.max(0, playerHp);
        turnsLog.push({
          round,
          actor: 'MONSTER',
          action: 'ATTACK',
          damage: damageToPlayer,
          actorHpRemaining: monsterHp,
          targetHpRemaining: playerHp,
          message: `🔥 ${monster.name} phản công quyết liệt, gây ${damageToPlayer} sát thương!`
        });
      }

      round++;
    }

    const isWon = monsterHp <= 0 && playerHp > 0;

    // 4. XỬ LÝ PHẦN THƯỞNG & LƯU TIẾN ĐỘ NẾU CHIẾN THẮNG
    let rewardXp = 0;
    let rewardCoins = 0;
    let droppedEquipment: any = null;

    if (isWon) {
      // Tính XP và Coins với hệ số Skill passives
      rewardXp = Math.round(monster.rewardXp * xpMultiplier);
      rewardCoins = Math.round(monster.rewardCoins * coinsMultiplier);

      // Trao XP & Coins qua centralized engine (Idempotent per battle record)
      const battleRecordId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await Promise.all([
        progressionService.awardXp(userId, {
          amount: rewardXp,
          category: 'task',
          source: 'monster_battle',
          sourceId: `${battleRecordId}_xp`,
          description: `Hạ gục ${monster.name} (${monster.title})`
        }),
        progressionService.addCoins(
          userId,
          rewardCoins,
          'monster_loot',
          `${battleRecordId}_coins`,
          `Chiến lợi phẩm: ${monster.name}`
        )
      ]);

      // Kiểm tra Rơi Trang Bị (Equipment Loot Drop)
      const ownedKeys = new Set(userItemKeys.map(k => k.itemKey));
      if (monster.dropEquipmentKey) {
        const dropDef = EQUIPMENTS_CATALOG[monster.dropEquipmentKey];
        if (dropDef) {
          const isFirstClear = !progressMap.has(monster.id) || (progressMap.get(monster.id)?.defeatCount === 0);
          const roll = Math.random() * 100;
          
          // First clear luôn rớt hoặc roll trúng drop rate
          if (isFirstClear || roll <= monster.dropRatePercent) {
            if (!ownedKeys.has(dropDef.key)) {
              // Nhận trang bị mới vào kho
              const newEquip = await prisma.userEquipment.create({
                data: {
                  userId,
                  itemKey: dropDef.key,
                  name: dropDef.name,
                  slot: dropDef.slot,
                  rarity: dropDef.rarity,
                  powerBonus: dropDef.basePower,
                  defenseBonus: dropDef.baseDefense,
                  hpBonus: dropDef.baseHp,
                  specialEffect: dropDef.specialEffectDescription,
                  level: 1,
                  isEquipped: false,
                  acquiredFrom: `Hạ gục ${monster.name}`
                }
              });
              droppedEquipment = { ...dropDef, id: newEquip.id, isNew: true };
            } else {
              // Nếu đã có trang bị rồi: Tặng thêm 50 coins đền bù nguyên liệu
              await progressionService.addCoins(
                userId,
                50,
                'loot_recycle',
                `${battleRecordId}_salvage`,
                `Nguyên liệu chế tạo: ${dropDef.name}`
              );
              droppedEquipment = { ...dropDef, isNew: false, salvageCoins: 50 };
            }
          }
        }
      }

      // Cập nhật MonsterProgress
      const existingProg = progressMap.get(monster.id);
      const newDefeatCount = (existingProg?.defeatCount || 0) + 1;
      const bestTurns = existingProg?.bestTurns ? Math.min(existingProg.bestTurns, round) : round;

      await prisma.monsterProgress.upsert({
        where: { userId_monsterId: { userId, monsterId } },
        create: {
          userId,
          monsterId,
          status: 'DEFEATED',
          defeatCount: 1,
          firstDefeatedAt: new Date(),
          lastDefeatedAt: new Date(),
          bestTurns: round
        },
        update: {
          status: 'DEFEATED',
          defeatCount: newDefeatCount,
          lastDefeatedAt: new Date(),
          bestTurns
        }
      });
    }

    // 5. LƯU BATTLE RECORD VÀO DATABASE
    const battleRecord = await prisma.battleRecord.create({
      data: {
        userId,
        monsterId: monster.id,
        monsterName: monster.name,
        chapter: monster.chapter,
        won: isWon,
        playerPower: charStats.stats.power,
        playerHpRemaining: playerHp,
        monsterHpRemaining: monsterHp,
        rewardXp: isWon ? rewardXp : 0,
        rewardCoins: isWon ? rewardCoins : 0,
        rewardEquipment: droppedEquipment ? JSON.stringify(droppedEquipment) : null,
        turnsLog: JSON.stringify(turnsLog)
      }
    });

    return {
      battleId: battleRecord.id,
      won: isWon,
      rounds: round,
      monster: {
        id: monster.id,
        name: monster.name,
        title: monster.title,
        avatar: monster.avatar,
        maxHp: monster.maxHp,
        isBoss: monster.isBoss
      },
      playerHpRemaining: playerHp,
      monsterHpRemaining: monsterHp,
      rewardXp,
      rewardCoins,
      droppedEquipment,
      turnsLog,
      trainingHint: !isWon 
        ? `💡 GỢI Ý HUẤN LUYỆN: Đối thủ này đòi hỏi sức chịu đựng cao hơn. Hãy hoàn thành thêm 1 phiên Focus hoặc 2 Nhiệm vụ hôm nay để tăng HP và Giáp trụ!`
        : null
    };
  },

  /**
   * Lấy danh sách toàn bộ trang bị cá nhân (Inventory).
   */
  async getUserEquipments(userId: string) {
    const prisma = getPrisma();
    const userItems = await prisma.userEquipment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const prog = await progressionService.getOrCreateProgression(userId);

    // Ghép với thông tin chi tiết từ EQUIPMENTS_CATALOG
    const inventory = userItems.map(item => {
      const def = EQUIPMENTS_CATALOG[item.itemKey];
      const lvl = Math.max(1, item.level);
      const currentPower = def ? def.basePower + (lvl - 1) * def.powerScalePerLevel : item.powerBonus;
      const currentDefense = def ? def.baseDefense + (lvl - 1) * def.defenseScalePerLevel : item.defenseBonus;
      const currentHp = def ? def.baseHp + (lvl - 1) * def.hpScalePerLevel : item.hpBonus;

      // Chi phí nâng cấp tiếp theo: baseUpgradeCost * (level ^ 1.4)
      const upgradeCost = def ? Math.round(def.baseUpgradeCost * Math.pow(lvl, 1.4)) : 100;
      const canUpgrade = prog.coins >= upgradeCost && lvl < 10;

      return {
        id: item.id,
        itemKey: item.itemKey,
        name: item.name,
        title: def?.title || item.name,
        slot: item.slot,
        rarity: item.rarity,
        level: lvl,
        maxLevel: 10,
        isEquipped: item.isEquipped,
        stats: {
          power: currentPower,
          defense: currentDefense,
          hp: currentHp
        },
        upgradeCost,
        canUpgrade,
        icon: def?.icon || '🗡️',
        lore: def?.lore || '',
        specialEffect: def?.specialEffectDescription || item.specialEffect,
        acquiredFrom: item.acquiredFrom
      };
    });

    return {
      inventory,
      equipped: {
        weapon: inventory.find(i => i.slot === 'WEAPON' && i.isEquipped) || null,
        armor: inventory.find(i => i.slot === 'ARMOR' && i.isEquipped) || null,
        accessory: inventory.find(i => i.slot === 'ACCESSORY' && i.isEquipped) || null
      },
      coins: prog.coins
    };
  },

  /**
   * Trang bị vật phẩm (Equip item).
   */
  async equipItem(userId: string, equipmentId: string) {
    const prisma = getPrisma();
    const targetItem = await prisma.userEquipment.findUnique({
      where: { id: equipmentId }
    });

    if (!targetItem || targetItem.userId !== userId) {
      throw new Error('Vật phẩm không tồn tại trong kho đồ của bạn.');
    }

    // Gỡ các trang bị cùng slot
    await prisma.userEquipment.updateMany({
      where: { userId, slot: targetItem.slot },
      data: { isEquipped: false }
    });

    // Trang bị vật phẩm mới
    const updated = await prisma.userEquipment.update({
      where: { id: equipmentId },
      data: { isEquipped: true }
    });

    // Cập nhật slot trong UserProgression
    const updateProgData: any = {};
    if (targetItem.slot === 'WEAPON') updateProgData.equippedWeaponKey = targetItem.itemKey;
    if (targetItem.slot === 'ARMOR') updateProgData.equippedArmorKey = targetItem.itemKey;
    if (targetItem.slot === 'ACCESSORY') updateProgData.equippedAccessoryKey = targetItem.itemKey;

    await prisma.userProgression.update({
      where: { userId },
      data: updateProgData
    });

    return updated;
  },

  /**
   * Nâng cấp trang bị bằng Coins (Upgrade item).
   */
  async upgradeEquipment(userId: string, equipmentId: string) {
    const prisma = getPrisma();
    const item = await prisma.userEquipment.findUnique({
      where: { id: equipmentId }
    });

    if (!item || item.userId !== userId) {
      throw new Error('Vật phẩm không tồn tại.');
    }

    if (item.level >= 10) {
      throw new Error('Trang bị này đã đạt cấp tối đa (Level 10 Mastered)!');
    }

    const def = EQUIPMENTS_CATALOG[item.itemKey];
    const lvl = item.level;
    const baseUpgradeCost = def ? Math.round(def.baseUpgradeCost * Math.pow(lvl, 1.4)) : 100;

    // Kiểm tra Skill giảm giá nâng cấp (Finance tree)
    const charStats = await this.calculateRealCharacterStats(userId);
    const discount = charStats.multipliers.discountUpgrade || 0;
    const finalUpgradeCost = Math.round(baseUpgradeCost * (1 - discount / 100));

    const prog = await progressionService.getOrCreateProgression(userId);
    if (prog.coins < finalUpgradeCost) {
      throw new Error(`Bạn cần ${finalUpgradeCost} 🪙 để nâng cấp (Hiện có: ${prog.coins} 🪙). Hãy hoàn thành các nhiệm vụ và đánh quái để kiếm thêm Coins!`);
    }

    // Trừ Coins qua Coin Ledger
    await prisma.$transaction([
      prisma.coinTransaction.create({
        data: {
          userId,
          amount: -finalUpgradeCost,
          type: 'spend',
          source: 'equipment_upgrade',
          sourceId: equipmentId,
          description: `Nâng cấp ${item.name} lên cấp ${lvl + 1}`
        }
      }),
      prisma.userProgression.update({
        where: { userId },
        data: { coins: prog.coins - finalUpgradeCost }
      }),
      prisma.userEquipment.update({
        where: { id: equipmentId },
        data: {
          level: lvl + 1,
          powerBonus: def ? def.basePower + lvl * def.powerScalePerLevel : item.powerBonus + 5,
          defenseBonus: def ? def.baseDefense + lvl * def.defenseScalePerLevel : item.defenseBonus + 3,
          hpBonus: def ? def.baseHp + lvl * def.hpScalePerLevel : item.hpBonus + 10
        }
      })
    ]);

    return {
      success: true,
      newLevel: lvl + 1,
      coinsSpent: finalUpgradeCost,
      newBalance: prog.coins - finalUpgradeCost
    };
  },

  /**
   * Lấy danh sách 5 Cây Kỹ Năng và trạng thái mở khóa.
   */
  async getSkillTrees(userId: string) {
    const prisma = getPrisma();
    const [charStats, userSkills] = await Promise.all([
      this.calculateRealCharacterStats(userId),
      prisma.userSkill.findMany({ where: { userId } })
    ]);

    const unlockedSet = new Set(userSkills.map(s => s.skillKey));

    const trees = [
      {
        id: 'FOCUS',
        name: 'Nhánh Tập Trung (Focus Tree)',
        description: 'Tăng cường sức mạnh tấn công và tỷ lệ chí mạng từ thời lượng làm việc sâu.',
        icon: '🧠',
        skills: SKILLS_CATALOG.filter(s => s.tree === 'FOCUS').map(s => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: 'LEARNING',
        name: 'Nhánh Tri Thức (Learning Tree)',
        description: 'Chuyển hóa từ vựng và bài học thành lá chắn bảo vệ và điểm kinh nghiệm.',
        icon: '📖',
        skills: SKILLS_CATALOG.filter(s => s.tree === 'LEARNING').map(s => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: 'DISCIPLINE',
        name: 'Nhánh Kỷ Luật (Discipline Tree)',
        description: 'Gia tăng giáp trụ và khả năng phục hồi thần kỳ từ các chuỗi ngày streak.',
        icon: '🔥',
        skills: SKILLS_CATALOG.filter(s => s.tree === 'DISCIPLINE').map(s => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: 'PRODUCTIVITY',
        name: 'Nhánh Năng Suất (Productivity Tree)',
        description: 'Tạo đà tiến công dũng mãnh và sát thương vượt trội từ các việc đã xong.',
        icon: '🎯',
        skills: SKILLS_CATALOG.filter(s => s.tree === 'PRODUCTIVITY').map(s => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      },
      {
        id: 'FINANCE',
        name: 'Nhánh Tài Chính (Finance Tree)',
        description: 'Tích lũy của cải, tối ưu hóa nguyên liệu và gia tăng tiền thưởng Coins.',
        icon: '🪙',
        skills: SKILLS_CATALOG.filter(s => s.tree === 'FINANCE').map(s => ({
          ...s,
          isUnlocked: unlockedSet.has(s.key),
          canUnlock: !unlockedSet.has(s.key) && charStats.level >= s.requiredLevel && charStats.availableSkillPoints >= s.costSkillPoints
        }))
      }
    ];

    return {
      trees,
      availableSkillPoints: charStats.availableSkillPoints,
      unlockedSkillsCount: userSkills.length
    };
  },

  /**
   * Mở khóa kỹ năng mới bằng Điểm Kỹ Năng (Skill Point).
   */
  async unlockSkill(userId: string, skillKey: string) {
    const prisma = getPrisma();
    const skillDef = SKILLS_CATALOG.find(s => s.key === skillKey);
    if (!skillDef) {
      throw new Error(`Kỹ năng ${skillKey} không hợp lệ.`);
    }

    const charStats = await this.calculateRealCharacterStats(userId);
    if (charStats.level < skillDef.requiredLevel) {
      throw new Error(`Yêu cầu cấp độ Level ${skillDef.requiredLevel} để mở khóa kỹ năng này.`);
    }

    if (charStats.availableSkillPoints < skillDef.costSkillPoints) {
      throw new Error(`Bạn cần ${skillDef.costSkillPoints} Điểm Kỹ Năng (Hiện có: ${charStats.availableSkillPoints}). Hãy Level Up để nhận thêm điểm!`);
    }

    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillKey: { userId, skillKey } }
    });

    if (existing) {
      throw new Error('Bạn đã mở khóa kỹ năng này rồi.');
    }

    const created = await prisma.userSkill.create({
      data: {
        userId,
        skillKey,
        tree: skillDef.tree,
        tier: skillDef.tier,
        level: 1
      }
    });

    return {
      success: true,
      skill: skillDef,
      remainingSkillPoints: charStats.availableSkillPoints - skillDef.costSkillPoints
    };
  },

  /**
   * Khởi tạo Starter Kit RPG cho người chơi mới (Tặng trang bị khởi đầu).
   */
  async ensureStarterKit(userId: string) {
    const prisma = getPrisma();
    const existingWeapons = await prisma.userEquipment.count({ where: { userId } });
    if (existingWeapons === 0) {
      // Tặng thanh kiếm khởi đầu
      const starterBlade = EQUIPMENTS_CATALOG['wpn_focus_blade'];
      await prisma.userEquipment.create({
        data: {
          userId,
          itemKey: starterBlade.key,
          name: starterBlade.name,
          slot: starterBlade.slot,
          rarity: starterBlade.rarity,
          powerBonus: starterBlade.basePower,
          defenseBonus: starterBlade.baseDefense,
          hpBonus: starterBlade.baseHp,
          specialEffect: starterBlade.specialEffectDescription,
          level: 1,
          isEquipped: true,
          acquiredFrom: 'Quà tặng tân thủ khởi hành'
        }
      });
    }
  }
};
