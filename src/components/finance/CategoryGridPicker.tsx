import React, { useState, useEffect } from 'react';
import {
  FinanceCategory,
  getCategoriesByType,
  addCustomCategory,
  deleteCustomCategory,
  resetFinanceCategoriesToDefault
} from '../../lib/financeCategories';
import { Plus, Settings2, Check, X, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../../lib/soundEngine';

interface CategoryGridPickerProps {
  type: 'Chi tiêu' | 'Thu nhập' | 'Chuyển tiền';
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
}

const PRESET_EMOJIS = [
  '🍜', '☕', '🚗', '🛍️', '🏠', '💡', '🎮', '💊', 
  '📚', '🎁', '🐶', '✈️', '💄', '💻', '💰', '📈', 
  '🏦', '📱', '⚽', '🍕', '🍣', '🚲', '🚕', '🛒', 
  '🧴', '👟', '🍿', '🥐', '🍉', '🎨', '🎸', '🩺'
];

export function CategoryGridPicker({
  type,
  selectedCategory,
  onSelectCategory
}: CategoryGridPickerProps) {
  const [categories, setCategories] = useState<FinanceCategory[]>(() => getCategoriesByType(type));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');

  // Reload categories on type change or external update
  const refreshCategories = () => {
    setCategories(getCategoriesByType(type));
  };

  useEffect(() => {
    refreshCategories();
    setIsAddingNew(false);
    setIsManaging(false);
  }, [type]);

  useEffect(() => {
    const handleUpdate = () => refreshCategories();
    window.addEventListener('lifeos-categories-updated', handleUpdate);
    return () => window.removeEventListener('lifeos-categories-updated', handleUpdate);
  }, [type]);

  const handleSelect = (catName: string) => {
    soundEngine.playPop();
    onSelectCategory(catName);
  };

  const handleCreateNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;

    soundEngine.playSuccess();
    const created = addCustomCategory({
      name: cleanName,
      icon: newCatIcon || '🏷️',
      type
    });

    setNewCatName('');
    setNewCatIcon('🏷️');
    setIsAddingNew(false);
    refreshCategories();
    onSelectCategory(created.name);
  };

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playPop();
    deleteCustomCategory(id);
    refreshCategories();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục danh sách danh mục về mặc định ban đầu?')) {
      resetFinanceCategoriesToDefault();
      refreshCategories();
      setIsManaging(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header bar: Title & Actions */}
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span>Danh mục {type.toLowerCase()}</span>
          {selectedCategory && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Đã chọn: {selectedCategory}
            </span>
          )}
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(!isAddingNew);
              setIsManaging(false);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title="Thêm danh mục riêng của bạn"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mới</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsManaging(!isManaging);
              setIsAddingNew(false);
            }}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              isManaging
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Quản lý / xóa danh mục tùy chỉnh"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Form: Add Custom Category */}
      {isAddingNew && (
        <form
          onSubmit={handleCreateNewCategory}
          className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Thiết lập danh mục mới cho {type}
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs shrink-0 select-none">
              {newCatIcon}
            </span>
            <input
              type="text"
              required
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="VD: Nuôi mèo, Tiền trọ, Học IELTS..."
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
            >
              Lưu
            </button>
          </div>

          {/* Quick Emoji Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Chọn biểu tượng:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {PRESET_EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setNewCatIcon(emoji)}
                  className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                    newCatIcon === emoji
                      ? 'bg-emerald-500 text-white scale-110 shadow-xs'
                      : 'bg-white/80 dark:bg-slate-900/80 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      {/* Managing Mode Notice */}
      {isManaging && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
          <span>Chế độ quản lý: Bấm biểu tượng 🗑️ để xóa các danh mục tự tạo.</span>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold hover:bg-amber-300 dark:hover:bg-amber-800 transition cursor-pointer shrink-0"
            title="Khôi phục danh mục gốc"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Khôi phục</span>
          </button>
        </div>
      )}

      {/* Interactive Category Chips Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <div
              key={cat.id}
              onClick={() => handleSelect(cat.name)}
              className={`group relative flex items-center gap-2 p-2 rounded-xl border text-xs transition-all cursor-pointer select-none text-left ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-base shrink-0 leading-none">{cat.icon}</span>
              <span className="truncate flex-1 font-medium">{cat.name}</span>

              {isSelected && (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}

              {/* Delete button for custom categories in managing mode */}
              {isManaging && !cat.isDefault && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteCategory(cat.id, e)}
                  className="p-1 rounded-md bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                  title="Xóa danh mục này"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
