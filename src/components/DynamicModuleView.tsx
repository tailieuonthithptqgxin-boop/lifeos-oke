import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit3, Trash2, Download, AlertCircle, CheckCircle2,
  Layers, Filter, RefreshCw, X, Check, Calendar, DollarSign,
  Tag, Link as LinkIcon, FileText, CheckSquare, Hash, ArrowUpDown
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { formatCurrency } from '../lib/utils';
import { useAppStore } from '../lib/store';

interface FieldDef {
  id: string;
  name: string;
  key: string;
  type: string;
  required: boolean;
  defaultValue?: string | null;
  options: string; // JSON array string
  sortOrder: number;
}

interface ModuleDef {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  status: string;
  fields: FieldDef[];
}

interface RecordItem {
  id: string;
  moduleId: string;
  userId: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function DynamicModuleView({ slug }: { slug: string }) {
  const { currentUser } = useAppStore();
  const [moduleDef, setModuleDef] = useState<ModuleDef | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fetchModuleAndRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall<{ success: boolean; module: ModuleDef; records: RecordItem[] }>(
        `/api/custom-modules/${slug}/records`
      );
      if (res.success) {
        setModuleDef(res.module);
        setRecords(res.records || []);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) {
      fetchModuleAndRecords();
    }
  }, [slug]);

  const handleOpenCreate = () => {
    setEditingRecord(null);
    const initial: Record<string, any> = {};
    if (moduleDef?.fields) {
      for (const field of moduleDef.fields) {
        initial[field.key] = field.defaultValue || (field.type === 'boolean' ? false : '');
      }
    }
    setFormData(initial);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: RecordItem) => {
    setEditingRecord(rec);
    setFormData({ ...rec.data });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleDef) return;

    // Validate required fields
    for (const f of moduleDef.fields) {
      if (f.required && (formData[f.key] === undefined || formData[f.key] === null || formData[f.key] === '')) {
        setError(`Vui lòng điền thông tin trường bắt buộc: "${f.name}"`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (editingRecord) {
        const res = await apiCall<{ success: boolean; message: string; record: RecordItem }>(
          `/api/custom-modules/${slug}/records/${editingRecord.id}`,
          'PUT',
          { data: formData }
        );
        if (res.success) {
          setRecords(prev => prev.map(r => r.id === editingRecord.id ? res.record : r));
          setSuccess('Cập nhật bản ghi thành công!');
          setIsModalOpen(false);
        }
      } else {
        const res = await apiCall<{ success: boolean; message: string; record: RecordItem }>(
          `/api/custom-modules/${slug}/records`,
          'POST',
          { data: formData }
        );
        if (res.success) {
          setRecords(prev => [res.record, ...prev]);
          setSuccess('Thêm bản ghi mới thành công!');
          setIsModalOpen(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu bản ghi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này không?')) return;
    try {
      const res = await apiCall<{ success: boolean; message: string }>(
        `/api/custom-modules/${slug}/records/${id}`,
        'DELETE'
      );
      if (res.success) {
        setRecords(prev => prev.filter(r => r.id !== id));
        setSuccess('Đã xóa bản ghi thành công!');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xóa bản ghi.');
    }
  };

  const handleExportCSV = () => {
    if (!moduleDef || records.length === 0) return;
    const headers = moduleDef.fields.map(f => `"${f.name}"`).join(',');
    const rows = records.map(r => {
      return moduleDef.fields.map(f => {
        const val = r.data[f.key];
        return `"${(val !== undefined && val !== null ? String(val) : '').replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${moduleDef.slug}_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter records
  const filteredRecords = records.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(r.data).some(val => 
      String(val).toLowerCase().includes(q)
    );
  });

  const parseOptions = (optsStr: string): string[] => {
    try {
      const parsed = JSON.parse(optsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return optsStr.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang tải dữ liệu module...</p>
        </div>
      </div>
    );
  }

  if (!moduleDef) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Không tìm thấy module</h3>
        <p className="text-sm mt-1">Module "{slug}" có thể đã bị xóa hoặc tạm ngưng hoạt động.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm w-full min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {moduleDef.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-200 dark:border-blue-800">
                Module Động
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {moduleDef.description || `Quản lý danh sách và dữ liệu lĩnh vực ${moduleDef.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bản ghi mới</span>
          </button>
        </div>
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

      {/* Search & Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Tìm kiếm trong ${records.length} bản ghi...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong>{filteredRecords.length}</strong> / {records.length} bản ghi
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs w-full min-w-0">
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center text-slate-400">
            <Layers className="w-12 h-12 stroke-[1.5] text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Chưa có bản ghi nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Bắt đầu thêm bản ghi đầu tiên vào lĩnh vực {moduleDef.name}.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full min-w-0 max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  {moduleDef.fields.slice(0, 6).map(f => (
                    <th key={f.id} className="py-3.5 px-4 font-bold">
                      {f.name}
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-slate-400">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>
                    {moduleDef.fields.slice(0, 6).map(f => {
                      const val = r.data[f.key];
                      return (
                        <td key={f.id} className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {f.type === 'boolean' ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${val ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {val ? 'Có / Bật' : 'Không / Tắt'}
                            </span>
                          ) : f.type === 'currency' ? (
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {typeof val === 'number' ? formatCurrency(val) : val}
                            </span>
                          ) : f.type === 'date' ? (
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {val ? new Date(val).toLocaleDateString('vi-VN') : '—'}
                            </span>
                          ) : f.type === 'select' ? (
                            <span className="inline-flex px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                              {val || '—'}
                            </span>
                          ) : (
                            <span className="line-clamp-1 max-w-xs">{val !== undefined && val !== null && val !== '' ? String(val) : '—'}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          title="Sửa bản ghi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                          title="Xóa bản ghi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingRecord ? 'Chỉnh sửa bản ghi' : `Thêm bản ghi mới: ${moduleDef.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">Điền thông tin cho các trường dữ liệu</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {moduleDef.fields.map(field => {
                const options = field.type === 'select' ? parseOptions(field.options) : [];

                return (
                  <div key={field.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>
                        {field.name}
                        {field.required && <span className="text-rose-500 ml-1">*</span>}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({field.key})</span>
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={formData[field.key] || ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Chọn {field.name} --</option>
                        {options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'boolean' ? (
                      <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(formData[field.key])}
                          onChange={e => setFormData({ ...formData, [field.key]: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {field.name} (Bật / Có)
                        </span>
                      </label>
                    ) : field.type === 'number' || field.type === 'currency' ? (
                      <input
                        type="number"
                        value={formData[field.key] !== undefined ? formData[field.key] : ''}
                        onChange={e => setFormData({ ...formData, [field.key]: parseFloat(e.target.value) || 0 })}
                        required={field.required}
                        placeholder={field.type === 'currency' ? 'Ví dụ: 500000' : '0'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={formData[field.key] || ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[field.key] || ''}
                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}

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
                  <span>{editingRecord ? 'Lưu thay đổi' : 'Tạo bản ghi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
