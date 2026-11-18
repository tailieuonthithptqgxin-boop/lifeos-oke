import crypto from 'crypto';
import { getPrisma } from '../db.js';

export interface UserPetState {
  id: string;
  userId: string;
  name: string;
  type: 'CAPYBARA' | 'CAT' | 'SHIBA' | 'DRAGON' | 'LUMI' | 'KITSU';
  level: number;
  exp: number;
  nextLevelExp: number;
  hunger: number; // 0 - 100
  happiness: number; // 0 - 100
  mood: 'HAPPY' | 'STUDYING' | 'HUNGRY' | 'SLEEPING' | 'SUPER_FOCUS';
  foodCount: number;
  equippedSkin: string;
  unlockedSkins: string[];
  totalStudyMinutes: number;
  dialogue: string;
  lastFedAt: string;
  lastPettedAt: string;
}

export const PET_QUOTES = {
  HAPPY: [
    'Sen ơi, hôm nay tui sẵn sàng cày bài cùng sen rồi nè! 🐾',
    'Tui thấy sen học đều là tui vui cả ngày luôn á! ✨',
    'Năng lượng hôm nay 100% nha sen, không làm thì thôi, làm là phải đỉnh! 🚀',
    'Sen giỏi quá trời, cố lên tui luôn ở bên cạnh sen nè! 💖'
  ],
  HUNGRY: [
    'Bụng tui đang kêu rột rột nè sen ơi... cho tui 1 củ cà rốt đi! 🥕',
    'Làm 1 task hoặc học 15 phút là tui có đồ ăn ngon rồi! 🥺',
    'Đói bụng quá, sen cày bài kiếm thức ăn cho tui dí! 🍎'
  ],
  STUDYING: [
    'Suỵt... sen đang tập trung siêu sâu, tui đeo tai nghe chill cùng sen nè! 🎧',
    'Giữ vững phong độ nha sen, từng phút học là từng bước đến mục tiêu! 📚',
    'Đang vào flow rồi, đừng để ai làm phiền nha sen ơi! 🔥'
  ],
  SLEEPING: [
    'Khò... khò... Zzz... sen cũng nên nghỉ mắt một xíu nha... 💤',
    'Nghỉ ngơi là để đi xa hơn, nạp năng lượng thôi sen ơi! 🌙'
  ],
  SUPER_FOCUS: [
    'Chiến thần tập trung xuất hiện rồi! Đỉnh nóc kịch trần bay phấp phới! ⚡',
    'Sen đang bất khả chiến bại hôm nay! Giữ chuỗi cháy máy luôn! 🔥'
  ]
};

function getRandomQuote(mood: keyof typeof PET_QUOTES): string {
  const list = PET_QUOTES[mood] || PET_QUOTES.HAPPY;
  return list[Math.floor(Math.random() * list.length)];
}

export function calculateNextLevelExp(level: number): number {
  return 100 + (level - 1) * 60;
}

let isTableChecked = false;
async function ensurePetTable() {
  if (isTableChecked) return;
  try {
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_pets" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL DEFAULT 'Bé Capy',
        "type" TEXT NOT NULL DEFAULT 'CAPYBARA',
        "level" INTEGER NOT NULL DEFAULT 1,
        "exp" INTEGER NOT NULL DEFAULT 0,
        "hunger" INTEGER NOT NULL DEFAULT 85,
        "happiness" INTEGER NOT NULL DEFAULT 90,
        "mood" TEXT NOT NULL DEFAULT 'HAPPY',
        "food_count" INTEGER NOT NULL DEFAULT 0,
        "equipped_skin" TEXT NOT NULL DEFAULT 'default',
        "unlocked_skins" TEXT NOT NULL DEFAULT '["default"]',
        "total_study_minutes" INTEGER NOT NULL DEFAULT 0,
        "last_fed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_petted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_user_pets_user_id" ON "user_pets"("user_id")
    `);
    isTableChecked = true;
  } catch (err: any) {
    console.warn('[PetService] ensurePetTable error:', err?.message || err);
  }
}

export const petService = {
  /**
   * Lấy thông tin Pet của User (Tự khởi tạo nếu chưa có)
   */
  async getPet(userId: string): Promise<UserPetState> {
    await ensurePetTable();
    const prisma = getPrisma();
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "user_pets" WHERE "user_id" = $1 LIMIT 1`,
      userId
    );

    let raw = rows[0];

    if (!raw) {
      const id = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "user_pets" 
         ("id", "user_id", "name", "type", "level", "exp", "hunger", "happiness", "mood", "food_count", "equipped_skin", "unlocked_skins", "total_study_minutes")
         VALUES ($1, $2, 'Bé Capy', 'CAPYBARA', 1, 0, 85, 90, 'HAPPY', 0, 'default', '["default"]', 0)`,
        id,
        userId
      );
      const created: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "user_pets" WHERE "id" = $1 LIMIT 1`,
        id
      );
      raw = created[0];
    }

    // Tính toán suy giảm Hunger và Happiness theo thời gian
    const now = Date.now();
    const lastFed = new Date(raw.last_fed_at).getTime();
    const hoursSinceFed = Math.max(0, (now - lastFed) / (1000 * 60 * 60));
    
    // Mỗi 3 giờ giảm 5 điểm hunger
    const hungerDecay = Math.floor(hoursSinceFed / 3) * 5;
    let currentHunger = Math.max(10, (raw.hunger || 85) - hungerDecay);

    let mood: UserPetState['mood'] = 'HAPPY';
    if (currentHunger <= 30) {
      mood = 'HUNGRY';
    } else {
      const currentHour = new Date().getHours();
      if (currentHour >= 23 || currentHour <= 5) {
        mood = 'SLEEPING';
      }
    }

    let unlocked: string[] = ['default'];
    try {
      unlocked = typeof raw.unlocked_skins === 'string' ? JSON.parse(raw.unlocked_skins) : (raw.unlocked_skins || ['default']);
    } catch {
      unlocked = ['default'];
    }

    const nextLevelExp = calculateNextLevelExp(raw.level || 1);

    return {
      id: raw.id,
      userId: raw.user_id,
      name: raw.name || 'Bé Capy',
      type: raw.type || 'CAPYBARA',
      level: raw.level || 1,
      exp: raw.exp || 0,
      nextLevelExp,
      hunger: currentHunger,
      happiness: raw.happiness || 90,
      mood,
      foodCount: raw.food_count || 0,
      equippedSkin: raw.equipped_skin || 'default',
      unlockedSkins: unlocked,
      totalStudyMinutes: raw.total_study_minutes || 0,
      dialogue: getRandomQuote(mood),
      lastFedAt: new Date(raw.last_fed_at).toISOString(),
      lastPettedAt: new Date(raw.last_petted_at).toISOString()
    };
  },

  /**
   * Cho Pet ăn (+25 đói, +15 vui, +15 EXP)
   */
  async feed(userId: string): Promise<{ pet: UserPetState; leveledUp: boolean; message: string }> {
    const prisma = getPrisma();
    const current = await this.getPet(userId);

    if (current.foodCount <= 0) {
      throw new Error('Hết thức ăn rồi sen ơi! Hãy học Pomodoro hoặc hoàn thành nhiệm vụ để nhận thêm cà rốt 🥕!');
    }

    let newExp = current.exp + 15;
    let newLevel = current.level;
    let leveledUp = false;
    let nextExp = calculateNextLevelExp(newLevel);

    while (newExp >= nextExp) {
      newExp -= nextExp;
      newLevel += 1;
      leveledUp = true;
      nextExp = calculateNextLevelExp(newLevel);
    }

    // Mở khóa skin theo level
    const skins = new Set(current.unlockedSkins);
    if (newLevel >= 2) skins.add('headphones');
    if (newLevel >= 3) skins.add('yuzu_hat');
    if (newLevel >= 5) skins.add('wizard');
    if (newLevel >= 10) skins.add('crown');

    const newHunger = Math.min(100, current.hunger + 25);
    const newHappiness = Math.min(100, current.happiness + 15);
    const newFoodCount = current.foodCount - 1;

    await prisma.$executeRawUnsafe(
      `UPDATE "user_pets" 
       SET "hunger" = $1, "happiness" = $2, "exp" = $3, "level" = $4, "food_count" = $5,
           "unlocked_skins" = $6, "last_fed_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
       WHERE "user_id" = $7`,
      newHunger,
      newHappiness,
      newExp,
      newLevel,
      newFoodCount,
      JSON.stringify(Array.from(skins)),
      userId
    );

    const updated = await this.getPet(userId);
    return {
      pet: updated,
      leveledUp,
      message: leveledUp 
        ? `🎉 Oa! ${current.name} đã thăng lên Cấp ${newLevel}! Đã mở khóa phụ kiện mới!` 
        : `🥕 Mlem mlem! ${current.name} đã no bụng và vui vẻ hơn rồi!`
    };
  },

  /**
   * Xoa đầu / Tương tác với Pet (+5 vui vẻ)
   */
  async pet(userId: string): Promise<{ pet: UserPetState; dialogue: string }> {
    const prisma = getPrisma();
    const current = await this.getPet(userId);

    const newHappiness = Math.min(100, current.happiness + 5);
    await prisma.$executeRawUnsafe(
      `UPDATE "user_pets" 
       SET "happiness" = $1, "last_petted_at" = CURRENT_TIMESTAMP, "updated_at" = CURRENT_TIMESTAMP
       WHERE "user_id" = $2`,
      newHappiness,
      userId
    );

    const updated = await this.getPet(userId);
    const cuteReplies = [
      `*Grừ grừ...* ${current.name} dụi đầu vào tay bạn thật êm ái! 🥰`,
      `${current.name} nháy mắt: "Cảm ơn sen nhiều nha, tui thương sen nhất!" ❤️`,
      `${current.name} vẫy tai mừng rỡ: "Cùng nhau chinh phục mục tiêu hôm nay nhé!" ✨`
    ];

    return {
      pet: updated,
      dialogue: cuteReplies[Math.floor(Math.random() * cuteReplies.length)]
    };
  },

  /**
   * Đổi tên Pet
   */
  async rename(userId: string, name: string): Promise<UserPetState> {
    const clean = String(name || '').trim().slice(0, 30);
    if (!clean) throw new Error('Tên thú cưng không được để trống.');

    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(
      `UPDATE "user_pets" SET "name" = $1, "updated_at" = CURRENT_TIMESTAMP WHERE "user_id" = $2`,
      clean,
      userId
    );
    return this.getPet(userId);
  },

  /**
   * Chuyển đổi loại thú cưng hoặc trang phục
   */
  async customize(userId: string, type?: 'CAPYBARA' | 'CAT' | 'SHIBA' | 'DRAGON' | 'LUMI' | 'KITSU', skin?: string): Promise<UserPetState> {
    const current = await this.getPet(userId);
    const prisma = getPrisma();

    const newType = type || current.type;
    let newSkin = current.equippedSkin;

    if (skin) {
      if (!current.unlockedSkins.includes(skin)) {
        throw new Error('Bạn chưa mở khóa trang phục này!');
      }
      newSkin = skin;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "user_pets" SET "type" = $1, "equipped_skin" = $2, "updated_at" = CURRENT_TIMESTAMP WHERE "user_id" = $3`,
      newType,
      newSkin,
      userId
    );

    return this.getPet(userId);
  },

  /**
   * Thưởng khi hoàn thành phiên học Pomodoro / Classroom
   */
  async awardStudySession(userId: string, minutes: number): Promise<{ expEarned: number; foodEarned: number; leveledUp: boolean }> {
    if (minutes <= 0) return { expEarned: 0, foodEarned: 0, leveledUp: false };

    const prisma = getPrisma();
    const current = await this.getPet(userId);

    const expEarned = minutes * 8;
    const foodEarned = Math.max(1, Math.floor(minutes / 15));

    let newExp = current.exp + expEarned;
    let newLevel = current.level;
    let leveledUp = false;
    let nextExp = calculateNextLevelExp(newLevel);

    while (newExp >= nextExp) {
      newExp -= nextExp;
      newLevel += 1;
      leveledUp = true;
      nextExp = calculateNextLevelExp(newLevel);
    }

    const skins = new Set(current.unlockedSkins);
    if (newLevel >= 2) skins.add('headphones');
    if (newLevel >= 3) skins.add('yuzu_hat');
    if (newLevel >= 5) skins.add('wizard');
    if (newLevel >= 10) skins.add('crown');

    const newFood = current.foodCount + foodEarned;
    const newTotalMinutes = current.totalStudyMinutes + minutes;
    const newHappiness = Math.min(100, current.happiness + 20);

    await prisma.$executeRawUnsafe(
      `UPDATE "user_pets" 
       SET "exp" = $1, "level" = $2, "food_count" = $3, "total_study_minutes" = $4,
           "happiness" = $5, "unlocked_skins" = $6, "updated_at" = CURRENT_TIMESTAMP
       WHERE "user_id" = $7`,
      newExp,
      newLevel,
      newFood,
      newTotalMinutes,
      newHappiness,
      JSON.stringify(Array.from(skins)),
      userId
    );

    return { expEarned, foodEarned, leveledUp };
  },

  /**
   * Thưởng khi hoàn thành một nhiệm vụ
   */
  async awardTaskComplete(userId: string): Promise<void> {
    try {
      await ensurePetTable();
      const prisma = getPrisma();
      await prisma.$executeRawUnsafe(
        `UPDATE "user_pets" 
         SET "food_count" = "food_count" + 1, "exp" = "exp" + 20, "updated_at" = CURRENT_TIMESTAMP
         WHERE "user_id" = $1`,
        userId
      );
    } catch (err) {
      // Non-blocking
    }
  }
};
