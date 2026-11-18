import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Lock, 
  Check, 
  Clock, 
  X, 
  Layers, 
  Database,
  Image as ImageIcon,
  MessageSquare,
  Users,
  GraduationCap,
  Sliders,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';
import { toast } from '../lib/toast';
import { soundEngine } from '../lib/soundEngine';
import { triggerConfetti } from '../lib/confetti';

interface CategorySubItem {
  label: string;
  count: number;
  size: string;
}

interface StorageCategory {
  key: string;
  title: string;
  icon: string;
  color: string;
  bytes: number;
  formatted: string;
  itemCount: number;
  isProtected: boolean;
  description: string;
  subItems: CategorySubItem[];
}

interface StorageBreakdownData {
  timestamp: string;
  capacity: {
    totalTargetBytes: number;
    totalTargetFormatted: string;
    totalUsedBytes: number;
    totalUsedFormatted: string;
    usedPercentage: number;
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    healthLabel: string;
  };
  categories: StorageCategory[];
}

interface AutoProtectionSettings {
  autoDeleteExpiredNotesAndRoomChat: boolean;
  autoCleanWhenOver80Percent: boolean;
  antiSpamLimit50MsgsPerUser: boolean;
  updatedAt?: string;
}

export function AdminStorageAuditTab() {
  const [data, setData] = useState<StorageBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Auto protection settings
  const [autoSettings, setAutoSettings] = useState<AutoProtectionSettings>({
    autoDeleteExpiredNotesAndRoomChat: true,
    autoCleanWhenOver80Percent: true,
    antiSpamLimit50MsgsPerUser: true
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Safe Category Clean Modal
  const [targetCategoryToClean, setTargetCategoryToClean] = useState<{
    key: string;
    title: string;
    description: string;
  } | null>(null);
  const [isCleaningCategory, setIsCleaningCategory] = useState(false);

  // Restore file input ref
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const fetchStorageBreakdown = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/admin/storage-audit/breakdown', 'GET');
      if (res?.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error('Fetch storage breakdown error:', err);
      toast.error('Không thể tải thông tin dung lượng. Vui lòng kiểm tra lại!');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoProtectionSettings = async () => {
    try {
      const res = await apiCall('/api/admin/storage-audit/auto-protection', 'GET');
      if (res?.success && res.data) {
        setAutoSettings(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStorageBreakdown();
    fetchAutoProtectionSettings();
  }, []);

  // 1-Click Smart Clean Handler
  const handleSmartClean = async () => {
    if (isCleaning) return;
    try {
      setIsCleaning(true);
      const res = await apiCall('/api/admin/storage-audit/smart-clean', 'POST');
      if (res?.success && res.data) {
        soundEngine.playSuccess();
        triggerConfetti();
        toast.success(
          `✅ Đã dọn sạch ${res.data.freedFormatted} dữ liệu thừa! Toàn bộ Tài khoản và Hoa hồng được bảo toàn 100%.`
        );
        await fetchStorageBreakdown();
      } else {
        toast.error('Lỗi khi thực hiện dọn dẹp.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể thực hiện dọn dẹp hệ thống.');
    } finally {
      setIsCleaning(false);
    }
  };

  // Toggle Auto Protection setting
  const handleToggleSetting = async (key: keyof AutoProtectionSettings) => {
    const updated = {
      ...autoSettings,
      [key]: !autoSettings[key]
    };
    setAutoSettings(updated);

    try {
      setIsSavingSettings(true);
      await apiCall('/api/admin/storage-audit/auto-protection', 'POST', updated);
      soundEngine.playPop();
      toast.success('Đã lưu cấu hình tự động bảo vệ hệ thống.');
    } catch {
      toast.error('Không thể lưu cài đặt tự động.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      soundEngine.playPop();

      // Trigger browser download via blob
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/admin/storage-audit/export-csv', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Không thể xuất báo cáo CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-nguoi-dung-hoa-hong-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Đã xuất file báo cáo Người dùng & Hoa hồng (.CSV) thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tải file báo cáo CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Export JSON Backup Handler
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);
      soundEngine.playPop();

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch('/api/admin/storage-audit/backup-json', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Không thể xuất file sao lưu JSON');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-lifeos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Đã tạo và tải file Két sắt Sao lưu (.JSON) thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi sao lưu dữ liệu JSON');
    } finally {
      setIsExportingJson(false);
    }
  };

  // Restore JSON File Handler
  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      toast.error('Vui lòng chọn đúng tệp tin sao lưu định dạng .json');
      return;
    }

    try {
      setIsRestoring(true);
      const fileText = await file.text();
      const backupJson = JSON.parse(fileText);

      if (!backupJson?.version || !backupJson?.data) {
        throw new Error('Tệp JSON không đúng cấu trúc bản sao lưu LifeOS.');
      }

      const res = await apiCall('/api/admin/storage-audit/restore-json', 'POST', backupJson);
      if (res?.success) {
        soundEngine.playSuccess();
        triggerConfetti();
        toast.success('Khôi phục dữ liệu từ bản sao lưu thành công!');
        await fetchStorageBreakdown();
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      toast.error(err.message || 'Lỗi khi khôi phục dữ liệu từ tệp tin.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Clean specific category handler
  const handleExecuteCategoryClean = async () => {
    if (!targetCategoryToClean) return;
    try {
      setIsCleaningCategory(true);
      const res = await apiCall('/api/admin/storage-audit/clean-category', 'POST', {
        categoryKey: targetCategoryToClean.key
      });

      if (res?.success) {
        toast.success(`Đã dọn sạch mục "${targetCategoryToClean.title}" (${res.data.freedCount} bản ghi).`);
        setTargetCategoryToClean(null);
        await fetchStorageBreakdown();
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể dọn dẹp mục này.');
    } finally {
      setIsCleaningCategory(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 sm:p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          Đang tính toán dung lượng thời gian thực của hệ thống...
        </p>
      </div>
    );
  }

  const capacity = data?.capacity || {
    totalTargetBytes: 512 * 1024 * 1024,
    totalTargetFormatted: '512 MB',
    totalUsedBytes: 0,
    totalUsedFormatted: '0 B',
    usedPercentage: 0,
    healthStatus: 'HEALTHY' as const,
    healthLabel: '🟢 Dung lượng an toàn - Hệ thống mượt mà'
  };

  const categories = data?.categories || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hidden file input for Restore */}
      <input
        ref={restoreFileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreFileSelected}
        className="hidden"
      />

      {/* ======================================================== */}
      {/* HEADER: TIÊU ĐỀ & NÚT LÀM MỚI SỐ LIỆU THẬT               */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Quản Lý Dung Lượng & Dữ Liệu Hệ Thống
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đo đếm dung lượng thật 100%, bảo vệ dữ liệu vàng và tối ưu tải cho 10.000 người dùng gói Free.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStorageBreakdown}
          disabled={loading}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Đo Lại Dung Lượng</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* HẠNG MỤC 1: THANH ĐO DUNG LƯỢNG ĐA SẮC (IPHONE STYLE)     */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Health status header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              Trạng Thái Sức Khỏe Bộ Nhớ:
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              capacity.healthStatus === 'HEALTHY'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : capacity.healthStatus === 'WARNING'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}>
              {capacity.healthLabel}
            </span>
          </div>

          <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
            Đã dùng: <span className="text-slate-900 dark:text-white font-black text-sm">{capacity.totalUsedFormatted}</span> / {capacity.totalTargetFormatted} ({capacity.usedPercentage}%)
          </div>
        </div>

        {/* Multi-colored Storage Bar (iPhone-style) */}
        <div className="w-full h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner p-0.5 gap-0.5">
          {categories.map((cat) => {
            const widthPct = capacity.totalTargetBytes > 0 
              ? Math.max(1.5, (cat.bytes / capacity.totalTargetBytes) * 100) 
              : 0;
            return (
              <div
                key={cat.key}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: cat.color
                }}
                className="h-full rounded-full transition-all duration-500 hover:brightness-110 cursor-pointer"
                title={`${cat.title}: ${cat.formatted}`}
              />
            );
          })}
        </div>

        {/* Legend dots */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                  {cat.icon} {cat.title}
                </p>
                <p className="text-[11px] font-black text-slate-900 dark:text-white">
                  {cat.formatted}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* HẠNG MỤC 2: PHÂN TẦNG BẢO VỆ DỮ LIỆU VÀNG & NÚT DỌN RÁC  */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 rounded-3xl border border-emerald-500/30 dark:border-emerald-800/40 shadow-sm space-y-4">
        {/* Banner header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Dọn Rác Thông Minh & Bảo Vệ Dữ Liệu Vàng 100%
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Cơ chế quét an toàn tự động phân tầng: bảo vệ vĩnh viễn dữ liệu tài chính, chỉ dọn sạch các tệp rác và phiên tạm đã quá hạn.
            </p>
          </div>

          {/* Big Prominent Clean Button (>= 44px) */}
          <button
            type="button"
            onClick={handleSmartClean}
            disabled={isCleaning}
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isCleaning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Đang quét & dọn dẹp...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>🧹 Dọn rác & Tối ưu bộ nhớ ngay (An toàn 100%)</span>
              </>
            )}
          </button>
        </div>

        {/* Protection Tier Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Gold Data (Locked) */}
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>DỮ LIỆU VÀNG (KHÓA BẢO VỆ TUYỆT ĐỐI 🔒):</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc">
              <li>Tài khoản người dùng, Mật khẩu & Quyền hạn</li>
              <li>Số dư hoa hồng, Lịch sử rút tiền & Ảnh QR CTV</li>
              <li>Tổng phút tập trung, Chuỗi ngày (Streaks) & Cấp độ</li>
              <li>Toàn bộ bài viết, nhiệm vụ và ghi chú của người dùng</li>
            </ul>
          </div>

          {/* Temp Junk Data (Cleanable) */}
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>DỮ LIỆU TẠM & RÁC ĐƯỢC DỌN DẸP 🧹:</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc">
              <li>Bong bóng trạng thái (Notes) đã quá 24h</li>
              <li>Tin nhắn phòng học cũ quá hạn lưu trữ</li>
              <li>Phiên đăng nhập (Sessions) & Token reset đã hết hạn</li>
              <li>Thông báo hệ thống đã đọc quá 14 ngày & Log tạm</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* HẠNG MỤC 3: BẢNG TỰ ĐỘNG HÓA & CHỐNG SPAM TRÀN BỘ NHỚ     */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bảng Điều Khiển Tự Động Hóa & Chống Spam Tràn Bộ Nhớ
            </h3>
            <p className="text-xs text-slate-500">
              Bảo vệ bộ nhớ tự động chạy ngầm, không cần can thiệp thủ công mỗi ngày.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Toggle 1: Auto purge 24h notes and old room chat */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 gap-3">
            <div className="min-w-0 space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                Tự động xóa Bong bóng trạng thái sau 24h & Tin nhắn phòng học cũ quá 7 ngày
              </span>
              <p className="text-[11px] text-slate-500">
                Giải phóng dữ liệu đệm phòng học và trạng thái ngắn hạn tự động định kỳ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('autoDeleteExpiredNotesAndRoomChat')}
              disabled={isSavingSettings}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                autoSettings.autoDeleteExpiredNotesAndRoomChat ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                autoSettings.autoDeleteExpiredNotesAndRoomChat ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Toggle 2: Auto clean when >80% */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 gap-3">
            <div className="min-w-0 space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                Tự động dọn rác ngầm khi dung lượng bộ nhớ vượt mức 80%
              </span>
              <p className="text-[11px] text-slate-500">
                Ngăn chặn hoàn toàn lỗi tràn bộ nhớ (QuotaExceededError) gây văng ứng dụng trên điện thoại.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('autoCleanWhenOver80Percent')}
              disabled={isSavingSettings}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                autoSettings.autoCleanWhenOver80Percent ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                autoSettings.autoCleanWhenOver80Percent ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Toggle 3: Anti-spam 50 messages per user */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 gap-3">
            <div className="min-w-0 space-y-0.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                Giới hạn chống Spam (Chỉ giữ tối đa 50 tin nhắn gần nhất mỗi người & giới hạn đăng ảnh)
              </span>
              <p className="text-[11px] text-slate-500">
                Đảm bảo một vài cá nhân spam không thể làm đầy bộ nhớ dùng chung của 10.000 người dùng.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSetting('antiSpamLimit50MsgsPerUser')}
              disabled={isSavingSettings}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors shrink-0 ${
                autoSettings.antiSpamLimit50MsgsPerUser ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                autoSettings.antiSpamLimit50MsgsPerUser ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* HẠNG MỤC 4: KÉT SẮT SAO LƯU & KHÔI PHỤC 1 CHẠM (REAL 100%) */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Két Sắt Sao Lưu, Xuất Báo Cáo & Khôi Phục Dữ Liệu
            </h3>
            <p className="text-xs text-slate-500">
              Đảm bảo an toàn 100% dữ liệu với các bản sao lưu chuẩn hóa có thể tải về thiết bị bất cứ lúc nào.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Action 1: JSON Backup */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={isExportingJson}
            className="min-h-[50px] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group active:scale-98 disabled:opacity-50"
          >
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              {isExportingJson ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                📥 Sao Lưu Toàn Bộ (.JSON)
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Đóng gói 100% dữ liệu Web tải về máy
              </span>
            </div>
          </button>

          {/* Action 2: CSV Report */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExportingCsv}
            className="min-h-[50px] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group active:scale-98 disabled:opacity-50"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              {isExportingCsv ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                📊 Báo Cáo CTV & Users (.CSV)
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                File Excel UTF-8 chuẩn tiếng Việt
              </span>
            </div>
          </button>

          {/* Action 3: Restore Backup */}
          <button
            type="button"
            onClick={() => restoreFileRef.current?.click()}
            disabled={isRestoring}
            className="min-h-[50px] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 bg-slate-50/70 hover:bg-purple-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer group active:scale-98 disabled:opacity-50"
          >
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              {isRestoring ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                📤 Khôi Phục Từ File Sao Lưu
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Nạp lại bản sao lưu .json đã lưu
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* HẠNG MỤC 5: THẺ CHI TIẾT 4 NHÓM DỮ LIỆU & DỌN RIÊNG TỪNG MỤC */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-500" />
          <span>Bóc Tách Dữ Liệu Theo Từng Nhóm Chức Năng (4 Nhóm)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        {cat.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {cat.itemCount} bản ghi
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {cat.formatted}
                    </span>
                    {cat.isProtected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Dữ liệu vàng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                        Có thể dọn
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {cat.description}
                </p>

                {/* Sub-items list */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  {cat.subItems.map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>• {sub.label} ({sub.count}):</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{sub.size}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {cat.isProtected ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Mục này được khóa an toàn tuyệt đối, không thể xóa nhầm.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTargetCategoryToClean({
                      key: cat.key === 'community' ? 'notifications' : 'sessions',
                      title: cat.title,
                      description: `Dọn dẹp các tệp tạm và dữ liệu đệm cũ thuộc nhóm ${cat.title}.`
                    })}
                    className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:hover:bg-rose-950/30 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dọn dữ liệu tạm nhóm này</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN DỌN TỪNG PHẦN (MOBILE BOTTOM SHEET)       */}
      {/* ======================================================== */}
      {targetCategoryToClean && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto animate-bottom-sheet"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Xác nhận dọn dẹp dữ liệu tạm
                </h4>
                <p className="text-xs text-slate-500">
                  Nhóm: {targetCategoryToClean.title}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl">
              Hệ thống sẽ quét và loại bỏ các bản ghi tạm thời hoặc đã hết hạn của mục này. Toàn bộ Tài khoản người dùng và Dữ liệu hoa hồng vẫn được khóa bảo vệ an toàn 100%.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetCategoryToClean(null)}
                disabled={isCleaningCategory}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleExecuteCategoryClean}
                disabled={isCleaningCategory}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCleaningCategory ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang dọn...</span>
                  </>
                ) : (
                  <span>Xác nhận dọn</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
