import React, { useState, useMemo, useRef } from 'react';
import { Sparkles, Wallet, CheckSquare, FileText, CornerDownLeft, Search } from 'lucide-react';
import { useAppStore } from '../../lib/store';
import { formatCurrency, formatLocalDateKey } from '../../lib/utils';
import { parseCommand } from '../../utils/commandParser';
import { soundEngine } from '../../lib/soundEngine';
import { showFloatingXp } from '../../lib/celebrationEngine';
import { toast } from '../../lib/toast';

type DetectedIntent =
  | { kind: 'income'; amount: number; description: string; badge: string }
  | { kind: 'expense'; amount: number; description: string; badge: string }
  | { kind: 'note'; title: string; content: string; badge: string }
  | { kind: 'task'; title: string; dueDate: string; priority: 'Cao' | 'Trung bình' | 'Thấp'; energy?: string; badge: string };

function detectIntent(rawInput: string, isVi: boolean): DetectedIntent | null {
  const q = rawInput.trim();
  if (!q) return null;

  // 1. Note intent (#note ..., note: ..., ghi chú: ...)
  if (/^(#note|#ghichu|note:|ghi chú:)\s+/i.test(q)) {
    const body = q.replace(/^(#note|#ghichu|note:|ghi chú:)\s+/i, '').trim();
    if (body) {
      return {
        kind: 'note',
        title: body.slice(0, 60),
        content: body,
        badge: isVi ? '📝 Lưu vào Sổ tay' : '📝 Save to Notes',
      };
    }
  }

  // 2. Income intent (+15m Lương, lương 15m, thưởng 500k)
  const isIncomeExplicit = q.startsWith('+') || /^(thu|lương|thưởng|nhận)\s+/i.test(q);
  const incomeMatch = q.match(/(?:\+)?(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan)?/i);
  if (isIncomeExplicit && incomeMatch) {
    let num = parseFloat(incomeMatch[1].replace(/,/g, ''));
    const unit = (incomeMatch[2] || '').toLowerCase();
    if (unit === 'm' || unit === 'tr' || unit === 'triệu') num *= 1_000_000;
    else if (unit === 'k' || unit === 'nghìn' || unit === 'ngan' || num < 1000) num *= 1000;
    if (num > 0) {
      const desc =
        q
          .replace(/^[+\s]+/, '')
          .replace(/^(?:thu|lương|thưởng|nhận)\s+/i, '')
          .replace(/(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan)?/i, '')
          .trim() || (isVi ? 'Thu nhập nhanh' : 'Quick income');
      return {
        kind: 'income',
        amount: num,
        description: desc,
        badge: `💰 +${formatCurrency(num)} · ${desc}`,
      };
    }
  }

  // 3. Expense intent (Trà sữa 35k, -45k cafe, ăn trưa 50k, xăng 70k)
  const isExpenseExplicit = q.startsWith('-') || /^(chi|mua|tiền|trả)\s+/i.test(q);
  const expenseMatch = q.match(/(?:-)?(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan|đ|vnd)\b/i);
  const isExpenseKeyword =
    isExpenseExplicit ||
    /chi|mua|ăn|uống|xăng|cà phê|cafe|trà sữa|tiền|trả|bánh|cơm|phở|bún|grab|shopee|lazada|vé|thuê/i.test(q);

  if (expenseMatch && (isExpenseKeyword || /(?:k|tr|triệu|nghìn|đ|vnd)$/i.test(q)) && !isIncomeExplicit) {
    let num = parseFloat(expenseMatch[1].replace(/,/g, ''));
    const unit = (expenseMatch[2] || '').toLowerCase();
    if (unit === 'm' || unit === 'tr' || unit === 'triệu') num *= 1_000_000;
    else if (unit === 'k' || unit === 'nghìn' || unit === 'ngan') num *= 1000;
    if (num > 0) {
      const desc =
        q
          .replace(/^[-|\s]+/, '')
          .replace(/(\d+[\d,.]*)\s*(m|tr|triệu|k|nghìn|ngan|đ|vnd)\b/i, '')
          .replace(/^(chi|mua|tiền|trả)\s*/i, '')
          .trim() || (isVi ? 'Chi tiêu nhanh' : 'Quick expense');
      return {
        kind: 'expense',
        amount: num,
        description: desc,
        badge: `💸 -${formatCurrency(num)} · ${desc}`,
      };
    }
  }

  // 4. Default: Smart Task intent (supports @mai, @20:00, !gap, !cao, ~45m)
  const parsed = parseCommand(q);
  const isUrgent = /!(gap|high|cao|uutu)/i.test(q) || parsed.energy === 'deep_work';
  const isLow = /!(thap|low)/i.test(q) || parsed.energy === 'low_battery';
  const cleanTitle = (parsed.title || q).replace(/!(gap|high|uutu)/gi, '').trim();
  const due = parsed.dueDate || formatLocalDateKey(new Date());
  const dueLabel = parsed.dueDisplay || (isVi ? 'Hôm nay' : 'Today');

  return {
    kind: 'task',
    title: cleanTitle || q,
    dueDate: due,
    priority: isUrgent ? 'Cao' : isLow ? 'Thấp' : 'Trung bình',
    energy: parsed.energy,
    badge: `✅ ${isVi ? 'Việc' : 'Task'} · ${dueLabel}${isUrgent ? ' · 🔥 Ưu tiên' : ''}`,
  };
}

export function InlineSmartOmnibar() {
  const { addTask, addTransaction, addNote, toggleCommand, language } = useAppStore();
  const isVi = language === 'vi';
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const intent = useMemo(() => detectIntent(value, isVi), [value, isVi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent || isSaving) return;
    setIsSaving(true);

    try {
      if (intent.kind === 'income') {
        await addTransaction?.({
          amount: intent.amount,
          type: 'Thu nhập',
          category: 'Lương & Thưởng',
          date: formatLocalDateKey(new Date()),
          description: intent.description,
        });
        toast.success(
          isVi
            ? `Đã cộng +${formatCurrency(intent.amount)} (${intent.description})`
            : `Recorded +${formatCurrency(intent.amount)} (${intent.description})`
        );
      } else if (intent.kind === 'expense') {
        await addTransaction?.({
          amount: intent.amount,
          type: 'Chi tiêu',
          category: 'Ăn uống / Sinh hoạt',
          date: formatLocalDateKey(new Date()),
          description: intent.description,
        });
        toast.success(
          isVi
            ? `Đã ghi chi tiêu -${formatCurrency(intent.amount)} (${intent.description})`
            : `Logged expense -${formatCurrency(intent.amount)} (${intent.description})`
        );
      } else if (intent.kind === 'note') {
        await addNote?.({
          title: intent.title,
          content: intent.content,
          type: 'Standard',
          tags: ['nhanh'],
        });
        toast.success(isVi ? `Đã lưu vào Sổ tay: "${intent.title}"` : `Saved note: "${intent.title}"`);
      } else {
        await addTask?.({
          title: intent.title,
          status: 'Chưa làm',
          priority: intent.priority,
          dueDate: intent.dueDate,
          energy: intent.energy,
          projectId: null,
        });
        toast.success(isVi ? `Đã thêm việc: "${intent.title}"` : `Added task: "${intent.title}"`);
      }

      try {
        soundEngine.playSuccess();
      } catch {}
      showFloatingXp('+15 XP', formRef.current);
      setValue('');
    } catch {
      toast.error(isVi ? 'Không thể lưu lúc này, vui lòng thử lại.' : 'Could not save right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full bg-white dark:bg-[#141E30] border border-slate-200/90 dark:border-white/[0.08] focus-within:border-emerald-500 dark:focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 rounded-2xl p-2 sm:p-2.5 flex flex-col gap-1.5 shadow-xs transition-all"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          {intent?.kind === 'expense' || intent?.kind === 'income' ? (
            <Wallet className="w-4 h-4 stroke-[2.2]" />
          ) : intent?.kind === 'note' ? (
            <FileText className="w-4 h-4 stroke-[2.2]" />
          ) : intent?.kind === 'task' ? (
            <CheckSquare className="w-4 h-4 stroke-[2.2]" />
          ) : (
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            isVi
              ? "Gõ thẳng vào đây rồi Enter: 'Làm đề Anh @20:00', 'Trà sữa 35k', '#note Ý tưởng'..."
              : "Type & hit Enter: 'Finish report @17:00', 'Coffee 45k', '#note Idea'..."
          }
          className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-1.5"
        />

        {value.trim() ? (
          <button
            type="submit"
            disabled={isSaving}
            className="shrink-0 px-3.5 py-2 min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isVi ? 'Lưu ngay' : 'Save'}</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              try {
                soundEngine.playPop();
              } catch {}
              toggleCommand();
            }}
            title={isVi ? 'Mở tìm kiếm toàn cục (Ctrl + K)' : 'Open Global Search (Ctrl + K)'}
            className="shrink-0 px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isVi ? 'Tìm nhanh' : 'Search'}</span>
            <kbd className="hidden md:inline font-mono text-[10px] opacity-75">Ctrl K</kbd>
          </button>
        )}
      </div>

      {intent && (
        <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100 dark:border-white/[0.06] text-[11px] animate-in fade-in duration-150">
          <span className="font-bold text-emerald-700 dark:text-emerald-300 truncate">{intent.badge}</span>
          <span className="text-slate-400 hidden sm:inline shrink-0">
            {isVi ? 'Nhấn Enter ↵ để lưu tức thì (+15 XP)' : 'Press Enter ↵ to save (+15 XP)'}
          </span>
        </div>
      )}
    </form>
  );
}
