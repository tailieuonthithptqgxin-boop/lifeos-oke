export interface FinanceCategory {
  id: string;
  name: string;
  icon: string;
  type: 'Chi tiêu' | 'Thu nhập' | 'Chuyển tiền';
  isDefault?: boolean;
}

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  // --- Chi tiêu (Expenses) ---
  { id: 'cat-eat', name: 'Ăn uống', icon: '🍜', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-cafe', name: 'Cà phê & Trà', icon: '☕', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-trans', name: 'Đi lại & Xăng xe', icon: '🚗', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-shop', name: 'Mua sắm & Quần áo', icon: '🛍️', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-house', name: 'Tiền nhà & Phòng trọ', icon: '🏠', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-bill', name: 'Hóa đơn & Điện nước', icon: '💡', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-ent', name: 'Giải trí & Phim ảnh', icon: '🎮', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-health', name: 'Sức khỏe & Thuốc men', icon: '💊', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-edu', name: 'Học tập & Sách vở', icon: '📚', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-gift', name: 'Quà tặng & Hiếu hỉ', icon: '🎁', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-pet', name: 'Thú cưng', icon: '🐶', type: 'Chi tiêu', isDefault: true },
  { id: 'cat-other-exp', name: 'Chi tiêu khác', icon: '📦', type: 'Chi tiêu', isDefault: true },

  // --- Thu nhập (Income) ---
  { id: 'cat-salary', name: 'Tiền lương', icon: '💰', type: 'Thu nhập', isDefault: true },
  { id: 'cat-bonus', name: 'Tiền thưởng & KPI', icon: '🎯', type: 'Thu nhập', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance & Job ngoài', icon: '💻', type: 'Thu nhập', isDefault: true },
  { id: 'cat-invest', name: 'Đầu tư & Lãi suất', icon: '📈', type: 'Thu nhập', isDefault: true },
  { id: 'cat-income-gift', name: 'Được tặng / Lì xì', icon: '🎁', type: 'Thu nhập', isDefault: true },
  { id: 'cat-other-inc', name: 'Thu nhập khác', icon: '💵', type: 'Thu nhập', isDefault: true },

  // --- Chuyển tiền (Transfers) ---
  { id: 'cat-bank-trans', name: 'Chuyển khoản', icon: '🔄', type: 'Chuyển tiền', isDefault: true },
  { id: 'cat-atm', name: 'Rút tiền mặt ATM', icon: '🏧', type: 'Chuyển tiền', isDefault: true },
  { id: 'cat-ewallet', name: 'Nạp ví điện tử', icon: '📱', type: 'Chuyển tiền', isDefault: true },
  { id: 'cat-save', name: 'Gửi vào tiết kiệm', icon: '🏦', type: 'Chuyển tiền', isDefault: true },
  { id: 'cat-card-pay', name: 'Thanh toán thẻ tín dụng', icon: '💳', type: 'Chuyển tiền', isDefault: true }
];

const STORAGE_KEY = 'lifeos_finance_custom_categories_v2';

export function getAllFinanceCategories(): FinanceCategory[] {
  if (typeof window === 'undefined') return DEFAULT_FINANCE_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FINANCE_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse custom finance categories:', err);
  }
  return DEFAULT_FINANCE_CATEGORIES;
}

export function getCategoriesByType(type: 'Chi tiêu' | 'Thu nhập' | 'Chuyển tiền'): FinanceCategory[] {
  const all = getAllFinanceCategories();
  return all.filter((c) => c.type === type);
}

export function saveFinanceCategories(categories: FinanceCategory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event('lifeos-categories-updated'));
  } catch (err) {
    console.error('Failed to save finance categories:', err);
  }
}

export function addCustomCategory(newCat: Omit<FinanceCategory, 'id' | 'isDefault'>): FinanceCategory {
  const all = getAllFinanceCategories();
  const created: FinanceCategory = {
    ...newCat,
    id: `custom-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isDefault: false
  };
  const updated = [created, ...all];
  saveFinanceCategories(updated);
  return created;
}

export function deleteCustomCategory(id: string): void {
  const all = getAllFinanceCategories();
  const updated = all.filter((c) => c.id !== id);
  saveFinanceCategories(updated);
}

export function resetFinanceCategoriesToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('lifeos-categories-updated'));
}
