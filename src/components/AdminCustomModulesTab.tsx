import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Trash2, Edit3, CheckCircle2, AlertCircle, RefreshCw,
  Search, X, Check, Eye, Sliders, ChevronRight, Hash, Type, Calendar,
  DollarSign, CheckSquare, ListFilter, Shield
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';

interface CustomField {
  name: string;
  key: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  options?: string;
}

interface CustomModuleItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  status: string;
  isPublic: boolean;
  fields: Array<{
    id: string;
    name: string;
    key: string;
    type: string;
    required: boolean;
    options: string;
    sortOrder: number;
  }>;
  createdAt: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Văn bản ngắn (Text)', icon: Type },
  { value: 'textarea', label: 'Văn bản dài (Textarea)', icon: Type },
  { value: 'number', label: 'Số (Number)', icon: Hash },
  { value: 'currency', label: 'Tiền tệ VNĐ (Currency)', icon: DollarSign },
  { value: 'date', label: 'Ngày tháng (Date)', icon: Calendar },
  { value: 'select', label: 'Danh sách lựa chọn (Dropdown Select)', icon: ListFilter },
  { value: 'boolean', label: 'Đúng / Sai (Checkbox / Toggle)', icon: CheckSquare },
  { value: 'url', label: 'Liên kết web (URL)', icon: Type }
];

export function AdminCustomModulesTab() {
  const [modules, setModules] = useState<CustomModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CustomModuleItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [status, setStatus] = useState('ACTIVE');
  const [fields, setFields] = useState<CustomField[]>([
    { name: 'Tiêu đề', key: 'title', type: 'text', required: true }
  ]);
  const [saving, setSaving] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await apiCall<{ success: boolean; modules: CustomModuleItem[] }>('/api/custom-modules');
      if (res.success) {
        setModules(res.modules || []);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleOpenCreate = () => {
    setEditingModule(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Layers');
    setStatus('ACTIVE');
    setFields([
      { name: 'Tiêu đề', key: 'title', type: 'text', required: true }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mod: CustomModuleItem) => {
    setEditingModule(mod);
    setName(mod.name);
    setSlug(mod.slug);
    setDescription(mod.description || '');
    setIcon(mod.icon || 'Layers');
    setStatus(mod.status || 'ACTIVE');
    setFields(mod.fields.map(f => ({
      name: f.name,
      key: f.key,
      type: f.type,
      required: f.required,
      options: f.options
    })));
    setIsModalOpen(true);
  };

  const handleAddField = () => {
    const idx = fields.length + 1;
    setFields([
      ...fields,
      { name: `Trường mới ${idx}`, key: `field_${idx}`, type: 'text', required: false }
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, patch: Partial<CustomField>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...patch } : f));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên module.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      icon,
      status,
      fields
    };

    try {
      if (editingModule) {
        const res = await apiCall<{ success: boolean; message: string; module: CustomModuleItem }>(
          `/api/custom-modules/${editingModule.id}`,
          'PUT',
          payload
        );
        if (res.success) {
          setSuccess('Cập nhật module thành công!');
          setIsModalOpen(false);
          fetchModules();
        }
      } else {
        const res = await apiCall<{ success: boolean; message: string; module: CustomModuleItem }>(
          '/api/custom-modules',
          'POST',
          payload
        );
        if (res.success) {
          setSuccess(res.message || 'Tạo module mới thành công!');
          setIsModalOpen(false);
          fetchModules();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu module.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, moduleName: string) => {
    if (!window.confirm(`Xác nhận xóa hoàn toàn module "${moduleName}" cùng toàn bộ dữ liệu người dùng trong module này? Thao tác không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await apiCall<{ success: boolean; message: string }>(
        `/api/custom-modules/${id}`,
        'DELETE'
      );
      if (res.success) {
        setSuccess(`Đã xóa module "${moduleName}" thành công.`);
        setModules(prev => prev.filter(m => m.id !== id));
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa module.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Quản lý Lĩnh vực & Module Động (No-Code Extensions)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
              Mở rộng tức thì
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Thêm bất kỳ lĩnh vực quản lý mới (Bất động sản, Hợp đồng, Xe cộ, Kho sách, Thú cưng,...) trực tiếp từ giao diện Admin mà không cần viết thêm code. Module mới sẽ tự động hiển thị trong thanh menu của người dùng.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Module Mới</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Modules List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-xs font-medium">Đang tải danh sách module...</span>
        </div>
      ) : modules.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Chưa có module động nào</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hệ thống hỗ trợ Admin tạo không giới hạn các module lĩnh vực tùy biến theo mô hình dữ liệu động (Dynamic Schema).
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Khởi tạo module đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map(mod => (
            <div
              key={mod.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {mod.name}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mod.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'}`}>
                        {mod.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Slug: /{mod.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(mod)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Chỉnh sửa cấu trúc"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(mod.id, mod.name)}
                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                    title="Xóa module"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {mod.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {mod.description}
                </p>
              )}

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Cấu trúc trường ({mod.fields.length} trường):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mod.fields.map(f => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span>{f.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({f.type})</span>
                      {f.required && <span className="text-rose-500 font-bold">*</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Khởi tạo: {new Date(mod.createdAt).toLocaleDateString('vi-VN')}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                  API: /api/custom-modules/{mod.slug}/records
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingModule ? `Chỉnh sửa: ${editingModule.name}` : 'Khởi tạo Lĩnh vực / Module Động Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">Cấu hình tên, đường dẫn và các trường thuộc tính</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tên lĩnh vực / Module <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Ví dụ: Quản lý Bất Động Sản, Bảo Dưỡng Xe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Slug định danh URL
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="Tự động tạo nếu bỏ trống (vd: bat_dong_san)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mô tả chức năng module
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn về lĩnh vực này để người dùng hiểu cách sử dụng"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Dynamic Fields Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Danh sách Trường Dữ liệu ({fields.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm trường</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          Trường #{idx + 1}
                        </span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 text-xs cursor-pointer"
                            title="Xóa trường này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Tên hiển thị</label>
                          <input
                            type="text"
                            value={field.name}
                            onChange={e => {
                              const newName = e.target.value;
                              const newKey = newName
                                .toLowerCase()
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .replace(/[^a-z0-9_]/g, '_');
                              handleUpdateField(idx, { name: newName, key: field.key.startsWith('field_') ? newKey : field.key });
                            }}
                            required
                            placeholder="Tên trường (vd: Giá trị hợp đồng)"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Khóa JSON (Key)</label>
                          <input
                            type="text"
                            value={field.key}
                            onChange={e => handleUpdateField(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                            required
                            placeholder="contract_value"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Loại dữ liệu</label>
                          <select
                            value={field.type}
                            onChange={e => handleUpdateField(idx, { type: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          >
                            {FIELD_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {field.type === 'select' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">Các tùy chọn (cách nhau bởi dấu phẩy)</label>
                          <input
                            type="text"
                            value={field.options || ''}
                            onChange={e => handleUpdateField(idx, { options: e.target.value })}
                            placeholder="Đang hiệu lực, Đã thanh lý, Chờ gia hạn"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={e => handleUpdateField(idx, { required: e.target.checked })}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Bắt buộc nhập</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingModule ? 'Lưu cấu hình module' : 'Tạo và kích hoạt module'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
