import React, { useState } from 'react';
import { X, Check, Sliders, Sparkles, GraduationCap, Briefcase, Zap, RotateCcw } from 'lucide-react';
import { soundEngine } from '../lib/soundEngine';
import { ViewState } from '../lib/types';
import { useAppStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

export const NAV_MODULE_METADATA = [
  { id: 'dashboard' as ViewState, labelVi: 'Hôm nay', labelEn: 'Today', iconEmoji: '⚡', descVi: 'Trạm chỉ huy 3 giây, Daily Trifecta & Streak', descEn: '3-second command center, Daily Trifecta & Streak', group: 'core' },
  { id: 'focus' as ViewState, labelVi: 'Tập trung', labelEn: 'Focus', iconEmoji: '🧘', descVi: 'Đồng hồ Pomodoro & Zen Mode', descEn: 'Pomodoro timer & Zen Mode', group: 'core' },
  { id: 'tasks' as ViewState, labelVi: 'Công việc', labelEn: 'Tasks', iconEmoji: '✅', descVi: 'Quản lý nhiệm vụ, deadline & ma trận ưu tiên', descEn: 'Manage tasks, deadlines & priority matrix', group: 'space' },
  { id: 'projects' as ViewState, labelVi: 'Dự án (P.A.R.A)', labelEn: 'Projects (P.A.R.A)', iconEmoji: '📁', descVi: 'Phương pháp P.A.R.A, tiến độ dự án', descEn: 'P.A.R.A methodology & project milestones', group: 'space' },
  { id: 'habits' as ViewState, labelVi: 'Thói quen', labelEn: 'Habits', iconEmoji: '🔥', descVi: 'Theo dõi chuỗi streak kỉ luật mỗi ngày', descEn: 'Track daily discipline habit streaks', group: 'space' },
  { id: 'finance' as ViewState, labelVi: 'Tài chính', labelEn: 'Finance', iconEmoji: '💳', descVi: 'Thu chi, Safe-to-Spend & quy tắc 50/30/20', descEn: 'Cash flow, Safe-to-Spend & 50/30/20 rule', group: 'space' },
  { id: 'study' as ViewState, labelVi: 'Học tập & Từ vựng', labelEn: 'Study & Vocab', iconEmoji: '📚', descVi: 'Flashcards Spaced Repetition (JLPT, IELTS, HSK)', descEn: 'Spaced Repetition flashcards (JLPT, IELTS, HSK)', group: 'space' },
  { id: 'notes' as ViewState, labelVi: 'Sổ tay & Ghi chú', labelEn: 'Journal & Notes', iconEmoji: '📝', descVi: 'Second Brain, ghi chép nhanh & ý tưởng', descEn: 'Second Brain, quick notes & ideation', group: 'space' },
  { id: 'goals' as ViewState, labelVi: 'Mục tiêu', labelEn: 'Goals', iconEmoji: '🎯', descVi: 'Mục tiêu năm, quý & OKRs', descEn: 'Annual, quarterly goals & OKRs', group: 'space' },
  { id: 'calendar' as ViewState, labelVi: 'Lịch biểu', labelEn: 'Calendar', iconEmoji: '📅', descVi: 'Lịch sự kiện & thời gian biểu', descEn: 'Event schedule & time blocking', group: 'space' },
  { id: 'marketplace' as ViewState, labelVi: 'Thư viện mẫu', labelEn: 'Templates Marketplace', iconEmoji: '🛍️', descVi: '12 templates cuộc sống thực chiến', descEn: '12 practical life templates', group: 'system' },
  { id: 'automation' as ViewState, labelVi: 'Quy tắc tự động', labelEn: 'Automation Rules', iconEmoji: '⚙️', descVi: '16 luật tự động hóa dữ liệu', descEn: '16 data automation rules', group: 'system' },
  { id: 'notifications' as ViewState, labelVi: 'Thông báo & Đa kênh', labelEn: 'Notifications & Sync', iconEmoji: '🔔', descVi: 'Web Push PWA, Lịch .ics & Messenger (Cổng 443)', descEn: 'Web Push PWA, Calendar .ics & Messenger (Port 443)', group: 'system' },
  { id: 'decision' as ViewState, labelVi: 'Bộ máy ra quyết định', labelEn: 'Decision Engine', iconEmoji: '⚖️', descVi: 'Động cơ cân nhắc quyết định 10/10/10', descEn: '10/10/10 Decision framework engine', group: 'system' },
  { id: 'subscription' as ViewState, labelVi: 'Gói & Nhóm', labelEn: 'Plans & Team', iconEmoji: '💎', descVi: 'Nâng cấp và quản lý thành viên', descEn: 'Upgrade & manage team members', group: 'system' },
  { id: 'referral' as ViewState, labelVi: 'Giới thiệu 20%', labelEn: 'Referral 20%', iconEmoji: '🎁', descVi: 'Chương trình Affiliate hoa hồng', descEn: 'Affiliate commission program', group: 'system' },
  { id: 'feedback' as ViewState, labelVi: 'Góp ý & Hỗ trợ', labelEn: 'Feedback & Support', iconEmoji: '💬', descVi: 'Gửi phản hồi trực tiếp cho đội ngũ', descEn: 'Send direct feedback to our team', group: 'system' },
];

export const PRESET_MODES = [
  {
    id: 'minimalist',
    nameVi: 'Minimalist (Tập trung ADHD)',
    nameEn: 'Minimalist (ADHD Focus)',
    icon: Zap,
    descVi: 'Tối giản nhất, chống quá tải nhận thức · Chỉ 4 mục cốt lõi',
    descEn: 'Maximum minimalism, zero cognitive overload · Core 4 items only',
    allowed: ['dashboard', 'focus', 'tasks', 'notes'] as ViewState[]
  },
  {
    id: 'student',
    nameVi: 'Sinh viên & Học bá',
    nameEn: 'Student & Academic',
    icon: GraduationCap,
    descVi: 'Tối ưu học thi, từ vựng JLPT/IELTS, thói quen & ví tiền',
    descEn: 'Optimized for exams, vocab flashcards, habits & budget',
    allowed: ['dashboard', 'focus', 'tasks', 'study', 'habits', 'finance', 'notes'] as ViewState[]
  },
  {
    id: 'builder',
    nameVi: 'Builder & Freelancer',
    nameEn: 'Builder & Freelancer',
    icon: Briefcase,
    descVi: 'Quản lý dự án khách hàng, tài chính thu cọc, task & tự động hóa',
    descEn: 'Client projects, cash flow, tasks & automation rules',
    allowed: ['dashboard', 'focus', 'tasks', 'projects', 'finance', 'notes', 'automation'] as ViewState[]
  },
  {
    id: 'all',
    nameVi: 'All-In-One (Đầy đủ)',
    nameEn: 'All-In-One (Full Suite)',
    icon: Sparkles,
    descVi: 'Mở trọn vẹn toàn bộ 16 mô-đun của hệ điều hành',
    descEn: 'Unlock all 16 operating system modules',
    allowed: NAV_MODULE_METADATA.map(m => m.id) as ViewState[]
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
  const { language } = useAppStore();
  const isVi = language === 'vi';
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
                <h3 className="font-black text-lg text-white">
                  {isVi ? 'Cá nhân hóa danh mục' : 'Customize Navigation'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                  {selectedModules.length} {isVi ? 'mục đang bật' : 'items enabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi 
                  ? 'Ẩn bớt các mục bạn không dùng để giữ không gian làm việc sạch sẽ, chống quá tải nhận thức.'
                  : 'Hide modules you do not use to keep your workspace clean and prevent cognitive overload.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isVi ? 'Đóng' : 'Close'}
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
              {isVi ? '1. Chọn nhanh theo phong cách (Presets)' : '1. Quick Styles (Presets)'}
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
                        <span className="font-bold text-xs text-white truncate">{isVi ? p.nameVi : p.nameEn}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {isVi ? p.descVi : p.descEn}
                      </p>
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
                {isVi ? '2. Bật / Tắt chi tiết từng mô-đun' : '2. Toggle Individual Modules'}
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> {isVi ? 'Mặc định tất cả' : 'Reset to All'}
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
                          <span className="text-xs font-bold text-white truncate">{isVi ? mod.labelVi : mod.labelEn}</span>
                          {isPermanent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-bold">
                              {isVi ? 'Cốt lõi' : 'Core'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {isVi ? mod.descVi : mod.descEn}
                        </span>
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
            {isVi 
              ? 'Thay đổi được áp dụng ngay lập tức cho tài khoản của bạn.'
              : 'Changes apply immediately to your active workspace.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {isVi ? 'Áp dụng ngay' : 'Apply Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
