import { apiCall } from './apiClient';

export interface UserPet {
  id: string;
  userId: string;
  name: string;
  type: 'CAPYBARA' | 'CAT' | 'SHIBA' | 'DRAGON' | 'LUMI' | 'KITSU';
  level: number;
  exp: number;
  nextLevelExp: number;
  hunger: number;
  happiness: number;
  mood: 'HAPPY' | 'STUDYING' | 'HUNGRY' | 'SLEEPING' | 'SUPER_FOCUS';
  foodCount: number;
  equippedSkin: string;
  unlockedSkins: string[];
  totalStudyMinutes: number;
  dialogue: string;
  lastFedAt: string;
  lastPettedAt: string;
}

export const petApi = {
  async getPet(): Promise<UserPet> {
    const res = await apiCall<{ success: boolean; pet: UserPet }>('/api/pet');
    if (!res?.pet) throw new Error('Không thể tải thông tin thú cưng');
    return res.pet;
  },

  async feed(): Promise<{ pet: UserPet; leveledUp: boolean; message: string }> {
    const res = await apiCall<{ success: boolean; pet: UserPet; leveledUp: boolean; message: string }>('/api/pet/feed', {
      method: 'POST'
    });
    if (!res?.pet) throw new Error(res?.message || 'Không thể cho ăn');
    return res;
  },

  async pet(): Promise<{ pet: UserPet; dialogue: string }> {
    const res = await apiCall<{ success: boolean; pet: UserPet; dialogue: string }>('/api/pet/pet', {
      method: 'POST'
    });
    if (!res?.pet) throw new Error('Lỗi tương tác với thú cưng');
    return res;
  },

  async rename(name: string): Promise<UserPet> {
    const res = await apiCall<{ success: boolean; pet: UserPet }>('/api/pet/rename', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    if (!res?.pet) throw new Error('Không thể đổi tên thú cưng');
    return res.pet;
  },

  async customize(type?: string, skin?: string): Promise<UserPet> {
    const res = await apiCall<{ success: boolean; pet: UserPet }>('/api/pet/customize', {
      method: 'POST',
      body: JSON.stringify({ type, skin })
    });
    if (!res?.pet) throw new Error('Không thể đổi trang phục');
    return res.pet;
  }
};
