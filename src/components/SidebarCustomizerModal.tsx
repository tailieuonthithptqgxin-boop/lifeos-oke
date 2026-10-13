import React, { useState } from 'react';
import { X, Check, Sliders, Sparkles, GraduationCap, Briefcase, Zap, Eye, RotateCcw } from 'lucide-react';
import { soundEngine } from '../lib/soundEngine';
import { ViewState } from '../lib/types';

export const NAV_MODULE_METADATA: { id: ViewState; label: string; iconEmoji: string; description: string; group: 'core' | 'space' | 'system' }[] = [
  { id: 'dashboard', label: 'Hôm nay', iconEmoji: '⚡', description: 'Trạm chỉ huy 3 giây, Daily Trifecta & Streak', group: 'core' },
  { id: 'focus', label: 'Tập trung (Focus)', iconEmoji: '🧘', description: 'Đồng hồ Pomodoro & Zen Mode', group: 'core' },
  { id: 'tasks', label: 'Công việc (Tasks)', iconEmoji: '✅', description: 'Quản lý nhiệm vụ, deadline & ma trận ưu tiên', group: 'space' },
  { id: 'projects', label: 'Dự án (Projects)', iconEmoji: '📁', description: 'Phương pháp P.A.R.A, tiến độ dự án', group: 'space' },
  { id: 'habits', label: 'Thói quen (Habits)', iconEmoji: '🔥', description: 'Theo dõi chuỗi streak kỉ luật mỗi ngày', group: 'space' },
  { id: 'finance', label: 'Tài chính (Finance)', iconEmoji: '💳', description: 'Thu chi, Safe-to-Spend & quy tắc 50/30/20', group: 'space' },
  { id: 'study', label: 'Học tập & Từ vựng', iconEmoji: '📚', description: 'Flashcards Spaced Repetition (JLPT, IELTS, HSK)', group: 'space' },
  { id: 'notes', label: 'Nhật ký & Ghi chú', iconEmoji: '📝', description: 'Second Brain, ghi chép nhanh & ý tưởng', group: 'space' },
  { id: 'goals', label: 'Mục tiêu (Goals)', iconEmoji: '🎯', description: 'Mục tiêu năm, quý & OKRs', group: 'space' },
  { id: 'calendar', label: 'Lịch biểu (Calendar)', iconEmoji: '📅', description: 'Lịch sự kiện & thời gian biểu', group: 'space' },
  { id: 'marketplace', label: 'Thư viện mẫu', iconEmoji: '🛍️', description: '12 templates cuộc sống thực chiến', group: 'system' },
  { id: 'automation', label: 'Quy tắc tự động', iconEmoji: '⚙️', description: '16 luật tự động hóa dữ liệu', group: 'system' },
  { id: 'decision', label: 'Ra quyết định', iconEmoji: '⚖️', description: 'Động cơ cân nhắc quyết định 10/10/10', group: 'system' },
  { id: 'subscription', label: 'Gói cước & Đội ngũ', iconEmoji: '💎', description: 'Nâng cấp và quản lý thành viên', group: 'system' },
  { id: 'referral', label: 'Giới thiệu nhận 20%', iconEmoji: '🎁', description: 'Chương trình Affiliate hoa hồng', group: 'system' },
  { id: 'feedback', label: 'Góp ý & Hỗ trợ', iconEmoji: '💬', description: 'Gửi phản hồi trực tiếp cho đội ngũ', group: 'system' },
];

export const PRESET_MODES: {
  id: string;
  name: string;
  icon: any;
  desc: string;
  allowed: ViewState[];
}[] = [
  {
    id: 'minimalist',
    name: 'Minimalist (ADHD Focus)',
    icon: Zap,
    desc: 'Tối giản nhất, chống quá tải nhận thức · Chỉ 4 mục cốt lõi',
    allowed: ['dashboard', 'focus', 'tasks', 'notes']
  },
  {
    id: 'student',
    name: 'Sinh viên & Học bá',
    icon: GraduationCap,
    desc: 'Tối ưu học thi, từ vựng JLPT/IELTS, thói quen & ví tiền',
    allowed: ['dashboard', 'focus', 'tasks', 'study', 'habits', 'finance', 'notes']
  },
  {
    id: 'builder',
    name: 'Builder & Freelancer',
    icon: Briefcase,
    desc: 'Quản lý dự án khách hàng, tài chính thu cọc, task & tự động hóa',
    allowed: ['dashboard', 'focus', 'tasks', 'projects', 'finance', 'notes', 'automation']
  },
  {
    id: 'all',
    name: 'All-In-One (Đầy đủ)',
    icon: Sparkles,
    desc: 'Mở trọn vẹn toàn bộ 16 mô-đun của hệ điều hành',
    allowed: NAV_MODULE_METADATA.map(m => m.id)
  }
];

export function getVisibleNavModules(): string[] {
  try {
    const raw = localStorage.getItem('lifeos_visible_modules');
    if (!raw) return NAV_MODULE_METADATA.map(m => m.id);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return NAV_MODULE_METADATA.map(m => m.id);
  } catch {
    return NAV_MODULE_METADATA.map(m => m.id);
  }
}

interface SidebarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (modules: string[]) => void;
}

export function SidebarCustomizerModal({ isOpen, onClose, onSaved }: SidebarCustomizerModalProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>(() => getVisibleNavModules());

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    soundEngine.playPop();
    // Luôn giữ ít nhất dashboard
    if (id === 'dashboard') return;
    
    setSelectedModules(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(m => m !== id) : [...prev, id];
      return next.length > 0 ? next : ['dashboard'];
    });
  };

  const handleApplyPreset = (allowed: ViewState[]) => {
    soundEngine.playPop();
    setSelectedModules(allowed);
  };

  const handleSave = () => {
    soundEngine.playPop();
    localStorage.setItem('lifeos_visible_modules', JSON.stringify(selectedModules));
    onSaved(selectedModules);
    onClose();
  };

  const handleReset = () => {
    soundEngine.playPop();
    const all = NAV_MODULE_METADATA.map(m => m.id);
    setSelectedModules(all);
    localStorage.setItem('lifeos_visible_modules', JSON.stringify(all));
    onSaved(all);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">Cá Nhân Hóa Thanh Sidebar</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {selectedModules.length} mục đang bật
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ẩn bớt các mục bạn không dùng để giữ không gian làm việc sạch sẽ, chống quá tải nhận thức.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Presets */}
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              1. Chọn nhanh theo phong cách (Presets)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_MODES.map(p => {
                const Icon = p.icon;
                const isSelected = p.allowed.length === selectedModules.length && 
                  p.allowed.every(id => selectedModules.includes(id));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.allowed)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Grid Customizer */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                2. Bật / Tắt chi tiết từng mô-đun
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Mặc định tất cả
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NAV_MODULE_METADATA.map(mod => {
                const isChecked = selectedModules.includes(mod.id);
                const isPermanent = mod.id === 'dashboard';
                return (
                  <div
                    key={mod.id}
                    onClick={() => !isPermanent && handleToggle(mod.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{mod.iconEmoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{mod.label}</span>
                          {isPermanent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-bold">Cốt lõi</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">{mod.description}</span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-emerald-500 text-slate-950 font-black' : 'border border-slate-600 bg-slate-800'
                    }`}>
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Thay đổi được áp dụng ngay lập tức cho tài khoản của bạn.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Áp dụng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
