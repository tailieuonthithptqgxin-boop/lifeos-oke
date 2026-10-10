import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, Globe, X } from 'lucide-react';
import { apiCall } from '../../lib/apiClient';
import { useAppStore } from '../../lib/store';
import { LanguageItem } from './types';

interface AdminLanguagesTabProps {
  onShowMessage?: (msg: { text: string; type: 'success' | 'error' }) => void;
}

export function AdminLanguagesTab({ onShowMessage }: AdminLanguagesTabProps) {
  const { refreshLanguages } = useAppStore();
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isSavingLanguages, setIsSavingLanguages] = useState(false);
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [newLanguage, setNewLanguage] = useState({ code: '', name: '', flag: '🌐' });

  const fetchLanguages = async () => {
    try {
      setIsLoadingLanguages(true);
      const res = await apiCall('/api/admin/languages');
      if (res && res.success) {
        setLanguages(res.languages || []);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải ngôn ngữ:', err);
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const handleToggleLanguageStatus = async (code: string) => {
    const updated = languages.map(lang => {
      if (lang.code === code) {
        return {
          ...lang,
          status: (lang.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE'
        };
      }
      return lang;
    });

    if (!updated.some(l => l.status === 'ACTIVE')) {
      onShowMessage?.({ text: 'Bắt buộc phải có ít nhất 1 ngôn ngữ hoạt động.', type: 'error' });
      return;
    }

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        onShowMessage?.({ text: 'Cập nhật trạng thái ngôn ngữ thành công!', type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi cập nhật ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleSetDefaultLanguage = async (code: string) => {
    const updated = languages.map(lang => ({
      ...lang,
      isDefault: lang.code === code,
      status: (lang.code === code ? 'ACTIVE' : lang.status) as 'ACTIVE' | 'INACTIVE'
    }));

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        onShowMessage?.({ text: `Đã đặt ngôn ngữ mặc định thành công!`, type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi cập nhật ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLanguage.code.trim() || !newLanguage.name.trim()) return;

    const cleanCode = newLanguage.code.toLowerCase().trim();
    if (languages.some(l => l.code === cleanCode)) {
      onShowMessage?.({ text: 'Mã ngôn ngữ này đã tồn tại trong danh sách.', type: 'error' });
      return;
    }

    const updated: LanguageItem[] = [
      ...languages,
      {
        code: cleanCode,
        name: newLanguage.name.trim(),
        flag: newLanguage.flag.trim() || '🌐',
        status: 'ACTIVE',
        isDefault: false
      }
    ];

    try {
      setIsSavingLanguages(true);
      const res = await apiCall('/api/admin/languages', 'PUT', { languages: updated });
      if (res && res.success) {
        setLanguages(updated);
        setShowAddLanguageModal(false);
        setNewLanguage({ code: '', name: '', flag: '🌐' });
        onShowMessage?.({ text: `Đã thêm ngôn ngữ ${newLanguage.name} thành công!`, type: 'success' });
        refreshLanguages?.();
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi thêm ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  const handleDeleteLanguage = async (code: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ngôn ngữ "${name}" (${code}) khỏi hệ thống?`)) return;

    try {
      setIsSavingLanguages(true);
      const res = await apiCall(`/api/admin/languages/${code}`, 'DELETE');
      if (res && res.success) {
        setLanguages(res.languages || languages.filter(l => l.code !== code));
        onShowMessage?.({ text: `Đã xóa ngôn ngữ "${name}" thành công!`, type: 'success' });
        refreshLanguages?.();
      } else {
        throw new Error(res?.message || 'Không thể xóa ngôn ngữ');
      }
    } catch (err: any) {
      onShowMessage?.({ text: err.message || 'Lỗi khi xóa ngôn ngữ', type: 'error' });
    } finally {
      setIsSavingLanguages(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Cấu Hình Ngôn Ngữ Hệ Thống</h3>
          <p className="text-xs text-slate-500">
            Kích hoạt, tắt hoặc đặt ngôn ngữ mặc định. Người dùng có thể chuyển đổi giữa các ngôn ngữ đang hoạt động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddLanguageModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm ngôn ngữ</span>
        </button>
      </div>

      {/* Modern Languages Card List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Danh sách ngôn ngữ ({languages.filter(l => l.status === 'ACTIVE').length} đang hoạt động)
          </h4>
          <button
            type="button"
            onClick={fetchLanguages}
            disabled={isLoadingLanguages}
            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLanguages ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingLanguages && languages.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
            Đang tải cấu hình ngôn ngữ...
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {languages.map((lang) => {
              const isActive = lang.status === 'ACTIVE';

              return (
                <div
                  key={lang.code}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl select-none" role="img" aria-label={lang.name}>
                      {lang.flag}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {lang.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400 uppercase">
                          ({lang.code})
                        </span>
                        {lang.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className={`text-xs font-semibold ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {isActive ? 'Đang hoạt động' : 'Tắt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {!lang.isDefault && isActive && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultLanguage(lang.code)}
                        disabled={isSavingLanguages}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Đặt làm mặc định
                      </button>
                    )}

                    {!lang.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleToggleLanguageStatus(lang.code)}
                        disabled={isSavingLanguages}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isActive ? 'Tắt' : 'Kích hoạt'}
                      </button>
                    )}

                    {!lang.isDefault && lang.code !== 'vi' && lang.code !== 'en' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLanguage(lang.code, lang.name)}
                        disabled={isSavingLanguages}
                        title="Xóa ngôn ngữ"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Language Modal */}
      {showAddLanguageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Thêm Ngôn Ngữ Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddLanguageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Language Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                Gợi ý ngôn ngữ phổ biến:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { code: 'ja', name: '日本語', flag: '🇯🇵' },
                  { code: 'ko', name: '한국어', flag: '🇰🇷' },
                  { code: 'zh', name: '中文', flag: '🇨🇳' },
                  { code: 'fr', name: 'Français', flag: '🇫🇷' },
                  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                  { code: 'es', name: 'Español', flag: '🇪🇸' }
                ].map((preset) => (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => setNewLanguage({ code: preset.code, name: preset.name, flag: preset.flag })}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    {preset.flag} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddLanguage} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã ngôn ngữ (ISO Code, ví dụ: fr, de, es, zh) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={newLanguage.code}
                  onChange={e => setNewLanguage({ ...newLanguage, code: e.target.value.toLowerCase() })}
                  placeholder="fr, de, es..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên ngôn ngữ *
                </label>
                <input
                  type="text"
                  required
                  value={newLanguage.name}
                  onChange={e => setNewLanguage({ ...newLanguage, name: e.target.value })}
                  placeholder="Français, Deutsch, Español..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Biểu tượng cờ quốc gia (Emoji) *
                </label>
                <input
                  type="text"
                  required
                  value={newLanguage.flag}
                  onChange={e => setNewLanguage({ ...newLanguage, flag: e.target.value })}
                  placeholder="🇫🇷, 🇩🇪, 🇪🇸..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLanguageModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingLanguages}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {isSavingLanguages ? 'Đang thêm...' : 'Thêm Ngôn Ngữ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
